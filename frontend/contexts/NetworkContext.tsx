'use client';

// Global network selection (Preview / Preprod), so every page's wallet
// connect, contract calls, and activity recording agree on the same
// network without each one re-deriving it. Backed by lib/networks.ts's
// module-level store (the single source of truth non-component code
// reads from) -- this context just gives components a re-rendering,
// React-friendly view of that same store plus the setter.
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  DEFAULT_NETWORK,
  NETWORKS,
  getCurrentNetworkKey,
  setCurrentNetwork,
  type NetworkConfig,
  type NetworkKey,
} from '@/lib/networks';

type NetworkContextType = {
  networkKey: NetworkKey;
  network: NetworkConfig;
  setNetworkKey: (key: NetworkKey) => void;
};

const NetworkContext = createContext<NetworkContextType | null>(null);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  // Starts from DEFAULT_NETWORK (matches server-rendered markup) and syncs
  // to whatever's in localStorage right after mount, to avoid a
  // hydration mismatch if the stored preference differs from the default.
  const [networkKey, setNetworkKeyState] = useState<NetworkKey>(DEFAULT_NETWORK);

  useEffect(() => {
    setNetworkKeyState(getCurrentNetworkKey());
  }, []);

  const setNetworkKey = useCallback((key: NetworkKey) => {
    setCurrentNetwork(key);
    setNetworkKeyState(key);
  }, []);

  return (
    <NetworkContext.Provider value={{ networkKey, network: NETWORKS[networkKey], setNetworkKey }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork(): NetworkContextType {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error('useNetwork must be used within a NetworkProvider');
  return ctx;
}
