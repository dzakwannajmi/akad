/** Every failure the CLI reports, as a closed set of codes. */
export type AkadErrorCode =
  | 'INVALID_ARGS'
  | 'UNKNOWN_COMMAND'
  | 'INVALID_NETWORK'
  | 'NETWORK_NOT_CONFIGURED'
  | 'CONFIG'
  | 'INVALID_WALLET_NAME'
  | 'WALLET_EXISTS'
  | 'WALLET_NOT_FOUND'
  | 'INVALID_SEED'
  | 'TEST_SEED_ON_PUBLIC_NETWORK'
  | 'CONFIRMATION_REQUIRED'
  | 'FEE_CAP_MISSING'
  | 'FEE_CAP_EXCEEDED'
  | 'INDEXER'
  | 'INDEXER_MALFORMED'
  | 'CONTRACT_NOT_FOUND'
  | 'EVIDENCE_INVALID'
  | 'EVIDENCE_MISMATCH'
  | 'TIMEOUT'
  | 'INSUFFICIENT_FUNDS'
  | 'SECRET_IN_OUTPUT'
  | 'NOT_IMPLEMENTED';

/** An expected, user-facing failure. The message never contains a secret. */
export class AkadError extends Error {
  readonly code: AkadErrorCode;

  constructor(code: AkadErrorCode, message: string) {
    super(message);
    this.name = 'AkadError';
    this.code = code;
  }
}

/**
 * Narrows an unknown thrown value to an AkadError.
 *
 * @param value - Anything caught in a `catch` block.
 * @returns True when `value` is an AkadError.
 */
export function isAkadError(value: unknown): value is AkadError {
  return value instanceof AkadError;
}
