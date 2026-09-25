import { mkdtempSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cachePath, readWalletCache, writeWalletCache, type WalletCache } from '../src/wallet-cache.js';

const ADDRESS = 'mn_addr_preview1k4dxefanunxz67vp6sjan0ka5l4fjz6m75n869sajtfdgfjuellqpjc2fv';

function sample(): WalletCache {
  return {
    version: 1,
    network: 'preview',
    unshieldedAddress: ADDRESS,
    shielded: '{"s":1}',
    unshielded: '{"u":1}',
    dust: '{"d":1}',
    savedAt: '2026-09-26T00:00:00.000Z',
  };
}

describe('wallet sync cache', () => {
  it('lives in .akad-cache/wallets/<network>/<wallet>.json', () => {
    expect(cachePath('/repo', 'preprod', 'a1')).toBe('/repo/.akad-cache/wallets/preprod/a1.json');
  });

  it('round-trips with an owner-only file and directory', () => {
    const path = cachePath(mkdtempSync(join(tmpdir(), 'akad-cache-')), 'preview', 'a0');
    writeWalletCache(path, sample());
    expect(readWalletCache(path, 'preview', ADDRESS)).toEqual(sample());
    expect(statSync(path).mode & 0o777).toBe(0o600);
    expect(statSync(dirname(path)).mode & 0o777).toBe(0o700);
  });

  it('ignores a cache for another wallet or network', () => {
    const path = cachePath(mkdtempSync(join(tmpdir(), 'akad-cache-')), 'preview', 'a0');
    writeWalletCache(path, sample());
    expect(readWalletCache(path, 'preview', ADDRESS.replace('k4dx', 'zzzz'))).toBeNull();
    expect(readWalletCache(path, 'preprod', ADDRESS)).toBeNull();
  });

  it('ignores a missing, corrupt or incomplete cache', () => {
    const dir = mkdtempSync(join(tmpdir(), 'akad-cache-'));
    expect(readWalletCache(join(dir, 'none.json'), 'preview', ADDRESS)).toBeNull();
    writeFileSync(join(dir, 'bad.json'), '{not json');
    expect(readWalletCache(join(dir, 'bad.json'), 'preview', ADDRESS)).toBeNull();
    writeFileSync(join(dir, 'partial.json'), JSON.stringify({ ...sample(), dust: undefined }));
    expect(readWalletCache(join(dir, 'partial.json'), 'preview', ADDRESS)).toBeNull();
  });
});
