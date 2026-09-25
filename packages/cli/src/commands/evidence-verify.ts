import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveNetwork } from '../config.js';
import type { Command } from '../context.js';
import { AkadError } from '../errors.js';
import { isSet, requireString } from '../flags.js';
import type { IndexedTransaction } from '../indexer/client.js';
import { parseNetwork } from '../networks.js';

type EvidenceEntry = { id: string; circuit: string; tx: string; expectedStatus: string };
type EvidenceFile = { network: string; contract: string; entries: EvidenceEntry[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads the fields `evidence verify` needs from an evidence file. Full schema
 * validation is `npm run validate:json`; this only refuses what would make
 * the check itself meaningless.
 *
 * @param text - File contents.
 * @returns Network, contract and entries.
 * @throws AkadError `EVIDENCE_INVALID`.
 */
export function parseEvidence(text: string): EvidenceFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new AkadError('EVIDENCE_INVALID', 'The evidence file is not valid JSON.');
  }
  if (!isRecord(data) || typeof data.network !== 'string' || typeof data.contract !== 'string' || !Array.isArray(data.entries)) {
    throw new AkadError('EVIDENCE_INVALID', 'The evidence file needs network, contract and entries.');
  }
  const entries = data.entries.map((entry: unknown, index: number) => {
    if (
      !isRecord(entry) ||
      typeof entry.id !== 'string' ||
      typeof entry.circuit !== 'string' ||
      typeof entry.tx !== 'string' ||
      typeof entry.expectedStatus !== 'string'
    ) {
      throw new AkadError('EVIDENCE_INVALID', `Entry ${index} needs id, circuit, tx and expectedStatus.`);
    }
    return { id: entry.id, circuit: entry.circuit, tx: entry.tx.toLowerCase(), expectedStatus: entry.expectedStatus };
  });
  if (entries.length === 0) throw new AkadError('EVIDENCE_INVALID', 'The evidence file has no entries.');
  return { network: data.network, contract: data.contract.toLowerCase(), entries };
}

/**
 * Checks one entry against what the indexer reports.
 *
 * @param entry - Evidence entry.
 * @param contract - Contract the evidence is about.
 * @param tx - Indexer result, or null when the indexer does not know the hash.
 * @returns null when the entry holds, otherwise the reason it does not.
 */
export function checkEntry(entry: EvidenceEntry, contract: string, tx: IndexedTransaction | null): string | null {
  if (tx === null) return 'the indexer does not know this transaction';
  if (tx.status !== entry.expectedStatus) return `status is ${tx.status}, expected ${entry.expectedStatus}`;
  const onContract = tx.contractActions.filter((action) => action.address === contract);
  if (onContract.length === 0) return 'the transaction has no action on the evidence contract';
  const matches = entry.circuit === 'deploy'
    ? onContract.some((action) => action.kind === 'deploy')
    : onContract.some((action) => action.entryPoint === entry.circuit);
  return matches ? null : `the transaction ran ${onContract.map((a) => a.entryPoint ?? a.kind).join(', ')}, not ${entry.circuit}`;
}

/** `akad evidence verify --file docs/v2/evidence/v1.json`: re-check every hash against the indexer. */
export const evidenceVerify: Command = {
  path: ['evidence', 'verify'],
  summary: 'Re-check every transaction in an evidence file against the indexer',
  submits: false,
  flags: {
    file: { type: 'string' },
  },
  async run(ctx, flags) {
    const path = resolve(requireString(flags, 'file'));
    let text: string;
    try {
      text = readFileSync(path, 'utf8');
    } catch {
      throw new AkadError('EVIDENCE_INVALID', `Cannot read ${path}.`);
    }
    const evidence = parseEvidence(text);
    const network = parseNetwork(evidence.network);
    if (isSet(flags, 'dry-run')) {
      ctx.out.fields([
        ['file', path],
        ['network', network],
        ['entries', String(evidence.entries.length)],
        ['query', 'skipped (dry run)'],
      ]);
      return;
    }
    const indexer = ctx.indexerFor(resolveNetwork(ctx.config, network));
    let failed = 0;
    for (const entry of evidence.entries) {
      const problem = checkEntry(entry, evidence.contract, await indexer.findTransaction({ hash: entry.tx }));
      if (problem !== null) failed += 1;
      ctx.out.line(`${entry.id.padEnd(6)} ${entry.circuit.padEnd(24)} ${entry.tx.slice(0, 8)}  ${problem === null ? 'ok' : `FAIL: ${problem}`}`);
    }
    const passed = evidence.entries.length - failed;
    ctx.out.line(`${passed} of ${evidence.entries.length} entries hold on ${network}.`);
    if (failed > 0) {
      throw new AkadError('EVIDENCE_MISMATCH', `${failed} evidence entr${failed === 1 ? 'y does' : 'ies do'} not match the indexer.`);
    }
  },
};
