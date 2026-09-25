import { createHash } from 'node:crypto';
import { appendFileSync, chmodSync, existsSync, readFileSync } from 'node:fs';
import { inspect } from 'node:util';
import { generateRandomSeed } from '@midnight-ntwrk/wallet-sdk/hd';
import { AkadError } from './errors.js';
import { isPublicNetwork, type NetworkName } from './networks.js';

const WALLET_NAME = /^a[0-9]+$/;
const SEED_HEX = /^[0-9a-f]{64}$/;

/**
 * SHA-256 digests of the fixed seeds used by the test suite. The seeds
 * themselves live only in test code; the CLI keeps their digests so it can
 * refuse them on public networks without ever holding the values.
 */
export const KNOWN_TEST_SEED_SHA256: readonly string[] = [
  'afa880ca0c7da502fc32ab284cf70852ef7c5540204e4215c2a1617074ca7905',
];

/**
 * Validates a wallet name such as `a0` or `a12`.
 *
 * @param value - Raw `--name` value.
 * @returns The same name.
 * @throws AkadError `INVALID_WALLET_NAME` for anything else.
 */
export function parseWalletName(value: string | undefined): string {
  if (value === undefined || !WALLET_NAME.test(value)) {
    throw new AkadError('INVALID_WALLET_NAME', 'Wallet names are a0, a1, a2 and so on.');
  }
  return value;
}

/**
 * Returns the environment variable that holds a wallet's seed.
 *
 * @param name - A validated wallet name.
 * @returns For example `AKAD_SEED_A1`.
 */
export function seedVariable(name: string): string {
  return `AKAD_SEED_${name.toUpperCase()}`;
}

/**
 * A wallet seed. Printing, logging or serialising it yields a placeholder, so
 * a stray `console.log(seed)` or `JSON.stringify` cannot leak it.
 */
export class Seed {
  readonly #hex: string;

  private constructor(hex: string) {
    this.#hex = hex;
  }

  /**
   * Parses a 64-character hex seed.
   *
   * @param hex - The seed as read from the environment.
   * @returns The seed.
   * @throws AkadError `INVALID_SEED`; the message never includes the value.
   */
  static fromHex(hex: string): Seed {
    const normalized = hex.trim().toLowerCase();
    if (!SEED_HEX.test(normalized)) {
      throw new AkadError('INVALID_SEED', 'A wallet seed must be 64 hex characters.');
    }
    return new Seed(normalized);
  }

  /**
   * Generates a fresh random seed with the wallet SDK's generator.
   *
   * @returns A new 32-byte seed.
   */
  static generate(): Seed {
    return new Seed(Buffer.from(generateRandomSeed()).toString('hex'));
  }

  /** The seed bytes, for key derivation only. */
  bytes(): Uint8Array {
    return Buffer.from(this.#hex, 'hex');
  }

  /** The seed as hex, for writing to .env.automation only. */
  revealHexForStorage(): string {
    return this.#hex;
  }

  /** SHA-256 of the seed bytes, safe to compare and print. */
  sha256(): string {
    return createHash('sha256').update(this.bytes()).digest('hex');
  }

  toString(): string {
    return '[redacted seed]';
  }

  toJSON(): string {
    return '[redacted seed]';
  }

  [inspect.custom](): string {
    return '[redacted seed]';
  }
}

/**
 * Reads a wallet's seed from the environment.
 *
 * @param env - Environment variables, as passed in by the entry point.
 * @param name - A validated wallet name.
 * @returns The seed.
 * @throws AkadError `WALLET_NOT_FOUND` when the variable is unset,
 *   `INVALID_SEED` when it is malformed.
 */
export function readSeed(env: Readonly<Record<string, string | undefined>>, name: string): Seed {
  const value = env[seedVariable(name)];
  if (value === undefined || value === '') {
    throw new AkadError('WALLET_NOT_FOUND', `No seed for wallet ${name}. Create it with: akad wallet create --name ${name}`);
  }
  return Seed.fromHex(value);
}

/**
 * Refuses the test suite's fixed seeds on public networks.
 *
 * @param seed - The seed about to be used.
 * @param network - The target network.
 * @throws AkadError `TEST_SEED_ON_PUBLIC_NETWORK` for a known test seed on
 *   preview or preprod.
 */
export function assertSeedAllowed(seed: Seed, network: NetworkName): void {
  if (isPublicNetwork(network) && KNOWN_TEST_SEED_SHA256.includes(seed.sha256())) {
    throw new AkadError('TEST_SEED_ON_PUBLIC_NETWORK', 'Test seeds are for the local network only.');
  }
}

/**
 * Appends a new wallet seed to the env file, creating it with mode 0600.
 *
 * @param path - Absolute path to .env.automation.
 * @param name - A validated wallet name.
 * @param seed - The seed to store.
 * @throws AkadError `WALLET_EXISTS` when the file already defines the wallet.
 */
export function appendSeedToEnvFile(path: string, name: string, seed: Seed): void {
  const variable = seedVariable(name);
  if (existsSync(path)) {
    const definesWallet = readFileSync(path, 'utf8')
      .split('\n')
      .some((line) => line.trimStart().startsWith(`${variable}=`));
    if (definesWallet) {
      throw new AkadError('WALLET_EXISTS', `Wallet ${name} already exists. Seeds are never overwritten.`);
    }
  }
  appendFileSync(path, `${variable}=${seed.revealHexForStorage()}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
}
