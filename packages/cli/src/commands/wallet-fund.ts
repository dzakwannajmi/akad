import { MidnightBech32m, UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk/address-format';
import { resolveNetwork, type ResolvedNetwork } from '../config.js';
import type { CliContext, Command } from '../context.js';
import type { IndexerClient } from '../indexer/client.js';
import type { WalletKeys } from '../keys.js';
import { AkadError } from '../errors.js';
import { feeCapFor } from '../fees.js';
import { isSet, optionalString, parseBaseUnits, parseWalletList, requireString } from '../flags.js';
import { parseNetwork, sdkNetworkId, type NetworkName } from '../networks.js';
import { parseWalletName } from '../secrets.js';
import { loadWallet } from '../wallet.js';
import { cachePath } from '../wallet-cache.js';
import { NIGHT, startWallet, summarize, waitForSync } from '../wallet-runtime.js';
import { stepPassed, writeRun, type RunStep } from '../report/run-report.js';
import {
  checkGate,
  dustRegistrationStep,
  registerForDust,
  stateAfter,
  submitAndConfirm,
  waitForDust,
  walletState,
} from '../wallet-tx.js';
import { DUST_TIMEOUT_S } from './wallet-register-dust.js';
import { SYNC_TIMEOUT_S } from './wallet-status.js';

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * `akad wallet fund --from a0 --to a1,a2 --amount <base units> --network preprod --yes`:
 * one unshielded tNIGHT transfer from the treasury to each recipient, then
 * DUST registration for each recipient and a wait until each has DUST
 * (AUTOMATION.md section 4.1, step 3).
 */
export const walletFund: Command = {
  path: ['wallet', 'fund'],
  summary: 'Send tNIGHT from the treasury, then register each recipient for DUST',
  submits: true,
  flags: {
    from: { type: 'string' },
    to: { type: 'string' },
    amount: { type: 'string' },
    'no-register': { type: 'boolean' },
  },
  async run(ctx, flags) {
    const network = parseNetwork(optionalString(flags, 'network'));
    const fromName = parseWalletName(requireString(flags, 'from'));
    const toNames = parseWalletList(requireString(flags, 'to'));
    if (toNames.includes(fromName)) throw new AkadError('INVALID_ARGS', '--to must not include the --from wallet.');
    const amount = parseBaseUnits(requireString(flags, 'amount'), 'amount');
    if (amount === 0n) throw new AkadError('INVALID_ARGS', '--amount must be more than 0.');

    const sender = loadWallet(ctx, fromName, network);
    const recipients = toNames.map((name) => loadWallet(ctx, name, network));
    const plan: [string, string][] = [
      ['action', `send ${amount} tNIGHT base units to each of ${toNames.join(', ')}`],
      ['from', `${fromName} ${sender.addresses.unshielded}`],
      ...recipients.map((r): [string, string] => [`to ${r.name}`, r.addresses.unshielded]),
      ['network', network],
      ['becomes public', 'sender and recipient addresses and every amount (unshielded transfer)'],
    ];
    if (isSet(flags, 'dry-run')) {
      ctx.out.fields([...plan, ['fee estimate', 'computed from the wallet state; not in a dry run']]);
      return;
    }

    const cap = feeCapFor(ctx.env, isSet(flags, 'yes'));
    const yes = isSet(flags, 'yes');
    const resolved = resolveNetwork(ctx.config, network);
    const indexer = ctx.indexerFor(resolved);
    const networkId = sdkNetworkId(network);
    const startedAt = ctx.now();
    const steps: RunStep[] = [];
    const report = () =>
      steps.length === 0 ? null : writeRun(ctx, { scenario: 'wallet-fund', network, contract: null, startedAt, steps });

    const wallet = await startWallet(sender, resolved, cachePath(ctx.paths.repoRoot, network, fromName));
    try {
      if (wallet.restored) ctx.out.error(`sync ${fromName}: resuming from the local cache`);
      const state = await waitForSync(wallet.facade, SYNC_TIMEOUT_S * 1000, (line) => ctx.out.error(`${fromName} ${line}`));
      await wallet.save();
      const needed = amount * BigInt(recipients.length);
      const { night } = summarize(state, ctx.now());
      const before = walletState(state, ctx.now());
      if (night < needed) {
        throw new AkadError('INSUFFICIENT_FUNDS', `${fromName} holds ${night} tNIGHT base units; the transfer needs ${needed}.`);
      }
      const recipe = await wallet.facade.transferTransaction(
        [
          {
            type: 'unshielded',
            outputs: recipients.map((r) => ({
              type: NIGHT,
              receiverAddress: MidnightBech32m.parse(r.addresses.unshielded).decode(UnshieldedAddress, networkId),
              amount,
            })),
          },
        ],
        { shieldedSecretKeys: sender.shieldedSecretKeys, dustSecretKey: sender.dustSecretKey },
        { ttl: new Date(Date.now() + ONE_HOUR_MS), payFees: true }
      );
      const fee = await wallet.facade.calculateTransactionFee(recipe.transaction);
      checkGate(ctx, { cap, yes, plan }, fee);
      const signed = await wallet.facade.signRecipe(recipe, (payload) => sender.unshieldedKeystore.signData(payload));
      const confirmation = await submitAndConfirm(ctx, wallet, indexer, await wallet.facade.finalizeRecipe(signed), 'tNIGHT transfer');
      steps.push({
        index: 0,
        kind: 'transfer',
        circuit: null,
        wallet: fromName,
        walletAddress: sender.addresses.unshielded,
        expected: 'SUCCESS',
        feeEstimate: { dust: fee.toString(), method: 'approximate' },
        transfers: recipients.map((r) => ({ toWallet: r.name, toAddress: r.addresses.unshielded, amount: amount.toString() })),
        tx: confirmation.hash,
        indexerStatus: confirmation.indexerStatus,
        passed: stepPassed('SUCCESS', confirmation.indexerStatus),
        stateBefore: before,
        stateAfter: confirmation.hash === null ? before : await stateAfter(wallet, before, ctx.now),
        feeActual: null,
        error: confirmation.indexerStatus === 'SUCCESS' ? null : confirmation.message,
      });
    } finally {
      await wallet.stop();
    }
    if (steps[0]?.passed !== true) {
      const path = report();
      if (path !== null) ctx.out.fields([['report', path]]);
      throw new AkadError('STEP_FAILED', 'The tNIGHT transfer did not reach SUCCESS on the indexer.');
    }

    try {
      if (!isSet(flags, 'no-register')) {
        await registerRecipients(ctx, recipients, { network, resolved, indexer, cap, yes }, steps);
      }
    } finally {
      const path = report();
      if (path !== null) ctx.out.fields([['report', path]]);
    }
    const failed = steps.filter((step) => !step.passed);
    if (failed.length > 0) {
      throw new AkadError('STEP_FAILED', `${failed.length} step(s) did not reach SUCCESS on the indexer.`);
    }
  },
};

/**
 * Registers each funded recipient for DUST and waits for its DUST, appending
 * one run report step per registration.
 *
 * @param ctx - CLI context.
 * @param recipients - Recipient wallets.
 * @param run - Network, endpoints, indexer and the gate settings.
 * @param steps - Run report steps, appended to in place.
 */
async function registerRecipients(
  ctx: CliContext,
  recipients: readonly WalletKeys[],
  run: { network: NetworkName; resolved: ResolvedNetwork; indexer: IndexerClient; cap: bigint | null; yes: boolean },
  steps: RunStep[]
): Promise<void> {
  for (const recipient of recipients) {
    const running = await startWallet(recipient, run.resolved, cachePath(ctx.paths.repoRoot, run.network, recipient.name));
    try {
      if (running.restored) ctx.out.error(`sync ${recipient.name}: resuming from the local cache`);
      await waitForSync(running.facade, SYNC_TIMEOUT_S * 1000, (line) => ctx.out.error(`${recipient.name} ${line}`));
      await running.save();
      const registration = await registerForDust(ctx, running, run.indexer, {
        cap: run.cap,
        yes: run.yes,
        plan: [
          ['action', 'register NIGHT UTXOs for DUST generation'],
          ['wallet', `${recipient.name} ${recipient.addresses.unshielded}`],
        ],
      });
      if (registration === null) continue;
      const step = dustRegistrationStep(steps.length, { name: recipient.name, address: recipient.addresses.unshielded }, registration);
      steps.push(step);
      if (!step.passed) continue;
      const { dust, waitedMs } = await waitForDust(ctx, running, DUST_TIMEOUT_S * 1000);
      ctx.out.fields([
        [`${recipient.name} DUST`, `${dust} base units`],
        [`${recipient.name} DUST wait`, `${Math.round(waitedMs / 1000)} s after registration was confirmed`],
      ]);
    } finally {
      await running.stop();
    }
  }
}
