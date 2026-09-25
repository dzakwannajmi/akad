import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CliContext } from '../context.js';
import { AkadError } from '../errors.js';
import type { NetworkName } from '../networks.js';

export type IndexerStatus = 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE' | 'NOT_FOUND' | 'NOT_SUBMITTED';

export type StepKind = 'call' | 'deploy' | 'transfer' | 'dustRegistration';

/** One output of a transfer step. */
export type TransferOutput = { toWallet: string; toAddress: string; amount: string };

/** One step of a run. Mirrors `step` in docs/v2/schemas/run-report.schema.json, schemaVersion 2. */
export type RunStep = {
  index: number;
  kind: StepKind;
  /** Circuit name for call steps, null for every other kind. */
  circuit: string | null;
  wallet: string;
  walletAddress: string;
  expected: 'SUCCESS' | 'FAILURE';
  feeEstimate: { dust: string; method: 'exact' | 'approximate' };
  /** Present on transfer steps only. */
  transfers?: TransferOutput[];
  tx: string | null;
  indexerStatus: IndexerStatus;
  passed: boolean;
  stateBefore: Record<string, string>;
  stateAfter: Record<string, string>;
  feeActual: string | null;
  error: string | null;
};

/** A run report. Mirrors docs/v2/schemas/run-report.schema.json, schemaVersion 2. */
export type RunReport = {
  schemaVersion: 2;
  runId: string;
  scenario: string;
  network: NetworkName;
  /** Null when every step is a wallet operation. */
  contract: string | null;
  commit: string;
  startedAt: string;
  finishedAt: string;
  steps: RunStep[];
};

/**
 * Builds a run id such as `2026-09-25T10:00:00Z-call-transfer`.
 *
 * @param startedAt - Start time of the run.
 * @param scenario - Lowercase scenario slug.
 * @returns The run id, which is also the report's file name.
 */
export function makeRunId(startedAt: Date, scenario: string): string {
  return `${startedAt.toISOString().replace(/\.\d{3}Z$/, 'Z')}-${scenario}`;
}

/**
 * Decides whether a step met its expectation. Only the indexer's status
 * counts. PARTIAL_SUCCESS never passes: fees were spent and part of the
 * transaction rolled back, which is not a clean outcome for either kind of
 * step.
 *
 * @param expected - SUCCESS for a normal step, FAILURE for an adversarial one.
 * @param status - Status from the indexer, or NOT_SUBMITTED when the step was
 *   rejected before submission.
 * @returns True when the observed outcome matches the expectation.
 */
export function stepPassed(expected: RunStep['expected'], status: IndexerStatus): boolean {
  if (expected === 'SUCCESS') return status === 'SUCCESS';
  return status === 'FAILURE' || status === 'NOT_SUBMITTED';
}

/**
 * Writes a run report to `<reportsDir>/<runId>.json`. The serialized text is
 * checked against the secret registry first, and an existing report is never
 * overwritten.
 *
 * @param ctx - CLI context.
 * @param report - The finished report.
 * @returns The path written.
 * @throws AkadError `SECRET_IN_OUTPUT` when the report contains a secret; a
 *   Node error when the file already exists.
 */
export function writeRunReport(ctx: CliContext, report: RunReport): string {
  const text = ctx.out.guard(JSON.stringify(report, null, 2) + '\n');
  mkdirSync(ctx.paths.reportsDir, { recursive: true });
  const path = join(ctx.paths.reportsDir, `${report.runId}.json`);
  writeFileSync(path, text, { flag: 'wx' });
  return path;
}

/**
 * Returns the commit the CLI runs from, for the report's `commit` field.
 *
 * @param repoRoot - Repository root.
 * @returns The full commit hash.
 * @throws AkadError `CONFIG` outside a git checkout.
 */
export function currentCommit(repoRoot: string): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch {
    throw new AkadError('CONFIG', 'Run reports need a git commit; run the CLI inside the Akad repository.');
  }
}

/**
 * Builds and writes a report for a finished run.
 *
 * @param ctx - CLI context.
 * @param run - Scenario, network, contract (null for wallet-only runs), start time and steps.
 * @returns The path written.
 */
export function writeRun(
  ctx: CliContext,
  run: { scenario: string; network: NetworkName; contract: string | null; startedAt: Date; steps: RunStep[] }
): string {
  return writeRunReport(ctx, {
    schemaVersion: 2,
    runId: makeRunId(run.startedAt, run.scenario),
    scenario: run.scenario,
    network: run.network,
    contract: run.contract,
    commit: currentCommit(ctx.paths.repoRoot),
    startedAt: run.startedAt.toISOString(),
    finishedAt: ctx.now().toISOString(),
    steps: run.steps,
  });
}
