import { ContractState } from '@midnight-ntwrk/compact-runtime';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import * as AkadV1 from '../../contracts/akad/contract/index.js';
import { AkadError } from '../errors.js';
import type { ContractStateSnapshot } from '../indexer/client.js';

/** The v1 contract's public state, decoded, plus its tNIGHT custody. */
export type AkadV1State = {
  txHash: string;
  blockHeight: number;
  totalSupply: bigint;
  reserveAKD: bigint;
  reserveNight: bigint;
  sNightSupply: bigint;
  /** Unshielded tNIGHT the contract holds, from the state blob's balance map. */
  custody: bigint;
  /** custody == reserveNight + sNightSupply (ARCHITECTURE.md, section 3). */
  solvent: boolean;
};

/**
 * Decodes an indexer snapshot of the v1 contract. Custody comes from the
 * state blob itself: on 25 Sep 2026 the Preprod indexer's unshieldedBalances
 * field was empty for this contract while the blob held the real balance.
 *
 * @param snapshot - Output of IndexerClient.contractState.
 * @returns Reserves, supplies, custody and the solvency check.
 * @throws AkadError `INDEXER_MALFORMED` when the blob does not decode as the
 *   v1 contract's state.
 */
export function decodeAkadV1State(snapshot: ContractStateSnapshot): AkadV1State {
  let state: ContractState;
  let fields: AkadV1.Ledger;
  try {
    state = ContractState.deserialize(Buffer.from(snapshot.stateHex, 'hex'));
    fields = AkadV1.ledger(state.data);
  } catch (err) {
    throw new AkadError('INDEXER_MALFORMED', `Contract state does not decode as Akad v1: ${(err as Error).message}`);
  }
  const night = ledger.nativeToken();
  let custody = 0n;
  for (const [token, amount] of state.balance) {
    if (token.tag === night.tag && token.raw === night.raw) custody += amount;
  }
  return {
    txHash: snapshot.txHash,
    blockHeight: snapshot.blockHeight,
    totalSupply: fields.totalSupply,
    reserveAKD: fields.reserveAKD,
    reserveNight: fields.reserveNight,
    sNightSupply: fields.sNightSupply,
    custody,
    solvent: custody === fields.reserveNight + fields.sNightSupply,
  };
}

/**
 * Flattens a decoded state into the `stateBefore`/`stateAfter` shape of a run
 * report: decimal strings keyed by field name.
 *
 * @param state - Decoded state.
 * @returns Field name to decimal string.
 */
export function stateForReport(state: AkadV1State): Record<string, string> {
  return {
    totalSupply: state.totalSupply.toString(),
    reserveAKD: state.reserveAKD.toString(),
    reserveNight: state.reserveNight.toString(),
    sNightSupply: state.sNightSupply.toString(),
    custody: state.custody.toString(),
  };
}
