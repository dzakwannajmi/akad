'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { getCompatibleWallets, connectWallet } from '@/lib/wallet';
import { getReserves, executeSwap } from '@/lib/swap-api';
import { computeSwapOutput, applySlippage } from '@/lib/bonding-curve';
import { wrapTokens, unwrapTokens, getTokenColor } from '@/lib/token-api';
import { TOKEN_CONTRACT_ADDRESS } from '@/lib/wallet-constants';
import { Icon } from '@iconify/react';

// Hardcoded for now — the addresses of our two deployed contracts on Preview.
import { SWAP_CONTRACT_ADDRESS } from '@/lib/wallet-constants';

type Direction = 'AkdToNight' | 'NightToAkd';

export default function SwapPage() {
  const [connectedApi, setConnectedApi] = useState<any>(null);
  const [addresses, setAddresses] = useState<any>(null);
  const [direction, setDirection] = useState<Direction>('AkdToNight');
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState<bigint | null>(null);
  const [reserves, setReserves] = useState<{ reserveAKD: bigint; reserveNight: bigint } | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [wrapAmount, setWrapAmount] = useState('');
  const [wrapStatus, setWrapStatus] = useState<string>('idle');
  const [wrappedCoin, setWrappedCoin] = useState<{ nonce: Uint8Array; value: bigint } | null>(null);
  const [unwrapStatus, setUnwrapStatus] = useState<string>('idle');
  const [tab, setTab] = useState<'swap' | 'wrap' | 'unwrap' | 'activity'>('swap');
  const [showSettings, setShowSettings] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ from: string; to: string; amountIn: string; amountOut: string; time: string }[]>([]);

  const fromToken = direction === 'AkdToNight' ? 'AKD' : 'tNIGHT';
  const toToken = direction === 'AkdToNight' ? 'tNIGHT' : 'AKD';

  const handleConnect = async () => {
    setError(null);
    try {
      const wallets = getCompatibleWallets();
      if (wallets.length === 0) {
        setError('No compatible wallet found. Install/unlock Lace.');
        return;
      }
      const { connectedApi: api, addresses: addr } = await connectWallet(wallets[0]);
      setConnectedApi(api);
      setAddresses(addr);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const refreshReserves = useCallback(async () => {
    if (!connectedApi || !addresses) return;
    try {
      const r = await getReserves(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey,
        SWAP_CONTRACT_ADDRESS
      );
      setReserves(r);
    } catch (err) {
      console.error('[Reserves]', err);
    }
  }, [connectedApi, addresses]);

  useEffect(() => {
    refreshReserves();
  }, [refreshReserves]);

  useEffect(() => {
    if (!reserves || !amountIn) {
      setAmountOut(null);
      return;
    }
    try {
      const dx = BigInt(amountIn);
      const [reserveIn, reserveOut] =
        direction === 'AkdToNight'
          ? [reserves.reserveAKD, reserves.reserveNight]
          : [reserves.reserveNight, reserves.reserveAKD];
      setAmountOut(computeSwapOutput(reserveIn, reserveOut, dx));
    } catch {
      setAmountOut(null);
    }
  }, [amountIn, direction, reserves]);


  const handleWrap = async () => {
    if (!connectedApi || !addresses || !wrapAmount) return;
    setWrapStatus('wrapping');
    setError(null);
    try {
      const coin = await wrapTokens(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey,
        TOKEN_CONTRACT_ADDRESS,
        BigInt(wrapAmount)
      );
      setWrappedCoin(coin);
      setUnwrapStatus('idle');
      setWrapStatus('wrapped');
      setWrapAmount('');
    } catch (err: any) {
      console.error('[Wrap]', err);
      const detail = err?.cause?.cause?.message || err?.cause?.message || err?.message || String(err);
      setError(detail);
      setWrapStatus('error');
    }
  };

  const handleUnwrap = async () => {
    if (!connectedApi || !addresses || !wrappedCoin) return;
    setUnwrapStatus('unwrapping');
    setError(null);
    try {
      const color = await getTokenColor(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey,
        TOKEN_CONTRACT_ADDRESS
      );
      await unwrapTokens(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey,
        TOKEN_CONTRACT_ADDRESS,
        { nonce: wrappedCoin.nonce, color, value: wrappedCoin.value }
      );
      setWrappedCoin(null);
      setUnwrapStatus('unwrapped');
    } catch (err: any) {
      console.error('[Unwrap]', err);
      const detail = err?.cause?.cause?.message || err?.cause?.message || err?.message || String(err);
      setError(detail);
      setUnwrapStatus('error');
    }
  };

  const handleSwap = async () => {
    if (!connectedApi || !addresses || !reserves || amountOut === null) return;
    setStatus('swapping');
    setError(null);
    try {
      const dx = BigInt(amountIn);
      const minOut = applySlippage(amountOut, 50); // 0.5% slippage tolerance
      await executeSwap(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey,
        SWAP_CONTRACT_ADDRESS,
        direction,
        dx,
        amountOut,
        minOut
      );
      setStatus('swapped');
      setHistory((h) => [
        {
          from: fromToken,
          to: toToken,
          amountIn,
          amountOut: amountOut.toString(),
          time: new Date().toLocaleTimeString(),
        },
        ...h,
      ]);
      setAmountIn('');
      await refreshReserves();
    } catch (err: any) {
      console.error('[Swap]', err);
      const detail = err?.cause?.cause?.message || err?.cause?.message || err?.message || String(err);
      setError(detail);
      setStatus('error');
    }
  };

  const tradeItems = [
    { id: 'swap', label: 'Swap', desc: 'AKD ⇄ tNIGHT', icon: 'lucide:arrow-down-up' },
    { id: 'wrap', label: 'Wrap', desc: 'Public to shielded', icon: 'lucide:shield' },
    { id: 'unwrap', label: 'Unwrap', desc: 'Shielded to public', icon: 'lucide:shield-off' },
  ] as const;

  const tabs = [
    { id: 'swap', label: 'Swap' },
    { id: 'wrap', label: 'Wrap' },
    { id: 'unwrap', label: 'Unwrap' },
    { id: 'activity', label: 'Activity' },
  ] as const;

  return (
    <main className="flex min-h-screen flex-col bg-black text-white selection:bg-white selection:text-black">
      <header className="border-b border-white/10">
        <div className="flex items-center justify-between px-6 py-4 sm:px-8">
          {tradeOpen && (
            <button
              aria-hidden
              tabIndex={-1}
              onClick={() => setTradeOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
          )}

          <nav className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-medium tracking-tight sm:text-3xl">
              Akad
            </Link>

            <div className="relative z-50 hidden sm:block">
              <button
                onClick={() => setTradeOpen((v) => !v)}
                aria-expanded={tradeOpen}
                className="flex items-center gap-1.5 text-base font-medium transition-colors hover:text-white/80 sm:text-lg"
              >
                Trade
                <Icon
                  icon="lucide:chevron-down"
                  width={18}
                  height={18}
                  className={`transition-transform duration-200 ${tradeOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <div
                className={`absolute left-0 top-full mt-4 w-64 origin-top-left rounded-2xl border border-white/10 bg-[#0a0a0a] p-2 shadow-2xl transition-all duration-200 ease-out ${
                  tradeOpen
                    ? 'visible translate-y-0 opacity-100'
                    : 'invisible -translate-y-2 opacity-0'
                }`}
              >
                {tradeItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setTab(item.id);
                      setTradeOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                      tab === item.id ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <Icon icon={item.icon} width={18} height={18} className="text-white/60" />
                    <span>
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className="block text-xs text-white/40">{item.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

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

          {!connectedApi ? (
            <button
              onClick={handleConnect}
              className="rounded-full bg-white px-6 py-2.5 text-base font-medium text-black transition-colors hover:bg-white/85"
            >
              Connect
            </button>
          ) : (
            <button
              onClick={() => {
                setConnectedApi(null);
                setAddresses(null);
                setReserves(null);
              }}
              title="Disconnect"
              className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 font-mono text-xs text-white/70 transition-colors hover:bg-white/20"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              {addresses.unshieldedAddress.slice(0, 10)}…
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 justify-center px-6 py-12 sm:py-16">
        <div className="w-full max-w-md">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={
                    tab === t.id
                      ? 'rounded-full bg-white/10 px-4 py-2 text-sm font-medium'
                      : 'rounded-full px-4 py-2 text-sm text-white/45 transition-colors hover:text-white/80'
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowSettings((v) => !v)}
              aria-label="Settings"
              className={
                showSettings
                  ? 'rounded-full bg-white/10 p-2 text-white'
                  : 'rounded-full p-2 text-white/45 transition-colors hover:text-white'
              }
            >
              <Icon icon="lucide:settings" width={18} height={18} />
            </button>
          </div>

          {showSettings && (
            <div className="mb-3 rounded-2xl bg-white/[0.04] p-5">
              <div className="font-mono text-xs uppercase tracking-wider text-white/35">
                Privacy mode
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-white/[0.06] p-1">
                <button className="rounded-full bg-white py-2 text-xs font-medium text-black">
                  Public
                </button>
                <button
                  disabled
                  title="Shielded swaps are on the roadmap — see README"
                  className="cursor-not-allowed rounded-full py-2 text-xs text-white/25"
                >
                  Private (soon)
                </button>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/35">
                Swaps are public — reserves have to be, for pricing. Use Wrap to hold AKD privately.
              </p>
            </div>
          )}

          {tab === 'swap' && (
            <>
              <div className="relative">
                <div className="rounded-2xl bg-white/[0.04] p-5">
                  <div className="text-sm text-white/45">You send</div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <input
                      type="number"
                      value={amountIn}
                      onChange={(e) => setAmountIn(e.target.value)}
                      placeholder="0"
                      className="w-full bg-transparent text-4xl font-medium tracking-tight outline-none placeholder:text-white/20"
                    />
                    <span className="whitespace-nowrap rounded-full bg-white/10 px-4 py-2 font-mono text-sm">
                      {fromToken}
                    </span>
                  </div>
                </div>

                <div className="mt-1 rounded-2xl bg-white/[0.04] p-5">
                  <div className="text-sm text-white/45">You receive</div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-4xl font-medium tracking-tight text-white/80">
                      {amountOut !== null ? amountOut.toString() : '0'}
                    </span>
                    <span className="whitespace-nowrap rounded-full bg-white/10 px-4 py-2 font-mono text-sm">
                      {toToken}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() =>
                    setDirection((d) => (d === 'AkdToNight' ? 'NightToAkd' : 'AkdToNight'))
                  }
                  aria-label="Flip direction"
                  className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-xl border-4 border-black bg-white/10 p-2.5 transition-colors hover:bg-white/20"
                >
                  <Icon icon="lucide:arrow-down" width={16} height={16} />
                </button>
              </div>

              <button
                onClick={handleSwap}
                disabled={!connectedApi || amountOut === null || status === 'swapping'}
                className="mt-1 w-full rounded-2xl bg-white py-4 text-base font-medium text-black transition-colors hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-25"
              >
                {status === 'swapping' ? 'Swapping…' : 'Swap'}
              </button>

              <div className="mt-4 flex items-center justify-between font-mono text-xs text-white/30">
                <span>Base units · 6 decimals</span>
                {reserves && (
                  <span>
                    Pool {reserves.reserveAKD.toString()} / {reserves.reserveNight.toString()}
                  </span>
                )}
              </div>
            </>
          )}

          {tab === 'wrap' && (
            <div className="rounded-2xl bg-white/[0.04] p-5">
              <div className="text-sm text-white/45">Wrap to private</div>
              <p className="mt-2 text-sm leading-relaxed text-white/40">
                Converts public AKD into a native shielded coin — unlinkable to your public balance.
              </p>
              <input
                type="number"
                value={wrapAmount}
                onChange={(e) => setWrapAmount(e.target.value)}
                placeholder="0"
                className="mt-5 w-full bg-transparent text-4xl font-medium tracking-tight outline-none placeholder:text-white/20"
              />
              <button
                onClick={handleWrap}
                disabled={!connectedApi || !wrapAmount || wrapStatus === 'wrapping'}
                className="mt-5 w-full rounded-2xl bg-white py-4 text-base font-medium text-black transition-colors hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-25"
              >
                {wrapStatus === 'wrapping' ? 'Wrapping…' : 'Wrap'}
              </button>
              {wrapStatus === 'wrapped' && (
                <p className="mt-4 font-mono text-xs text-green-400">
                  Wrapped — check your wallet for the shielded balance.
                </p>
              )}
            </div>
          )}

          {tab === 'unwrap' && (
            <div className="rounded-2xl bg-white/[0.04] p-5">
              <div className="text-sm text-white/45">Unwrap to public</div>
              {wrappedCoin ? (
                <>
                  <p className="mt-2 text-sm leading-relaxed text-white/40">
                    Sends the shielded coin back to the contract and credits your public balance.
                  </p>
                  <div className="mt-5 text-4xl font-medium tracking-tight">
                    {wrappedCoin.value.toString()}{' '}
                    <span className="font-mono text-base text-white/40">AKD shielded</span>
                  </div>
                  <button
                    onClick={handleUnwrap}
                    disabled={!connectedApi || unwrapStatus === 'unwrapping'}
                    className="mt-5 w-full rounded-2xl bg-white py-4 text-base font-medium text-black transition-colors hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-25"
                  >
                    {unwrapStatus === 'unwrapping' ? 'Unwrapping…' : 'Unwrap'}
                  </button>
                </>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-white/40">
                  Nothing to unwrap. Wrap some AKD first — coins are tracked for the current session
                  only.
                </p>
              )}
              {unwrapStatus === 'unwrapped' && (
                <p className="mt-4 font-mono text-xs text-green-400">
                  Unwrapped — public balance restored.
                </p>
              )}
            </div>
          )}

          {tab === 'activity' && (
            <div className="rounded-2xl bg-white/[0.04] p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/45">This session</span>
                {/* Tambahkan tag pembuka <a ... > dan penutup </a> */}
                <a
                  href={`https://explorer.preview.midnight.network/contracts/stream/${SWAP_CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 font-mono text-xs text-white/40 transition-colors hover:text-white"
                >
                  Explorer
                  <Icon icon="lucide:arrow-up-right" width={13} height={13} />
                </a>
              </div>
              {history.length === 0 ? (
                <p className="mt-5 font-mono text-xs text-white/25">No swaps yet this session.</p>
              ) : (
                <ul className="mt-4 divide-y divide-white/5">
                  {history.map((h, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-4 py-3 font-mono text-xs text-white/50"
                    >
                      <span>
                        {h.amountIn} {h.from} → {h.amountOut} {h.to}
                      </span>
                      <span className="text-white/25">{h.time}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )} {/* <--- Ganti ) menjadi )} di sini */}

          {error && (
            <p className="mt-3 rounded-2xl bg-red-400/10 p-4 font-mono text-xs leading-relaxed text-red-300">
              {error}
            </p>
          )}
        </div>
      </div>  
    </main>
  );
}
