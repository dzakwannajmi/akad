import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { getCurrentNetwork, type NetworkConfig } from './networks';

// Reading a contract's public ledger state needs nothing from the wallet:
// only the indexer. buildProviders() in providers.ts additionally builds a
// proof provider and a wallet provider from the connected DApp connector,
// which is why every reader in akad-api.ts takes a `connectedApi` it never
// actually uses for the read itself. The practical cost of that was that a
// visitor had to connect a wallet before they could see so much as the
// pool's reserves.
//
// This builds the single provider a read genuinely needs, so read-only
// pages work for anyone with a browser, no wallet installed.
export function buildReadOnlyProviders(): {
  network: NetworkConfig;
  publicDataProvider: ReturnType<typeof indexerPublicDataProvider>;
} {
  const network = getCurrentNetwork();
  // Global SDK setting, and the network is switchable at runtime, so it has
  // to be set on every call rather than once at module load.
  setNetworkId(network.id);

  return {
    network,
    publicDataProvider: indexerPublicDataProvider(network.indexerHttp, network.indexerWs),
  };
}
