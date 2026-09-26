// Runs random sequences of v1 trades, wraps and redemptions, and checks the
// accounting identities akad.compact states after every step:
//
//   tNIGHT custody            == reserveNight + sNightSupply   (L141-L154)
//   sNightSupply              == sNIGHT coins in circulation
//   sum(balances) + AKD coins == totalSupply
//   balances[poolKey()]       == reserveAKD
//
// Custody is the harness model: it moves only by each call's unshielded
// inputs and outputs, as the chain applies them.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { computeSwapOutput } from '../../frontend/lib/bonding-curve.ts';
import {
  ALICE,
  ALICE_UNSHIELDED,
  DEPLOYER,
  POOL_KEY,
  SAFE_BOUND,
  hex,
  keyOf,
  seededPool,
  type AkadSim,
  type CallResult,
  type Coin,
} from './harness.js';
import { propertyConfig } from './property-config.js';

type Step =
  | { kind: 'swapAkdToNight' | 'swapNightToAkd' | 'wrap'; permille: number }
  | { kind: 'unwrap' | 'shieldedSwapAkdToNight' | 'shieldedSwapNightToAkd' | 'unwrapNight'; pick: number };

const permille = fc.integer({ min: 1, max: 1000 });
const pick = fc.nat();
// Coin-spending steps are weighted up: they only apply once a coin exists.
const step: fc.Arbitrary<Step> = fc.oneof(
  {
    weight: 1,
    arbitrary: fc.record({
      kind: fc.constantFrom('swapAkdToNight' as const, 'swapNightToAkd' as const, 'wrap' as const),
      permille,
    }),
  },
  {
    weight: 2,
    arbitrary: fc.record({
      kind: fc.constantFrom(
        'unwrap' as const,
        'shieldedSwapAkdToNight' as const,
        'shieldedSwapNightToAkd' as const,
        'unwrapNight' as const
      ),
      pick,
    }),
  }
);

type Wallet = { akd: Coin[]; sNight: Coin[] };

function sum(values: Iterable<bigint>): bigint {
  let total = 0n;
  for (const value of values) total += value;
  return total;
}

function min(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

function scaled(max: bigint, perMille: number): bigint {
  const amount = (max * BigInt(perMille)) / 1000n;
  return amount > 0n ? amount : 1n;
}

function quote(x: bigint, y: bigint, dx: bigint): bigint | null {
  if (y * dx < x + dx || x + dx > SAFE_BOUND) return null;
  return computeSwapOutput(x, y, dx);
}

function take(coins: Coin[], index: number): Coin | undefined {
  return coins.length === 0 ? undefined : coins.splice(index % coins.length, 1)[0];
}

function collect(result: CallResult, sim: AkadSim, wallet: Wallet): void {
  for (const output of result.outputs) {
    if (!output.recipient.is_left || hex(output.recipient.left.bytes) !== ALICE) continue;
    const color = hex(output.coinInfo.color);
    if (color === hex(sim.ledger.tokenColor)) wallet.akd.push(output.coinInfo);
    else if (color === hex(sim.ledger.sNightColor)) wallet.sNight.push(output.coinInfo);
  }
}

/** Runs one step if it is valid in the current state; returns false when skipped. */
function apply(sim: AkadSim, wallet: Wallet, next: Step): boolean {
  const { reserveAKD: akd, reserveNight: night } = sim.ledger;
  const call = (run: () => CallResult): boolean => {
    collect(run(), sim, wallet);
    return true;
  };
  switch (next.kind) {
    case 'swapAkdToNight': {
      const dx = scaled(min(sim.balanceOf(keyOf(ALICE)), SAFE_BOUND - akd), next.permille);
      const dy = quote(akd, night, dx);
      return dy !== null && call(() => sim.call(ALICE, 'swapAkdToNight', [dx, dy, dy, ALICE_UNSHIELDED]));
    }
    case 'swapNightToAkd': {
      const dx = scaled(SAFE_BOUND - night, next.permille);
      const dy = quote(night, akd, dx);
      return dy !== null && call(() => sim.call(ALICE, 'swapNightToAkd', [dx, dy, dy]));
    }
    case 'wrap': {
      // Coins sized to fit the pool's headroom, so later shielded swaps can use them.
      const balance = sim.balanceOf(keyOf(ALICE));
      const amount = scaled(min(balance, (SAFE_BOUND - akd) / 4n), next.permille);
      return balance > 0n && call(() => sim.call(ALICE, 'wrap', [amount]));
    }
    case 'unwrap': {
      const coin = take(wallet.akd, next.pick);
      return coin !== undefined && call(() => sim.call(ALICE, 'unwrap', [], coin));
    }
    case 'shieldedSwapAkdToNight': {
      const coin = take(wallet.akd, next.pick);
      const dy = coin === undefined ? null : quote(akd, night, coin.value);
      if (coin !== undefined && dy === null) wallet.akd.push(coin);
      return coin !== undefined && dy !== null && call(() => sim.call(ALICE, 'shieldedSwapAkdToNight', [dy, dy], coin));
    }
    case 'shieldedSwapNightToAkd': {
      const coin = take(wallet.sNight, next.pick);
      const dy = coin === undefined ? null : quote(night, akd, coin.value);
      if (coin !== undefined && dy === null) wallet.sNight.push(coin);
      return coin !== undefined && dy !== null && call(() => sim.call(ALICE, 'shieldedSwapNightToAkd', [dy, dy], coin));
    }
    case 'unwrapNight': {
      const coin = take(wallet.sNight, next.pick);
      return coin !== undefined && call(() => sim.call(ALICE, 'unwrapNight', [ALICE_UNSHIELDED], coin));
    }
  }
}

function expectBooksBalance(sim: AkadSim, wallet: Wallet): void {
  const ledger = sim.ledger;
  expect(sim.custody).toBe(ledger.reserveNight + ledger.sNightSupply);
  expect(ledger.sNightSupply).toBe(sum(wallet.sNight.map((coin) => coin.value)));
  const publicAkd = sum([...ledger.balances].map(([, amount]) => amount));
  expect(publicAkd + sum(wallet.akd.map((coin) => coin.value))).toBe(ledger.totalSupply);
  expect(sim.balanceOf(POOL_KEY)).toBe(ledger.reserveAKD);
}

describe('v1 accounting identities under random operation sequences', () => {
  it('custody, sNIGHT supply and AKD supply stay covered after every step', () => {
    fc.assert(
      fc.property(
        fc.record({
          akd: fc.bigInt({ min: 1_000n, max: SAFE_BOUND / 2n }),
          night: fc.bigInt({ min: 1_000n, max: SAFE_BOUND / 2n }),
        }),
        fc.array(step, { minLength: 1, maxLength: 25 }),
        (reserves, steps) => {
          const sim = seededPool(reserves);
          sim.call(DEPLOYER, 'transfer', [keyOf(ALICE), SAFE_BOUND]);
          const wallet: Wallet = { akd: [], sNight: [] };
          expectBooksBalance(sim, wallet);
          for (const next of steps) {
            if (apply(sim, wallet, next)) expectBooksBalance(sim, wallet);
          }
        }
      ),
      propertyConfig(100)
    );
  });
});
