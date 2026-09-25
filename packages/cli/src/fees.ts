import type { CliEnv } from './context.js';
import { AkadError } from './errors.js';

/** Environment variable holding the per-transaction fee cap, in DUST base units. */
export const FEE_CAP_VARIABLE = 'AKAD_MAX_FEE_DUST';

/**
 * Reads the fee cap. There is no default: a missing cap blocks every
 * submission, so a run can never spend more than the operator set.
 *
 * @param env - Environment snapshot from the entry point.
 * @returns The cap in DUST base units.
 * @throws AkadError `FEE_CAP_MISSING` when unset, `INVALID_ARGS` when not a
 *   whole number.
 */
export function readFeeCap(env: CliEnv): bigint {
  const raw = env[FEE_CAP_VARIABLE];
  if (raw === undefined || raw === '') {
    throw new AkadError(
      'FEE_CAP_MISSING',
      `Set ${FEE_CAP_VARIABLE} (DUST base units) before submitting. Run with --dry-run first to see the plan.`
    );
  }
  if (!/^(0|[1-9][0-9]*)$/.test(raw)) {
    throw new AkadError('INVALID_ARGS', `${FEE_CAP_VARIABLE} must be a whole number of DUST base units.`);
  }
  return BigInt(raw);
}

/**
 * Refuses a transaction whose fee estimate exceeds the cap.
 *
 * @param estimate - Fee estimate in DUST base units.
 * @param cap - Cap from readFeeCap.
 * @throws AkadError `FEE_CAP_EXCEEDED`.
 */
export function enforceFeeCap(estimate: bigint, cap: bigint): void {
  if (estimate > cap) {
    throw new AkadError(
      'FEE_CAP_EXCEEDED',
      `Fee estimate ${estimate} exceeds ${FEE_CAP_VARIABLE}=${cap}. Nothing was submitted.`
    );
  }
}
