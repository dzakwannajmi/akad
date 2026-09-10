import { NextRequest, NextResponse } from 'next/server';
import type { PostgrestError } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { NETWORKS, type NetworkKey } from '@/lib/networks';

export const dynamic = 'force-dynamic';
// Explicit, not left to plan defaults: the retry loop in verifyTransaction
// below can legitimately run close to a minute waiting on indexer lag.
// 90s gives it headroom on both Fluid Compute (300s default) and legacy
// compute (10s on Hobby without this) without depending on which one the
// project happens to be on.
export const maxDuration = 90;

const ALLOWED_TX_TYPES = [
  'wrap',
  'unwrap',
  'addLiquidity',
  'swapAkdToNight',
  'swapNightToAkd',
  'claimFaucet',
  'privateSwapAkdToNight',
  'privateSwapNightToAkd',
] as const;
type TxType = (typeof ALLOWED_TX_TYPES)[number];

type ActivityRow = {
  id: number;
  tx_type: TxType;
  wallet_address: string;
  tx_hash: string;
  amount_in: string | null;
  amount_out: string | null;
  token_in: string | null;
  token_out: string | null;
  block_height: number | null;
  block_time: string | null;
  created_at: string;
  network: NetworkKey | null;
};

const MAX_ROWS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Supabase's PostgREST layer occasionally rejects a perfectly valid API key
// with PGRST303 ("JWT issued at future"): this is a known, currently
// unresolved bug in PostgREST's cached clock (see
// https://github.com/orgs/supabase/discussions/48123), not a problem with
// our key or env vars, and it self-resolves within about a second. Retrying
// a couple of times with a short delay rides straight through it instead of
// surfacing a 500 for something that was never actually wrong.
async function withPgrst303Retry<T>(
  fn: () => PromiseLike<{ data: T; error: PostgrestError | null }>,
  attempts = 3
): Promise<{ data: T; error: PostgrestError | null }> {
  let last: { data: T; error: PostgrestError | null } = { data: null as unknown as T, error: null };
  for (let i = 0; i < attempts; i++) {
    last = await fn();
    if (!last.error || last.error.code !== 'PGRST303') return last;
    if (i < attempts - 1) await sleep(400 * (i + 1));
  }
  return last;
}

// GET: public read of the shared activity feed. No auth needed, this is
// meant to be visible to anyone (that's the point, it's a traction log).
export async function GET() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await withPgrst303Retry(() =>
    supabase.from('activity').select('*').order('created_at', { ascending: false }).limit(MAX_ROWS)
  );

  if (error) {
    console.error('[GET /api/activity]', error);
    return NextResponse.json({ error: 'Failed to load activity' }, { status: 500 });
  }

  return NextResponse.json({ rows: (data ?? []) as ActivityRow[] });
}

type VerifyTxResponse = {
  data?: {
    transactions: Array<{
      hash: string;
      contractActions: Array<{ address: string }>;
      // The indexer serializes this as a Unix epoch (observed in
      // milliseconds), not an ISO date string, and JSON transport can hand
      // it back as either a number or a numeric string depending on size.
      block: { height: number; timestamp: string | number } | null;
      transactionResult: { status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE' } | null;
    }>;
  };
  errors?: Array<{ message: string }>;
};

const VERIFY_TX_QUERY = /* GraphQL */ `
  query VerifyTx($identifier: HexEncoded!) {
    transactions(offset: { identifier: $identifier }) {
      hash
      contractActions {
        address
      }
      block {
        height
        timestamp
      }
      ... on RegularTransaction {
        transactionResult {
          status
        }
      }
    }
  }
`;

function normalizeHex(value: string): string {
  return value.trim().toLowerCase().replace(/^0x/, '');
}

// Postgres's timestamptz column needs an ISO-8601 string, not a raw Unix
// epoch. The indexer hands back block.timestamp as a plain epoch value
// (observed as milliseconds, e.g. "1788823578000"), so inserting it as-is
// makes Postgres try to parse that number as a literal date and fail with
// "date/time field value out of range". A 13+ digit numeric value is
// already milliseconds; a shorter one is seconds and needs *1000.
function normalizeBlockTime(raw: string | number | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const asString = String(raw);
  if (/^\d+$/.test(asString)) {
    const ms = asString.length > 12 ? Number(asString) : Number(asString) * 1000;
    const parsed = new Date(ms);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  const parsed = new Date(asString);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

type VerifiedTx = { hash: string; blockHeight: number | null; blockTime: string | null };

// Confirms a transaction is real, succeeded, and actually touched this
// app's contract, by asking Midnight's own indexer rather than trusting
// whatever the client claims. This is what keeps the activity table
// honest: a row only exists here because the indexer already agreed the
// underlying transaction happened on-chain.
async function verifyTransactionOnce(
  txIdentifier: string,
  indexerHttp: string,
  contractAddress: string
): Promise<VerifiedTx | null> {
  const res = await fetch(indexerHttp, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: VERIFY_TX_QUERY,
      variables: { identifier: normalizeHex(txIdentifier) },
    }),
  });

  if (!res.ok) {
    throw new Error(`Indexer request failed: ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as VerifyTxResponse;
  if (body.errors?.length) {
    throw new Error(`Indexer returned errors: ${body.errors.map((e) => e.message).join('; ')}`);
  }

  const tx = body.data?.transactions?.[0];
  if (!tx) return null;

  const touchesOurContract = tx.contractActions.some(
    (action) => normalizeHex(action.address) === normalizeHex(contractAddress)
  );
  if (!touchesOurContract) return null;

  if (tx.transactionResult?.status !== 'SUCCESS') return null;

  return {
    hash: tx.hash,
    blockHeight: tx.block?.height ?? null,
    blockTime: normalizeBlockTime(tx.block?.timestamp),
  };
}

// The client calls this right after submitting a transaction, but Midnight's
// indexer usually takes a few seconds to catch up to a just-submitted tx.
// Rather than fail the whole activity record on that normal lag, retry the
// lookup for a bit before giving up.
//
// This used to stop after ~15s (six attempts), on the assumption that
// "comfortably covers ordinary indexer lag". Verified false in practice on
// Preview: a real, successful, contract-matching transaction was still
// unindexed at the 15s mark and only showed up when queried by hand later.
// Extended to ~62s (eleven attempts) with a longer tail so slow indexer
// catches don't get reported as "not found" to a transaction that actually
// succeeded. This is still a background, fire-and-forget call from the
// client's perspective (see lib/activity-api.ts), so a longer wait here
// never blocks the UI, and it stays far under Vercel's function duration
// limit.
async function verifyTransaction(
  txIdentifier: string,
  indexerHttp: string,
  contractAddress: string
): Promise<VerifiedTx | null> {
  const delaysMs = [1000, 2000, 3000, 5000, 5000, 8000, 8000, 10000, 10000, 10000];
  for (let attempt = 0; attempt <= delaysMs.length; attempt++) {
    const result = await verifyTransactionOnce(txIdentifier, indexerHttp, contractAddress);
    if (result) return result;
    if (attempt < delaysMs.length) await sleep(delaysMs[attempt]);
  }
  return null;
}

type RecordActivityBody = {
  txId: string;
  txType: TxType;
  wallet: string;
  network: NetworkKey;
  amountIn?: string;
  amountOut?: string;
  tokenIn?: string;
  tokenOut?: string;
};

function isValidBody(body: unknown): body is RecordActivityBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.txId === 'string' &&
    b.txId.length > 0 &&
    typeof b.txType === 'string' &&
    (ALLOWED_TX_TYPES as readonly string[]).includes(b.txType) &&
    typeof b.wallet === 'string' &&
    b.wallet.length > 0 &&
    (b.network === 'preview' || b.network === 'preprod') &&
    (b.amountIn === undefined || typeof b.amountIn === 'string') &&
    (b.amountOut === undefined || typeof b.amountOut === 'string') &&
    (b.tokenIn === undefined || typeof b.tokenIn === 'string') &&
    (b.tokenOut === undefined || typeof b.tokenOut === 'string')
  );
}

// POST: called by the frontend right after a wrap/unwrap/swap/addLiquidity
// transaction is submitted. Verifies the transaction against the indexer
// before writing anything, so this endpoint can't be used to inject fake
// rows just by knowing the request shape, each row costs a real,
// contract-touching, successful on-chain transaction to produce.
//
// Known limitation: tx_type, wallet_address, amount_in/out, and token_in/
// out are taken from the caller, not independently re-derived from the raw
// transaction bytes (that would require decoding the transaction's
// intents, out of scope here). Only txHash-touches-our-contract-and-
// succeeded is independently verified. This is disclosed in the Activity
// page's own copy, not just this comment.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isValidBody(body)) {
    return NextResponse.json({ error: 'Invalid activity payload' }, { status: 400 });
  }

  const net = NETWORKS[body.network];

  let verified: VerifiedTx | null;
  try {
    verified = await verifyTransaction(body.txId, net.indexerHttp, net.contractAddress);
  } catch (err) {
    console.error('[POST /api/activity] indexer verification failed', err);
    return NextResponse.json({ error: 'Could not verify transaction against the indexer' }, { status: 502 });
  }

  if (!verified) {
    // Diagnostic only: shows exactly which identifier we queried the
    // indexer for, so a failed verification can be cross-checked by hand
    // against an explorer instead of guessing what txId was actually sent.
    console.warn(
      '[POST /api/activity] verification failed for identifier',
      normalizeHex(body.txId),
      '(raw txId from client:', body.txId, ')'
    );
    return NextResponse.json(
      { error: 'Transaction not found, not yet indexed, did not touch this contract, or did not succeed' },
      { status: 422 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await withPgrst303Retry(() =>
    supabase
      .from('activity')
      .insert({
        tx_type: body.txType,
        wallet_address: body.wallet,
        tx_hash: verified!.hash,
        network: body.network,
        amount_in: body.amountIn ?? null,
        amount_out: body.amountOut ?? null,
        token_in: body.tokenIn ?? null,
        token_out: body.tokenOut ?? null,
        block_height: verified!.blockHeight,
        block_time: verified!.blockTime,
      })
      .select()
      .single()
  );

  if (error) {
    // Unique violation on tx_hash means this transaction was already
    // recorded (e.g. the client retried the same submission), treat that
    // as success rather than an error.
    if (error.code === '23505') {
      return NextResponse.json({ ok: true, alreadyRecorded: true });
    }
    console.error('[POST /api/activity] insert failed', error);
    return NextResponse.json({ error: 'Failed to record activity' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, row: data as ActivityRow }, { status: 201 });
}
