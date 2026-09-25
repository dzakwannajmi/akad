import { describe, expect, it } from 'vitest';
import { normalizeBlockTime, parseTransactions, type IndexedTransaction } from '../src/indexer/client.js';
import { FakeIndexerClient } from '../src/indexer/fake.js';
import { HttpIndexerClient, type FetchLike } from '../src/indexer/http.js';
import { describeOutcome, waitForTransaction, type WaitOptions } from '../src/indexer/wait.js';

const HASH = '1f50267947ee63e9d0cc54866238402c585731142b499a7521c51778cd12cc41';
const REF = { hash: HASH };

function tx(status: IndexedTransaction['status'], failedSegments: number[] = []): IndexedTransaction {
  return {
    hash: HASH,
    identifiers: [],
    status,
    failedSegments,
    blockHeight: 2553760,
    blockTime: '2026-09-15T01:19:54.000Z',
    contractActions: [{ kind: 'call', address: '2689c5c2'.padEnd(64, '0'), entryPoint: 'unwrapNight' }],
    unshieldedSpent: 0,
    unshieldedCreated: 1,
  };
}

/** Virtual clock: sleep advances time instantly and records each delay. */
function clock(timeoutMs = 60_000): WaitOptions & { slept: number[] } {
  let t = 0;
  const slept: number[] = [];
  return {
    timeoutMs,
    pollMs: 1_000,
    maxBackoffMs: 8_000,
    now: () => t,
    sleep: async (ms) => {
      slept.push(ms);
      t += ms;
    },
    slept,
  };
}

describe('waitForTransaction fault injection (TESTING_STRATEGY section 4)', () => {
  it('reports SUCCESS only after the indexer says so, after N empty polls', async () => {
    const client = new FakeIndexerClient().script(REF, [null, null, null, tx('SUCCESS')]);
    const outcome = await waitForTransaction(client, REF, clock());
    expect(outcome.kind).toBe('indexed');
    expect(describeOutcome(outcome).indexerStatus).toBe('SUCCESS');
    expect(client.calls.get(`hash:${HASH}`)).toBe(4);
  });

  it('reports PARTIAL_SUCCESS as partially failed with fees spent, never as success', async () => {
    const client = new FakeIndexerClient().script(REF, [tx('PARTIAL_SUCCESS', [1])]);
    const described = describeOutcome(await waitForTransaction(client, REF, clock()));
    expect(described.indexerStatus).toBe('PARTIAL_SUCCESS');
    expect(described.message).toMatch(/^Partially failed: fees spent, nothing traded/);
    expect(described.message).toContain('1');
  });

  it('reports FAILURE as failed', async () => {
    const client = new FakeIndexerClient().script(REF, [tx('FAILURE')]);
    const described = describeOutcome(await waitForTransaction(client, REF, clock()));
    expect(described.indexerStatus).toBe('FAILURE');
    expect(described.message).toMatch(/^Failed/);
  });

  it('reports NOT_FOUND as not confirmed when the timeout passes, never as success', async () => {
    const client = new FakeIndexerClient().script(REF, [null]);
    const options = clock(10_000);
    const outcome = await waitForTransaction(client, REF, options);
    expect(outcome.kind).toBe('not-found');
    const described = describeOutcome(outcome);
    expect(described.indexerStatus).toBe('NOT_FOUND');
    expect(described.message).toMatch(/^Not confirmed/);
    expect(options.slept.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(10_000);
  });

  it('retries network errors with exponential backoff, then continues', async () => {
    const client = new FakeIndexerClient().script(REF, [
      new Error('ECONNRESET'),
      new Error('ECONNRESET'),
      new Error('indexer HTTP 502'),
      tx('SUCCESS'),
    ]);
    const options = clock();
    const outcome = await waitForTransaction(client, REF, options);
    expect(describeOutcome(outcome).indexerStatus).toBe('SUCCESS');
    expect(options.slept).toEqual([2_000, 4_000, 8_000]);
  });

  it('caps the backoff and reports the last error when the indexer never recovers', async () => {
    const client = new FakeIndexerClient().script(REF, [new Error('indexer HTTP 503')]);
    const options = clock(40_000);
    const outcome = await waitForTransaction(client, REF, options);
    expect(outcome).toEqual({ kind: 'not-found', lastError: 'indexer HTTP 503' });
    expect(Math.max(...options.slept)).toBe(8_000);
  });

  it('fails closed on a malformed response: an error, no retry, no success', async () => {
    const fetchBad: FetchLike = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: { transactions: [{ hash: HASH, transactionResult: { status: 'MAYBE' } }] } }),
    });
    const client = new HttpIndexerClient('https://indexer.invalid', fetchBad);
    await expect(waitForTransaction(client, REF, clock())).rejects.toMatchObject({ code: 'INDEXER_MALFORMED' });
  });

  it.each([
    [{ data: {} }, 'missing transactions list'],
    [{ data: { transactions: [{ hash: 'nothex' }] } }, 'transaction hash'],
    [{ data: { transactions: [{ hash: HASH, transactionResult: { status: 'SUCCESS', segments: [{ id: 'x' }] } }] } }, 'segment'],
  ])('rejects malformed shape %#', async (body, detail) => {
    expect(() => parseTransactions((body as { data: unknown }).data)).toThrow(detail);
  });
});

describe('block timestamps', () => {
  it.each([
    [1789435194000, '2026-09-15T01:19:54.000Z'],
    ['1789435194000', '2026-09-15T01:19:54.000Z'],
    [1789435194, '2026-09-15T01:19:54.000Z'],
    ['2026-09-15T01:19:54Z', '2026-09-15T01:19:54.000Z'],
  ])('normalises %j', (raw, iso) => {
    expect(normalizeBlockTime(raw)).toBe(iso);
  });

  it.each([null, 'yesterday', {}, -Infinity])('rejects %j', (raw) => {
    expect(() => normalizeBlockTime(raw)).toThrow(/block timestamp/);
  });
});

describe('HttpIndexerClient', () => {
  // Response recorded from the Preprod v4 indexer on 25 Sep 2026 for the
  // first unwrapNight on the v1 contract.
  const recorded = {
    data: {
      transactions: [
        {
          hash: HASH,
          identifiers: ['0038fa22263e5d3aae626c02d48572c29ffb7acf471be371c17faea9323723a7b3'],
          transactionResult: { status: 'SUCCESS', segments: null },
          unshieldedSpentOutputs: [],
          unshieldedCreatedOutputs: [{ value: '22902903' }],
          block: { height: 2553760, timestamp: 1789435194000 },
          contractActions: [
            {
              __typename: 'ContractCall',
              address: '2689c5c24d4f560ec4ce0be14641ad544bca382d524ebdcb2e69c152f179a51a',
              entryPoint: 'unwrapNight',
            },
          ],
        },
      ],
    },
  };

  it('parses a real indexer response', async () => {
    let sent = '';
    const fetchRecorded: FetchLike = async (_url, init) => {
      sent = init.body;
      return { ok: true, status: 200, json: async () => recorded };
    };
    const found = await new HttpIndexerClient('https://indexer.invalid', fetchRecorded).findTransaction(REF);
    expect(found).toEqual({
      hash: HASH,
      identifiers: ['0038fa22263e5d3aae626c02d48572c29ffb7acf471be371c17faea9323723a7b3'],
      status: 'SUCCESS',
      failedSegments: [],
      blockHeight: 2553760,
      blockTime: '2026-09-15T01:19:54.000Z',
      contractActions: [
        { kind: 'call', address: '2689c5c24d4f560ec4ce0be14641ad544bca382d524ebdcb2e69c152f179a51a', entryPoint: 'unwrapNight' },
      ],
      unshieldedSpent: 0,
      unshieldedCreated: 1,
    });
    expect(JSON.parse(sent).variables).toEqual({ hash: HASH });
  });

  it('returns null for an empty list and throws on HTTP and GraphQL errors', async () => {
    const empty: FetchLike = async () => ({ ok: true, status: 200, json: async () => ({ data: { transactions: [] } }) });
    expect(await new HttpIndexerClient('u', empty).findTransaction(REF)).toBeNull();
    const http502: FetchLike = async () => ({ ok: false, status: 502, json: async () => ({}) });
    await expect(new HttpIndexerClient('u', http502).findTransaction(REF)).rejects.toThrow('indexer HTTP 502');
    const gqlError: FetchLike = async () => ({ ok: true, status: 200, json: async () => ({ errors: [{ message: 'boom' }] }) });
    await expect(new HttpIndexerClient('u', gqlError).findTransaction(REF)).rejects.toThrow('indexer error: boom');
  });
});
