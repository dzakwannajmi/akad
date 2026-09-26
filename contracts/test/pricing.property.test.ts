// L2 property tests for the v1 quote, computeSwapOutput() in
// frontend/lib/bonding-curve.ts, against the checks every v1 swap circuit
// asserts, plus an L3 cross-check that the circuits accept exactly the quote.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applySlippage, computeSwapOutput } from '../../frontend/lib/bonding-curve.ts';
import { ALICE, ALICE_UNSHIELDED, DEPLOYER, SAFE_BOUND, failedAssert, keyOf, seededPool } from './harness.js';
import { propertyConfig } from './property-config.js';

const U64 = 2n ** 64n;

/**
 * A pool and an input inside the bounds the swap circuits assert:
 * 0 < x, 0 < y <= 4e9, 0 < dx and x + dx <= 4e9 (e.g. L424-L430).
 */
const trade = fc
  .bigInt({ min: 1n, max: SAFE_BOUND - 1n })
  .chain((x) =>
    fc.record({
      x: fc.constant(x),
      y: fc.bigInt({ min: 1n, max: SAFE_BOUND }),
      dx: fc.bigInt({ min: 1n, max: SAFE_BOUND - x }),
    })
  );

const keepsInvariant = (x: bigint, y: bigint, dx: bigint, dy: bigint): boolean => (x + dx) * (y - dy) >= x * y;

describe('computeSwapOutput against the constant-product checks', () => {
  it('returns an output that keeps the invariant, or refuses when the output rounds to zero', () => {
    fc.assert(
      fc.property(trade, ({ x, y, dx }) => {
        if (y * dx < x + dx) {
          expect(() => computeSwapOutput(x, y, dx)).toThrow('output rounds to zero');
          return;
        }
        expect(keepsInvariant(x, y, dx, computeSwapOutput(x, y, dx))).toBe(true);
      }),
      propertyConfig(2000)
    );
  });

  it('returns the largest output the invariant allows, so rounding favours the pool', () => {
    fc.assert(
      fc.property(trade, ({ x, y, dx }) => {
        fc.pre(y * dx >= x + dx);
        const dy = computeSwapOutput(x, y, dx);
        expect(keepsInvariant(x, y, dx, dy + 1n)).toBe(false);
      }),
      propertyConfig(2000)
    );
  });

  it('never drains the reserve', () => {
    fc.assert(
      fc.property(trade, ({ x, y, dx }) => {
        fc.pre(y * dx >= x + dx);
        expect(computeSwapOutput(x, y, dx) < y).toBe(true);
      }),
      propertyConfig(2000)
    );
  });

  it('keeps both invariant products below 2^64 inside the asserted bounds (comment at L384-L387)', () => {
    fc.assert(
      fc.property(trade, ({ x, y, dx }) => {
        expect((x + dx) * y < U64).toBe(true);
        expect(x * y < U64).toBe(true);
      }),
      propertyConfig(2000)
    );
  });

  it('applySlippage never raises the minimum above the quote', () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 1n, max: SAFE_BOUND }), fc.integer({ min: 0, max: 10_000 }), (amountOut, bps) => {
        const minOut = applySlippage(amountOut, bps);
        expect(minOut >= 0n && minOut <= amountOut).toBe(true);
        if (bps === 0) expect(minOut).toBe(amountOut);
      }),
      propertyConfig(2000)
    );
  });
});

describe('the swap circuits accept exactly the quote', () => {
  it('swapAkdToNight L420-L456 accepts dy from the quote and rejects dy + 1', () => {
    fc.assert(
      fc.property(trade, ({ x, y, dx }) => {
        const sim = seededPool({ akd: x, night: y });
        sim.call(DEPLOYER, 'transfer', [keyOf(ALICE), dx]);
        if (y * dx < x + dx) {
          expect(() => sim.call(ALICE, 'swapAkdToNight', [dx, 0n, 0n, ALICE_UNSHIELDED])).toThrow(
            failedAssert('output rounds to zero')
          );
          return;
        }
        const dy = computeSwapOutput(x, y, dx);
        const rejection = dy + 1n === y ? 'cannot drain full reserve' : 'invalid swap: violates constant product invariant';
        expect(() => sim.call(ALICE, 'swapAkdToNight', [dx, dy + 1n, 0n, ALICE_UNSHIELDED])).toThrow(failedAssert(rejection));
        sim.call(ALICE, 'swapAkdToNight', [dx, dy, dy, ALICE_UNSHIELDED]);
        expect([sim.ledger.reserveAKD, sim.ledger.reserveNight]).toEqual([x + dx, y - dy]);
      }),
      propertyConfig(100)
    );
  });

  it('swapNightToAkd L461-L501 accepts dy from the quote and rejects dy + 1', () => {
    fc.assert(
      fc.property(trade, ({ x, y, dx }) => {
        const sim = seededPool({ akd: y, night: x });
        if (y * dx < x + dx) {
          expect(() => sim.call(ALICE, 'swapNightToAkd', [dx, 0n, 0n])).toThrow(failedAssert('output rounds to zero'));
          return;
        }
        const dy = computeSwapOutput(x, y, dx);
        const rejection = dy + 1n === y ? 'cannot drain full reserve' : 'invalid swap: violates constant product invariant';
        expect(() => sim.call(ALICE, 'swapNightToAkd', [dx, dy + 1n, 0n])).toThrow(failedAssert(rejection));
        sim.call(ALICE, 'swapNightToAkd', [dx, dy, dy]);
        expect([sim.ledger.reserveNight, sim.ledger.reserveAKD]).toEqual([x + dx, y - dy]);
      }),
      propertyConfig(100)
    );
  });
});
