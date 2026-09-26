// L3 tests for the public pool circuits of akad.compact (v1): addLiquidity,
// swapAkdToNight and swapNightToAkd. Quotes come from the app's own
// computeSwapOutput(), the function every v1 swap uses to pick dy.
import { describe, expect, it } from 'vitest';
import { computeSwapOutput } from '../../frontend/lib/bonding-curve.ts';
import {
  ALICE,
  ALICE_UNSHIELDED,
  AkadSim,
  BOB,
  DEPLOYER,
  INITIAL_SUPPLY,
  POOL_KEY,
  SAFE_BOUND,
  failedAssert,
  hex,
  keyOf,
  seededPool,
} from './harness.js';

const X_AKD = 1_000_000n;
const Y_NIGHT = 2_000_000n;

/** A seeded pool where ALICE holds 1,000,000 AKD base units. */
function tradingPool(): AkadSim {
  const sim = seededPool({ akd: X_AKD, night: Y_NIGHT });
  sim.call(DEPLOYER, 'transfer', [keyOf(ALICE), 1_000_000n]);
  return sim;
}

describe('addLiquidity L378-L412', () => {
  it('moves the caller\'s AKD to the pool account and pulls the tNIGHT into custody', () => {
    const sim = AkadSim.deploy();
    const result = sim.call(DEPLOYER, 'addLiquidity', [X_AKD, Y_NIGHT]);
    expect([sim.ledger.reserveAKD, sim.ledger.reserveNight]).toEqual([X_AKD, Y_NIGHT]);
    expect(sim.balanceOf(keyOf(DEPLOYER))).toBe(INITIAL_SUPPLY - X_AKD);
    expect(sim.balanceOf(POOL_KEY)).toBe(X_AKD);
    expect([result.nightIn, result.nightOut]).toEqual([Y_NIGHT, 0n]);
    expect(sim.custody).toBe(Y_NIGHT);
  });

  it('accepts both amounts at the 4,000,000,000 bound', () => {
    const sim = AkadSim.deploy();
    sim.call(DEPLOYER, 'addLiquidity', [SAFE_BOUND, SAFE_BOUND]);
    expect(sim.ledger.reserveAKD).toBe(SAFE_BOUND);
  });

  // Observation for the M8 review: the first caller with enough AKD seeds
  // the pool. The source comments call this caller "the builder", but no
  // assert checks who it is.
  it('lets any caller with enough AKD seed the pool first', () => {
    const sim = AkadSim.deploy();
    sim.call(DEPLOYER, 'transfer', [keyOf(ALICE), 10n]);
    sim.call(ALICE, 'addLiquidity', [10n, 10n]);
    expect(sim.ledger.reserveAKD).toBe(10n);
  });

  it('assert L382 "liquidity already seeded"', () => {
    const sim = AkadSim.deploy();
    sim.call(DEPLOYER, 'addLiquidity', [X_AKD, Y_NIGHT]);
    expect(() => sim.call(DEPLOYER, 'addLiquidity', [1n, 1n])).toThrow(failedAssert('liquidity already seeded'));
  });

  it('assert L383 "amounts must be positive" (AKD side)', () => {
    expect(() => AkadSim.deploy().call(DEPLOYER, 'addLiquidity', [0n, 1n])).toThrow(
      failedAssert('amounts must be positive')
    );
  });

  it('assert L383 "amounts must be positive" (tNIGHT side)', () => {
    expect(() => AkadSim.deploy().call(DEPLOYER, 'addLiquidity', [1n, 0n])).toThrow(
      failedAssert('amounts must be positive')
    );
  });

  it('assert L388 "amountAKD exceeds safe bound"', () => {
    expect(() => AkadSim.deploy().call(DEPLOYER, 'addLiquidity', [SAFE_BOUND + 1n, 1n])).toThrow(
      failedAssert('amountAKD exceeds safe bound')
    );
  });

  it('assert L389 "amountNight exceeds safe bound"', () => {
    expect(() => AkadSim.deploy().call(DEPLOYER, 'addLiquidity', [1n, SAFE_BOUND + 1n])).toThrow(
      failedAssert('amountNight exceeds safe bound')
    );
  });

  it('assert L393 "insufficient AKD balance to seed pool"', () => {
    expect(() => AkadSim.deploy().call(ALICE, 'addLiquidity', [1n, 1n])).toThrow(
      failedAssert('insufficient AKD balance to seed pool')
    );
  });
});

describe('swapAkdToNight L420-L456', () => {
  const dx = 10_000n;
  const dy = computeSwapOutput(X_AKD, Y_NIGHT, dx);

  it('takes dx AKD into the pool account and pays dy tNIGHT from custody to the recipient', () => {
    const sim = tradingPool();
    const result = sim.call(ALICE, 'swapAkdToNight', [dx, dy, dy, ALICE_UNSHIELDED]);
    expect([sim.ledger.reserveAKD, sim.ledger.reserveNight]).toEqual([X_AKD + dx, Y_NIGHT - dy]);
    expect(sim.balanceOf(keyOf(ALICE))).toBe(1_000_000n - dx);
    expect(sim.balanceOf(POOL_KEY)).toBe(X_AKD + dx);
    expect([result.nightIn, result.nightOut]).toEqual([0n, dy]);
    expect(result.nightPaidTo.get(hex(ALICE_UNSHIELDED.bytes))).toBe(dy);
    expect(sim.custody).toBe(Y_NIGHT - dy);
  });

  it('assert L424 "pool not initialized"', () => {
    const sim = AkadSim.deploy();
    expect(() => sim.call(DEPLOYER, 'swapAkdToNight', [dx, 1n, 0n, ALICE_UNSHIELDED])).toThrow(
      failedAssert('pool not initialized')
    );
  });

  it('assert L425 "amount must be positive"', () => {
    expect(() => tradingPool().call(ALICE, 'swapAkdToNight', [0n, 1n, 0n, ALICE_UNSHIELDED])).toThrow(
      failedAssert('amount must be positive')
    );
  });

  it('assert L426 "output rounds to zero"', () => {
    expect(() => tradingPool().call(ALICE, 'swapAkdToNight', [dx, 0n, 0n, ALICE_UNSHIELDED])).toThrow(
      failedAssert('output rounds to zero')
    );
  });

  it('assert L427 "slippage: insufficient output"', () => {
    expect(() => tradingPool().call(ALICE, 'swapAkdToNight', [dx, dy, dy + 1n, ALICE_UNSHIELDED])).toThrow(
      failedAssert('slippage: insufficient output')
    );
  });

  it('assert L428 "cannot drain full reserve"', () => {
    expect(() => tradingPool().call(ALICE, 'swapAkdToNight', [dx, Y_NIGHT, 0n, ALICE_UNSHIELDED])).toThrow(
      failedAssert('cannot drain full reserve')
    );
  });

  it('assert L429 "reserveAKD exceeds safe bound"', () => {
    const sim = tradingPool();
    sim.call(DEPLOYER, 'transfer', [keyOf(ALICE), SAFE_BOUND]);
    const edge = SAFE_BOUND - X_AKD;
    expect(() => sim.call(ALICE, 'swapAkdToNight', [edge + 1n, 1n, 0n, ALICE_UNSHIELDED])).toThrow(
      failedAssert('reserveAKD exceeds safe bound')
    );
    sim.call(ALICE, 'swapAkdToNight', [edge, 1n, 0n, ALICE_UNSHIELDED]);
    expect(sim.ledger.reserveAKD).toBe(SAFE_BOUND);
  });

  // Unreachable through circuit calls: every circuit that raises reserveNight
  // bounds it first (L389, L470, L638). The cell is set directly.
  it('assert L430 "reserveNight exceeds safe bound"', () => {
    const sim = tradingPool();
    sim.injectCell('reserveNight', SAFE_BOUND + 1n);
    expect(() => sim.call(ALICE, 'swapAkdToNight', [dx, 1n, 0n, ALICE_UNSHIELDED])).toThrow(
      failedAssert('reserveNight exceeds safe bound')
    );
  });

  it('assert L431 "pool has insufficient tNIGHT custody for this swap"', () => {
    const sim = tradingPool();
    sim.setCustody(dy - 1n);
    expect(() => sim.call(ALICE, 'swapAkdToNight', [dx, dy, dy, ALICE_UNSHIELDED])).toThrow(
      failedAssert('pool has insufficient tNIGHT custody for this swap')
    );
  });

  it('assert L438 "invalid swap: violates constant product invariant"', () => {
    expect(() => tradingPool().call(ALICE, 'swapAkdToNight', [dx, dy + 1n, 0n, ALICE_UNSHIELDED])).toThrow(
      failedAssert('invalid swap: violates constant product invariant')
    );
  });

  it('assert L442 "insufficient AKD balance for swap"', () => {
    expect(() => tradingPool().call(BOB, 'swapAkdToNight', [dx, dy, dy, ALICE_UNSHIELDED])).toThrow(
      failedAssert('insufficient AKD balance for swap')
    );
  });
});

describe('swapNightToAkd L461-L501', () => {
  const dx = 20_000n;
  const dy = computeSwapOutput(Y_NIGHT, X_AKD, dx);

  it('pulls dx tNIGHT into custody and credits dy AKD from the pool account to the caller', () => {
    const sim = tradingPool();
    const result = sim.call(BOB, 'swapNightToAkd', [dx, dy, dy]);
    expect([sim.ledger.reserveNight, sim.ledger.reserveAKD]).toEqual([Y_NIGHT + dx, X_AKD - dy]);
    expect(sim.balanceOf(keyOf(BOB))).toBe(dy);
    expect(sim.balanceOf(POOL_KEY)).toBe(X_AKD - dy);
    expect([result.nightIn, result.nightOut]).toEqual([dx, 0n]);
    expect(sim.custody).toBe(Y_NIGHT + dx);
  });

  it('assert L465 "pool not initialized"', () => {
    expect(() => AkadSim.deploy().call(BOB, 'swapNightToAkd', [dx, 1n, 0n])).toThrow(
      failedAssert('pool not initialized')
    );
  });

  it('assert L466 "amount must be positive"', () => {
    expect(() => tradingPool().call(BOB, 'swapNightToAkd', [0n, 1n, 0n])).toThrow(
      failedAssert('amount must be positive')
    );
  });

  it('assert L467 "output rounds to zero"', () => {
    expect(() => tradingPool().call(BOB, 'swapNightToAkd', [dx, 0n, 0n])).toThrow(
      failedAssert('output rounds to zero')
    );
  });

  it('assert L468 "slippage: insufficient output"', () => {
    expect(() => tradingPool().call(BOB, 'swapNightToAkd', [dx, dy, dy + 1n])).toThrow(
      failedAssert('slippage: insufficient output')
    );
  });

  it('assert L469 "cannot drain full reserve"', () => {
    expect(() => tradingPool().call(BOB, 'swapNightToAkd', [dx, X_AKD, 0n])).toThrow(
      failedAssert('cannot drain full reserve')
    );
  });

  it('assert L470 "reserveNight exceeds safe bound"', () => {
    const sim = tradingPool();
    const edge = SAFE_BOUND - Y_NIGHT;
    expect(() => sim.call(BOB, 'swapNightToAkd', [edge + 1n, 1n, 0n])).toThrow(
      failedAssert('reserveNight exceeds safe bound')
    );
    sim.call(BOB, 'swapNightToAkd', [edge, 1n, 0n]);
    expect(sim.ledger.reserveNight).toBe(SAFE_BOUND);
  });

  // Unreachable through circuit calls: every circuit that raises reserveAKD
  // bounds it first (L388, L429, L590). The cell is set directly.
  it('assert L471 "reserveAKD exceeds safe bound"', () => {
    const sim = tradingPool();
    sim.injectCell('reserveAKD', SAFE_BOUND + 1n);
    expect(() => sim.call(BOB, 'swapNightToAkd', [dx, 1n, 0n])).toThrow(failedAssert('reserveAKD exceeds safe bound'));
  });

  it('assert L478 "invalid swap: violates constant product invariant"', () => {
    expect(() => tradingPool().call(BOB, 'swapNightToAkd', [dx, dy + 1n, 0n])).toThrow(
      failedAssert('invalid swap: violates constant product invariant')
    );
  });

  // Unreachable through circuit calls: the pool account starts at reserveAKD
  // and moves with it, and dy < reserveAKD (L469). The balance is set
  // directly.
  it('assert L482 "pool has insufficient AKD custody for this swap"', () => {
    const sim = tradingPool();
    sim.injectBalance(POOL_KEY, dy - 1n);
    expect(() => sim.call(BOB, 'swapNightToAkd', [dx, dy, dy])).toThrow(
      failedAssert('pool has insufficient AKD custody for this swap')
    );
  });
});
