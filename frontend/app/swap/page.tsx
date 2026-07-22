'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCompatibleWallets, connectWallet } from '@/lib/wallet';
import { getReserves, executeSwap } from '@/lib/swap-api';
import { computeSwapOutput, applySlippage } from '@/lib/bonding-curve';
import { wrapTokens } from '@/lib/token-api';
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
      const nonce = crypto.getRandomValues(new Uint8Array(32));
      await wrapTokens(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey,
        TOKEN_CONTRACT_ADDRESS,
        BigInt(wrapAmount)
      );
      setWrapStatus('wrapped');
      setWrapAmount('');
    } catch (err: any) {
      console.error('[Wrap]', err);
      const detail = err?.cause?.cause?.message || err?.cause?.message || err?.message || String(err);
      setError(detail);
      setWrapStatus('error');
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

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <span className="font-mono text-sm">Akad</span>
          {!connectedApi ? (
            <button
              onClick={handleConnect}
              className="text-xs font-mono rounded-full border border-white/20 px-4 py-1.5 hover:border-white/40 transition-colors"
            >
              Connect Wallet
            </button>
          ) : (
            <button
              onClick={() => {
                setConnectedApi(null);
                setAddresses(null);
                setReserves(null);
              }}
              className="text-xs font-mono text-white/40 hover:text-white/80 transition-colors"
              title="Disconnect"
            >
              {addresses.unshieldedAddress.slice(0, 10)}... ✕
            </button>
          )}
        </div>

        {/* Privacy mode toggle — Private is roadmap-only, honestly disabled */}
        <div className="flex gap-2 mb-4">
          <button className="flex-1 text-xs font-mono rounded-full bg-white text-black py-2">
            Public
          </button>
          <button
            disabled
            title="Shielded swaps are on the roadmap — see README"
            className="flex-1 text-xs font-mono rounded-full border border-white/10 text-white/30 py-2 cursor-not-allowed"
          >
            Private (soon)
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs text-white/40 mb-2 font-mono">You send</div>
          <div className="flex items-center justify-between">
            <input
              type="number"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              placeholder="0"
              className="bg-transparent text-3xl font-medium outline-none w-full"
            />
            <span className="font-mono text-sm text-white/60 whitespace-nowrap ml-3">{fromToken}</span>
          </div>
        </div>

        <div className="flex justify-center -my-3 relative z-10">
          <button
            onClick={() => setDirection((d) => (d === 'AkdToNight' ? 'NightToAkd' : 'AkdToNight'))}
            className="rounded-full bg-black border border-white/15 w-9 h-9 flex items-center justify-center hover:border-white/40 transition-colors"
            aria-label="Flip direction"
          >
            <Icon icon="lucide:arrow-down" width={16} height={16} />
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 mt-3">
          <div className="text-xs text-white/40 mb-2 font-mono">You receive</div>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-medium text-white/80">
              {amountOut !== null ? amountOut.toString() : '0'}
            </span>
            <span className="font-mono text-sm text-white/60 whitespace-nowrap ml-3">{toToken}</span>
          </div>
        </div>

        <button
          onClick={handleSwap}
          disabled={!connectedApi || amountOut === null || status === 'swapping'}
          className="w-full mt-4 rounded-full bg-white text-black py-3 text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 transition-colors"
        >
          {status === 'swapping' ? 'Swapping…' : 'Swap'}
        </button>

        {error && <p className="mt-4 text-xs text-red-400 font-mono">{error}</p>}

        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="text-xs text-white/40 mb-3 font-mono">Wrap to Private</div>
          <p className="text-xs text-white/40 mb-3 leading-relaxed">
            Converts public AKD into a native shielded coin — unlinkable to your public balance.
            Check your shielded balance in Lace after wrapping.
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              value={wrapAmount}
              onChange={(e) => setWrapAmount(e.target.value)}
              placeholder="Amount of AKD"
              className="bg-transparent border border-white/10 rounded-full px-4 py-2 text-sm outline-none flex-1"
            />
            <button
              onClick={handleWrap}
              disabled={!connectedApi || !wrapAmount || wrapStatus === 'wrapping'}
              className="rounded-full bg-white/10 border border-white/20 px-5 py-2 text-xs font-mono disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
            >
              {wrapStatus === 'wrapping' ? 'Wrapping…' : 'Wrap'}
            </button>
          </div>
          {wrapStatus === 'wrapped' && (
            <p className="mt-3 text-xs text-green-400 font-mono">Wrapped — check Lace for your shielded balance.</p>
          )}
        </div>

        {reserves && (
          <p className="mt-6 text-center text-xs text-white/30 font-mono">
            Pool: {reserves.reserveAKD.toString()} AKD / {reserves.reserveNight.toString()} tNIGHT
          </p>
        )}

        <div className="mt-10 flex items-center justify-between">
          <span className="text-xs font-mono text-white/40">Recent activity (this session)</span>
          
          <a
            href={`https://explorer.preview.midnight.network/contracts/stream/${SWAP_CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-white/40 hover:text-white/80 transition-colors underline"
          >
            View full history on explorer
          </a>
        </div>

        {history.length === 0 ? (
          <p className="mt-3 text-xs text-white/20 font-mono">No swaps yet this session.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {history.map((h, i) => (
              <li
                key={i}
                className="flex items-center justify-between text-xs font-mono text-white/50 border-b border-white/5 pb-2"
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
    </main>
  );
}
