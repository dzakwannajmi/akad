import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { AkadError } from '../src/errors.js';
import { parseNetwork } from '../src/networks.js';
import { assertSeedAllowed, KNOWN_TEST_SEED_SHA256, Seed } from '../src/secrets.js';
import { runCli, TEST_SEED } from './helpers.js';

describe('network flag', () => {
  it.each(['local', 'preview', 'preprod'])('accepts %s', (name) => {
    expect(parseNetwork(name)).toBe(name);
  });

  it('rejects mainnet as out of scope', () => {
    expect(() => parseNetwork('mainnet')).toThrow(/out of scope/);
  });

  it.each(['devnet', 'Preview', 'undeployed', 'testnet', ''])('rejects %j', (name) => {
    expect(() => parseNetwork(name)).toThrow(AkadError);
  });

  it('requires a value', () => {
    expect(() => parseNetwork(undefined)).toThrow(/required/);
  });

  it('makes the CLI exit 1 with INVALID_NETWORK for --network mainnet', async () => {
    const run = await runCli(['wallet', 'create', '--name', 'a7', '--network', 'mainnet', '--dry-run']);
    expect(run.code).toBe(1);
    expect(run.stderr).toContain('INVALID_NETWORK');
  });
});

describe('test seed', () => {
  it('is listed in KNOWN_TEST_SEED_SHA256', () => {
    const digest = createHash('sha256').update(Buffer.from(TEST_SEED, 'hex')).digest('hex');
    expect(KNOWN_TEST_SEED_SHA256).toContain(digest);
  });

  it('is refused on preview and preprod', () => {
    const seed = Seed.fromHex(TEST_SEED);
    expect(() => assertSeedAllowed(seed, 'preview')).toThrow(/local network only/);
    expect(() => assertSeedAllowed(seed, 'preprod')).toThrow(/local network only/);
  });

  it('is allowed on the local network', () => {
    expect(() => assertSeedAllowed(Seed.fromHex(TEST_SEED), 'local')).not.toThrow();
  });

  it('does not block other seeds on public networks', () => {
    expect(() => assertSeedAllowed(Seed.generate(), 'preprod')).not.toThrow();
  });
});
