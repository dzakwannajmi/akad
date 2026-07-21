import semver from 'semver';
import type { InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import { COMPATIBLE_CONNECTOR_API_VERSION, NETWORK_ID } from './wallet-constants';

// Finds installed wallet extensions compatible with connector API v4.x.
export function getCompatibleWallets(): InitialAPI[] {
  if (typeof window === 'undefined' || !window.midnight) return [];

  return Object.values(window.midnight).filter(
    (wallet): wallet is InitialAPI =>
      !!wallet &&
      typeof wallet === 'object' &&
      'apiVersion' in wallet &&
      semver.satisfies(wallet.apiVersion, COMPATIBLE_CONNECTOR_API_VERSION)
  );
}

// Connects to a specific wallet (e.g. Lace) on the Preview network.
export async function connectWallet(wallet: InitialAPI) {
  const connectedApi = await wallet.connect(NETWORK_ID);  
  const status = await connectedApi.getConnectionStatus();

  if (status.status !== 'connected') {
    throw new Error(`Wallet status: ${status.status}`);
  }

  const config = await connectedApi.getConfiguration();
  const shielded = await connectedApi.getShieldedAddresses();
  const unshielded = await connectedApi.getUnshieldedAddress();
  const dust = await connectedApi.getDustAddress();

  console.log('[Wallet] Configuration from wallet:', config);

  return {
    connectedApi,
    config,
    addresses: {
      shieldedAddress: shielded.shieldedAddress,
      shieldedCoinPublicKey: shielded.shieldedCoinPublicKey,
      shieldedEncryptionPublicKey: shielded.shieldedEncryptionPublicKey,
      unshieldedAddress: unshielded.unshieldedAddress,
      dustAddress: dust.dustAddress,
    },
  };
}
