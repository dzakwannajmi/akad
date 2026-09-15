'use client';

import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { ActivityRow } from '@/lib/activity-api';
import type { PublicPoolState } from '@/lib/akad-api';

// Three views, not four. A Uniswap v3 pool page also carries a Liquidity
// tab, which plots how liquidity is distributed across price ticks. A
// constant-product pool has no ticks: liquidity is uniform across every
// price by definition, so that chart would be a flat line dressed up as
// data. It is left out rather than faked.
type Tab = 'price' | 'volume' | 'depth';
type Range = '1D' | '1W' | '1M' | 'All';

const RANGE_MS: Record<Range, number | null> = {
  '1D': 24 * 60 * 60 * 1000,
  '1W': 7 * 24 * 60 * 60 * 1000,
  '1M': 30 * 24 * 60 * 60 * 1000,
  All: null,
};

const AKD_IN: ReadonlySet<string> = new Set([
  'swapAkdToNight',
  'privateSwapAkdToNight',
  'addLiquidity',
]);
const NIGHT_IN: ReadonlySet<string> = new Set(['swapNightToAkd', 'privateSwapNightToAkd']);

const num = (v: string | null): number | null => {
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const rowTime = (r: ActivityRow): number => new Date(r.block_time ?? r.created_at).getTime();

const chartConfig = {
  value: { label: 'Value', color: 'var(--color-akd-accent)' },
} satisfies ChartConfig;

export function PoolChart({
  rows,
  pool,
}: {
  rows: ActivityRow[] | null;
  pool: PublicPoolState | null;
}) {
  const [tab, setTab] = useState<Tab>('price');
  const [range, setRange] = useState<Range>('1W');

  const inRange = useMemo(() => {
    if (!rows) return [];
    const span = RANGE_MS[range];
    const cutoff = span === null ? 0 : Date.now() - span;
    return rows
      .filter((r) => rowTime(r) >= cutoff)
      .sort((a, b) => rowTime(a) - rowTime(b));
  }, [rows, range]);

  // Every trade reprices the pool, so each swap row is one observation of
  // NIGHT per AKD. Which side of the row holds AKD depends on direction.
  const priceSeries = useMemo(() => {
    const out: { t: number; label: string; value: number }[] = [];
    for (const r of inRange) {
      const a = num(r.amount_in);
      const b = num(r.amount_out);
      if (a === null || b === null) continue;
      let price: number | null = null;
      if (AKD_IN.has(r.tx_type)) price = b / a;
      else if (NIGHT_IN.has(r.tx_type)) price = a / b;
      if (price === null || !Number.isFinite(price)) continue;
      const t = rowTime(r);
      out.push({ t, label: new Date(t).toLocaleString(), value: price });
    }
    return out;
  }, [inRange]);

  // Denominated in AKD on both sides so the bars are comparable.
  const volumeSeries = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const r of inRange) {
      const a = num(r.amount_in);
      const b = num(r.amount_out);
      let akd: number | null = null;
      if (AKD_IN.has(r.tx_type)) akd = a;
      else if (NIGHT_IN.has(r.tx_type)) akd = b;
      if (akd === null) continue;
      const day = new Date(rowTime(r)).toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + akd);
    }
    return Array.from(byDay.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([day, value]) => ({ t: new Date(day).getTime(), label: day, value }));
  }, [inRange]);

  // Depth is not history: it is the curve the contract enforces right now,
  // computed from the live reserves. Negative sizes buy AKD, positive
  // sizes sell it, and the y value is the price that trade would actually
  // execute at, which is how slippage becomes visible.
  const depthSeries = useMemo(() => {
    if (!pool || pool.reserveAKD <= 0n || pool.reserveNight <= 0n) return [];
    const x = Number(pool.reserveAKD) / 1e6;
    const y = Number(pool.reserveNight) / 1e6;
    const k = x * y;
    const out: { t: number; label: string; value: number }[] = [];
    for (let pct = -40; pct <= 40; pct += 2) {
      if (pct === 0) continue;
      const size = (x * pct) / 100;
      let price: number;
      if (size > 0) {
        // selling `size` AKD into the pool
        price = (y - k / (x + size)) / size;
      } else {
        // buying `-size` AKD out of the pool
        const want = -size;
        if (want >= x) continue;
        price = (k / (x - want) - y) / want;
      }
      if (!Number.isFinite(price) || price <= 0) continue;
      out.push({
        t: size,
        label: `${size > 0 ? 'sell' : 'buy'} ${Math.abs(size).toFixed(2)} AKD`,
        value: price,
      });
    }
    return out;
  }, [pool]);

  const series = tab === 'price' ? priceSeries : tab === 'volume' ? volumeSeries : depthSeries;

  const spot =
    pool && pool.reserveAKD > 0n ? Number(pool.reserveNight) / Number(pool.reserveAKD) : null;

  const change = useMemo(() => {
    if (tab !== 'price' || priceSeries.length < 2) return null;
    const first = priceSeries[0].value;
    const last = priceSeries[priceSeries.length - 1].value;
    if (first <= 0) return null;
    return ((last - first) / first) * 100;
  }, [tab, priceSeries]);

  const totalVolume = useMemo(
    () => volumeSeries.reduce((sum, d) => sum + d.value, 0),
    [volumeSeries]
  );

  const headline =
    tab === 'volume'
      ? `${totalVolume.toLocaleString('en-US', { maximumFractionDigits: 2 })} AKD`
      : spot === null
        ? '—'
        : `1 AKD = ${spot.toFixed(6)} NIGHT`;

  const subline =
    tab === 'price'
      ? 'Spot price from live reserves. Each point is one trade.'
      : tab === 'volume'
        ? 'Routed through this app, denominated in AKD.'
        : 'What a trade of each size would execute at, right now.';

  return (
    <div className="mt-4 rounded-2xl bg-white/[0.04] p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-6">
        {(['price', 'volume', 'depth'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              tab === t
                ? 'text-base font-medium capitalize text-white'
                : 'text-base capitalize text-white/40 transition-colors hover:text-white/70'
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-baseline gap-3">
        <span className="text-3xl font-medium tracking-tight text-white sm:text-4xl">
          {headline}
        </span>
        {change !== null && (
          <span
            className={
              change >= 0
                ? 'text-sm font-medium text-akd-accent'
                : 'text-sm font-medium text-red-400'
            }
          >
            {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-white/35">{subline}</p>

      {series.length === 0 ? (
        <p className="mt-10 mb-10 text-center text-sm text-white/35">
          {tab === 'depth'
            ? 'Depth needs live reserves, which are still loading.'
            : 'No trades in this range yet.'}
        </p>
      ) : (
        <ChartContainer config={chartConfig} className="mt-6 h-[280px] w-full">
          <AreaChart data={series} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="poolFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-akd-accent)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-akd-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="2 6" stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              minTickGap={40}
              tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
              tickFormatter={(v: string) =>
                tab === 'depth' ? v.replace(' AKD', '') : v.split(',')[0]
              }
            />
            <YAxis
              orientation="right"
              tickLine={false}
              axisLine={false}
              width={72}
              tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => (tab === 'volume' ? v.toFixed(0) : v.toFixed(4))}
            />
            <ChartTooltip content={<ChartTooltipContent labelKey="label" />} />
            <Area
              type={tab === 'volume' ? 'stepAfter' : 'monotone'}
              dataKey="value"
              stroke="var(--color-akd-accent)"
              strokeWidth={2}
              fill="url(#poolFill)"
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      )}

      <div className="mt-5 flex justify-end">
        <div className="flex items-center gap-1 rounded-full bg-white/[0.06] p-1">
          {(Object.keys(RANGE_MS) as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              disabled={tab === 'depth'}
              className={
                tab === 'depth'
                  ? 'rounded-full px-3 py-1 text-xs text-white/20'
                  : range === r
                    ? 'rounded-full bg-white px-3 py-1 text-xs font-medium text-black'
                    : 'rounded-full px-3 py-1 text-xs text-white/50 transition-colors hover:text-white'
              }
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
