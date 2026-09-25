import type { ContractStateSnapshot, IndexedTransaction, IndexerClient, TxRef } from './client.js';

/** One scripted answer: a transaction, "not indexed yet", or a thrown error. */
export type FakeResponse = IndexedTransaction | null | Error;

/**
 * IndexerClient for tests. Each transaction reference gets a script of
 * responses, returned one per poll; the last one repeats.
 */
export class FakeIndexerClient implements IndexerClient {
  readonly #scripts = new Map<string, FakeResponse[]>();
  readonly #states = new Map<string, ContractStateSnapshot>();
  /** Number of findTransaction calls per reference, for assertions. */
  readonly calls = new Map<string, number>();

  /**
   * Sets the responses for a reference.
   *
   * @param ref - Hash or identifier the code under test will ask for.
   * @param responses - Answers in order; the last repeats forever.
   * @returns This client, for chaining.
   */
  script(ref: TxRef, responses: FakeResponse[]): this {
    this.#scripts.set(key(ref), [...responses]);
    return this;
  }

  /**
   * Sets the state returned for a contract.
   *
   * @param address - Contract address.
   * @param snapshot - State to return.
   * @returns This client, for chaining.
   */
  setState(address: string, snapshot: ContractStateSnapshot): this {
    this.#states.set(address.toLowerCase(), snapshot);
    return this;
  }

  async findTransaction(ref: TxRef): Promise<IndexedTransaction | null> {
    const k = key(ref);
    this.calls.set(k, (this.calls.get(k) ?? 0) + 1);
    const script = this.#scripts.get(k);
    if (script === undefined || script.length === 0) return null;
    const next = script.length > 1 ? script.shift() : script[0];
    if (next instanceof Error) throw next;
    return next ?? null;
  }

  async contractState(address: string): Promise<ContractStateSnapshot | null> {
    return this.#states.get(address.toLowerCase()) ?? null;
  }
}

function key(ref: TxRef): string {
  return 'hash' in ref ? `hash:${ref.hash.toLowerCase()}` : `id:${ref.identifier.toLowerCase()}`;
}
