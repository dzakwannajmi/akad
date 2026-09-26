// One pass through every exported v1 circuit on its success path, in an
// order where each call's preconditions hold. disclosure-map.test.ts reads
// what each call touched.
import { computeSwapOutput } from '../../frontend/lib/bonding-curve.ts';
import {
  ALICE,
  ALICE_UNSHIELDED,
  AkadSim,
  DEPLOYER,
  FAUCET_AMOUNT,
  FAUCET_KEY,
  hex,
  keyOf,
  type CallResult,
  type CircuitArgs,
  type CircuitName,
  type Coin,
} from './harness.js';

export type JourneyStep = {
  circuit: CircuitName;
  caller: string;
  result: CallResult;
  /** Ledger fields whose value differs after the call, from a full snapshot. */
  changed: Set<string>;
};

function snapshot(sim: AkadSim): Record<string, string> {
  const ledger = sim.ledger;
  const text = (value: unknown): string =>
    JSON.stringify(value, (_key, v: unknown) =>
      v instanceof Uint8Array ? hex(v) : typeof v === 'bigint' ? v.toString() : v
    );
  return {
    balances: text([...ledger.balances]),
    totalSupply: text(ledger.totalSupply),
    tokenColor: text(ledger.tokenColor),
    faucetAddress: text(ledger.faucetAddress),
    reserveAKD: text(ledger.reserveAKD),
    reserveNight: text(ledger.reserveNight),
    sNightColor: text(ledger.sNightColor),
    sNightSupply: text(ledger.sNightSupply),
    faucetClaimed: text([...ledger.faucetClaimed]),
  };
}

function minted(result: CallResult, color: Uint8Array): Coin {
  const output = result.outputs.find((o) => o.recipient.is_left && hex(o.coinInfo.color) === hex(color));
  if (output === undefined) throw new Error('expected a minted coin');
  return output.coinInfo;
}

/** Calls all 11 exported circuits once each and records what each touched. */
export function runJourney(): JourneyStep[] {
  const sim = AkadSim.deploy();
  const steps: JourneyStep[] = [];
  const run = <K extends CircuitName>(caller: string, circuit: K, args: CircuitArgs<K>, coin: Coin | null = null): CallResult => {
    const before = snapshot(sim);
    const result = sim.call(caller, circuit, args, coin);
    const after = snapshot(sim);
    const changed = new Set(Object.keys(after).filter((field) => after[field] !== before[field]));
    steps.push({ circuit, caller, result, changed });
    return result;
  };

  run(DEPLOYER, 'recordTokenColor', []);
  run(DEPLOYER, 'transfer', [FAUCET_KEY, 10n * FAUCET_AMOUNT]);
  run(ALICE, 'claimFaucet', []);
  run(DEPLOYER, 'addLiquidity', [1_000_000n, 2_000_000n]);
  const { reserveAKD, reserveNight } = sim.ledger;
  const out = computeSwapOutput(reserveAKD, reserveNight, 1_000n);
  run(ALICE, 'swapAkdToNight', [1_000n, out, out, ALICE_UNSHIELDED]);
  const back = computeSwapOutput(sim.ledger.reserveNight, sim.ledger.reserveAKD, 3_000n);
  run(ALICE, 'swapNightToAkd', [3_000n, back, back]);

  const tokenColor = sim.ledger.tokenColor;
  const sNightColor = sim.ledger.sNightColor;
  const akd = [0, 1, 2].map(() => minted(run(ALICE, 'wrap', [5_000n]), tokenColor));
  run(ALICE, 'unwrap', [], akd[0] ?? null);
  const sNight = [akd[1], akd[2]].map((coin) => {
    const dy = computeSwapOutput(sim.ledger.reserveAKD, sim.ledger.reserveNight, coin?.value ?? 0n);
    return minted(run(ALICE, 'shieldedSwapAkdToNight', [dy, dy], coin ?? null), sNightColor);
  });
  const dy = computeSwapOutput(sim.ledger.reserveNight, sim.ledger.reserveAKD, sNight[0]?.value ?? 0n);
  run(ALICE, 'shieldedSwapNightToAkd', [dy, dy], sNight[0] ?? null);
  run(ALICE, 'unwrapNight', [ALICE_UNSHIELDED], sNight[1] ?? null);
  return steps;
}

/** The balances-map key of a caller, hex. */
export function callerKeyHex(caller: string): string {
  return hex(keyOf(caller));
}
