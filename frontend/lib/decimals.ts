// AKD's decimal convention, established in contracts/src/akad.compact: the
// constructor mints "1,000,000 AKD at 6 decimals = 1_000_000_000_000 base
// units", and claimFaucet() grants 50_000_000 base units per 50 AKD claim.
// NIGHT amounts in this UI (reserveNight, and the real tNIGHT that
// addLiquidity() and the swaps move through the contract's custody) use the
// same convention for a consistent display. That is a display choice, not a
// claim about the NIGHT token's own decimals.
export const AKD_DECIMALS = 6;

// Formats a base-unit bigint as a human-readable decimal string, trimming
// trailing zeros (e.g. 1_500_000n -> "1.5", 1_000_000n -> "1", 1n ->
// "0.000001"). Never uses floating point, so it stays exact for values
// larger than Number.MAX_SAFE_INTEGER.
export function formatBaseUnits(value: bigint, decimals: number = AKD_DECIMALS): string {
  const unit = 10n ** BigInt(decimals);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / unit;
  const frac = abs % unit;

  if (frac === 0n) {
    return `${negative ? '-' : ''}${whole.toString()}`;
  }

  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole.toString()}.${fracStr}`;
}

// Parses a human-entered decimal string (e.g. "1.5") into a base-unit
// bigint (e.g. 1_500_000n). Returns null for empty or malformed input,
// rather than throwing, so callers can treat "not a valid amount yet" the
// same as "nothing typed yet" while the user is still typing. Extra
// fractional digits beyond `decimals` are truncated, never rounded, so the
// amount actually submitted on-chain never exceeds what the user typed.
export function parseToBaseUnits(input: string, decimals: number = AKD_DECIMALS): bigint | null {
  const trimmed = input.trim();
  if (trimmed === '' || trimmed === '.') return null;
  if (!/^\d*\.?\d*$/.test(trimmed)) return null;

  const [wholePart, fracPart = ''] = trimmed.split('.');
  const whole = wholePart === '' ? 0n : BigInt(wholePart);
  const truncatedFrac = fracPart.slice(0, decimals).padEnd(decimals, '0');
  const fracBase = truncatedFrac === '' ? 0n : BigInt(truncatedFrac);

  return whole * 10n ** BigInt(decimals) + fracBase;
}
