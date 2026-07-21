import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { NETWORK_ID } from './wallet-constants';
setNetworkId(NETWORK_ID); // NetworkId is just a string in this SDK version (4.1.1), not an enum

import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { dappConnectorProofProvider } from '@midnight-ntwrk/midnight-js-dapp-connector-proof-provider';
import { createMemoryPrivateStateProvider } from './memory-private-state-provider';
import { toHex, fromHex } from '@midnight-ntwrk/midnight-js-utils';
import { Transaction, CostModel } from '@midnight-ntwrk/ledger-v8';
import {
  INDEXER_HTTP,
  INDEXER_WS,
  CONTRACT_PATH,
  PRIVATE_STATE_ID,
  PRIVATE_STATE_PASSWORD,
} from './wallet-constants';

// Assembles every provider Midnight.js needs to deploy/interact with a contract,
// delegating proof generation to the connected wallet (not our local proof server).
// Singleton so the same in-memory state persists across separate
// buildProviders() calls within one page session (e.g. deploy then init()).
let _privateStateProvider: any = null;
function getPrivateStateProvider() {
  if (!_privateStateProvider) {
    _privateStateProvider = createMemoryPrivateStateProvider();
  }
  return _privateStateProvider;
}

export async function buildProviders(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string,
  contractAddress?: string,
  zkContractPath: string = CONTRACT_PATH
) {
  const zkConfigProvider = new FetchZkConfigProvider(
    `${window.location.origin}${zkContractPath}`,
    fetch.bind(window)
  );

  const privateStateProvider = getPrivateStateProvider();

  if (contractAddress) {
    privateStateProvider.setContractAddress(contractAddress);
  }

  return {
    privateStateProvider,
    publicDataProvider: indexerPublicDataProvider(INDEXER_HTTP, INDEXER_WS),
    zkConfigProvider,
    proofProvider: await dappConnectorProofProvider(
      connectedApi,
      zkConfigProvider,
      CostModel.initialCostModel()
    ),
    walletProvider: {
      getCoinPublicKey: () => coinPublicKey,
      getEncryptionPublicKey: () => encryptionPublicKey,
      async balanceTx(tx: any): Promise<any> {
        const serializedTx = toHex(tx.serialize());
        const received = await connectedApi.balanceUnsealedTransaction(serializedTx);
        return Transaction.deserialize('signature', 'proof', 'binding', fromHex(received.tx));
      },
    },
    midnightProvider: {
      async submitTx(tx: any): Promise<string> {
        await connectedApi.submitTransaction(toHex(tx.serialize()));
        const ids = (tx as any).identifiers?.();
        return ids?.[0] ?? '';
      },
    },
  };
}
