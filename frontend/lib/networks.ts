// Per-network configuration for Akad. The compiled contract, its ZK assets,
// and the private-state scheme (see wallet-constants.ts) are identical on
// every network -- only the indexer endpoints, the wallet's connect()
// target, and the deployed contract's address differ. Preview and Preprod
// are separate chain states: the same contract source deployed to each
// gets its own address, so NEXT_PUBLIC_AKAD_CONTRACT_ADDRESS_PREPROD has to
// be set from a real Preprod deployment (see docs/TROUBLESHOOTING.md) --
// until then the Preprod entry below is reachable in the UI but has no
// contract to actually call.
export type NetworkKey = 'preview' | 'preprod';

export type NetworkConfig = {
  id: NetworkKey;
  label: string;
  indexerHttp: string;
  indexerWs: string;
  contractAddress: string;
};

export const NETWORKS: Record<NetworkKey, NetworkConfig> = {
  preview: {
    id: 'preview',
    label: 'Preview',
    indexerHttp:
      process.env.NEXT_PUBLIC_INDEXER_HTTP_PREVIEW ??
      'https://indexer.preview.midnight.network/api/v4/graphql',
    indexerWs:
      process.env.NEXT_PUBLIC_INDEXER_WS_PREVIEW ??
      'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
    contractAddress: process.env.NEXT_PUBLIC_AKAD_CONTRACT_ADDRESS_PREVIEW ?? '',
  },
  preprod: {
    id: 'preprod',
    label: 'Preprod',
    indexerHttp:
      process.env.NEXT_PUBLIC_INDEXER_HTTP_PREPROD ??
      'https://indexer.preprod.midnight.network/api/v4/graphql',
    indexerWs:
      process.env.NEXT_PUBLIC_INDEXER_WS_PREPROD ??
      'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
    contractAddress: process.env.NEXT_PUBLIC_AKAD_CONTRACT_ADDRESS_PREPROD ?? '',
  },
};

export const DEFAULT_NETWORK: NetworkKey =
  process.env.NEXT_PUBLIC_DEFAULT_NETWORK === 'preprod' ? 'preprod' : 'preview';

const STORAGE_KEY = 'akad-network';

function readStoredNetwork(): NetworkKey | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === 'preview' || raw === 'preprod' ? raw : null;
}

// Plain module-level store (not React state) so code that isn't a
// component -- lib/providers.ts, lib/wallet.ts -- can read the current
// network without needing it threaded through every function signature.
// NetworkContext (contexts/NetworkContext.tsx) is the single writer: it
// owns the React state for re-renders and calls setCurrentNetwork()
// whenever the user switches the toggle, which is also where
// localStorage gets updated and subscribers get notified.
let currentNetwork: NetworkKey = readStoredNetwork() ?? DEFAULT_NETWORK;
const subscribers = new Set<(network: NetworkKey) => void>();

export function getCurrentNetwork(): NetworkConfig {
  return NETWORKS[currentNetwork];
}

export function getCurrentNetworkKey(): NetworkKey {
  return currentNetwork;
}

export function setCurrentNetwork(network: NetworkKey): void {
  if (network === currentNetwork) return;
  currentNetwork = network;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, network);
  }
  subscribers.forEach((fn) => fn(network));
}

// Lets NetworkContext re-render on changes that originate elsewhere (there
// currently aren't any, but this keeps the module store and React state
// from being able to drift if that ever changes). Returns an unsubscribe.
export function subscribeToNetwork(fn: (network: NetworkKey) => void): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}
