'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getReserves,
  getMyAkdBalance,
  executeSwap,
  wrapTokens,
  unwrapTokens,
  getTokenColor,
  claimFaucet,
  privateSwapAkdToNight,
  privateSwapNightToAkd,
} from '@/lib/akad-api';
import { computeSwapOutput, applySlippage } from '@/lib/bonding-curve';
import { formatBaseUnits, parseToBaseUnits } from '@/lib/decimals';
import { recordActivity } from '@/lib/activity-api';
import { toHex, fromHex } from '@midnight-ntwrk/midnight-js-utils';
import { useNetwork } from '@/contexts/NetworkContext';
import { useWalletConnect } from '@/hooks/use-wallet-connect';
import { Icon } from '@iconify/react';
import { Spinner } from '@/components/icons/spinner';
import { SiteHeader } from '@/components/brand/site-header';
import { NetworkToggle } from '@/components/brand/network-toggle';
import { WalletConnectButton } from '@/components/brand/wallet-connect-button';
import { AkdTokenIcon, NightTokenIcon } from '@/components/icons/token-icon';

type Direction = 'AkdToNight' | 'NightToAkd';

// wrap() mints a shielded coin with a client-generated nonce that only
// this browser ever sees -- the wallet's own shielded-balance query later
// confirms the coin exists, but can't recover its nonce, which is what
// unwrap() needs to spend that exact coin. Persisting {nonce, value} to
// localStorage (keyed per network + contract + wallet) means a page
// refresh no longer makes "Unwrap" wrongly claim there's nothing to
// unwrap. This does NOT survive a different browser/device, or the user
// clearing site data -- a real fix for that would need the wallet to
// expose spendable-coin details beyond the aggregate balance it reports
// today (see getShieldedBalances() usage below), which isn't available.
function wrappedCoinStorageKey(networkKey: string, contractAddress: string, wallet: string): string {
  return `akad:wrappedCoin:${networkKey}:${contractAddress}:${wallet}`;
}

function saveWrappedCoin(key: string, coin: { nonce: Uint8Array; value: bigint }): void {
  try {
    window.localStorage.setItem(key, JSON.stringify({ nonce: toHex(coin.nonce), value: coin.value.toString() }));
  } catch (err) {
    console.error('[WrappedCoin] Failed to persist to localStorage:', err);
  }
}

function loadWrappedCoin(key: string): { nonce: Uint8Array; value: bigint } | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { nonce: string; value: string };
    // fromHex() returns a Node Buffer, not a plain Uint8Array -- the
    // compact-runtime rejects a Buffer for a Bytes<32> circuit argument
    // (this nonce gets passed straight into unwrap()), so re-wrap it.
    // Same root cause as the accountKey fix in getMyAkdBalance()
    // (akad-api.ts), confirmed live via a CompactError: "expected value
    // of type Bytes<32> but received <Buffer >".
    return { nonce: new Uint8Array(fromHex(parsed.nonce)), value: BigInt(parsed.value) };
  } catch (err) {
    console.error('[WrappedCoin] Failed to read from localStorage:', err);
    return null;
  }
}

function clearWrappedCoin(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch (err) {
    console.error('[WrappedCoin] Failed to clear localStorage:', err);
  }
}

function TokenPillIcon({ token }: { token: string }) {
  return token === 'AKD' ? (
    <AkdTokenIcon className="h-5 w-5" />
  ) : (
    <NightTokenIcon className="h-5 w-5" />
  );
}

export default function SwapPage() {
  const { networkKey, network } = useNetwork();
  const CONTRACT_ADDRESS = network.contractAddress;
  const wallet = useWalletConnect();
  const { connectedApi, addresses } = wallet;
  const [direction, setDirection] = useState<Direction>('AkdToNight');
  const [privateMode, setPrivateMode] = useState(false);
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState<bigint | null>(null);
  const [reserves, setReserves] = useState<{ reserveAKD: bigint; reserveNight: bigint } | null>(null);
  const [publicBalance, setPublicBalance] = useState<bigint | null>(null);
  const [shieldedBalance, setShieldedBalance] = useState<bigint | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesError, setBalancesError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [wrapAmount, setWrapAmount] = useState('');
  const [wrapStatus, setWrapStatus] = useState<string>('idle');
  const [wrappedCoin, setWrappedCoin] = useState<{ nonce: Uint8Array; value: bigint } | null>(null);
  const [unwrapStatus, setUnwrapStatus] = useState<string>('idle');
  const [tab, setTab] = useState<'swap' | 'wrap' | 'unwrap' | 'activity'>('swap');
  const [faucetStatus, setFaucetStatus] = useState<string>('idle');
  const [showSettings, setShowSettings] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [showPoolInfo, setShowPoolInfo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fromToken = direction === 'AkdToNight' ? 'AKD' : 'NIGHT';
  const toToken = direction === 'AkdToNight' ? 'NIGHT' : 'AKD';
  // Private AKD -> NIGHT spends the whole wrapped coin as-is (no
  // change-making in privateSwapAkdToNight()), so the "You send" amount
  // isn't freely typed in that mode -- it's locked to wrappedCoin.value.
  const privateAkdInputLocked = privateMode && direction === 'AkdToNight';

  // Skips the reset on the very first render (there's nothing to reset
  // yet) and fires only on an actual network change after that.
  const mountedNetworkRef = useRef(networkKey);
  useEffect(() => {
    if (mountedNetworkRef.current === networkKey) return;
    mountedNetworkRef.current = networkKey;
    setReserves(null);
    setWrappedCoin(null);
    setError(null);
  }, [networkKey]);

  // wallet.disconnect() (and the hook's own network-switch reset) clear
  // connectedApi without knowing about this page's reserves -- drop the
  // stale quote whenever the connection goes away.
  useEffect(() => {
    if (!connectedApi) {
      setReserves(null);
      setPublicBalance(null);
      setShieldedBalance(null);
    }
  }, [connectedApi]);

  // Rehydrates a wrapped coin persisted from a previous page load (see
  // saveWrappedCoin() above) once we know which wallet/network/contract to
  // look it up for. Runs again on network switch so each network's own
  // wrapped coin (if any) is picked up separately.
  useEffect(() => {
    if (!addresses) return;
    const stored = loadWrappedCoin(
      wrappedCoinStorageKey(networkKey, CONTRACT_ADDRESS, addresses.unshieldedAddress)
    );
    if (stored) setWrappedCoin(stored);
  }, [networkKey, CONTRACT_ADDRESS, addresses]);

  const refreshReserves = useCallback(async () => {
    if (!connectedApi || !addresses) return;
    try {
      const r = await getReserves(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey,
        CONTRACT_ADDRESS
      );
      setReserves(r);
    } catch (err) {
      console.error('[Reserves]', err);
    }
  }, [connectedApi, addresses]);

  // Reads both the public AKD balance (custom ledger map, see
  // getMyAkdBalance() in akad-api.ts) and the shielded AKD balance (a real
  // Zswap coin the wallet itself tracks) for the connected wallet. The
  // shielded lookup keys getShieldedBalances()'s Record<TokenType, bigint>
  // by AKD's hex-encoded token color -- this is the one piece not yet
  // smoke-tested live (no browser/wallet available in this dev session),
  // so verify the panel shows a sane number after a real wrap before
  // trusting it fully.
  const refreshBalances = useCallback(async () => {
    if (!connectedApi || !addresses) {
      setPublicBalance(null);
      setShieldedBalance(null);
      setBalancesError(null);
      return;
    }
    setBalancesLoading(true);
    setBalancesError(null);
    try {
      const [publicBal, color, shieldedBalances] = await Promise.all([
        getMyAkdBalance(
          connectedApi,
          addresses.shieldedCoinPublicKey,
          addresses.shieldedEncryptionPublicKey,
          CONTRACT_ADDRESS
        ),
        getTokenColor(
          connectedApi,
          addresses.shieldedCoinPublicKey,
          addresses.shieldedEncryptionPublicKey,
          CONTRACT_ADDRESS
        ),
        connectedApi.getShieldedBalances(),
      ]);
      const colorHex = toHex(color);
      const shieldedMap = shieldedBalances as Record<string, bigint>;
      setPublicBalance(publicBal);
      setShieldedBalance(shieldedMap[colorHex] ?? 0n);
    } catch (err) {
      console.error('[Balances] failed:', err);
      setBalancesError(err instanceof Error ? err.message : String(err));
      setPublicBalance(null);
      setShieldedBalance(null);
    } finally {
      setBalancesLoading(false);
    }
  }, [connectedApi, addresses]);

  // Lets footer/product links deep-link straight into a tab, e.g.
  // /swap?tab=wrap. Read on mount rather than via next/navigation's
  // useSearchParams(), which would force this page behind a Suspense
  // boundary for no benefit here -- nothing above depends on the tab
  // during the initial render.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('tab');
    if (requested === 'swap' || requested === 'wrap' || requested === 'unwrap' || requested === 'activity') {
      setTab(requested);
    }
  }, []);

  useEffect(() => {
    refreshReserves();
  }, [refreshReserves]);

  useEffect(() => {
    refreshBalances();
  }, [refreshBalances]);

  // In private AKD -> NIGHT mode the input isn't free-typed -- dx is fixed
  // to whatever's already wrapped, since privateSwapAkdToNight() spends the
  // whole coin (no change-making). Every other mode keeps using amountIn.
  useEffect(() => {
    if (!reserves) {
      setAmountOut(null);
      return;
    }
    const dx =
      privateMode && direction === 'AkdToNight' ? wrappedCoin?.value ?? null : parseToBaseUnits(amountIn);
    if (dx === null || dx <= 0n) {
      setAmountOut(null);
      return;
    }
    try {
      const [reserveIn, reserveOut] =
        direction === 'AkdToNight'
          ? [reserves.reserveAKD, reserves.reserveNight]
          : [reserves.reserveNight, reserves.reserveAKD];
      setAmountOut(computeSwapOutput(reserveIn, reserveOut, dx));
    } catch {
      setAmountOut(null);
    }
  }, [amountIn, direction, reserves, privateMode, wrappedCoin]);


  // Bootstraps a wallet that has never held AKD before with a one-time 50
  // AKD claim from the on-chain public faucet, so it can try a real swap
  // without the deployer manually transferring tokens to it first. Fails
  // on-chain (a clear assert message, not a crash) if this wallet already
  // claimed once, or if the faucet itself has run dry.
  const handleClaimFaucet = async () => {
    if (!connectedApi || !addresses) return;
    setFaucetStatus('claiming');
    setError(null);
    try {
      const { txId } = await claimFaucet(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey,
        CONTRACT_ADDRESS
      );
      recordActivity({
        txId,
        txType: 'claimFaucet',
        wallet: addresses.unshieldedAddress,
        amountOut: '50',
        tokenOut: 'AKD',
        network: networkKey,
      }).catch((err) => console.error('[Activity] Failed to record claimFaucet:', err));
      setFaucetStatus('claimed');
      await Promise.all([refreshReserves(), refreshBalances()]);
    } catch (err: any) {
      console.error('[Claim Faucet]', err);
      const detail = err?.cause?.cause?.message || err?.cause?.message || err?.message || String(err);
      setError(detail);
      setFaucetStatus('error');
    }
  };

  const handleWrap = async () => {
    if (!connectedApi || !addresses || !wrapAmount) return;
    const amount = parseToBaseUnits(wrapAmount);
    if (amount === null || amount <= 0n) {
      setError('Jumlah wrap tidak valid.');
      return;
    }
    setWrapStatus('wrapping');
    setError(null);
    try {
      const { nonce, value, txId } = await wrapTokens(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey,
        CONTRACT_ADDRESS,
        amount
      );
      setWrappedCoin({ nonce, value });
      saveWrappedCoin(wrappedCoinStorageKey(networkKey, CONTRACT_ADDRESS, addresses.unshieldedAddress), { nonce, value });
      setUnwrapStatus('idle');
      setWrapStatus('wrapped');
      recordActivity({
        txId,
        txType: 'wrap',
        wallet: addresses.unshieldedAddress,
        amountIn: formatBaseUnits(value),
        tokenIn: 'AKD',
        network: networkKey,
      }).catch((err) => console.error('[Activity] Failed to record wrap:', err));
      setWrapAmount('');
      await refreshBalances();
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
        CONTRACT_ADDRESS
      );
      const { txId } = await unwrapTokens(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey,
        CONTRACT_ADDRESS,
        { nonce: wrappedCoin.nonce, color, value: wrappedCoin.value }
      );
      recordActivity({
        txId,
        txType: 'unwrap',
        wallet: addresses.unshieldedAddress,
        amountIn: formatBaseUnits(wrappedCoin.value),
        tokenIn: 'AKD (shielded)',
        network: networkKey,
      }).catch((err) => console.error('[Activity] Failed to record unwrap:', err));
      clearWrappedCoin(wrappedCoinStorageKey(networkKey, CONTRACT_ADDRESS, addresses.unshieldedAddress));
      setWrappedCoin(null);
      setUnwrapStatus('unwrapped');
      await refreshBalances();
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
      const minOut = applySlippage(amountOut, 50); // 0.5% slippage tolerance

      if (privateMode && direction === 'AkdToNight') {
        if (!wrappedCoin) return;
        const color = await getTokenColor(
          connectedApi,
          addresses.shieldedCoinPublicKey,
          addresses.shieldedEncryptionPublicKey,
          CONTRACT_ADDRESS
        );
        const { txId } = await privateSwapAkdToNight(
          connectedApi,
          addresses.shieldedCoinPublicKey,
          addresses.shieldedEncryptionPublicKey,
          CONTRACT_ADDRESS,
          { nonce: wrappedCoin.nonce, color, value: wrappedCoin.value },
          amountOut,
          minOut
        );
        setStatus('swapped');
        recordActivity({
          txId,
          txType: 'privateSwapAkdToNight',
          wallet: addresses.unshieldedAddress,
          amountIn: formatBaseUnits(wrappedCoin.value),
          amountOut: formatBaseUnits(amountOut),
          tokenIn: 'AKD (shielded)',
          tokenOut: toToken,
          network: networkKey,
        }).catch((err) => console.error('[Activity] Failed to record privateSwapAkdToNight:', err));
        clearWrappedCoin(wrappedCoinStorageKey(networkKey, CONTRACT_ADDRESS, addresses.unshieldedAddress));
        setWrappedCoin(null);
        await Promise.all([refreshReserves(), refreshBalances()]);
        return;
      }

      if (privateMode && direction === 'NightToAkd') {
        const dx = parseToBaseUnits(amountIn);
        if (dx === null || dx <= 0n) {
          setError('Jumlah tidak valid.');
          setStatus('idle');
          return;
        }
        const { nonce, value, txId } = await privateSwapNightToAkd(
          connectedApi,
          addresses.shieldedCoinPublicKey,
          addresses.shieldedEncryptionPublicKey,
          CONTRACT_ADDRESS,
          dx,
          amountOut,
          minOut
        );
        setStatus('swapped');
        recordActivity({
          txId,
          txType: 'privateSwapNightToAkd',
          wallet: addresses.unshieldedAddress,
          amountIn: formatBaseUnits(dx),
          amountOut: formatBaseUnits(value),
          tokenIn: fromToken,
          tokenOut: 'AKD (shielded)',
          network: networkKey,
        }).catch((err) => console.error('[Activity] Failed to record privateSwapNightToAkd:', err));
        setWrappedCoin({ nonce, value });
        saveWrappedCoin(wrappedCoinStorageKey(networkKey, CONTRACT_ADDRESS, addresses.unshieldedAddress), { nonce, value });
        setUnwrapStatus('idle');
        setAmountIn('');
        await Promise.all([refreshReserves(), refreshBalances()]);
        return;
      }

      const dx = parseToBaseUnits(amountIn);
      if (dx === null || dx <= 0n) {
        setError('Jumlah tidak valid.');
        setStatus('idle');
        return;
      }
      const { txId } = await executeSwap(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey,
        CONTRACT_ADDRESS,
        direction,
        dx,
        amountOut,
        minOut
      );
      setStatus('swapped');
      recordActivity({
        txId,
        txType: direction === 'AkdToNight' ? 'swapAkdToNight' : 'swapNightToAkd',
        wallet: addresses.unshieldedAddress,
        amountIn: formatBaseUnits(dx),
        amountOut: formatBaseUnits(amountOut),
        tokenIn: fromToken,
        tokenOut: toToken,
        network: networkKey,
      }).catch((err) => console.error('[Activity] Failed to record swap:', err));
      setAmountIn('');
      await Promise.all([refreshReserves(), refreshBalances()]);
    } catch (err: any) {
      console.error('[Swap]', err);
      const detail = err?.cause?.cause?.message || err?.cause?.message || err?.message || String(err);
      setError(detail);
      setStatus('error');
    }
  };

  const tradeItems = [
    { id: 'swap', label: 'Swap', desc: 'AKD ⇄ NIGHT', icon: 'lucide:arrow-down-up' },
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
      {tradeOpen && (
        <button
          aria-hidden
          tabIndex={-1}
          onClick={() => setTradeOpen(false)}
          className="fixed inset-0 z-40 cursor-default"
        />
      )}

      <SiteHeader
        leftExtra={
          <div className="relative z-50 hidden sm:block">
            <button
              onClick={() => setTradeOpen((v) => !v)}
              aria-expanded={tradeOpen}
              className="flex items-center gap-1.5 text-base font-medium text-white/80 transition-colors hover:text-white sm:text-lg"
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
        }
        right={
          <div className="flex items-center gap-3">
            <NetworkToggle />
            <WalletConnectButton wallet={wallet} />
          </div>
        }
      />

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

          {connectedApi && (
            <div className="mb-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white/[0.04] px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-white/40">
                    <AkdTokenIcon className="h-3.5 w-3.5" />
                    Public AKD
                  </div>
                  <div className="mt-1 font-mono text-lg tabular-nums">
                    {balancesLoading ? (
                      <Spinner className="h-4 w-4" />
                    ) : balancesError ? (
                      <span className="text-base text-red-400/70">Couldn&apos;t load</span>
                    ) : (
                      formatBaseUnits(publicBalance ?? 0n)
                    )}
                  </div>
                </div>
                <div className="rounded-2xl bg-white/[0.04] px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-white/40">
                    <Icon icon="lucide:shield" width={14} height={14} />
                    Private AKD (shielded)
                  </div>
                  <div className="mt-1 font-mono text-lg tabular-nums">
                    {balancesLoading ? (
                      <Spinner className="h-4 w-4" />
                    ) : balancesError ? (
                      <span className="text-base text-red-400/70">Couldn&apos;t load</span>
                    ) : (
                      formatBaseUnits(shieldedBalance ?? 0n)
                    )}
                  </div>
                </div>
              </div>
              {balancesError && (
                <p className="mt-2 text-xs leading-relaxed text-red-400/60">
                  Balance check failed: {balancesError}. Your funds are unaffected, this is just a
                  display error, check the browser console for details.
                </p>
              )}
            </div>
          )}

          {showSettings && (
            <div className="mb-3 rounded-2xl bg-white/[0.04] p-5">
              <div className="font-mono text-xs uppercase tracking-wider text-white/35">
                Privacy mode
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-white/[0.06] p-1">
                <button
                  onClick={() => setPrivateMode(false)}
                  className={
                    !privateMode
                      ? 'rounded-full bg-white py-2 text-xs font-medium text-black'
                      : 'rounded-full py-2 text-xs text-white/45 transition-colors hover:text-white'
                  }
                >
                  Public
                </button>
                <button
                  onClick={() => setPrivateMode(true)}
                  className={
                    privateMode
                      ? 'rounded-full bg-white py-2 text-xs font-medium text-black'
                      : 'rounded-full py-2 text-xs text-white/45 transition-colors hover:text-white'
                  }
                >
                  Private
                </button>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/35">
                {privateMode
                  ? direction === 'AkdToNight'
                    ? 'Spends a shielded AKD coin directly -- wrap AKD first, then swap it here without a public balance ever being touched.'
                    : 'Your AKD output is minted as a fresh shielded coin instead of a public credit -- unwrap it afterward from the Unwrap tab.'
                  : 'Swaps are public -- reserves have to be, for pricing. Use Wrap to hold AKD privately.'}
              </p>
            </div>
          )}

          {tab === 'swap' && (
            <>
              <div className="relative rounded-2xl bg-white/[0.04]">
                <div className="p-5 pb-6">
                  <div className="text-sm text-white/45">You send</div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    {privateAkdInputLocked ? (
                      <span className="text-4xl font-medium tracking-tight">
                        {wrappedCoin ? formatBaseUnits(wrappedCoin.value) : '0'}
                      </span>
                    ) : (
                      <input
                        type="number"
                        value={amountIn}
                        onChange={(e) => setAmountIn(e.target.value)}
                        placeholder="0"
                        className="w-full bg-transparent text-4xl font-medium tracking-tight outline-none placeholder:text-white/20"
                      />
                    )}
                    <span className="flex items-center gap-2 whitespace-nowrap rounded-full bg-white/10 py-2 pl-2 pr-4 font-mono text-sm">
                      <TokenPillIcon token={fromToken} />
                      {fromToken}
                    </span>
                  </div>
                  {privateAkdInputLocked && !wrappedCoin && (
                    <p className="mt-2 text-xs leading-relaxed text-white/35">
                      Nothing wrapped yet.{' '}
                      <button onClick={() => setTab('wrap')} className="underline hover:text-white">
                        Wrap some AKD
                      </button>{' '}
                      first, then come back here to spend it privately.
                    </p>
                  )}
                  {privateAkdInputLocked && wrappedCoin && (
                    <p className="mt-2 text-xs leading-relaxed text-white/35">
                      Spends your whole wrapped coin -- wrap a different amount first to change this.
                    </p>
                  )}
                </div>

                <div className="h-px bg-white/[0.06]" />

                <div className="p-5 pt-6">
                  <div className="text-sm text-white/45">You receive</div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-4xl font-medium tracking-tight text-white/80">
                      {amountOut !== null ? formatBaseUnits(amountOut) : '0'}
                    </span>
                    <span className="flex items-center gap-2 whitespace-nowrap rounded-full bg-white/10 py-2 pl-2 pr-4 font-mono text-sm">
                      <TokenPillIcon token={toToken} />
                      {toToken}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() =>
                    setDirection((d) => (d === 'AkdToNight' ? 'NightToAkd' : 'AkdToNight'))
                  }
                  aria-label="Flip direction"
                  className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-xl border-4 border-black bg-white/10 p-2.5 transition-colors hover:bg-akd-accent hover:text-black"
                >
                  <Icon icon="lucide:arrow-down" width={16} height={16} />
                </button>
              </div>

              <button
                onClick={handleSwap}
                disabled={
                  !connectedApi ||
                  amountOut === null ||
                  status === 'swapping' ||
                  (privateAkdInputLocked && !wrappedCoin)
                }
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-akd-accent py-4 text-base font-medium text-black disabled:cursor-not-allowed disabled:opacity-25"
              >
                {status === 'swapping' && <Spinner className="h-4 w-4" />}
                {status === 'swapping' ? 'Swapping…' : privateMode ? 'Swap privately' : 'Swap'}
              </button>

              {reserves && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowPoolInfo((v) => !v)}
                    className="flex w-full items-center justify-end gap-1.5 font-mono text-xs text-white/30 transition-colors hover:text-white/60"
                  >
                    <span>
                      Pool {formatBaseUnits(reserves.reserveAKD)} AKD / {formatBaseUnits(reserves.reserveNight)} NIGHT
                    </span>
                    <Icon icon="lucide:info" width={13} height={13} />
                  </button>
                  {showPoolInfo && (
                    <p className="mt-2 rounded-xl bg-white/[0.03] p-3 text-right text-xs leading-relaxed text-white/40">
                      This is how much AKD and NIGHT the pool itself is holding right now. Akad prices
                      trades off these two numbers (a constant-product formula, x times y stays
                      constant), so the rate moves a little with every trade, and a bigger pool means
                      less price impact per trade. That is also why &quot;You receive&quot; is never an
                      exact 1:1 amount, even with no fees.
                    </p>
                  )}
                </div>
              )}

              {connectedApi && (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] px-5 py-3">
                  <p className="text-xs leading-relaxed text-white/35">
                    New wallet, no AKD yet? Claim a one-time 50 AKD from the testnet faucet.
                  </p>
                  <button
                    onClick={handleClaimFaucet}
                    disabled={faucetStatus === 'claiming'}
                    className="flex items-center gap-2 whitespace-nowrap rounded-full bg-white/10 px-4 py-2 font-mono text-xs text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {faucetStatus === 'claiming' && <Spinner className="h-3.5 w-3.5" />}
                    {faucetStatus === 'claiming' ? 'Claiming…' : faucetStatus === 'claimed' ? 'Claimed' : 'Claim faucet'}
                  </button>
                </div>
              )}
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
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-akd-accent py-4 text-base font-medium text-black disabled:cursor-not-allowed disabled:opacity-25"
              >
                {wrapStatus === 'wrapping' && <Spinner className="h-4 w-4" />}
                {wrapStatus === 'wrapping' ? 'Wrapping…' : 'Wrap'}
              </button>
              {wrapStatus === 'wrapped' && (
                <div className="mt-4 space-y-2">
                  <p className="font-mono text-xs text-green-400">
                    Wrapped — check your wallet for the shielded balance.
                  </p>
                  <p className="text-xs leading-relaxed text-white/35">
                    Spend it directly in a{' '}
                    <button
                      onClick={() => {
                        setTab('swap');
                        setDirection('AkdToNight');
                        setPrivateMode(true);
                      }}
                      className="underline hover:text-white"
                    >
                      private swap
                    </button>
                    , or unwrap it back to public AKD from the Unwrap tab.
                  </p>
                </div>
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
                  <div className="mt-5 flex items-center gap-3 text-4xl font-medium tracking-tight">
                    <span>{formatBaseUnits(wrappedCoin.value)}</span>
                    <span className="flex items-center gap-1.5 font-mono text-base text-white/40">
                      <AkdTokenIcon className="h-5 w-5" />
                      AKD shielded
                    </span>
                  </div>
                  <button
                    onClick={handleUnwrap}
                    disabled={!connectedApi || unwrapStatus === 'unwrapping'}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-akd-accent py-4 text-base font-medium text-black disabled:cursor-not-allowed disabled:opacity-25"
                  >
                    {unwrapStatus === 'unwrapping' && <Spinner className="h-4 w-4" />}
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
            <div className="rounded-2xl bg-white/[0.04] p-8 text-center">
              <p className="text-sm leading-relaxed text-white/45">
                Every wrap, unwrap, and swap made through Akad, verified against the chain
                and shown for every user, not just this session.
              </p>
              <Link
                href="/activity"
                className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-akd-accent px-6 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white"
              >
                View Activity
                <Icon icon="lucide:arrow-up-right" width={14} height={14} />
              </Link>
            </div>
          )}

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
