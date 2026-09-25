import type * as ledger from '@midnight-ntwrk/ledger-v8';
import type { FacadeState } from '@midnight-ntwrk/wallet-sdk/facade';
import type { CliContext } from './context.js';
import { AkadError } from './errors.js';
import { enforceFeeCap } from './fees.js';
import type { IndexerClient } from './indexer/client.js';
import { DEFAULT_WAIT, describeOutcome, waitForTransaction } from './indexer/wait.js';
import { stepPassed, type IndexerStatus, type RunStep } from './report/run-report.js';
import { NIGHT, summarize, waitForState, type RunningWallet } from './wallet-runtime.js';

/** What must hold before a wallet submits anything. */
export type Gate = {
  /** Null only in a preview without --yes. */
  cap: bigint | null;
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
    ['fee cap', gate.cap === null ? 'not set (AKAD_MAX_FEE_DUST is required with --yes)' : `${gate.cap} (AKAD_MAX_FEE_DUST)`],
  ]);
  if (gate.cap !== null) enforceFeeCap(fee, gate.cap);
  if (!gate.yes) {
    throw new AkadError('CONFIRMATION_REQUIRED', 'Nothing was submitted. Re-run with --yes to submit.');
  }
  if (gate.cap === null) {
    throw new AkadError('FEE_CAP_MISSING', 'Nothing was submitted: AKAD_MAX_FEE_DUST is not set.');
  }
}

/** What the indexer said about a submission, ready for a run report step. */
export type Confirmation = {
  hash: string | null;
  indexerStatus: IndexerStatus;
  message: string;
};

/**
 * Submits a finalized transaction, then waits for the indexer. Never throws
 * for a failed or rejected transaction: the caller records the outcome in a
 * run report first and decides afterwards.
 *
 * @param ctx - CLI context.
 * @param wallet - Wallet that submits.
 * @param indexer - Indexer client.
 * @param finalized - Proven, balanced, signed transaction.
 * @param what - Description for messages, for example "tNIGHT transfer".
 * @returns Hash, indexer status and a one-line description. A node rejection
 *   is NOT_SUBMITTED with the node's error as the message.
 */
export async function submitAndConfirm(
  ctx: CliContext,
  wallet: RunningWallet,
  indexer: IndexerClient,
  finalized: ledger.FinalizedTransaction,
  what: string
): Promise<Confirmation> {
  let identifier: string;
  try {
    identifier = await wallet.facade.submitTransaction(finalized);
  } catch (err) {
    const message = `Not submitted: ${err instanceof Error ? err.message : String(err)}`;
    ctx.out.fields([[`${what} status`, message]]);
    return { hash: null, indexerStatus: 'NOT_SUBMITTED', message };
  }
  ctx.out.error(`${what}: submitted; waiting for the indexer`);
  const outcome = await waitForTransaction(indexer, { identifier }, {
    ...DEFAULT_WAIT,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now: () => Date.now(),
  });
  const described = describeOutcome(outcome);
  const hash = outcome.kind === 'indexed' ? outcome.tx.hash : null;
  ctx.out.fields([
    [`${what} tx`, hash ?? 'none'],
    [`${what} status`, described.message],
  ]);
  return { hash, indexerStatus: described.indexerStatus, message: described.message };
}

/**
 * The acting wallet's balances, in the shape of a run report's state.
 *
 * @param state - A synced facade state.
 * @param now - Current time, for the DUST balance.
 * @returns tNIGHT, DUST and NIGHT UTXO counts as decimal strings.
 */
export function walletState(state: FacadeState, now: Date): Record<string, string> {
  const summary = summarize(state, now);
  return {
    night: summary.night.toString(),
    dust: summary.dust.toString(),
    nightUtxos: String(summary.nightUtxos.total),
    nightUtxosRegisteredForDust: String(summary.nightUtxos.registeredForDust),
  };
}

/**
 * Reads the wallet's state after a confirmed transaction, giving the wallet
 * up to a minute to see a change first.
 *
 * @param wallet - Running wallet.
 * @param before - State recorded before the transaction.
 * @param now - Clock.
 * @returns The state after, or the latest state if nothing changed in time.
 */
export async function stateAfter(
  wallet: RunningWallet,
  before: Record<string, string>,
  now: () => Date
): Promise<Record<string, string>> {
  const changed = (state: FacadeState) => JSON.stringify(walletState(state, now())) !== JSON.stringify(before);
  try {
    return walletState(await waitForState(wallet.facade, changed, 60_000, 'the wallet to see the transaction'), now());
  } catch {
    return walletState(await waitForState(wallet.facade, () => true, 60_000, 'a synced wallet state'), now());
  }
}

/** The outcome of one DUST registration, for a run report step. */
export type DustRegistration = {
  registered: number;
  fee: bigint;
  confirmation: Confirmation;
  stateBefore: Record<string, string>;
  stateAfter: Record<string, string>;
};

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
 * @returns The registration, or null when every NIGHT UTXO is already registered.
 * @throws AkadError `INSUFFICIENT_FUNDS` when the wallet holds no NIGHT.
 */
export async function registerForDust(
  ctx: CliContext,
  wallet: RunningWallet,
  indexer: IndexerClient,
  gate: Gate
): Promise<DustRegistration | null> {
  const { facade, keys } = wallet;
  const state = await waitForState(facade, () => true, 60_000, 'a synced wallet state');
  const night = state.unshielded.availableCoins.filter((coin) => coin.utxo.type === NIGHT);
  if (night.length === 0) {
    throw new AkadError('INSUFFICIENT_FUNDS', `${keys.name} holds no tNIGHT to register. Fund it first.`);
  }
  const unregistered = night.filter((coin) => !coin.meta.registeredForDustGeneration);
  if (unregistered.length === 0) return null;

  const before = walletState(state, ctx.now());
  const { fee } = await facade.estimateRegistration(unregistered);
  checkGate(ctx, gate, fee);
  ctx.out.error(`dust registration: waiting until the UTXOs have generated ${fee} DUST to cover the fee`);
  await facade.waitForGeneratedDust(unregistered, fee, { timeoutMs: 30 * 60_000 });
  const recipe = await facade.registerNightUtxosForDustGeneration(
    unregistered,
    keys.unshieldedKeystore.getPublicKey(),
    (payload) => keys.unshieldedKeystore.signData(payload)
  );
  const confirmation = await submitAndConfirm(ctx, wallet, indexer, await facade.finalizeRecipe(recipe), 'dust registration');
  const after = confirmation.hash === null ? before : await stateAfter(wallet, before, ctx.now);
  return { registered: unregistered.length, fee, confirmation, stateBefore: before, stateAfter: after };
}

/**
 * Turns a DUST registration into a run report step.
 *
 * @param index - Step index.
 * @param wallet - Wallet name and address.
 * @param registration - Result of registerForDust.
 * @returns The step.
 */
export function dustRegistrationStep(
  index: number,
  wallet: { name: string; address: string },
  registration: DustRegistration
): RunStep {
  return {
    index,
    kind: 'dustRegistration',
    circuit: null,
    wallet: wallet.name,
    walletAddress: wallet.address,
    expected: 'SUCCESS',
    feeEstimate: { dust: registration.fee.toString(), method: 'approximate' },
    tx: registration.confirmation.hash,
    indexerStatus: registration.confirmation.indexerStatus,
    passed: stepPassed('SUCCESS', registration.confirmation.indexerStatus),
    stateBefore: registration.stateBefore,
    stateAfter: registration.stateAfter,
    feeActual: null,
    error: registration.confirmation.indexerStatus === 'SUCCESS' ? null : registration.confirmation.message,
  };
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
