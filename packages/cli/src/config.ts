import { readFileSync } from 'node:fs';
import { AkadError } from './errors.js';
import { NETWORKS, type NetworkName } from './networks.js';

/** Endpoints and addresses for one network, as stored in akad.config.json. */
export type RawNetworkConfig = {
  indexerHttp: string | null;
  indexerWs: string | null;
  nodeWs: string | null;
  proofServer: string | null;
  faucetUrl: string | null;
  akadV1Contract: string | null;
};

export type AkadConfig = {
  networks: Record<NetworkName, RawNetworkConfig>;
};

/** A network with every endpoint the wallet and indexer need. */
export type ResolvedNetwork = {
  name: NetworkName;
  indexerHttp: string;
  indexerWs: string;
  nodeWs: string;
  proofServer: string;
  faucetUrl: string | null;
  akadV1Contract: string | null;
};

const FIELDS: readonly (keyof RawNetworkConfig)[] = [
  'indexerHttp',
  'indexerWs',
  'nodeWs',
  'proofServer',
  'faucetUrl',
  'akadV1Contract',
];

/**
 * Reads and validates akad.config.json.
 *
 * @param path - Absolute path to the config file.
 * @returns The typed config.
 * @throws AkadError `CONFIG` when the file is missing, is not JSON, or lacks a
 *   network or field.
 */
export function loadConfig(path: string): AkadConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new AkadError('CONFIG', `Cannot read ${path}: ${(err as Error).message}`);
  }
  if (typeof parsed !== 'object' || parsed === null || !('networks' in parsed)) {
    throw new AkadError('CONFIG', `${path} has no "networks" object.`);
  }
  const networks = (parsed as { networks: Record<string, unknown> }).networks;
  for (const name of NETWORKS) {
    const entry = networks[name];
    if (typeof entry !== 'object' || entry === null) {
      throw new AkadError('CONFIG', `${path} has no entry for network "${name}".`);
    }
    for (const field of FIELDS) {
      const value = (entry as Record<string, unknown>)[field];
      if (value !== null && typeof value !== 'string') {
        throw new AkadError('CONFIG', `${path}: networks.${name}.${field} must be a string or null.`);
      }
    }
  }
  return parsed as AkadConfig;
}

/**
 * Returns the endpoints for one network, failing if any required one is unset.
 *
 * @param config - A loaded config.
 * @param network - A validated network name.
 * @returns The network with non-null endpoints.
 * @throws AkadError `NETWORK_NOT_CONFIGURED` when an indexer, node or proof
 *   server endpoint is null, as the local network is until spike S10.
 */
export function resolveNetwork(config: AkadConfig, network: NetworkName): ResolvedNetwork {
  const raw = config.networks[network];
  const { indexerHttp, indexerWs, nodeWs, proofServer } = raw;
  if (indexerHttp === null || indexerWs === null || nodeWs === null || proofServer === null) {
    throw new AkadError(
      'NETWORK_NOT_CONFIGURED',
      `Network "${network}" has no indexer, node or proof server endpoint in akad.config.json.`
    );
  }
  return {
    name: network,
    indexerHttp,
    indexerWs,
    nodeWs,
    proofServer,
    faucetUrl: raw.faucetUrl,
    akadV1Contract: raw.akadV1Contract,
  };
}
