import { AkadError } from '../errors.js';
import {
  parseContractState,
  parseTransactions,
  type ContractStateSnapshot,
  type IndexedTransaction,
  type IndexerClient,
  type TxRef,
} from './client.js';

const TX_FIELDS = `
  hash
  block { height timestamp }
  contractActions { __typename address ... on ContractCall { entryPoint } }
  unshieldedCreatedOutputs { value }
  unshieldedSpentOutputs { value }
  ... on RegularTransaction {
    identifiers
    transactionResult { status segments { id success } }
  }
`;

const TX_BY_HASH = `query TxByHash($hash: HexEncoded!) { transactions(offset: { hash: $hash }) { ${TX_FIELDS} } }`;
const TX_BY_IDENTIFIER = `query TxById($identifier: HexEncoded!) { transactions(offset: { identifier: $identifier }) { ${TX_FIELDS} } }`;
const CONTRACT_STATE = `query ContractState($address: HexEncoded!) {
  contractAction(address: $address) { state transaction { hash block { height } } }
}`;

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

/** IndexerClient over the public v4 GraphQL API. */
export class HttpIndexerClient implements IndexerClient {
  readonly #url: string;
  readonly #fetch: FetchLike;

  /**
   * @param url - GraphQL HTTP endpoint, for example the Preprod v4 URL.
   * @param fetchImpl - Injected for tests; defaults to the global fetch.
   */
  constructor(url: string, fetchImpl: FetchLike = fetch) {
    this.#url = url;
    this.#fetch = fetchImpl;
  }

  async #query(query: string, variables: Record<string, string>): Promise<unknown> {
    const res = await this.#fetch(this.#url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) throw new Error(`indexer HTTP ${res.status}`);
    const body = await res.json();
    if (typeof body !== 'object' || body === null) {
      throw new AkadError('INDEXER_MALFORMED', 'Unexpected indexer response: body is not an object.');
    }
    const { data, errors } = body as { data?: unknown; errors?: Array<{ message?: unknown }> };
    if (Array.isArray(errors) && errors.length > 0) {
      throw new Error(`indexer error: ${errors.map((e) => String(e.message)).join('; ')}`);
    }
    return data;
  }

  async findTransaction(ref: TxRef): Promise<IndexedTransaction | null> {
    const data = 'hash' in ref
      ? await this.#query(TX_BY_HASH, { hash: ref.hash.toLowerCase() })
      : await this.#query(TX_BY_IDENTIFIER, { identifier: ref.identifier.toLowerCase() });
    return parseTransactions(data);
  }

  async contractState(address: string): Promise<ContractStateSnapshot | null> {
    return parseContractState(await this.#query(CONTRACT_STATE, { address: address.toLowerCase() }));
  }
}
