import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
// ajv and ajv-formats are CommonJS: module.exports is the class or function
// itself, and its `default` property points back to it. TypeScript types the
// default import as the whole module, so `.default` is correct for both.
import Ajv2020Module from 'ajv/dist/2020.js';
import ajvFormatsModule from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import type { CliContext } from '../src/context.js';
import { deriveWalletKeys } from '../src/keys.js';
import { Output, SecretRegistry } from '../src/output.js';
import { makeRunId, stepPassed, writeRunReport, type RunReport } from '../src/report/run-report.js';
import { Seed } from '../src/secrets.js';
import { CONFIG_FILE, TEST_SEED } from './helpers.js';

const SCHEMA = resolve(import.meta.dirname, '../../../docs/v2/schemas/run-report.schema.json');

function validator() {
  const ajv = new Ajv2020Module.default({ strict: true, allErrors: true });
  ajvFormatsModule.default(ajv);
  return ajv.compile(JSON.parse(readFileSync(SCHEMA, 'utf8')));
}

function context(): CliContext {
  const secrets = new SecretRegistry();
  const dir = mkdtempSync(join(tmpdir(), 'akad-report-test-'));
  return {
    env: {},
    config: loadConfig(CONFIG_FILE),
    out: new Output({ stdout: () => {}, stderr: () => {} }, secrets, false),
    secrets,
    paths: { repoRoot: dir, envFile: join(dir, '.env.automation'), configFile: CONFIG_FILE, reportsDir: join(dir, 'runs') },
    now: () => new Date('2026-09-25T10:00:00.123Z'),
  };
}

function sampleReport(ctx: CliContext): RunReport {
  const keys = deriveWalletKeys('a1', Seed.fromHex(TEST_SEED), 'undeployed', ctx.secrets);
  const startedAt = ctx.now();
  return {
    schemaVersion: 1,
    runId: makeRunId(startedAt, 'call-record-token-color'),
    scenario: 'call-record-token-color',
    network: 'local',
    contract: '2689c5c24d4f560ec4ce0be14641ad544bca382d524ebdcb2e69c152f179a51a',
    commit: '349a7ed',
    startedAt: startedAt.toISOString(),
    finishedAt: startedAt.toISOString(),
    steps: [
      {
        index: 0,
        circuit: 'recordTokenColor',
        wallet: 'a1',
        walletAddress: keys.addresses.unshielded,
        expected: 'SUCCESS',
        feeEstimate: { dust: '123', method: 'approximate' },
        tx: '853ccf42fcbb3ec3dd14d73dd795f3f56d4da7b5be72c6e32435f9b5a6844d96',
        indexerStatus: 'SUCCESS',
        passed: true,
        stateBefore: { reserveNight: '907777805' },
        stateAfter: { reserveNight: '907777805' },
        feeActual: null,
        error: null,
      },
    ],
  };
}

describe('run reports', () => {
  it('makes run ids the schema accepts', () => {
    expect(makeRunId(new Date('2026-09-25T10:00:00.123Z'), 'v1-evidence')).toBe('2026-09-25T10:00:00Z-v1-evidence');
  });

  it('writes a report that validates against run-report.schema.json', () => {
    const ctx = context();
    const path = writeRunReport(ctx, sampleReport(ctx));
    const validate = validator();
    const written = JSON.parse(readFileSync(path, 'utf8'));
    expect(validate(written), JSON.stringify(validate.errors)).toBe(true);
    expect(path.endsWith('2026-09-25T10:00:00Z-call-record-token-color.json')).toBe(true);
  });

  it('never overwrites an existing report', () => {
    const ctx = context();
    const report = sampleReport(ctx);
    writeRunReport(ctx, report);
    expect(() => writeRunReport(ctx, report)).toThrow(/EEXIST/);
  });

  it('refuses to write a report that contains a secret', () => {
    const ctx = context();
    const report = sampleReport(ctx);
    const leaking = { ...report, steps: [{ ...report.steps[0]!, error: `debug ${TEST_SEED}` }] };
    expect(() => writeRunReport(ctx, leaking)).toThrow(/contains a secret/);
  });

  it.each([
    ['SUCCESS', 'SUCCESS', true],
    ['SUCCESS', 'PARTIAL_SUCCESS', false],
    ['SUCCESS', 'FAILURE', false],
    ['SUCCESS', 'NOT_FOUND', false],
    ['SUCCESS', 'NOT_SUBMITTED', false],
    ['FAILURE', 'FAILURE', true],
    ['FAILURE', 'NOT_SUBMITTED', true],
    ['FAILURE', 'PARTIAL_SUCCESS', false],
    ['FAILURE', 'SUCCESS', false],
    ['FAILURE', 'NOT_FOUND', false],
  ] as const)('expected %s with indexer %s passes: %s', (expected, status, passed) => {
    expect(stepPassed(expected, status)).toBe(passed);
  });
});
