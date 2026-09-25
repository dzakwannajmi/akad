import { isAkadError } from '../errors.js';
import type { IndexedTransaction, IndexerClient, TxRef } from './client.js';

/** What the indexer finally said about a submitted transaction. */
export type TxOutcome =
  | { kind: 'indexed'; tx: IndexedTransaction }
  | { kind: 'not-found'; lastError: string | null };

export type WaitOptions = {
  timeoutMs: number;
  pollMs: number;
  maxBackoffMs: number;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
};

export const DEFAULT_WAIT: Omit<WaitOptions, 'sleep' | 'now'> = {
  timeoutMs: 5 * 60_000,
  pollMs: 3_000,
  maxBackoffMs: 30_000,
};

/**
 * Polls the indexer until it reports a result for a transaction. A returned
 * transaction id alone never counts as success (CLAUDE.md section 3.5).
 *
 * "Not indexed yet" waits `pollMs`. A network error retries with exponential
 * backoff up to `maxBackoffMs`. A malformed response fails closed at once.
 *
 * @param client - Indexer client.
 * @param ref - Hash or submission identifier.
 * @param options - Timing, with injectable sleep and clock for tests.
 * @returns `indexed` with the transaction (any status), or `not-found` when
 *   the timeout passes first, with the last network error if there was one.
 * @throws AkadError `INDEXER_MALFORMED` when a response has the wrong shape.
 */
export async function waitForTransaction(client: IndexerClient, ref: TxRef, options: WaitOptions): Promise<TxOutcome> {
  const deadline = options.now() + options.timeoutMs;
  let lastError: string | null = null;
  let failures = 0;
  for (;;) {
    let delay = options.pollMs;
    try {
      const tx = await client.findTransaction(ref);
      if (tx !== null) return { kind: 'indexed', tx };
      failures = 0;
    } catch (err) {
      if (isAkadError(err) && err.code === 'INDEXER_MALFORMED') throw err;
      failures += 1;
      lastError = err instanceof Error ? err.message : String(err);
      delay = Math.min(options.pollMs * 2 ** failures, options.maxBackoffMs);
    }
    if (options.now() + delay > deadline) return { kind: 'not-found', lastError };
    await options.sleep(delay);
  }
}

/**
 * Turns an outcome into the status line the CLI prints and the run report's
 * `indexerStatus`.
 *
 * @param outcome - Result of waitForTransaction.
 * @returns Report status and a one-line human description.
 */
export function describeOutcome(outcome: TxOutcome): {
  indexerStatus: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE' | 'NOT_FOUND';
  message: string;
} {
  if (outcome.kind === 'not-found') {
    const suffix = outcome.lastError === null ? '' : ` (last indexer error: ${outcome.lastError})`;
    return { indexerStatus: 'NOT_FOUND', message: `Not confirmed: the indexer did not report this transaction in time${suffix}` };
  }
  const { tx } = outcome;
  switch (tx.status) {
    case 'SUCCESS':
      return { indexerStatus: 'SUCCESS', message: `Confirmed at block ${tx.blockHeight}` };
    case 'PARTIAL_SUCCESS':
      return {
        indexerStatus: 'PARTIAL_SUCCESS',
        message: `Partially failed: fees spent, nothing traded (failed segments ${tx.failedSegments.join(', ') || 'unknown'})`,
      };
    case 'FAILURE':
      return { indexerStatus: 'FAILURE', message: `Failed: the indexer reports FAILURE at block ${tx.blockHeight}` };
  }
}
