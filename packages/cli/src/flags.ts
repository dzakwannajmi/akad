import type { Flags } from './context.js';
import { AkadError } from './errors.js';
import { parseWalletName } from './secrets.js';

/**
 * Reads a required string flag.
 *
 * @param flags - Parsed flags.
 * @param name - Flag name without dashes.
 * @returns The value.
 * @throws AkadError `INVALID_ARGS` when the flag is missing or empty.
 */
export function requireString(flags: Flags, name: string): string {
  const value = flags[name];
  if (typeof value !== 'string' || value === '') {
    throw new AkadError('INVALID_ARGS', `--${name} is required.`);
  }
  return value;
}

/**
 * Reads an optional string flag.
 *
 * @param flags - Parsed flags.
 * @param name - Flag name without dashes.
 * @returns The value, or undefined when absent.
 */
export function optionalString(flags: Flags, name: string): string | undefined {
  const value = flags[name];
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/**
 * Reads a boolean flag.
 *
 * @param flags - Parsed flags.
 * @param name - Flag name without dashes.
 * @returns True when the flag was given.
 */
export function isSet(flags: Flags, name: string): boolean {
  return flags[name] === true;
}

/**
 * Parses an amount in base units. Decimal points are rejected, so no
 * rounding ever happens.
 *
 * @param value - Raw flag value.
 * @param name - Flag name, for the error message.
 * @returns The amount as a bigint.
 * @throws AkadError `INVALID_ARGS` for anything but a non-negative integer.
 */
export function parseBaseUnits(value: string, name: string): bigint {
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new AkadError('INVALID_ARGS', `--${name} must be a whole number of base units.`);
  }
  return BigInt(value);
}

/**
 * Parses a comma-separated wallet list such as `a1,a2`.
 *
 * @param value - Raw flag value.
 * @returns Distinct, validated wallet names in the given order.
 * @throws AkadError `INVALID_WALLET_NAME` for a bad entry, `INVALID_ARGS` for
 *   an empty list.
 */
export function parseWalletList(value: string): string[] {
  const names = value.split(',').map((part) => part.trim()).filter((part) => part !== '');
  if (names.length === 0) {
    throw new AkadError('INVALID_ARGS', 'Give at least one wallet name, for example a1,a2.');
  }
  return [...new Set(names.map((name) => parseWalletName(name)))];
}
