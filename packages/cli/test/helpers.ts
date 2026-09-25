import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { HDWallet, Roles, type Role } from '@midnight-ntwrk/wallet-sdk/hd';
import { createKeystore } from '@midnight-ntwrk/wallet-sdk/unshielded';
import type { CliEnv } from '../src/context.js';
import type { IndexerClient } from '../src/indexer/client.js';
import { main } from '../src/main.js';

/**
 * Fixed seed for tests only. The CLI refuses it on preview and preprod
 * through KNOWN_TEST_SEED_SHA256 in src/secrets.ts.
 */
export const TEST_SEED = '0f1e2d3c4b5a69788796a5b4c3d2e1f00112233445566778899aabbccddeeff0';

export const CONFIG_FILE = resolve(import.meta.dirname, '../akad.config.json');

export const MANAGED_CONTRACT_DIR = resolve(import.meta.dirname, '../../../contracts/managed/akad');

/** A small evidence file in the shape of evidence.schema.json, with real Preprod hashes. */
export const EVIDENCE_SAMPLE = resolve(import.meta.dirname, 'fixtures/evidence-sample.json');

export type CliRun = {
  code: number;
  stdout: string;
  stderr: string;
  envFile: string;
  /** What the command copied to the clipboard and which URLs it opened. */
  desktop: { copied: string[]; opened: string[] };
};

/** Runs the CLI in-process with a temporary env file and reports directory. */
export async function runCli(argv: string[], env: CliEnv = {}, indexer?: IndexerClient): Promise<CliRun> {
  const dir = mkdtempSync(join(tmpdir(), 'akad-cli-test-'));
  let stdout = '';
  let stderr = '';
  const envFile = join(dir, '.env.automation');
  const desktop = { copied: [] as string[], opened: [] as string[] };
  const code = await main(argv, {
    sink: { stdout: (text) => (stdout += text), stderr: (text) => (stderr += text) },
    env,
    paths: { repoRoot: dir, envFile, configFile: CONFIG_FILE, reportsDir: join(dir, 'runs'), managedContractDir: MANAGED_CONTRACT_DIR },
    desktop: {
      copyToClipboard: (text) => desktop.copied.push(text) > 0,
      openUrl: (url) => desktop.opened.push(url) > 0,
    },
    now: () => new Date('2026-09-25T00:00:00Z'),
    indexerFor: () => {
      if (indexer === undefined) throw new Error('this test gave the CLI no indexer');
      return indexer;
    },
  });
  return { code, stdout, stderr, envFile, desktop };
}

function roleKey(seed: Uint8Array, role: Role): Uint8Array {
  const hd = HDWallet.fromSeed(seed);
  if (hd.type !== 'seedOk') throw new Error('test seed rejected');
  const result = hd.hdWallet.selectAccount(0).selectRole(role).deriveKeyAt(0);
  if (result.type !== 'keyDerived') throw new Error('test derivation failed');
  return result.key;
}

/**
 * Every secret derived from a seed, in hex (both cases) and base64, computed
 * independently of the CLI's own derivation code.
 */
export function secretNeedles(seedHex: string): string[] {
  const seed = Buffer.from(seedHex, 'hex');
  const zswap = roleKey(seed, Roles.Zswap);
  const night = roleKey(seed, Roles.NightExternal);
  const dust = roleKey(seed, Roles.Dust);
  const zswapKeys = ledger.ZswapSecretKeys.fromSeed(zswap);
  const secrets: Uint8Array[] = [
    seed,
    zswap,
    night,
    dust,
    createKeystore(night, 'preview').getSecretKey(),
    zswapKeys.coinSecretKey.yesIKnowTheSecurityImplicationsOfThis_serialize(),
    zswapKeys.encryptionSecretKey.yesIKnowTheSecurityImplicationsOfThis_serialize(),
  ];
  return secrets.flatMap((bytes) => {
    const buffer = Buffer.from(bytes);
    const hex = buffer.toString('hex');
    return [hex, hex.toUpperCase(), buffer.toString('base64')];
  });
}

/** Returns the first secret found in any of the texts, or undefined. */
export function findSecret(needles: readonly string[], ...texts: string[]): string | undefined {
  return needles.find((needle) => texts.some((text) => text.includes(needle)));
}
