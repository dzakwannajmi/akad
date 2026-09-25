import type { CliContext } from './context.js';
import { AkadError } from './errors.js';
import { enforceFeeCap } from './fees.js';
import type { IndexerClient } from './indexer/client.js';
import { DEFAULT_WAIT, describeOutcome, waitForTransaction } from './indexer/wait.js';
import { NIGHT, waitForState, type RunningWallet } from './wallet-runtime.js';

/** What must hold before a wallet submits anything. */
export type Gate = {
  cap: bigint;
  yes: boolean;
  plan: ReadonlyArray<readonly [string, string]>;
};

/**
 * Prints the plan with the fee estimate, then refuses to continue when the
 * estimate exceeds the cap or --yes is missing. Nothing is submitted before
 * this returns.
 *
 * @param ctx - CLI context.
 * @param gate - Cap, confirmation and plan rows.
 * @param fee - Fee estimate in DUST base units.
 * @throws AkadError `FEE_CAP_EXCEEDED` or `CONFIRMATION_REQUIRED`.
 */
export function checkGate(ctx: CliContext, gate: Gate, fee: bigint): void {
  ctx.out.fields([
    ...gate.plan,
    ['fee estimate', `${fee} DUST base units (approximate until spike S5)`],
    ['fee cap', `${gate.cap} (AKAD_MAX_FEE_DUST)`],
  ]);
  enforceFeeCap(fee, gate.cap);
  if (!gate.yes) {
    throw new AkadError('CONFIRMATION_REQUIRED', 'Nothing was submitted. Re-run with --yes to submit.');
  }
}

/**
 * Waits for the indexer to report a submitted transaction and requires
 * SUCCESS.
 *
 * @param ctx - CLI context.
 * @param indexer - Indexer client.
 * @param identifier - Identifier returned by submitTransaction.
 * @param what - Description for messages, for example "tNIGHT transfer".
 * @returns The transaction hash.
 * @throws AkadError `STEP_FAILED` for any status but SUCCESS, including a
 *   timeout.
 */
export async function confirmOnIndexer(
  ctx: CliContext,
  indexer: IndexerClient,
  identifier: string,
  what: string
): Promise<string> {
  ctx.out.error(`${what}: submitted; waiting for the indexer`);
  const outcome = await waitForTransaction(indexer, { identifier }, {
    ...DEFAULT_WAIT,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now: () => Date.now(),
  });
  const described = describeOutcome(outcome);
  ctx.out.fields([
    [`${what} tx`, outcome.kind === 'indexed' ? outcome.tx.hash : 'none'],
    [`${what} status`, described.message],
  ]);
  if (outcome.kind !== 'indexed' || described.indexerStatus !== 'SUCCESS') {
    throw new AkadError('STEP_FAILED', `${what} did not reach SUCCESS on the indexer.`);
  }
  return outcome.tx.hash;
}

/**
 * Registers every unregistered NIGHT UTXO of a synced wallet for DUST
 * generation. The registration pays its own fee from DUST projected from
 * those UTXOs, so the wallet first waits until enough has accrued (wallet
 * SDK: estimateRegistration, then waitForGeneratedDust).
 *
 * @param ctx - CLI context.
 * @param wallet - Started, synced wallet.
 * @param indexer - Indexer client.
 * @param gate - Fee cap, confirmation and plan.
 * @returns How many UTXOs were registered and the registration hash, or
 *   zero and null when there was nothing to register.
 * @throws AkadError `INSUFFICIENT_FUNDS` when the wallet holds no NIGHT.
 */
export async function registerForDust(
  ctx: CliContext,
  wallet: RunningWallet,
  indexer: IndexerClient,
  gate: Gate
): Promise<{ registered: number; hash: string | null }> {
  const { facade, keys } = wallet;
  const state = await waitForState(facade, () => true, 60_000, 'a synced wallet state');
  const night = state.unshielded.availableCoins.filter((coin) => coin.utxo.type === NIGHT);
  if (night.length === 0) {
    throw new AkadError('INSUFFICIENT_FUNDS', `${keys.name} holds no tNIGHT to register. Fund it first.`);
  }
  const unregistered = night.filter((coin) => !coin.meta.registeredForDustGeneration);
  if (unregistered.length === 0) return { registered: 0, hash: null };

  const { fee } = await facade.estimateRegistration(unregistered);
  checkGate(ctx, gate, fee);
  ctx.out.error(`dust registration: waiting until the UTXOs have generated ${fee} DUST to cover the fee`);
  await facade.waitForGeneratedDust(unregistered, fee, { timeoutMs: 30 * 60_000 });
  const recipe = await facade.registerNightUtxosForDustGeneration(
    unregistered,
    keys.unshieldedKeystore.getPublicKey(),
    (payload) => keys.unshieldedKeystore.signData(payload)
  );
  const identifier = await facade.submitTransaction(await facade.finalizeRecipe(recipe));
  const hash = await confirmOnIndexer(ctx, indexer, identifier, 'dust registration');
  return { registered: unregistered.length, hash };
}

/**
 * Waits until a wallet has spendable DUST and reports how long that took,
 * the wait AUTOMATION.md section 4.1 asks to measure.
 *
 * @param ctx - CLI context.
 * @param wallet - Started wallet.
 * @param timeoutMs - How long to wait.
 * @returns The DUST balance and the milliseconds waited.
 * @throws AkadError `TIMEOUT`.
 */
export async function waitForDust(
  ctx: CliContext,
  wallet: RunningWallet,
  timeoutMs: number
): Promise<{ dust: bigint; waitedMs: number }> {
  const started = Date.now();
  const state = await waitForState(wallet.facade, (s) => s.dust.balance(ctx.now()) > 0n, timeoutMs, 'DUST');
  return { dust: state.dust.balance(ctx.now()), waitedMs: Date.now() - started };
}
