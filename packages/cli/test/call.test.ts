import { describe, expect, it } from 'vitest';
import { convertArg, convertArgs } from '../src/contract/args.js';
import { readCircuits } from '../src/commands/call.js';
import { enforceFeeCap, readFeeCap } from '../src/fees.js';
import { Seed } from '../src/secrets.js';
import { MANAGED_CONTRACT_DIR, runCli } from './helpers.js';

const SEED = Seed.generate().revealHexForStorage();
const ENV = { AKAD_SEED_A1: SEED };
const TO = 'ab'.repeat(32);

describe('circuit arguments', () => {
  const circuits = readCircuits(MANAGED_CONTRACT_DIR);
  const params = (name: string) => circuits.find((c) => c.name === name)!.arguments;

  it('reads all 11 v1 circuits from contract-info.json', () => {
    expect(circuits.map((c) => c.name).sort()).toEqual(
      [
        'addLiquidity', 'claimFaucet', 'recordTokenColor', 'shieldedSwapAkdToNight', 'shieldedSwapNightToAkd',
        'swapAkdToNight', 'swapNightToAkd', 'transfer', 'unwrap', 'unwrapNight', 'wrap',
      ].sort()
    );
  });

  it('converts Uint strings to bigint and Bytes hex to bytes', () => {
    const [to, amount] = convertArgs(`["${TO}", "340282366920938463463374607431768211455"]`, params('transfer'));
    expect(to).toEqual(Uint8Array.from(Buffer.from(TO, 'hex')));
    expect(amount).toBe((1n << 128n) - 1n);
  });

  it('converts a UserAddress struct', () => {
    expect(convertArgs(`[{"bytes": "${TO}"}]`, params('unwrapNight'))).toEqual([{ bytes: Uint8Array.from(Buffer.from(TO, 'hex')) }]);
  });

  it.each([
    ['[]', /takes 2 argument/],
    ['not json', /JSON array/],
    [`["${TO}", 5]`, /amount: must be a decimal string/],
    [`["${TO}", "-1"]`, /amount: must be a decimal string/],
    [`["${TO}", "340282366920938463463374607431768211456"]`, /exceeds the maximum/],
    [`["abcd", "1"]`, /to: must be 32 bytes of hex/],
  ])('rejects %s', (json, message) => {
    expect(() => convertArgs(json, params('transfer'))).toThrow(message);
  });

  it('rejects a non-boolean for a Boolean', () => {
    expect(() => convertArg('yes', { 'type-name': 'Boolean' }, 'flag')).toThrow(/true or false/);
  });
});

describe('fee cap', () => {
  it('has no default: a missing cap blocks submission', () => {
    expect(() => readFeeCap({})).toThrow(/AKAD_MAX_FEE_DUST/);
  });

  it('rejects a malformed cap', () => {
    expect(() => readFeeCap({ AKAD_MAX_FEE_DUST: '1e9' })).toThrow(/whole number/);
  });

  it('allows an estimate at the cap and refuses one above it', () => {
    const cap = readFeeCap({ AKAD_MAX_FEE_DUST: '1000' });
    expect(() => enforceFeeCap(1000n, cap)).not.toThrow();
    expect(() => enforceFeeCap(1001n, cap)).toThrow(/Nothing was submitted/);
  });
});

describe('akad call', () => {
  it('prints the plan in a dry run, with converted arguments', async () => {
    const run = await runCli(['call', 'transfer', '--wallet', 'a1', '--network', 'preprod', '--args', `["${TO}", "1000"]`, '--dry-run', '--json'], ENV);
    expect(run.code, run.stderr).toBe(0);
    const plan = JSON.parse(run.stdout) as Record<string, string>;
    expect(plan['circuit']).toBe('transfer');
    expect(plan['args']).toBe(`${TO}, 1000`);
    expect(plan['contract']).toBe('2689c5c24d4f560ec4ce0be14641ad544bca382d524ebdcb2e69c152f179a51a');
  });

  it('refuses an unknown circuit and lists the real ones', async () => {
    const run = await runCli(['call', 'mint', '--wallet', 'a1', '--network', 'preprod', '--dry-run'], ENV);
    expect(run.code).toBe(1);
    expect(run.stderr).toContain('recordTokenColor');
  });

  it('refuses circuits that spend a shielded coin until coin selection exists', async () => {
    const run = await runCli(['call', 'unwrap', '--wallet', 'a1', '--network', 'preprod', '--dry-run'], ENV);
    expect(run.code).toBe(1);
    expect(run.stderr).toContain('NOT_IMPLEMENTED');
  });

  it('needs the circuit name', async () => {
    const run = await runCli(['call', '--wallet', 'a1', '--network', 'preprod', '--dry-run'], ENV);
    expect(run.code).toBe(1);
    expect(run.stderr).toContain('Usage: akad call circuit');
  });

  it('stops before any network work when the fee cap is missing', async () => {
    const run = await runCli(['call', 'recordTokenColor', '--wallet', 'a1', '--network', 'preprod', '--yes'], ENV);
    expect(run.code).toBe(1);
    expect(run.stderr).toContain('FEE_CAP_MISSING');
  });
});

describe('fee cap for previews', () => {
  it('is optional without --yes and required with it', async () => {
    const { feeCapFor } = await import('../src/fees.js');
    expect(feeCapFor({}, false)).toBeNull();
    expect(feeCapFor({ AKAD_MAX_FEE_DUST: '7' }, false)).toBe(7n);
    expect(() => feeCapFor({}, true)).toThrow(/AKAD_MAX_FEE_DUST/);
  });
});
