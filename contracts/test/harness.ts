// In-process harness for the v1 contract: runs the compiled circuits from
// contracts/managed/akad against a local ledger state, without proofs,
// wallets or a network. TESTING_STRATEGY.md section 7 describes what it can
// and cannot see.
import { readFileSync } from 'node:fs';
import {
  ChargedState,
  CompactTypeBytes,
  CompactTypeUnsignedInteger,
  StateValue,
  createCircuitContext,
  createConstructorContext,
  persistentHash,
  type AlignedValue,
  type CircuitContext,
  type CircuitResults,
  type ContractState,
  type Effects,
  type EncodedZswapLocalState,
  type Op,
  type TokenType,
  type WitnessContext,
} from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger, type Circuits, type Ledger } from '../managed/akad/contract/index.js';

/** Coin material the spentCoin() witness hands to a circuit. */
export type Coin = { nonce: Uint8Array; color: Uint8Array; value: bigint };

type PrivateState = { coin: Coin | null; nonce: Uint8Array };

export type CircuitName = keyof Circuits<PrivateState>;

export type CircuitArgs<K extends CircuitName> =
  Circuits<PrivateState>[K] extends (context: CircuitContext<PrivateState>, ...args: infer A) => unknown ? A : never;

/** Ledger field names and circuit metadata from the compiler output. */
export type ContractInfo = {
  circuits: { name: string }[];
  ledger: { name: string; index: number; storage: string }[];
};

export const CONTRACT_INFO = JSON.parse(
  readFileSync(new URL('../managed/akad/compiler/contract-info.json', import.meta.url), 'utf8')
) as ContractInfo;

/** Ledger field names ordered by their index in the contract state array. */
export const LEDGER_FIELDS: readonly string[] = [...CONTRACT_INFO.ledger]
  .sort((a, b) => a.index - b.index)
  .map((field) => field.name);

// Zswap coin public keys (hex) that stand in for wallets. Test values only.
export const DEPLOYER = 'aa'.repeat(32);
export const ALICE = 'a1'.repeat(32);
export const BOB = 'b0'.repeat(32);

/** The address every simulated deployment runs at; kernel.self() returns it. */
export const CONTRACT_ADDRESS = 'c0'.repeat(32);

/** An unshielded destination for sendUnshielded, as the circuits take it. */
export const ALICE_UNSHIELDED = { bytes: new Uint8Array(32).fill(0x5a) };

/** tNIGHT, the network's native token; nativeToken() in Compact. */
export const NIGHT: Extract<TokenType, { tag: 'unshielded' }> = { tag: 'unshielded', raw: '00'.repeat(32) };

/** Every bound the v1 swap and liquidity circuits enforce on reserves. */
export const SAFE_BOUND = 4_000_000_000n;

/** Supply minted to the deployer by the constructor (akad.compact L253). */
export const INITIAL_SUPPLY = 1_000_000_000_000n;

/** Fixed amount claimFaucet() pays (akad.compact L291-L298). */
export const FAUCET_AMOUNT = 50_000_000n;

const UINT8 = new CompactTypeUnsignedInteger(255n, 1);
const UINT128 = new CompactTypeUnsignedInteger(2n ** 128n - 1n, 16);
const BYTES32 = new CompactTypeBytes(32);

/** poolKey() and faucetKey() recomputed the way akad.compact L176-L187 does. */
export const POOL_KEY = persistentHash(UINT8, 7n);
export const FAUCET_KEY = persistentHash(UINT8, 11n);

/** The balances-map key of a caller: the bytes of its coin public key (callerKey(), L168-L170). */
export function keyOf(coinPublicKey: string): Uint8Array {
  return Uint8Array.from(Buffer.from(coinPublicKey, 'hex'));
}

export function hex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

function isNight(token: TokenType): boolean {
  return token.tag === 'unshielded' && token.raw === NIGHT.raw;
}

function nightTotal(amounts: Map<TokenType, bigint>): bigint {
  let total = 0n;
  for (const [token, amount] of amounts) if (isNight(token)) total += amount;
  return total;
}

/** What one successful circuit call did. */
export type CallResult = {
  /** Ledger state after the call. */
  ledger: Ledger;
  effects: Effects;
  /** Zswap outputs: coins the call minted and coins the contract received. */
  outputs: EncodedZswapLocalState['outputs'];
  /** Public transcript: the ledger program the proof commits to. */
  transcript: Op<AlignedValue>[];
  /** tNIGHT the call pulls into the contract (receiveUnshielded). */
  nightIn: bigint;
  /** tNIGHT the call pays out of the contract (sendUnshielded). */
  nightOut: bigint;
  /** tNIGHT paid to each user address (hex), as the transaction must show it. */
  nightPaidTo: Map<string, bigint>;
};

const witnesses = {
  coinNonce: ({ privateState }: WitnessContext<Ledger, PrivateState>): [PrivateState, Uint8Array] => [
    privateState,
    privateState.nonce,
  ],
  spentCoin: ({ privateState }: WitnessContext<Ledger, PrivateState>): [PrivateState, Coin] => {
    if (privateState.coin === null) throw new Error('this circuit spends a coin; pass one to AkadSim.call');
    return [privateState, privateState.coin];
  },
};

/**
 * One simulated v1 deployment. Each successful call replaces the ledger
 * state, and the contract's tNIGHT custody moves by the call's unshielded
 * inputs and outputs, as the chain would apply them. A failed call throws the
 * circuit's CompactError and changes nothing.
 */
export class AkadSim {
  private readonly contract = new Contract<PrivateState, typeof witnesses>(witnesses);
  private readonly state: ContractState;
  private nonceCounter = 0n;

  private constructor(state: ContractState) {
    this.state = state;
  }

  /**
   * Runs the constructor as `deployer`.
   *
   * @param deployer - Coin public key (hex) that receives the initial supply.
   * @returns A deployment with no tNIGHT custody.
   */
  static deploy(deployer: string = DEPLOYER): AkadSim {
    const contract = new Contract<PrivateState, typeof witnesses>(witnesses);
    const result = contract.initialState(
      createConstructorContext<PrivateState>({ coin: null, nonce: new Uint8Array(32) }, deployer)
    );
    return new AkadSim(result.currentContractState);
  }

  /**
   * Calls one exported circuit as `caller`.
   *
   * @param caller - Coin public key (hex); ownPublicKey() returns it.
   * @param circuit - Circuit name.
   * @param args - Circuit arguments, without the context.
   * @param coin - The coin spentCoin() returns, for circuits that spend one.
   * @returns What the call did.
   * @throws CompactError `failed assert: <message>` when an assert fails.
   */
  call<K extends CircuitName>(caller: string, circuit: K, args: CircuitArgs<K>, coin: Coin | null = null): CallResult {
    const context = createCircuitContext<PrivateState>(CONTRACT_ADDRESS, caller, this.state, {
      coin,
      nonce: this.freshBytes(),
    });
    const run = this.contract.circuits[circuit] as unknown as (
      context: CircuitContext<PrivateState>,
      ...args: CircuitArgs<K>
    ) => CircuitResults<PrivateState, []>;
    const result = run.call(this.contract.circuits, context, ...args);

    const query = result.context.currentQueryContext;
    const nightIn = nightTotal(query.effects.unshieldedInputs);
    const nightOut = nightTotal(query.effects.unshieldedOutputs);
    const nightPaidTo = new Map<string, bigint>();
    for (const [[token, address], amount] of query.effects.claimedUnshieldedSpends) {
      if (isNight(token) && address.tag === 'user') nightPaidTo.set(address.address, amount);
    }
    this.state.data = query.state;
    this.setCustody(this.custody + nightIn - nightOut);
    return {
      ledger: ledger(query.state),
      effects: query.effects,
      outputs: result.context.currentZswapLocalState.outputs,
      transcript: result.proofData.publicTranscript,
      nightIn,
      nightOut,
      nightPaidTo,
    };
  }

  get ledger(): Ledger {
    return ledger(this.state.data);
  }

  /** tNIGHT the contract holds, the balance unshieldedBalanceGte() checks. */
  get custody(): bigint {
    return nightTotal(this.state.balance);
  }

  /** Sets the contract's tNIGHT custody, to reach the custody asserts. */
  setCustody(amount: bigint): void {
    this.state.balance = new Map([[NIGHT, amount]]);
  }

  balanceOf(account: Uint8Array): bigint {
    const balances = this.ledger.balances;
    return balances.member(account) ? balances.lookup(account) : 0n;
  }

  /** A coin as a wallet would hold it, with a fresh nonce. */
  coin(color: Uint8Array, value: bigint): Coin {
    return { nonce: this.freshBytes(), color, value };
  }

  /**
   * Overwrites one Uint<128> ledger cell. Only for asserts that no sequence
   * of circuit calls can reach, so the defensive check itself gets a test.
   */
  injectCell(field: 'reserveAKD' | 'reserveNight' | 'sNightSupply', value: bigint): void {
    this.replaceField(field, StateValue.newCell(aligned(UINT128, value)));
  }

  /** Overwrites one balances entry. Same purpose as injectCell. */
  injectBalance(account: Uint8Array, value: bigint): void {
    const map = this.field('balances').asMap();
    if (map === undefined) throw new Error('balances is not a map');
    this.replaceField('balances', StateValue.newMap(map.insert(aligned(BYTES32, account), StateValue.newCell(aligned(UINT128, value)))));
  }

  private field(name: string): StateValue {
    const value = this.state.data.state.asArray()?.[fieldIndex(name)];
    if (value === undefined) throw new Error(`no ledger field ${name}`);
    return value;
  }

  private replaceField(name: string, value: StateValue): void {
    const index = fieldIndex(name);
    const fields = this.state.data.state.asArray() ?? [];
    let next = StateValue.newArray();
    fields.forEach((current, i) => {
      next = next.arrayPush(i === index ? value : current);
    });
    this.state.data = new ChargedState(next);
  }

  private freshBytes(): Uint8Array {
    this.nonceCounter += 1n;
    const bytes = new Uint8Array(32);
    new DataView(bytes.buffer).setBigUint64(24, this.nonceCounter);
    return bytes;
  }
}

function aligned<T>(type: { toValue(value: T): AlignedValue['value']; alignment(): AlignedValue['alignment'] }, value: T): AlignedValue {
  return { value: type.toValue(value), alignment: type.alignment() };
}

function fieldIndex(name: string): number {
  const index = LEDGER_FIELDS.indexOf(name);
  if (index < 0) throw new Error(`no ledger field ${name}`);
  return index;
}

/** The message a failed Compact assert throws. */
export function failedAssert(message: string): string {
  return `failed assert: ${message}`;
}

/**
 * A deployment with colors recorded, the faucet funded and the pool seeded,
 * the state v1 runs in on Preprod.
 *
 * @param reserves - Initial reserveAKD and reserveNight.
 */
export function seededPool(reserves: { akd: bigint; night: bigint } = { akd: 1_000_000n, night: 2_000_000n }): AkadSim {
  const sim = AkadSim.deploy();
  sim.call(DEPLOYER, 'recordTokenColor', []);
  sim.call(DEPLOYER, 'transfer', [FAUCET_KEY, 10n * FAUCET_AMOUNT]);
  sim.call(DEPLOYER, 'addLiquidity', [reserves.akd, reserves.night]);
  return sim;
}
