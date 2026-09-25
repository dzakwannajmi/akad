import { AkadError } from './errors.js';

/** The only networks the CLI accepts. Mainnet is out of scope (ADR-24). */
export const NETWORKS = ['local', 'preview', 'preprod'] as const;

export type NetworkName = (typeof NETWORKS)[number];

/**
 * Validates a `--network` value.
 *
 * @param value - Raw flag value, possibly undefined.
 * @returns The network name.
 * @throws AkadError `INVALID_NETWORK` for a missing value, `mainnet`, or any
 *   name outside {@link NETWORKS}.
 */
export function parseNetwork(value: string | undefined): NetworkName {
  if (value === undefined || value === '') {
    throw new AkadError('INVALID_NETWORK', `--network is required: one of ${NETWORKS.join(', ')}.`);
  }
  if ((NETWORKS as readonly string[]).includes(value)) {
    return value as NetworkName;
  }
  if (value === 'mainnet') {
    throw new AkadError('INVALID_NETWORK', 'Mainnet is out of scope for the Akad CLI. Use local, preview or preprod.');
  }
  throw new AkadError('INVALID_NETWORK', `Unknown network "${value}". Use one of ${NETWORKS.join(', ')}.`);
}

/**
 * Maps a CLI network to the network id the Midnight SDKs expect.
 *
 * @param network - A validated network name.
 * @returns `undeployed` for the local network, otherwise the same name.
 */
export function sdkNetworkId(network: NetworkName): 'undeployed' | 'preview' | 'preprod' {
  return network === 'local' ? 'undeployed' : network;
}

/**
 * Tells whether a network is public, where fixed test seeds are refused.
 *
 * @param network - A validated network name.
 * @returns True for preview and preprod.
 */
export function isPublicNetwork(network: NetworkName): boolean {
  return network !== 'local';
}
