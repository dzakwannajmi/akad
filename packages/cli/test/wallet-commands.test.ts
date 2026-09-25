import { describe, expect, it } from 'vitest';
import { Seed } from '../src/secrets.js';
import { findSecret, runCli, secretNeedles, TEST_SEED } from './helpers.js';

const PUBLIC_SEED = Seed.generate().revealHexForStorage();

describe('faucet', () => {
  it('copies only the unshielded address and opens the configured faucet page', async () => {
    const run = await runCli(['faucet', '--name', 'a0', '--network', 'preview', '--no-wait', '--json'], {
      AKAD_SEED_A0: PUBLIC_SEED,
    });
    expect(run.code, run.stderr).toBe(0);
    const printed = JSON.parse(run.stdout) as Record<string, string>;
    expect(run.desktop.copied).toEqual([printed['unshielded address']]);
    expect(printed['unshielded address']).toMatch(/^mn_addr_preview1/);
    expect(run.desktop.opened).toEqual(['https://midnight-tmnight-preview.nethermind.dev/']);
    expect(findSecret(secretNeedles(PUBLIC_SEED), run.stdout, run.stderr, ...run.desktop.copied)).toBeUndefined();
  });

  it('opens nothing with --no-open', async () => {
    const run = await runCli(['faucet', '--name', 'a0', '--network', 'preprod', '--no-wait', '--no-open'], {
      AKAD_SEED_A0: PUBLIC_SEED,
    });
    expect(run.code, run.stderr).toBe(0);
    expect(run.desktop).toEqual({ copied: [], opened: [] });
  });

  it('refuses the local network, which has no faucet', async () => {
    const run = await runCli(['faucet', '--name', 'a0', '--network', 'local', '--no-wait'], { AKAD_SEED_A0: TEST_SEED });
    expect(run.code).toBe(1);
    expect(run.stderr).toContain('NETWORK_NOT_CONFIGURED');
  });

  it('refuses the test seed on a public network before touching the desktop', async () => {
    const run = await runCli(['faucet', '--name', 'a0', '--network', 'preview', '--no-wait'], { AKAD_SEED_A0: TEST_SEED });
    expect(run.code).toBe(1);
    expect(run.stderr).toContain('TEST_SEED_ON_PUBLIC_NETWORK');
    expect(run.desktop).toEqual({ copied: [], opened: [] });
  });
});

describe('wallet status', () => {
  it('prints the three addresses in dry-run mode without syncing', async () => {
    const run = await runCli(['wallet', 'status', '--name', 'a1', '--network', 'preprod', '--dry-run', '--json'], {
      AKAD_SEED_A1: PUBLIC_SEED,
    });
    expect(run.code, run.stderr).toBe(0);
    const printed = JSON.parse(run.stdout) as Record<string, string>;
    expect(printed['unshielded address']).toMatch(/^mn_addr_preprod1/);
    expect(printed['shielded address']).toMatch(/^mn_shield-addr_preprod1/);
    expect(printed['dust address']).toMatch(/^mn_dust_preprod1/);
  });

  it('fails fast on the local network until its endpoints are configured', async () => {
    const run = await runCli(['wallet', 'status', '--name', 'a1', '--network', 'local'], { AKAD_SEED_A1: TEST_SEED });
    expect(run.code).toBe(1);
    expect(run.stderr).toContain('NETWORK_NOT_CONFIGURED');
  });

  it('reports a missing wallet by name, not by value', async () => {
    const run = await runCli(['wallet', 'status', '--name', 'a3', '--network', 'preview', '--dry-run']);
    expect(run.code).toBe(1);
    expect(run.stderr).toContain('WALLET_NOT_FOUND');
    expect(run.stderr).toContain('akad wallet create --name a3');
  });
});
