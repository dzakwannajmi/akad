import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { NetworkName } from './networks.js';

/**
 * Serialized sync state of one wallet on one network. It holds public keys,
 * local coin state, nullifiers and sync offsets, and no secret key; the wallet
 * SDK takes secret keys separately at start. It still reveals which coins
 * belong to the wallet, so it stays out of git and is readable by the owner
 * only. Without it every command re-scans the chain from index 0, which took
 * minutes on Preview for a fresh wallet (measured 26 Sep 2026).
 */
export type WalletCache = {
  version: 1;
  network: NetworkName;
  unshieldedAddress: string;
  shielded: string;
  unshielded: string;
  dust: string;
  savedAt: string;
};

/**
 * Returns the cache file for a wallet.
 *
 * @param repoRoot - Repository root; the cache lives in `.akad-cache/`.
 * @param network - Network name.
 * @param wallet - Wallet name.
 * @returns Absolute path.
 */
export function cachePath(repoRoot: string, network: NetworkName, wallet: string): string {
  return join(repoRoot, '.akad-cache', 'wallets', network, `${wallet}.json`);
}

/**
 * Reads a wallet cache if it exists and belongs to this wallet.
 *
 * @param path - Cache file path.
 * @param network - Expected network.
 * @param unshieldedAddress - Expected address, which ties the cache to the seed.
 * @returns The cache, or null when absent, unreadable, or for another wallet.
 */
export function readWalletCache(path: string, network: NetworkName, unshieldedAddress: string): WalletCache | null {
  if (!existsSync(path)) return null;
  try {
    const cache = JSON.parse(readFileSync(path, 'utf8')) as Partial<WalletCache>;
    const valid =
      cache.version === 1 &&
      cache.network === network &&
      cache.unshieldedAddress === unshieldedAddress &&
      typeof cache.shielded === 'string' &&
      typeof cache.unshielded === 'string' &&
      typeof cache.dust === 'string';
    return valid ? (cache as WalletCache) : null;
  } catch {
    return null;
  }
}

/**
 * Writes a wallet cache atomically with mode 0600 in a 0700 directory.
 *
 * @param path - Cache file path.
 * @param cache - The state to store.
 */
export function writeWalletCache(path: string, cache: WalletCache): void {
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify(cache), { mode: 0o600 });
  renameSync(temp, path);
}
