import { resolveNetwork } from '../config.js';
import type { Command } from '../context.js';
import { isSet, optionalString, parseBaseUnits, requireString } from '../flags.js';
import { parseNetwork } from '../networks.js';
import { parseWalletName } from '../secrets.js';
import { loadWallet } from '../wallet.js';
import { startWallet, summarize, waitForSync } from '../wallet-runtime.js';

/** Default sync timeout in seconds. */
export const SYNC_TIMEOUT_S = 300;

/**
 * Parses a `--timeout` flag given in seconds.
 *
 * @param value - Raw flag value, or undefined for the default.
 * @param fallback - Default in seconds.
 * @returns Milliseconds.
 * @throws AkadError `INVALID_ARGS` for a non-integer.
 */
export function timeoutMs(value: string | undefined, fallback: number): number {
  return Number(value === undefined ? fallback : parseBaseUnits(value, 'timeout')) * 1000;
}

/** Shortens a 64-hex token type for display. */
export function shortType(tokenType: string): string {
  return tokenType.length > 16 ? `${tokenType.slice(0, 8)}...${tokenType.slice(-6)}` : tokenType;
}

/** `akad wallet status --name a1 --network preprod`: sync and print balances, never keys. */
export const walletStatus: Command = {
  path: ['wallet', 'status'],
  summary: 'Sync a wallet and print tNIGHT, DUST and shielded balances',
  submits: false,
  flags: {
    name: { type: 'string' },
    timeout: { type: 'string' },
  },
  async run(ctx, flags) {
    const name = parseWalletName(requireString(flags, 'name'));
    const network = parseNetwork(optionalString(flags, 'network'));
    const keys = loadWallet(ctx, name, network);
    const rows: [string, string][] = [
      ['wallet', name],
      ['network', network],
      ['unshielded address', keys.addresses.unshielded],
      ['shielded address', keys.addresses.shielded],
      ['dust address', keys.addresses.dust],
    ];
    if (isSet(flags, 'dry-run')) {
      rows.push(['sync', 'skipped (dry run)']);
      ctx.out.fields(rows);
      return;
    }

    const wallet = await startWallet(keys, resolveNetwork(ctx.config, network));
    try {
      const state = await waitForSync(wallet.facade, timeoutMs(optionalString(flags, 'timeout'), SYNC_TIMEOUT_S));
      const summary = summarize(state, ctx.now());
      rows.push(['tNIGHT', summary.night.toString()]);
      rows.push(['NIGHT UTXOs', `${summary.nightUtxos.total} (${summary.nightUtxos.registeredForDust} registered for DUST)`]);
      rows.push(['DUST', summary.dust.toString()]);
      for (const coin of summary.shielded) {
        rows.push([`shielded ${shortType(coin.tokenType)}`, `${coin.total} in ${coin.coins} coin(s)`]);
      }
      for (const [tokenType, amount] of Object.entries(summary.otherUnshielded)) {
        rows.push([`unshielded ${shortType(tokenType)}`, amount.toString()]);
      }
      rows.push(['amounts', 'base units']);
      ctx.out.fields(rows);
    } finally {
      await wallet.stop();
    }
  },
};
