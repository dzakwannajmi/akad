import { AkadError } from '../errors.js';

/** Transaction outcome as the indexer reports it. */
export type TxStatus = 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE';

export type IndexedContractAction = {
  kind: 'deploy' | 'call' | 'update';
  address: string;
  entryPoint: string | null;
};

/**
 * A transaction as read from the indexer. Fees are deliberately absent: on
 * 25 Sep 2026 both the Preview and Preprod indexers returned paidFees "1"
 * and estimatedFees "1" for every transaction checked, deploys included, so
 * the field does not carry the real fee.
 */
export type IndexedTransaction = {
  hash: string;
  identifiers: string[];
  status: TxStatus;
  failedSegments: number[];
  blockHeight: number;
  blockTime: string;
  contractActions: IndexedContractAction[];
  unshieldedSpent: number;
  unshieldedCreated: number;
};

/** A transaction reference: its hash, or an identifier returned at submission. */
export type TxRef = { hash: string } | { identifier: string };

export type ContractStateSnapshot = {
  stateHex: string;
  txHash: string;
  blockHeight: number;
};

/**
 * Everything the CLI reads from the indexer. Business logic depends on this
 * interface; tests inject FakeIndexerClient.
 */
export interface IndexerClient {
  /**
   * Looks up one transaction.
   *
   * @returns The transaction, or null when the indexer does not know it yet.
   * @throws AkadError `INDEXER_MALFORMED` when the response has an unexpected
   *   shape; any other thrown error is treated as a transient network failure.
   */
  findTransaction(ref: TxRef): Promise<IndexedTransaction | null>;

  /**
   * Reads the latest state of a contract.
   *
   * @returns The serialized state and the transaction it follows, or null for
   *   an unknown contract.
   * @throws AkadError `INDEXER_MALFORMED` on an unexpected shape.
   */
  contractState(address: string): Promise<ContractStateSnapshot | null>;
}

const HEX64 = /^[0-9a-f]{64}$/;
const STATUSES: readonly TxStatus[] = ['SUCCESS', 'PARTIAL_SUCCESS', 'FAILURE'];

function malformed(detail: string): AkadError {
  return new AkadError('INDEXER_MALFORMED', `Unexpected indexer response: ${detail}.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Normalises an indexer block timestamp to ISO 8601. The v4 indexer returns
 * Unix milliseconds as a number or numeric string; seconds and ISO strings
 * are accepted too.
 *
 * @param raw - The timestamp field.
 * @returns An ISO 8601 string.
 * @throws AkadError `INDEXER_MALFORMED` for anything that is not a time.
 */
export function normalizeBlockTime(raw: unknown): string {
  if (typeof raw === 'number' || (typeof raw === 'string' && /^\d+$/.test(raw))) {
    const digits = String(raw);
    const ms = digits.length > 12 ? Number(digits) : Number(digits) * 1000;
    const date = new Date(ms);
    if (Number.isFinite(ms) && !Number.isNaN(date.getTime())) return date.toISOString();
  } else if (typeof raw === 'string') {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  throw malformed(`block timestamp ${JSON.stringify(raw)}`);
}

function parseAction(raw: unknown): IndexedContractAction {
  if (!isRecord(raw) || typeof raw.address !== 'string') throw malformed('contract action');
  const kinds: Record<string, IndexedContractAction['kind']> = {
    ContractDeploy: 'deploy',
    ContractCall: 'call',
    ContractUpdate: 'update',
  };
  const kind = typeof raw.__typename === 'string' ? kinds[raw.__typename] : undefined;
  if (kind === undefined) throw malformed(`contract action type ${JSON.stringify(raw.__typename)}`);
  const entryPoint = typeof raw.entryPoint === 'string' ? raw.entryPoint : null;
  return { kind, address: raw.address.toLowerCase(), entryPoint };
}

/**
 * Parses the `transactions` field of a GraphQL response. Fails closed: any
 * field of the wrong type is an error, never a guess.
 *
 * @param data - The `data` object of the response.
 * @returns The first transaction, or null for an empty list.
 * @throws AkadError `INDEXER_MALFORMED`.
 */
export function parseTransactions(data: unknown): IndexedTransaction | null {
  if (!isRecord(data) || !Array.isArray(data.transactions)) throw malformed('missing transactions list');
  const first: unknown = data.transactions[0];
  if (first === undefined) return null;
  if (!isRecord(first)) throw malformed('transaction entry');
  const hash = typeof first.hash === 'string' ? first.hash.toLowerCase() : '';
  if (!HEX64.test(hash)) throw malformed('transaction hash');
  const result = first.transactionResult;
  if (!isRecord(result) || !STATUSES.includes(result.status as TxStatus)) throw malformed('transaction status');
  const segments = result.segments ?? [];
  if (!Array.isArray(segments)) throw malformed('segments');
  const failedSegments = segments.map((segment: unknown) => {
    if (!isRecord(segment) || typeof segment.id !== 'number' || typeof segment.success !== 'boolean') {
      throw malformed('segment');
    }
    return segment;
  }).filter((segment) => segment.success === false).map((segment) => segment.id as number);
  const block = first.block;
  if (!isRecord(block) || typeof block.height !== 'number') throw malformed('block');
  const actions = first.contractActions;
  const spent = first.unshieldedSpentOutputs;
  const created = first.unshieldedCreatedOutputs;
  if (!Array.isArray(actions) || !Array.isArray(spent) || !Array.isArray(created)) throw malformed('transaction lists');
  const identifiers = Array.isArray(first.identifiers)
    ? first.identifiers.filter((id): id is string => typeof id === 'string').map((id) => id.toLowerCase())
    : [];
  return {
    hash,
    identifiers,
    status: result.status as TxStatus,
    failedSegments,
    blockHeight: block.height,
    blockTime: normalizeBlockTime(block.timestamp),
    contractActions: actions.map(parseAction),
    unshieldedSpent: spent.length,
    unshieldedCreated: created.length,
  };
}

/**
 * Parses the `contractAction` field of a GraphQL response.
 *
 * @param data - The `data` object of the response.
 * @returns The snapshot, or null for an unknown contract.
 * @throws AkadError `INDEXER_MALFORMED`.
 */
export function parseContractState(data: unknown): ContractStateSnapshot | null {
  if (!isRecord(data)) throw malformed('missing data');
  const action = data.contractAction;
  if (action === null || action === undefined) return null;
  if (!isRecord(action) || typeof action.state !== 'string') throw malformed('contract state');
  const tx = action.transaction;
  if (!isRecord(tx) || typeof tx.hash !== 'string' || !isRecord(tx.block) || typeof tx.block.height !== 'number') {
    throw malformed('contract state transaction');
  }
  return { stateHex: action.state, txHash: tx.hash.toLowerCase(), blockHeight: tx.block.height };
}
