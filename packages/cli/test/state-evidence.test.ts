import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkEntry } from '../src/commands/evidence-verify.js';
import { decodeAkadV1State } from '../src/contract/akad-v1.js';
import { parseContractState, type IndexedTransaction } from '../src/indexer/client.js';
import { FakeIndexerClient } from '../src/indexer/fake.js';
import { EVIDENCE_SAMPLE, runCli } from './helpers.js';

const PREVIEW = '676fb20d4062e293d6521bd8e70af202345f75406ba4922d66453148a9d636ae';
const PREPROD = '2689c5c24d4f560ec4ce0be14641ad544bca382d524ebdcb2e69c152f179a51a';

// Recorded from the Preview v4 indexer on 26 Sep 2026.
const recorded = JSON.parse(readFileSync(resolve(import.meta.dirname, 'fixtures/preview-v1-state.json'), 'utf8'));
const snapshot = parseContractState(recorded.response.data)!;

function tx(hash: string, entryPoint: string, status: IndexedTransaction['status'] = 'SUCCESS'): IndexedTransaction {
  return {
    hash,
    identifiers: [],
    status,
    failedSegments: [],
    blockHeight: 1,
    blockTime: '2026-09-15T00:00:00.000Z',
    contractActions: [{ kind: 'call', address: PREPROD, entryPoint }],
    unshieldedSpent: 0,
    unshieldedCreated: 0,
  };
}

describe('v1 contract state', () => {
  it('decodes the recorded Preview state, custody included', () => {
    const decoded = decodeAkadV1State(snapshot);
    expect(decoded).toMatchObject({
      txHash: '5d1bb0d53686d1f1fe9170fef8f027530d26b2b65aca037a171a0726c8c8bcfb',
      blockHeight: 918485,
      totalSupply: 1_000_000_000_000n,
      reserveAKD: 971_517_527n,
      reserveNight: 1_036_733_773n,
      sNightSupply: 0n,
      custody: 1_036_733_773n,
      solvent: true,
    });
  });

  it('prints the state and the solvency check through `akad state`', async () => {
    const indexer = new FakeIndexerClient().setState(PREVIEW, snapshot);
    const run = await runCli(['state', '--network', 'preview', '--json'], {}, indexer);
    expect(run.code, run.stderr).toBe(0);
    const printed = JSON.parse(run.stdout) as Record<string, string>;
    expect(printed['reserveNight']).toBe('1036733773');
    expect(printed['tNIGHT custody']).toBe('1036733773');
    expect(printed['solvency']).toMatch(/^holds/);
  });

  it('reports an unknown contract', async () => {
    const run = await runCli(['state', '--network', 'preview', '--contract', 'ab'.repeat(32)], {}, new FakeIndexerClient());
    expect(run.code).toBe(1);
    expect(run.stderr).toContain('CONTRACT_NOT_FOUND');
  });

  it('rejects a malformed --contract', async () => {
    const run = await runCli(['state', '--network', 'preview', '--contract', 'xyz'], {}, new FakeIndexerClient());
    expect(run.code).toBe(1);
    expect(run.stderr).toContain('INVALID_ARGS');
  });
});

describe('evidence verify', () => {
  const [first, second] = JSON.parse(readFileSync(EVIDENCE_SAMPLE, 'utf8')).entries as { tx: string }[];

  it('passes when the indexer agrees with every entry', async () => {
    const indexer = new FakeIndexerClient()
      .script({ hash: first!.tx }, [tx(first!.tx, 'shieldedSwapAkdToNight')])
      .script({ hash: second!.tx }, [tx(second!.tx, 'unwrapNight')]);
    const run = await runCli(['evidence', 'verify', '--file', EVIDENCE_SAMPLE], {}, indexer);
    expect(run.code, run.stderr).toBe(0);
    expect(run.stdout).toContain('2 of 2 entries hold on preprod.');
  });

  it('fails and names the entry when the indexer disagrees', async () => {
    const indexer = new FakeIndexerClient()
      .script({ hash: first!.tx }, [tx(first!.tx, 'shieldedSwapAkdToNight', 'PARTIAL_SUCCESS')])
      .script({ hash: second!.tx }, [null]);
    const run = await runCli(['evidence', 'verify', '--file', EVIDENCE_SAMPLE], {}, indexer);
    expect(run.code).toBe(1);
    expect(run.stdout).toContain('E-01');
    expect(run.stdout).toContain('status is PARTIAL_SUCCESS, expected SUCCESS');
    expect(run.stdout).toContain('the indexer does not know this transaction');
    expect(run.stderr).toContain('EVIDENCE_MISMATCH');
  });

  it('checks the entry point and the contract, not only the status', () => {
    const entry = { id: 'E-09', circuit: 'wrap', tx: 'aa'.repeat(32), expectedStatus: 'SUCCESS' };
    expect(checkEntry(entry, PREPROD, tx(entry.tx, 'unwrap'))).toMatch(/ran unwrap, not wrap/);
    expect(checkEntry(entry, 'bb'.repeat(32), tx(entry.tx, 'wrap'))).toMatch(/no action on the evidence contract/);
    expect(checkEntry(entry, PREPROD, tx(entry.tx, 'wrap'))).toBeNull();
  });
});
