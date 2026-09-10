'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { SiteHeader } from '@/components/brand/site-header';
import { Spinner } from '@/components/icons/spinner';
import { getCompatibleWallets, connectWallet } from '@/lib/wallet';
import { claimFaucet } from '@/lib/akad-api';
import { recordActivity } from '@/lib/activity-api';
import { useNetwork } from '@/contexts/NetworkContext';
import { NetworkToggle } from '@/components/brand/network-toggle';

type ConnectResult = Awaited<ReturnType<typeof connectWallet>>;
type Status = 'idle' | 'connecting' | 'claiming' | 'claimed';

// Walks a caught error's .cause chain (up to two levels, matching how the
// wallet/indexer errors here are actually wrapped) down to the most
// specific message available, without resorting to `any`.
function errorDetail(err: unknown): string {
  if (err instanceof Error) {
    if (err.cause instanceof Error) {
      return err.cause.cause instanceof Error ? err.cause.cause.message : err.cause.message;
    }
    return err.message;
  }
  return String(err);
}

export default function FaucetPage() {
  const { networkKey, network } = useNetwork();
  const CONTRACT_ADDRESS = network.contractAddress;
  const [connectedApi, setConnectedApi] = useState<ConnectResult['connectedApi'] | null>(null);
  const [addresses, setAddresses] = useState<ConnectResult['addresses'] | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setConnectedApi(null);
    setAddresses(null);
    setStatus('idle');
    setError(null);
    // Only ever needs to react to networkKey changing -- deliberately not
    // depending on anything else here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkKey]);

  const handleConnect = async () => {
    setError(null);
    setStatus('connecting');
    try {
      const wallets = getCompatibleWallets();
      if (wallets.length === 0) {
        setError('No compatible wallet found. Install/unlock 1AM or Lace.');
        setStatus('idle');
        return;
      }
      const { connectedApi: api, addresses: addr } = await connectWallet(wallets[0]);
      setConnectedApi(api);
      setAddresses(addr);
      setStatus('idle');
    } catch (err) {
      setError(errorDetail(err));
      setStatus('idle');
    }
  };

  const handleClaim = async () => {
    if (!connectedApi || !addresses) return;
    setStatus('claiming');
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
      setStatus('claimed');
    } catch (err) {
      console.error('[Faucet]', err);
      setError(errorDetail(err));
      setStatus('idle');
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-black text-white selection:bg-white selection:text-black">
      <SiteHeader right={<NetworkToggle />} />

      <div className="relative flex flex-1 items-center overflow-hidden">
        {/* Large dimmed brand mark standing in for the big background
            graphic on Midnight's own preprod faucet page -- purely
            decorative, sits behind everything. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- static asset from /public, no next/image optimization needed for a decorative background mark */}
        <img
          src="/token/logo.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 top-1/2 h-[560px] w-[560px] -translate-y-1/2 -rotate-[8deg] opacity-[0.07] sm:h-[680px] sm:w-[680px]"
        />

        <div className="relative mx-auto w-full max-w-5xl px-6 py-20 sm:px-10">
          <div className="max-w-lg">
            <h1 className="text-5xl font-medium leading-[0.95] tracking-[-0.03em] sm:text-6xl">
              Akad {network.label} Faucet
            </h1>
            <p className="mt-5 text-base leading-relaxed text-white/50">
              Claim a one-time 50 AKD on Midnight&apos;s {network.label} testnet, enough to try a
              real swap. AKD has no real value, and each wallet can claim once per network.
            </p>

            <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              {!connectedApi ? (
                <>
                  <p className="text-sm leading-relaxed text-white/50">
                    Connect a Midnight wallet (1AM or Lace) on the {network.label} network to
                    claim.
                  </p>
                  <button
                    onClick={handleConnect}
                    disabled={status === 'connecting'}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-akd-accent py-3.5 text-base font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {status === 'connecting' && <Spinner className="h-4 w-4" />}
                    {status === 'connecting' ? 'Connecting…' : 'Connect wallet'}
                  </button>
                </>
              ) : (
                <>
                  <p className="font-mono text-xs text-white/40">Connected</p>
                  <p className="mt-1 truncate font-mono text-sm text-white/70">
                    {addresses?.unshieldedAddress}
                  </p>
                  <button
                    onClick={handleClaim}
                    disabled={status === 'claiming' || status === 'claimed'}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-akd-accent py-3.5 text-base font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {status === 'claiming' && <Spinner className="h-4 w-4" />}
                    {status === 'claiming'
                      ? 'Claiming…'
                      : status === 'claimed'
                        ? 'Claimed'
                        : 'Request 50 AKD'}
                  </button>
                </>
              )}

              {error && <p className="mt-4 text-sm leading-relaxed text-red-400">{error}</p>}
              {status === 'claimed' && (
                <p className="mt-4 font-mono text-xs text-green-400">
                  Sent — check your wallet, or look it up on the Activity feed.
                </p>
              )}
            </div>

            <p className="mt-6 text-sm text-white/30">
              Already have AKD to trade?{' '}
              <Link
                href="/swap"
                className="text-white/50 underline underline-offset-4 transition-colors hover:text-white"
              >
                Open the app
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
