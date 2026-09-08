'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { fetchActivity, type ActivityRow, type ActivityTxType } from '@/lib/activity-api';
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
  swapAkdToNight: 'Swap AKD → tNIGHT',
  swapNightToAkd: 'Swap tNIGHT → AKD',
  claimFaucet: 'Claim Faucet',
};

const explorerTxUrl = (hash: string) => `https://explorer.1am.xyz/tx/${hash}?network=preview`;

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
    color: '#4ade80',
  },
} satisfies ChartConfig;

type RangeKey = '7d' | '30d' | '90d' | 'all';
const RANGE_DAYS: Record<RangeKey, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: Infinity,
};

export default function ActivityPage() {
  const [rows, setRows] = useState<ActivityRow[] | null>(null);
  // Snapshot of when the data was fetched, used instead of calling
  // Date.now() inside the memoized calculations below (that would make
  // "recency" derived values re-evaluate to a different answer on every
  // render, not just when the underlying data changes).
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>('30d');

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
      <header className="border-b border-white/10">
        <div className="flex items-center justify-between px-6 py-4 sm:px-8">
          <nav className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-medium tracking-tight sm:text-3xl">
              Akad
            </Link>
            <Link
              href="/swap"
              className="hidden text-base text-white/50 transition-colors hover:text-white sm:block sm:text-lg"
            >
              Trade
            </Link>
            <Link
              href="/#how-it-works"
              className="hidden text-base text-white/50 transition-colors hover:text-white sm:block sm:text-lg"
            >
              How it works
            </Link>
            <Link
              href="/#faq"
              className="hidden text-base text-white/50 transition-colors hover:text-white sm:block sm:text-lg"
            >
              FAQ
            </Link>
          </nav>
          <span className="rounded-full bg-white/10 px-4 py-2 font-mono text-xs text-white/60">
            Activity
          </span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-8 sm:py-16">
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">Activity</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/45">
          Every wrap, unwrap, swap, and liquidity seed made through Akad, across every wallet
          that has used it. Each row is written only after Midnight&apos;s indexer confirms the
          transaction succeeded and touched Akad&apos;s contract, so this can&apos;t be padded
          with fake rows just by knowing the request shape. Transaction type, wallet, and amounts
          are as reported by the app at the time of the call; the transaction existing,
          succeeding, and touching this contract is independently verified.
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
                    colSpan={5}
                    className="py-8 text-center font-mono text-xs text-white/25"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {rows !== null && rows.length === 0 && (
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center font-mono text-xs text-white/25"
                  >
                    No activity yet. Be the first, try a swap.
                  </TableCell>
                </TableRow>
              )}
              {rows?.map((row) => (
                <TableRow key={row.id} className="border-white/5 hover:bg-white/[0.03]">
                  <TableCell className="text-sm text-white/80">
                    {TX_TYPE_LABEL[row.tx_type]}
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
                      href={explorerTxUrl(row.tx_hash)}
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
