import { MidnightBech32m, UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk/address-format';
import { resolveNetwork } from '../config.js';
import type { Command } from '../context.js';
import { AkadError } from '../errors.js';
import { feeCapFor } from '../fees.js';
import { isSet, optionalString, parseBaseUnits, parseWalletList, requireString } from '../flags.js';
import { parseNetwork, sdkNetworkId } from '../networks.js';
import { parseWalletName } from '../secrets.js';
import { loadWallet } from '../wallet.js';
import { cachePath } from '../wallet-cache.js';
import { NIGHT, startWallet, summarize, waitForSync } from '../wallet-runtime.js';
import { checkGate, confirmOnIndexer, registerForDust, waitForDust } from '../wallet-tx.js';
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

    const wallet = await startWallet(sender, resolved, cachePath(ctx.paths.repoRoot, network, fromName));
    try {
      if (wallet.restored) ctx.out.error(`sync ${fromName}: resuming from the local cache`);
      const state = await waitForSync(wallet.facade, SYNC_TIMEOUT_S * 1000, (line) => ctx.out.error(`${fromName} ${line}`));
      await wallet.save();
      const needed = amount * BigInt(recipients.length);
      const { night } = summarize(state, ctx.now());
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
      checkGate(ctx, { cap, yes, plan }, await wallet.facade.calculateTransactionFee(recipe.transaction));
      const signed = await wallet.facade.signRecipe(recipe, (payload) => sender.unshieldedKeystore.signData(payload));
      const identifier = await wallet.facade.submitTransaction(await wallet.facade.finalizeRecipe(signed));
      await confirmOnIndexer(ctx, indexer, identifier, 'tNIGHT transfer');
    } finally {
      await wallet.stop();
    }

    if (isSet(flags, 'no-register')) return;
    for (const recipient of recipients) {
      const running = await startWallet(recipient, resolved, cachePath(ctx.paths.repoRoot, network, recipient.name));
      try {
        if (running.restored) ctx.out.error(`sync ${recipient.name}: resuming from the local cache`);
        await waitForSync(running.facade, SYNC_TIMEOUT_S * 1000, (line) => ctx.out.error(`${recipient.name} ${line}`));
        await running.save();
        await registerForDust(ctx, running, indexer, {
          cap,
          yes,
          plan: [
            ['action', 'register NIGHT UTXOs for DUST generation'],
            ['wallet', `${recipient.name} ${recipient.addresses.unshielded}`],
          ],
        });
        const { dust, waitedMs } = await waitForDust(ctx, running, DUST_TIMEOUT_S * 1000);
        ctx.out.fields([
          [`${recipient.name} DUST`, `${dust} base units`],
          [`${recipient.name} DUST wait`, `${Math.round(waitedMs / 1000)} s after registration was confirmed`],
        ]);
      } finally {
        await running.stop();
      }
    }
  },
};
