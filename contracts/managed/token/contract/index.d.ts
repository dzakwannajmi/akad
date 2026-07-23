import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  accountKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  init(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  transfer(context: __compactRuntime.CircuitContext<PS>,
           to_0: Uint8Array,
           amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  akdColor(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  wrap(context: __compactRuntime.CircuitContext<PS>,
       amount_0: bigint,
       nonce_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  unwrap(context: __compactRuntime.CircuitContext<PS>,
         coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  init(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  transfer(context: __compactRuntime.CircuitContext<PS>,
           to_0: Uint8Array,
           amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  akdColor(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  wrap(context: __compactRuntime.CircuitContext<PS>,
       amount_0: bigint,
       nonce_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  unwrap(context: __compactRuntime.CircuitContext<PS>,
         coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  init(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  transfer(context: __compactRuntime.CircuitContext<PS>,
           to_0: Uint8Array,
           amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  akdColor(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  wrap(context: __compactRuntime.CircuitContext<PS>,
       amount_0: bigint,
       nonce_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  unwrap(context: __compactRuntime.CircuitContext<PS>,
         coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): __compactRuntime.CircuitResults<PS, []>;
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
