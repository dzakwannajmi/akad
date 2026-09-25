import type { CliContext } from './context.js';
import { deriveWalletKeys, type WalletKeys } from './keys.js';
import { sdkNetworkId, type NetworkName } from './networks.js';
import { assertSeedAllowed, readSeed } from './secrets.js';

/**
 * Loads an existing wallet: reads its seed from the environment, refuses test
 * seeds on public networks, and derives its keys.
 *
 * @param ctx - CLI context.
 * @param name - A validated wallet name.
 * @param network - Target network.
 * @returns The wallet's keys and addresses.
 * @throws AkadError `WALLET_NOT_FOUND`, `INVALID_SEED` or
 *   `TEST_SEED_ON_PUBLIC_NETWORK`.
 */
export function loadWallet(ctx: CliContext, name: string, network: NetworkName): WalletKeys {
  const seed = readSeed(ctx.env, name);
  assertSeedAllowed(seed, network);
  return deriveWalletKeys(name, seed, sdkNetworkId(network), ctx.secrets);
}
