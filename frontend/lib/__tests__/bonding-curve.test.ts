import { describe, it, expect } from 'vitest';
import { computeSwapOutput, applySlippage } from '../bonding-curve';

describe('computeSwapOutput (constant product formula)', () => {
  it('computes correct output for a standard swap', () => {
    // Pool: 1000 AKD / 1000 tNIGHT. Swap in 100 AKD.
    // dy = (1000 * 100) / (1000 + 100) = 90.909... -> floor to 90
    const result = computeSwapOutput(1000n, 1000n, 100n);
    expect(result).toBe(90n);
  });

  it('throws when the pool has no liquidity', () => {
    expect(() => computeSwapOutput(0n, 1000n, 100n)).toThrow('pool not initialized');
    expect(() => computeSwapOutput(1000n, 0n, 100n)).toThrow('pool not initialized');
  });

  it('throws when the swap would drain the entire opposite reserve', () => {
    // A massive input relative to reserves should round close to (but never reach) reserveOut.
    expect(() => computeSwapOutput(1n, 1000n, 1000000000n)).not.toThrow();
    const nearlyDrained = computeSwapOutput(1n, 1000n, 1000000000n);
    expect(nearlyDrained).toBeLessThan(1000n);
  });
});

describe('applySlippage', () => {
  it('reduces the amount by the given basis points', () => {
    // 1000 with 0.5% (50 bps) slippage tolerance -> 995
    expect(applySlippage(1000n, 50)).toBe(995n);
  });

  it('returns the same amount at 0 bps slippage', () => {
    expect(applySlippage(1000n, 0)).toBe(1000n);
  });
});
