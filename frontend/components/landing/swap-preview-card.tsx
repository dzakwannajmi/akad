'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { AkdTokenIcon, NightTokenIcon } from '@/components/icons/token-icon';

type Symbol = 'AKD' | 'NIGHT';
type Leg = { symbol: Symbol; amount: string };

// Two illustrative legs the card alternates between, just to animate the
// hero. Not wired to real reserves — the real, live version of this same
// card is the actual Swap page (/swap), which this card links to.
const PAIRS: [Leg, Leg][] = [
  [
    { symbol: 'AKD', amount: '50' },
    { symbol: 'NIGHT', amount: '18.4' },
  ],
  [
    { symbol: 'NIGHT', amount: '25' },
    { symbol: 'AKD', amount: '67.9' },
  ],
];

function TokenGlyph({ symbol, className }: { symbol: Symbol; className?: string }) {
  return symbol === 'AKD' ? (
    <AkdTokenIcon className={className} />
  ) : (
    <NightTokenIcon className={className} />
  );
}

export function SwapPreviewCard() {
  const [pairIndex, setPairIndex] = useState(0);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    let swapTimeout: ReturnType<typeof setTimeout>;
    const intervalId = setInterval(() => {
      setFlipping(true);
      swapTimeout = setTimeout(() => {
        setPairIndex((i) => (i + 1) % PAIRS.length);
        setFlipping(false);
      }, 350);
    }, 3200);
    return () => {
      clearInterval(intervalId);
      clearTimeout(swapTimeout);
    };
  }, []);

  const [sell, buy] = PAIRS[pairIndex];

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="rounded-[28px] border border-white/10 bg-[#0a0a0a] p-2 shadow-[0_0_70px_-20px_rgba(208,248,100,0.35)]">
        {/* One unified card: Sell and Buy live inside the same rounded
            container, split by a hairline divider, with the direction
            chip sitting in a notch cut into that seam -- not two separate
            cards with a floating badge between them. */}
        <div className="relative rounded-[22px] bg-white/[0.04]">
          <div
            className={`p-5 pb-6 transition-opacity duration-300 ${
              flipping ? 'opacity-30' : 'opacity-100'
            }`}
          >
            <div className="font-mono text-xs uppercase tracking-wider text-white/35">Sell</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-4xl font-medium tracking-tight">{sell.amount}</span>
              <span className="flex items-center gap-2 rounded-full bg-white/10 py-2 pl-2.5 pr-4">
                <TokenGlyph symbol={sell.symbol} className="h-6 w-6" />
                <span className="font-mono text-sm">{sell.symbol}</span>
              </span>
            </div>
          </div>

          <div className="h-px bg-white/[0.06]" />

          <div
            className={`p-5 pt-6 transition-opacity duration-300 ${
              flipping ? 'opacity-30' : 'opacity-100'
            }`}
          >
            <div className="font-mono text-xs uppercase tracking-wider text-white/35">Buy</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-4xl font-medium tracking-tight text-white/80">{buy.amount}</span>
              <span className="flex items-center gap-2 rounded-full bg-white/10 py-2 pl-2.5 pr-4">
                <TokenGlyph symbol={buy.symbol} className="h-6 w-6" />
                <span className="font-mono text-sm">{buy.symbol}</span>
              </span>
            </div>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className="animate-akd-pulse flex h-9 w-9 items-center justify-center rounded-xl border-4 border-[#0a0a0a] bg-akd-accent text-black">
              <Icon icon="lucide:arrow-down" width={16} height={16} />
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5 px-2 font-mono text-xs text-white/35">
          <Icon icon="lucide:shield" width={12} height={12} />
          Akad · public constant-product AMM
        </div>

        <Link
          href="/swap"
          className="mt-4 block rounded-2xl bg-akd-accent py-3.5 text-center text-base font-medium text-black"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
