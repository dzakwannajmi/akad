// L3 tests for the shielded path of akad.compact (v1): unwrapNight,
// shieldedSwapAkdToNight and shieldedSwapNightToAkd. Coins spent here come
// from real circuit outputs (wrap and the shielded swaps) unless a test says
// otherwise.
import { describe, expect, it } from 'vitest';
import { computeSwapOutput } from '../../frontend/lib/bonding-curve.ts';
import {
  ALICE,
  ALICE_UNSHIELDED,
  AkadSim,
  CONTRACT_ADDRESS,
  DEPLOYER,
  POOL_KEY,
  SAFE_BOUND,
  failedAssert,
  hex,
  keyOf,
  seededPool,
  type CallResult,
  type Coin,
} from './harness.js';

const X_AKD = 1_000_000n;
const Y_NIGHT = 2_000_000n;
const DX_AKD = 10_000n;

function mintedTo(result: CallResult, coinPublicKey: string): Coin {
  const output = result.outputs.find((o) => o.recipient.is_left && hex(o.recipient.left.bytes) === coinPublicKey);
  if (output === undefined) throw new Error('no coin minted to that key');
  return output.coinInfo;
}

/** A seeded pool where ALICE holds one AKD coin worth DX_AKD. */
function withAkdCoin(): { sim: AkadSim; akd: Coin } {
  const sim = seededPool({ akd: X_AKD, night: Y_NIGHT });
  sim.call(DEPLOYER, 'transfer', [keyOf(ALICE), 100_000n]);
  const akd = mintedTo(sim.call(ALICE, 'wrap', [DX_AKD]), ALICE);
  return { sim, akd };
}

/** Same pool after ALICE swapped her AKD coin for an sNIGHT coin. */
function withSNightCoin(): { sim: AkadSim; sNight: Coin } {
  const { sim, akd } = withAkdCoin();
  const dy = computeSwapOutput(X_AKD, Y_NIGHT, DX_AKD);
  const sNight = mintedTo(sim.call(ALICE, 'shieldedSwapAkdToNight', [dy, dy], akd), ALICE);
  return { sim, sNight };
}

describe('shieldedSwapAkdToNight L576-L621', () => {
  const dy = computeSwapOutput(X_AKD, Y_NIGHT, DX_AKD);

  it('receives the AKD coin, moves the reserves and mints an sNIGHT coin, with no address and no tNIGHT', () => {
    const { sim, akd } = withAkdCoin();
    const custody = sim.custody;
    const result = sim.call(ALICE, 'shieldedSwapAkdToNight', [dy, dy], akd);
    expect([sim.ledger.reserveAKD, sim.ledger.reserveNight]).toEqual([X_AKD + DX_AKD, Y_NIGHT - dy]);
    expect(sim.balanceOf(POOL_KEY)).toBe(X_AKD + DX_AKD);
    expect(sim.ledger.sNightSupply).toBe(dy);
    const sNight = mintedTo(result, ALICE);
    expect([hex(sNight.color), sNight.value]).toEqual([hex(sim.ledger.sNightColor), dy]);
    const received = result.outputs.find((o) => !o.recipient.is_left);
    expect(hex(received?.recipient.right.bytes ?? new Uint8Array())).toBe(CONTRACT_ADDRESS);
    expect(result.effects.claimedShieldedReceives).toHaveLength(1);
    expect([result.nightIn, result.nightOut, result.nightPaidTo.size]).toEqual([0n, 0n, 0]);
    expect(sim.custody).toBe(custody);
  });

  it('assert L578 "wrong token color"', () => {
    const { sim } = withAkdCoin();
    expect(() => sim.call(ALICE, 'shieldedSwapAkdToNight', [dy, dy], sim.coin(sim.ledger.sNightColor, DX_AKD))).toThrow(
      failedAssert('wrong token color')
    );
  });

  it('assert L581 "amount must be positive"', () => {
    const { sim } = withAkdCoin();
    expect(() => sim.call(ALICE, 'shieldedSwapAkdToNight', [1n, 0n], sim.coin(sim.ledger.tokenColor, 0n))).toThrow(
      failedAssert('amount must be positive')
    );
  });

  it('assert L586 "pool not initialized"', () => {
    const sim = AkadSim.deploy();
    sim.call(DEPLOYER, 'recordTokenColor', []);
    const akd = mintedTo(sim.call(DEPLOYER, 'wrap', [DX_AKD]), DEPLOYER);
    expect(() => sim.call(DEPLOYER, 'shieldedSwapAkdToNight', [1n, 0n], akd)).toThrow(failedAssert('pool not initialized'));
  });

  it('assert L587 "output rounds to zero"', () => {
    const { sim, akd } = withAkdCoin();
    expect(() => sim.call(ALICE, 'shieldedSwapAkdToNight', [0n, 0n], akd)).toThrow(failedAssert('output rounds to zero'));
  });

  it('assert L588 "slippage: insufficient output"', () => {
    const { sim, akd } = withAkdCoin();
    expect(() => sim.call(ALICE, 'shieldedSwapAkdToNight', [dy, dy + 1n], akd)).toThrow(
      failedAssert('slippage: insufficient output')
    );
  });

  it('assert L589 "cannot drain full reserve"', () => {
    const { sim, akd } = withAkdCoin();
    expect(() => sim.call(ALICE, 'shieldedSwapAkdToNight', [Y_NIGHT, 0n], akd)).toThrow(
      failedAssert('cannot drain full reserve')
    );
  });

  it('assert L590 "reserveAKD exceeds safe bound"', () => {
    const { sim } = withAkdCoin();
    sim.call(DEPLOYER, 'transfer', [keyOf(ALICE), SAFE_BOUND]);
    const big = mintedTo(sim.call(ALICE, 'wrap', [SAFE_BOUND - X_AKD + 1n]), ALICE);
    expect(() => sim.call(ALICE, 'shieldedSwapAkdToNight', [1n, 0n], big)).toThrow(
      failedAssert('reserveAKD exceeds safe bound')
    );
  });

  // Unreachable through circuit calls (see pool.test.ts, assert L430).
  it('assert L591 "reserveNight exceeds safe bound"', () => {
    const { sim, akd } = withAkdCoin();
    sim.injectCell('reserveNight', SAFE_BOUND + 1n);
    expect(() => sim.call(ALICE, 'shieldedSwapAkdToNight', [1n, 0n], akd)).toThrow(
      failedAssert('reserveNight exceeds safe bound')
    );
  });

  it('assert L598 "invalid swap: violates constant product invariant"', () => {
    const { sim, akd } = withAkdCoin();
    expect(() => sim.call(ALICE, 'shieldedSwapAkdToNight', [dy + 1n, 0n], akd)).toThrow(
      failedAssert('invalid swap: violates constant product invariant')
    );
  });
});

describe('shieldedSwapNightToAkd L624-L670', () => {
  const x = Y_NIGHT - computeSwapOutput(X_AKD, Y_NIGHT, DX_AKD);
  const y = X_AKD + DX_AKD;

  it('receives the sNIGHT coin, returns it to the reserve and mints an AKD coin from the pool account', () => {
    const { sim, sNight } = withSNightCoin();
    const custody = sim.custody;
    const dy = computeSwapOutput(x, y, sNight.value);
    const result = sim.call(ALICE, 'shieldedSwapNightToAkd', [dy, dy], sNight);
    expect(sim.ledger.sNightSupply).toBe(0n);
    expect([sim.ledger.reserveNight, sim.ledger.reserveAKD]).toEqual([x + sNight.value, y - dy]);
    expect(sim.balanceOf(POOL_KEY)).toBe(y - dy);
    const akd = mintedTo(result, ALICE);
    expect([hex(akd.color), akd.value]).toEqual([hex(sim.ledger.tokenColor), dy]);
    expect(result.effects.claimedShieldedReceives).toHaveLength(1);
    expect([result.nightIn, result.nightOut, result.nightPaidTo.size]).toEqual([0n, 0n, 0]);
    expect(sim.custody).toBe(custody);
  });

  it('assert L626 "wrong token color"', () => {
    const { sim, sNight } = withSNightCoin();
    expect(() => sim.call(ALICE, 'shieldedSwapNightToAkd', [1n, 0n], sim.coin(sim.ledger.tokenColor, sNight.value))).toThrow(
      failedAssert('wrong token color')
    );
  });

  it('assert L629 "amount must be positive"', () => {
    const { sim } = withSNightCoin();
    expect(() => sim.call(ALICE, 'shieldedSwapNightToAkd', [1n, 0n], sim.coin(sim.ledger.sNightColor, 0n))).toThrow(
      failedAssert('amount must be positive')
    );
  });

  // No pool means no sNIGHT was ever minted, so the coin here is supplied
  // through the witness with the recorded sNIGHT color.
  it('assert L634 "pool not initialized"', () => {
    const sim = AkadSim.deploy();
    sim.call(DEPLOYER, 'recordTokenColor', []);
    expect(() => sim.call(ALICE, 'shieldedSwapNightToAkd', [1n, 0n], sim.coin(sim.ledger.sNightColor, 5n))).toThrow(
      failedAssert('pool not initialized')
    );
  });

  it('assert L635 "output rounds to zero"', () => {
    const { sim, sNight } = withSNightCoin();
    expect(() => sim.call(ALICE, 'shieldedSwapNightToAkd', [0n, 0n], sNight)).toThrow(failedAssert('output rounds to zero'));
  });

  it('assert L636 "slippage: insufficient output"', () => {
    const { sim, sNight } = withSNightCoin();
    const dy = computeSwapOutput(x, y, sNight.value);
    expect(() => sim.call(ALICE, 'shieldedSwapNightToAkd', [dy, dy + 1n], sNight)).toThrow(
      failedAssert('slippage: insufficient output')
    );
  });

  it('assert L637 "cannot drain full reserve"', () => {
    const { sim, sNight } = withSNightCoin();
    expect(() => sim.call(ALICE, 'shieldedSwapNightToAkd', [y, 0n], sNight)).toThrow(failedAssert('cannot drain full reserve'));
  });

  // An sNIGHT coin this large cannot exist: sNIGHT is only minted out of
  // reserveNight, which never exceeds the bound. The witness supplies it.
  it('assert L638 "reserveNight exceeds safe bound"', () => {
    const { sim } = withSNightCoin();
    const big = sim.coin(sim.ledger.sNightColor, SAFE_BOUND - x + 1n);
    expect(() => sim.call(ALICE, 'shieldedSwapNightToAkd', [1n, 0n], big)).toThrow(
      failedAssert('reserveNight exceeds safe bound')
    );
  });

  // Unreachable through circuit calls (see pool.test.ts, assert L471).
  it('assert L639 "reserveAKD exceeds safe bound"', () => {
    const { sim, sNight } = withSNightCoin();
    sim.injectCell('reserveAKD', SAFE_BOUND + 1n);
    expect(() => sim.call(ALICE, 'shieldedSwapNightToAkd', [1n, 0n], sNight)).toThrow(
      failedAssert('reserveAKD exceeds safe bound')
    );
  });

  it('assert L646 "invalid swap: violates constant product invariant"', () => {
    const { sim, sNight } = withSNightCoin();
    const dy = computeSwapOutput(x, y, sNight.value);
    expect(() => sim.call(ALICE, 'shieldedSwapNightToAkd', [dy + 1n, 0n], sNight)).toThrow(
      failedAssert('invalid swap: violates constant product invariant')
    );
  });

  // Unreachable through circuit calls (see pool.test.ts, assert L482).
  it('assert L650 "pool has insufficient AKD custody for this swap"', () => {
    const { sim, sNight } = withSNightCoin();
    const dy = computeSwapOutput(x, y, sNight.value);
    sim.injectBalance(POOL_KEY, dy - 1n);
    expect(() => sim.call(ALICE, 'shieldedSwapNightToAkd', [dy, dy], sNight)).toThrow(
      failedAssert('pool has insufficient AKD custody for this swap')
    );
  });

  // sNIGHT coins in circulation never exceed sNightSupply, so the coin
  // worth one more than the supply is supplied through the witness.
  it('assert L653 "sNIGHT supply accounting underflow"', () => {
    const { sim, sNight } = withSNightCoin();
    const value = sNight.value + 1n;
    const dy = computeSwapOutput(x, y, value);
    expect(() => sim.call(ALICE, 'shieldedSwapNightToAkd', [dy, dy], sim.coin(sim.ledger.sNightColor, value))).toThrow(
      failedAssert('sNIGHT supply accounting underflow')
    );
  });
});

describe('unwrapNight L538-L554', () => {
  it('receives the sNIGHT coin and pays its value in tNIGHT from custody to the recipient', () => {
    const { sim, sNight } = withSNightCoin();
    const custody = sim.custody;
    const result = sim.call(ALICE, 'unwrapNight', [ALICE_UNSHIELDED], sNight);
    expect(sim.ledger.sNightSupply).toBe(0n);
    expect([result.nightIn, result.nightOut]).toEqual([0n, sNight.value]);
    expect(result.nightPaidTo.get(hex(ALICE_UNSHIELDED.bytes))).toBe(sNight.value);
    expect(result.effects.claimedShieldedReceives).toHaveLength(1);
    expect(sim.custody).toBe(custody - sNight.value);
  });

  it('assert L540 "wrong token color"', () => {
    const { sim, sNight } = withSNightCoin();
    expect(() => sim.call(ALICE, 'unwrapNight', [ALICE_UNSHIELDED], sim.coin(sim.ledger.tokenColor, sNight.value))).toThrow(
      failedAssert('wrong token color')
    );
  });

  it('assert L543 "amount must be positive"', () => {
    const { sim } = withSNightCoin();
    expect(() => sim.call(ALICE, 'unwrapNight', [ALICE_UNSHIELDED], sim.coin(sim.ledger.sNightColor, 0n))).toThrow(
      failedAssert('amount must be positive')
    );
  });

  // Same witness-supplied coin as assert L653.
  it('assert L546 "sNIGHT supply accounting underflow"', () => {
    const { sim, sNight } = withSNightCoin();
    expect(() =>
      sim.call(ALICE, 'unwrapNight', [ALICE_UNSHIELDED], sim.coin(sim.ledger.sNightColor, sNight.value + 1n))
    ).toThrow(failedAssert('sNIGHT supply accounting underflow'));
  });

  it('assert L547 "contract has insufficient tNIGHT custody to redeem this coin"', () => {
    const { sim, sNight } = withSNightCoin();
    sim.setCustody(sNight.value - 1n);
    expect(() => sim.call(ALICE, 'unwrapNight', [ALICE_UNSHIELDED], sNight)).toThrow(
      failedAssert('contract has insufficient tNIGHT custody to redeem this coin')
    );
  });
});
