import { resolveNetwork } from '../config.js';
import { decodeAkadV1State } from '../contract/akad-v1.js';
import type { Command } from '../context.js';
import { AkadError } from '../errors.js';
import { isSet, optionalString } from '../flags.js';
import { parseNetwork } from '../networks.js';

const HEX64 = /^[0-9a-f]{64}$/;

/**
 * Resolves the contract address for a command: `--contract`, or the v1
 * address in akad.config.json.
 *
 * @param flagValue - Raw `--contract` value.
 * @param fallback - Configured address for the network, or null.
 * @returns A lowercase 64-hex address.
 * @throws AkadError `INVALID_ARGS` for a malformed or missing address.
 */
export function contractAddress(flagValue: string | undefined, fallback: string | null): string {
  const address = (flagValue ?? fallback ?? '').toLowerCase();
  if (!HEX64.test(address)) {
    throw new AkadError('INVALID_ARGS', '--contract must be a 64-character hex address (no contract is configured for this network).');
  }
  return address;
}

/** `akad state --network preprod`: v1 ledger state and the custody invariant, from the indexer. */
export const state: Command = {
  path: ['state'],
  summary: 'Print the v1 contract state, custody and solvency check',
  submits: false,
  flags: {
    contract: { type: 'string' },
  },
  async run(ctx, flags) {
    const network = parseNetwork(optionalString(flags, 'network'));
    const address = contractAddress(optionalString(flags, 'contract'), ctx.config.networks[network].akadV1Contract);
    if (isSet(flags, 'dry-run')) {
      ctx.out.fields([
        ['contract', address],
        ['network', network],
        ['query', 'skipped (dry run)'],
      ]);
      return;
    }
    const snapshot = await ctx.indexerFor(resolveNetwork(ctx.config, network)).contractState(address);
    if (snapshot === null) {
      throw new AkadError('CONTRACT_NOT_FOUND', `The ${network} indexer has no contract at ${address}.`);
    }
    const decoded = decodeAkadV1State(snapshot);
    const expected = decoded.reserveNight + decoded.sNightSupply;
    ctx.out.fields([
      ['contract', address],
      ['network', network],
      ['as of', `tx ${decoded.txHash} at block ${decoded.blockHeight}`],
      ['totalSupply', decoded.totalSupply.toString()],
      ['reserveAKD', decoded.reserveAKD.toString()],
      ['reserveNight', decoded.reserveNight.toString()],
      ['sNightSupply', decoded.sNightSupply.toString()],
      ['tNIGHT custody', decoded.custody.toString()],
      [
        'solvency',
        decoded.solvent
          ? 'holds: custody == reserveNight + sNightSupply'
          : `BROKEN: custody ${decoded.custody} != reserveNight + sNightSupply ${expected}`,
      ],
      ['amounts', 'base units'],
    ]);
  },
};
