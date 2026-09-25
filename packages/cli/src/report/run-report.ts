import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CliContext } from '../context.js';
import type { NetworkName } from '../networks.js';

export type IndexerStatus = 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE' | 'NOT_FOUND' | 'NOT_SUBMITTED';

/** One circuit call in a run. Mirrors `step` in docs/v2/schemas/run-report.schema.json. */
export type RunStep = {
  index: number;
  circuit: string;
  wallet: string;
  walletAddress: string;
  expected: 'SUCCESS' | 'FAILURE';
  feeEstimate: { dust: string; method: 'exact' | 'approximate' };
  tx: string | null;
  indexerStatus: IndexerStatus;
  passed: boolean;
  stateBefore: Record<string, string>;
  stateAfter: Record<string, string>;
  feeActual: string | null;
  error: string | null;
};

/** A run report. Mirrors docs/v2/schemas/run-report.schema.json, schemaVersion 1. */
export type RunReport = {
  schemaVersion: 1;
  runId: string;
  scenario: string;
  network: NetworkName;
  contract: string;
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
