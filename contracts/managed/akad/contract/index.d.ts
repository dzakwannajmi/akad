import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  coinNonce(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  spentCoin(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, { nonce: Uint8Array,
                                                                          color: Uint8Array,
                                                                          value: bigint
                                                                        }];
}

export type ImpureCircuits<PS> = {
  transfer(context: __compactRuntime.CircuitContext<PS>,
           to_0: Uint8Array,
           amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  claimFaucet(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  recordTokenColor(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  wrap(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  unwrap(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  addLiquidity(context: __compactRuntime.CircuitContext<PS>,
               amountAKD_0: bigint,
               amountNight_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  swapAkdToNight(context: __compactRuntime.CircuitContext<PS>,
                 dx_0: bigint,
                 dy_0: bigint,
                 minOut_0: bigint,
                 recipient_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  swapNightToAkd(context: __compactRuntime.CircuitContext<PS>,
                 dx_0: bigint,
                 dy_0: bigint,
                 minOut_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  unwrapNight(context: __compactRuntime.CircuitContext<PS>,
              recipient_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  shieldedSwapAkdToNight(context: __compactRuntime.CircuitContext<PS>,
                         dy_0: bigint,
                         minOut_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  shieldedSwapNightToAkd(context: __compactRuntime.CircuitContext<PS>,
                         dy_0: bigint,
                         minOut_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  transfer(context: __compactRuntime.CircuitContext<PS>,
           to_0: Uint8Array,
           amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  claimFaucet(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  recordTokenColor(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  wrap(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  unwrap(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  addLiquidity(context: __compactRuntime.CircuitContext<PS>,
               amountAKD_0: bigint,
               amountNight_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  swapAkdToNight(context: __compactRuntime.CircuitContext<PS>,
                 dx_0: bigint,
                 dy_0: bigint,
                 minOut_0: bigint,
                 recipient_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  swapNightToAkd(context: __compactRuntime.CircuitContext<PS>,
                 dx_0: bigint,
                 dy_0: bigint,
                 minOut_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  unwrapNight(context: __compactRuntime.CircuitContext<PS>,
              recipient_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  shieldedSwapAkdToNight(context: __compactRuntime.CircuitContext<PS>,
                         dy_0: bigint,
                         minOut_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  shieldedSwapNightToAkd(context: __compactRuntime.CircuitContext<PS>,
                         dy_0: bigint,
                         minOut_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  transfer(context: __compactRuntime.CircuitContext<PS>,
           to_0: Uint8Array,
           amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  claimFaucet(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  recordTokenColor(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  wrap(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  unwrap(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  addLiquidity(context: __compactRuntime.CircuitContext<PS>,
               amountAKD_0: bigint,
               amountNight_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  swapAkdToNight(context: __compactRuntime.CircuitContext<PS>,
                 dx_0: bigint,
                 dy_0: bigint,
                 minOut_0: bigint,
                 recipient_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  swapNightToAkd(context: __compactRuntime.CircuitContext<PS>,
                 dx_0: bigint,
                 dy_0: bigint,
                 minOut_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  unwrapNight(context: __compactRuntime.CircuitContext<PS>,
              recipient_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  shieldedSwapAkdToNight(context: __compactRuntime.CircuitContext<PS>,
                         dy_0: bigint,
                         minOut_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  shieldedSwapNightToAkd(context: __compactRuntime.CircuitContext<PS>,
                         dy_0: bigint,
                         minOut_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  balances: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  readonly totalSupply: bigint;
  readonly tokenColor: Uint8Array;
  readonly faucetAddress: Uint8Array;
  readonly reserveAKD: bigint;
  readonly reserveNight: bigint;
  readonly sNightColor: Uint8Array;
  readonly sNightSupply: bigint;
  faucetClaimed: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
