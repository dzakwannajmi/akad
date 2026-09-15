'use client';

import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { Spinner } from '@/components/icons/spinner';
import { SiteHeader } from '@/components/brand/site-header';
import { fetchActivity, type ActivityRow, type ActivityTxType } from '@/lib/activity-api';
import { useNetwork } from '@/contexts/NetworkContext';
import { getPublicPoolState, type PublicPoolState } from '@/lib/akad-api';
import { formatBaseUnits } from '@/lib/decimals';
import { PoolChart } from '@/components/pool/pool-chart';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const TX_TYPE_LABEL: Record<ActivityTxType, string> = {
  wrap: 'Wrap',
  unwrap: 'Unwrap',
  addLiquidity: 'Add Liquidity',
  swapAkdToNight: 'Swap AKD → NIGHT',
  swapNightToAkd: 'Swap NIGHT → AKD',
  claimFaucet: 'Claim Faucet',
  privateSwapAkdToNight: 'Private Swap AKD → NIGHT (retired)',
  privateSwapNightToAkd: 'Private Swap NIGHT → AKD (retired)',
  wrapNight: 'Wrap tNIGHT → sNIGHT',
  unwrapNight: 'Redeem sNIGHT → tNIGHT',
  shieldedSwapAkdToNight: 'Shielded Swap AKD → sNIGHT',
  shieldedSwapNightToAkd: 'Shielded Swap sNIGHT → AKD',
};

// Rows written before the network toggle shipped have no recorded network;
// default the explorer link to Preview since that's the only network Akad
// ran on before this feature existed.
const explorerTxUrl = (hash: string, network: string | null) =>
  `https://explorer.1am.xyz/tx/${hash}?network=${network ?? 'preview'}`;

const NETWORK_LABEL: Record<string, string> = {
  preview: 'Preview',
  preprod: 'Preprod',
};

function truncate(value: string, lead = 8, tail = 6): string {
  if (value.length <= lead + tail + 1) return value;
  return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}

function formatDay(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

const chartConfig = {
  count: {
    label: 'Transactions',
    color: '#d0f864',
  },
} satisfies ChartConfig;

type RangeKey = '7d' | '30d' | '90d' | 'all';
const RANGE_DAYS: Record<RangeKey, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: Infinity,
};

export default function PoolPage() {
  const { networkKey, network } = useNetwork();
  const CONTRACT_ADDRESS = network.contractAddress;
  const [pool, setPool] = useState<PublicPoolState | null>(null);
  const [poolError, setPoolError] = useState<string | null>(null);

  // Deliberately wallet-free: reserves live in public ledger state, so
  // anyone can verify the pool is real without installing a connector.
  // Re-reads on an interval and whenever the network toggle changes.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!CONTRACT_ADDRESS) {
        setPool(null);
        setPoolError('No contract address is configured for this network.');
        return;
      }
      try {
        const next = await getPublicPoolState(CONTRACT_ADDRESS);
        if (!cancelled) {
          setPool(next);
          setPoolError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setPool(null);
          setPoolError(err instanceof Error ? err.message : String(err));
        }
      }
    };
    load();
    const timer = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [CONTRACT_ADDRESS, networkKey]);

  const [rows, setRows] = useState<ActivityRow[] | null>(null);
  // Snapshot of when the data was fetched, used instead of calling
  // Date.now() inside the memoized calculations below (that would make
  // "recency" derived values re-evaluate to a different answer on every
  // render, not just when the underlying data changes).
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>('30d');
  const [pageSize, setPageSize] = useState<10 | 20>(10);
  const [page, setPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchActivity()
      .then((r) => {
        if (!cancelled) {
          setRows(r);
          setFetchedAt(Date.now());
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pageCount = rows ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;
  // Clamp instead of a reset effect: whenever rows/pageSize shrink the
  // available page count below the current page, fall back to the last
  // real page rather than rendering an out-of-range empty one.
  const safePage = Math.min(page, pageCount - 1);
  const pagedRows = rows ? rows.slice(safePage * pageSize, safePage * pageSize + pageSize) : [];

  const stats = useMemo(() => {
    if (!rows || fetchedAt === null) return null;
    const uniqueWallets = new Set(rows.map((r) => r.wallet_address)).size;
    const last24h = rows.filter(
      (r) => fetchedAt - new Date(r.created_at).getTime() < 24 * 60 * 60 * 1000
    ).length;
    return { total: rows.length, uniqueWallets, last24h };
  }, [rows, fetchedAt]);

  const chartData = useMemo(() => {
    if (!rows || fetchedAt === null) return [];
    const cutoffDays = RANGE_DAYS[range];
    const cutoff = fetchedAt - cutoffDays * 24 * 60 * 60 * 1000;
    const counts = new Map<string, number>();
    for (const row of rows) {
      const t = new Date(row.created_at).getTime();
      if (Number.isFinite(cutoffDays) && t < cutoff) continue;
      const day = formatDay(row.created_at);
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, count]) => ({ date, count }));
  }, [rows, range, fetchedAt]);

  return (
    <main className="flex min-h-screen flex-col bg-black text-white selection:bg-white selection:text-black">
      <SiteHeader />

      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-8 sm:py-16">
        <h1 className="text-3xl font-medium tracking-tight text-white sm:text-4xl">Pool</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/45">
          Live state of the AKD/NIGHT pool, read straight from the contract&apos;s public ledger.
          No wallet needed to view this: reserves are public by design, because a constant-product
          market maker prices every trade from them.
        </p>

        <PoolState pool={pool} error={poolError} network={network.label} />

        <PoolChart rows={rows} pool={pool} />

        <h2 className="mt-14 text-2xl font-medium tracking-tight text-white">Activity</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/45">
          Every wrap, unwrap, swap, and liquidity seed made through Akad, across every wallet
          that has used it. Each row is written only after Midnight&apos;s indexer confirms the
          transaction succeeded and touched Akad&apos;s contract, so this can&apos;t be padded
          with fake rows just by knowing the request shape. Transaction type, wallet, and amounts
          are as reported by the app at the time of the call; the transaction existing,
          succeeding, and touching this contract is independently verified. It covers activity
          routed through this app only, so it is not a complete record of every call the contract
          has ever received, and it resets whenever the contract is redeployed.
        </p>

        {error && (
          <p className="mt-6 rounded-2xl bg-red-400/10 p-4 font-mono text-xs leading-relaxed text-red-300">
            {error}
          </p>
        )}

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total transactions" value={stats ? stats.total.toString() : '—'} />
          <StatCard label="Unique wallets" value={stats ? stats.uniqueWallets.toString() : '—'} />
          <StatCard label="Last 24h" value={stats ? stats.last24h.toString() : '—'} />
        </div>

        <div className="mt-4 rounded-2xl bg-white/[0.04] p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/45">Transactions per day</span>
            <div className="flex items-center gap-1 rounded-full bg-white/[0.06] p-1">
              {(Object.keys(RANGE_DAYS) as RangeKey[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={
                    range === r
                      ? 'rounded-full bg-white px-3 py-1 text-xs font-medium text-black'
                      : 'rounded-full px-3 py-1 text-xs text-white/50 transition-colors hover:text-white'
                  }
                >
                  {r === 'all' ? 'All' : r}
                </button>
              ))}
            </div>
          </div>

          <ChartContainer config={chartConfig} className="mt-5 aspect-auto h-[220px] w-full">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                }
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    }
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="count"
                type="natural"
                fill="url(#fillCount)"
                stroke="var(--color-count)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>

          {rows !== null && chartData.length === 0 && (
            <p className="mt-4 text-center font-mono text-xs text-white/25">
              No activity in this range yet.
            </p>
          )}
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl bg-white/[0.04]">
          <div className="border-b border-white/10 p-5">
            <span className="text-sm text-white/45">Recent transactions</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/40">Type</TableHead>
                <TableHead className="text-white/40">Network</TableHead>
                <TableHead className="text-white/40">Status</TableHead>
                <TableHead className="text-white/40">Wallet</TableHead>
                <TableHead className="text-white/40">Amount</TableHead>
                <TableHead className="text-white/40">Transaction</TableHead>
                <TableHead className="text-right text-white/40">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows === null && (
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center font-mono text-xs text-white/25"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Spinner className="h-3.5 w-3.5" />
                      Loading…
                    </span>
                  </TableCell>
                </TableRow>
              )}
              {rows !== null && rows.length === 0 && (
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center font-mono text-xs text-white/25"
                  >
                    No activity yet. Be the first, try a swap.
                  </TableCell>
                </TableRow>
              )}
              {pagedRows.map((row) => (
                <TableRow key={row.id} className="border-white/5 hover:bg-white/[0.03]">
                  <TableCell className="text-sm text-white/80">
                    {TX_TYPE_LABEL[row.tx_type]}
                  </TableCell>
                  <TableCell className="text-xs text-white/50">
                    {row.network ? NETWORK_LABEL[row.network] ?? row.network : '—'}
                  </TableCell>
                  <TableCell>
                    {/* Every persisted row already passed server-side indexer
                        verification (see app/api/activity/route.ts) before it
                        was written -- there's no "pending" or "failed" state
                        to show, a row here always means Success. */}
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-400/10 px-2.5 py-1 text-xs text-green-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                      Success
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-white/50">
                    {truncate(row.wallet_address)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-white/50">
                    {row.amount_in ?? '—'} {row.token_in ?? ''}
                    {row.amount_out ? ` → ${row.amount_out} ${row.token_out ?? ''}` : ''}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <a
                      href={explorerTxUrl(row.tx_hash, row.network)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-white/50 transition-colors hover:text-white"
                    >
                      {truncate(row.tx_hash)}
                      <Icon icon="lucide:arrow-up-right" width={11} height={11} />
                    </a>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-white/30">
                    {new Date(row.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {rows !== null && rows.length > 0 && (
            <div className="flex flex-col items-start justify-between gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center">
              <span className="font-mono text-xs text-white/30">
                Showing {safePage * pageSize + 1}
                {'–'}
                {Math.min((safePage + 1) * pageSize, rows.length)} of {rows.length}
              </span>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">Rows per page</span>
                  <div className="flex items-center gap-1 rounded-full bg-white/[0.06] p-1">
                    {([10, 20] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => {
                          setPageSize(size);
                          setPage(0);
                        }}
                        className={
                          pageSize === size
                            ? 'rounded-full bg-white px-2.5 py-1 text-xs font-medium text-black'
                            : 'rounded-full px-2.5 py-1 text-xs text-white/50 transition-colors hover:text-white'
                        }
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <span className="font-mono text-xs text-white/40">
                  Page {safePage + 1} of {pageCount}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(0)}
                    disabled={safePage === 0}
                    aria-label="First page"
                    className="rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <Icon icon="lucide:chevrons-left" width={14} height={14} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={safePage === 0}
                    aria-label="Previous page"
                    className="rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <Icon icon="lucide:chevron-left" width={14} height={14} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                    disabled={safePage >= pageCount - 1}
                    aria-label="Next page"
                    className="rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <Icon icon="lucide:chevron-right" width={14} height={14} />
                  </button>
                  <button
                    onClick={() => setPage(pageCount - 1)}
                    disabled={safePage >= pageCount - 1}
                    aria-label="Last page"
                    className="rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <Icon icon="lucide:chevrons-right" width={14} height={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] p-5">
      <div className="text-sm text-white/45">{label}</div>
      <div className="mt-2 text-3xl font-medium tracking-tight">{value}</div>
    </div>
  );
}


function PoolState({
  pool,
  error,
  network,
}: {
  pool: PublicPoolState | null;
  error: string | null;
  network: string;
}) {
  if (error) {
    return (
      <p className="mt-8 rounded-2xl bg-red-400/10 p-4 font-mono text-xs leading-relaxed text-red-300">
        {error}
      </p>
    );
  }

  const akd = pool ? formatBaseUnits(pool.reserveAKD) : null;
  const night = pool ? formatBaseUnits(pool.reserveNight) : null;

  // Price is the pool's own exchange rate: NIGHT per AKD, straight off the
  // reserves. Deliberately not a fiat figure: AKD and tNIGHT are testnet
  // tokens with no market, so any currency value here would be invented.
  const price =
    pool && pool.reserveAKD > 0n
      ? (Number(pool.reserveNight) / Number(pool.reserveAKD)).toFixed(6)
      : null;

  // The constant product the contract asserts never decreases. Showing it
  // makes the invariant observable instead of a claim in a README.
  const k =
    pool && pool.reserveAKD > 0n && pool.reserveNight > 0n
      ? (Number(pool.reserveAKD) / 1e6) * (Number(pool.reserveNight) / 1e6)
      : null;

  return (
    <>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="AKD reserve" value={akd ?? '—'} />
        <StatCard label="NIGHT reserve" value={night ?? '—'} />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Price (NIGHT per AKD)" value={price ?? '—'} />
        <StatCard
          label="Constant product k"
          value={k === null ? '—' : k.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        />
      </div>

      <div className="mt-4 rounded-2xl bg-white/[0.04] p-5 sm:p-6">
        <div className="text-sm text-white/45">Contract</div>
        <p className="mt-2 break-all font-mono text-xs leading-relaxed text-white/70">
          {pool ? pool.contractAddress : 'loading'}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-white/40">
          Network {network}. Reserves refresh every 15 seconds and are read from public ledger
          state, not from this app&apos;s own records. There is no fiat value shown because AKD
          and tNIGHT are testnet tokens with no market price, so any currency figure would be
          made up. k rises slowly as trades round in the pool&apos;s favour, which is the
          invariant the contract enforces doing its job.
        </p>
      </div>
    </>
  );
}
