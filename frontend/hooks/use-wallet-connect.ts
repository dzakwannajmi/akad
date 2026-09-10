'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import { getCompatibleWallets, connectWallet } from '@/lib/wallet';
import { useNetwork } from '@/contexts/NetworkContext';

type ConnectResult = Awaited<ReturnType<typeof connectWallet>>;

// Shared connect flow for swap/faucet/deploy -- backs the dropdown in
// components/brand/wallet-connect-button.tsx (a Base UI Menu, matching the
// shadcn base/select look used for network selection). Always lists
// detected wallets in the dropdown rather than silently auto-connecting
// when exactly one is installed: that made it impossible to see the
// "Detected"/"Active" status the dropdown is meant to surface for the
// (very common) single-wallet case.
export function useWalletConnect() {
  const { networkKey } = useNetwork();
  const [connectedApi, setConnectedApi] = useState<ConnectResult['connectedApi'] | null>(null);
  const [connectedWallet, setConnectedWallet] = useState<InitialAPI | null>(null);
  const [addresses, setAddresses] = useState<ConnectResult['addresses'] | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerWallets, setPickerWallets] = useState<InitialAPI[]>([]);

  // A connected wallet session is tied to the network it connected under
  // (see lib/networks.ts / lib/wallet.ts) -- drop it on switch rather than
  // let pages keep acting on a stale connection.
  const mountedNetworkRef = useRef(networkKey);
  useEffect(() => {
    if (mountedNetworkRef.current === networkKey) return;
    mountedNetworkRef.current = networkKey;
    setConnectedApi((prev) => (prev ? null : prev));
    setConnectedWallet((prev) => (prev ? null : prev));
    setAddresses((prev) => (prev ? null : prev));
  }, [networkKey]);

  const pick = useCallback(async (wallet: InitialAPI) => {
    setPickerOpen(false);
    setConnecting(true);
    try {
      const { connectedApi: api, addresses: addr } = await connectWallet(wallet);
      setConnectedApi(api);
      setConnectedWallet(wallet);
      setAddresses(addr);
      toast.success(`Connected to ${wallet.name}`, {
        description: `${addr.unshieldedAddress.slice(0, 12)}…`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Couldn't connect to ${wallet.name}`, { description: msg });
    } finally {
      setConnecting(false);
    }
  }, []);

  // Fully controls the dropdown's open state (rather than letting the Menu
  // toggle itself) so a zero-wallets click can surface a toast instead of
  // opening an empty popup.
  const onPickerOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setPickerOpen(false);
      return;
    }
    const wallets = getCompatibleWallets();
    if (wallets.length === 0) {
      toast.error('No compatible wallet found', {
        description: 'Install or unlock 1AM or Lace, then try again.',
      });
      return;
    }
    setPickerWallets(wallets);
    setPickerOpen(true);
  }, []);

  const disconnect = useCallback(() => {
    setConnectedApi(null);
    setConnectedWallet(null);
    setAddresses(null);
    toast('Wallet disconnected');
  }, []);

  return {
    connectedApi,
    connectedWallet,
    addresses,
    connecting,
    pickerOpen,
    pickerWallets,
    onPickerOpenChange,
    pick,
    disconnect,
  };
}
