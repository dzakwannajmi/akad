// English comments per code convention; explanations to the user stay in Indonesian.
//
// Mirrors the constant-product formula enforced on-chain in swap.compact:
// dy = (y * dx) / (x + dx), with the same guard checks. This MUST be called
// client-side to compute dy before submitting a swap transaction — the
// circuit only verifies the result, it doesn't compute it (Compact has no
// division operator).

export function computeSwapOutput(reserveIn: bigint, reserveOut: bigint, amountIn: bigint): bigint {
  if (reserveIn <= 0n || reserveOut <= 0n) {
    throw new Error('pool not initialized');
  }
  if (amountIn <= 0n) {
    throw new Error('amount must be positive');
  }

  const amountOut = (reserveOut * amountIn) / (reserveIn + amountIn);

  if (amountOut <= 0n) {
    throw new Error('output rounds to zero');
  }
  if (amountOut >= reserveOut) {
    throw new Error('cannot drain full reserve');
  }

  return amountOut;
}

// Applies slippage tolerance (in basis points, e.g. 50 = 0.5%) to get minOut.
export function applySlippage(amountOut: bigint, slippageBps: number): bigint {
  const bps = BigInt(slippageBps);
  return (amountOut * (10000n - bps)) / 10000n;
}
