import { CompiledContract } from '@midnight-ntwrk/compact-js';
import * as AkadV1 from '../../contracts/akad/contract/index.js';

/** A shielded coin as the spentCoin() witness hands it to the circuit. */
export type ShieldedCoin = { nonce: Uint8Array; color: Uint8Array; value: bigint };

/**
 * Private state read by the v1 witnesses. The CLI stages one value right
 * before the call that needs it, as the frontend does (frontend/lib/akad-api.ts).
 */
export type AkadPrivateState = {
  pendingNonce: Uint8Array | null;
  pendingCoin: ShieldedCoin | null;
};

export const AKAD_PRIVATE_STATE_ID = 'akadPrivateState';

export const initialPrivateState = (): AkadPrivateState => ({ pendingNonce: null, pendingCoin: null });

/**
 * Witnesses for akad.compact lines 100 and 101. They throw instead of
 * returning a zero value: a zero nonce would mint an unspendable coin.
 */
export const akadWitnesses: AkadV1.Witnesses<AkadPrivateState> = {
  coinNonce({ privateState }) {
    if (privateState.pendingNonce === null) {
      throw new Error('coinNonce witness: no nonce staged. Stage one before calling a circuit that mints.');
    }
    return [privateState, privateState.pendingNonce];
  },
  spentCoin({ privateState }) {
    if (privateState.pendingCoin === null) {
      throw new Error('spentCoin witness: no coin staged. Stage one before calling a circuit that spends a coin.');
    }
    return [privateState, privateState.pendingCoin];
  },
};

export type AkadV1Contract = AkadV1.Contract<AkadPrivateState>;

/**
 * Builds the compiled v1 contract with its witnesses and ZK assets. The
 * data-first forms of withWitnesses and withCompiledFileAssets infer their
 * type parameters from the contract, so no cast is needed.
 *
 * @param zkAssetsDir - Directory with `keys/` and `zkir/`, for example
 *   contracts/managed/akad.
 * @returns The compiled contract for findDeployedContract.
 */
export function compileAkadV1(zkAssetsDir: string) {
  const base = CompiledContract.make<AkadV1Contract>('akad', AkadV1.Contract);
  const withWitnesses = CompiledContract.withWitnesses(base, akadWitnesses);
  return CompiledContract.withCompiledFileAssets(withWitnesses, zkAssetsDir);
}
