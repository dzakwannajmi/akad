import { readFileSync, statSync } from 'node:fs';
import { inspect } from 'node:util';
import { describe, expect, it } from 'vitest';
import { COMMANDS } from '../src/main.js';
import { Output, SecretRegistry } from '../src/output.js';
import { Seed } from '../src/secrets.js';
import { findSecret, runCli, secretNeedles, TEST_SEED } from './helpers.js';

const ENV = {
  AKAD_SEED_A0: TEST_SEED,
  AKAD_SEED_A1: TEST_SEED,
  AKAD_SEED_A2: TEST_SEED,
};

/**
 * Dry-run arguments for every command, on the local network where the test
 * seed is allowed. A command missing from this map fails the suite, so no
 * command ships without a leak check.
 */
const DRY_RUN_ARGS: Record<string, string[]> = {
  'wallet create': ['wallet', 'create', '--name', 'a9', '--network', 'local', '--dry-run'],
};

describe('secret leak: every command in dry-run mode', () => {
  const needles = secretNeedles(TEST_SEED);

  it('has dry-run arguments for every registered command', () => {
    const missing = COMMANDS.map((command) => command.path.join(' ')).filter((path) => !(path in DRY_RUN_ARGS));
    expect(missing).toEqual([]);
  });

  for (const [path, argv] of Object.entries(DRY_RUN_ARGS)) {
    it(`${path} prints no seed or derived key, in text or JSON mode`, async () => {
      for (const extra of [[], ['--json']]) {
        const run = await runCli([...argv, ...extra], ENV);
        expect(run.stderr).not.toContain('SECRET_IN_OUTPUT');
        expect(run.code, run.stderr).toBe(0);
        expect(findSecret(needles, run.stdout, run.stderr)).toBeUndefined();
      }
    });
  }
});

describe('secret leak: wallet create', () => {
  it('stores the new seed in the env file with mode 0600 and never prints it', async () => {
    const run = await runCli(['wallet', 'create', '--name', 'a5']);
    expect(run.code, run.stderr).toBe(0);
    const stored = readFileSync(run.envFile, 'utf8').trim();
    expect(stored).toMatch(/^AKAD_SEED_A5=[0-9a-f]{64}$/);
    const seedHex = stored.split('=')[1] ?? '';
    expect(findSecret(secretNeedles(seedHex), run.stdout, run.stderr)).toBeUndefined();
    expect(statSync(run.envFile).mode & 0o777).toBe(0o600);
    expect(run.stdout).toContain('preview unshielded');
    expect(run.stdout).toContain('preprod shielded');
  });

  it('refuses to create a wallet whose seed is already in the environment', async () => {
    const run = await runCli(['wallet', 'create', '--name', 'a1'], ENV);
    expect(run.code).toBe(1);
    expect(run.stderr).toContain('WALLET_EXISTS');
    expect(findSecret(secretNeedles(TEST_SEED), run.stdout, run.stderr)).toBeUndefined();
  });

  it('writes nothing in dry-run mode', async () => {
    const run = await runCli(['wallet', 'create', '--name', 'a6', '--dry-run']);
    expect(run.code, run.stderr).toBe(0);
    expect(() => readFileSync(run.envFile)).toThrow();
  });
});

describe('secret leak: guards', () => {
  it('redacts a seed in every string conversion', () => {
    const seed = Seed.fromHex(TEST_SEED);
    for (const text of [String(seed), `${seed}`, JSON.stringify({ seed }), inspect(seed), inspect({ seed })]) {
      expect(text).not.toContain(TEST_SEED);
      expect(text).toContain('[redacted seed]');
    }
  });

  it('never echoes a malformed seed in its error', () => {
    const bad = TEST_SEED.slice(0, 60) + 'zzzz';
    expect(() => Seed.fromHex(bad)).toThrow(/64 hex characters/);
    try {
      Seed.fromHex(bad);
    } catch (err) {
      expect((err as Error).message).not.toContain(bad);
    }
  });

  it('refuses to write any output that contains a registered secret', () => {
    const secrets = new SecretRegistry();
    secrets.addBytes(Buffer.from(TEST_SEED, 'hex'));
    let written = '';
    const out = new Output({ stdout: (t) => (written += t), stderr: (t) => (written += t) }, secrets, false);
    expect(() => out.line(`seed=${TEST_SEED}`)).toThrow(/contains a secret/);
    expect(() => out.error(TEST_SEED.toUpperCase())).toThrow(/contains a secret/);
    expect(() => out.guard(Buffer.from(TEST_SEED, 'hex').toString('base64'))).toThrow(/contains a secret/);
    expect(written).toBe('');
  });
});
