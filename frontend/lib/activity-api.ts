// Client-side helpers for the shared, cross-user activity feed. Recording
// goes through /api/activity, which independently verifies each
// transaction against Midnight's indexer before writing it (see that
// route for why) — this file only ever sends the app's own view of what
// just happened, not the source of truth.

export type ActivityTxType = 'wrap' | 'unwrap' | 'addLiquidity' | 'swapAkdToNight' | 'swapNightToAkd' | 'claimFaucet';

export type ActivityRow = {
  id: number;
  tx_type: ActivityTxType;
  wallet_address: string;
  tx_hash: string;
  amount_in: string | null;
  amount_out: string | null;
  token_in: string | null;
  token_out: string | null;
  block_height: number | null;
  block_time: string | null;
  created_at: string;
};

export type RecordActivityInput = {
  txId: string;
  txType: ActivityTxType;
  wallet: string;
  amountIn?: string;
  amountOut?: string;
  tokenIn?: string;
  tokenOut?: string;
};

// Fire-and-forget by design at call sites: a failure here (indexer lag,
// network hiccup) must never surface as an error on a swap/wrap/unwrap
// that already succeeded on-chain. Callers should catch and log, not
// block the UI on this.
export async function recordActivity(input: RecordActivityInput): Promise<void> {
  const res = await fetch('/api/activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Failed to record activity (${res.status})`);
  }
}

export async function fetchActivity(): Promise<ActivityRow[]> {
  const res = await fetch('/api/activity', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to load activity (${res.status})`);
  }
  const body = (await res.json()) as { rows: ActivityRow[] };
  return body.rows;
}
