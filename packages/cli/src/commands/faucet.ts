import { resolveNetwork } from '../config.js';
import type { Command } from '../context.js';
import { AkadError } from '../errors.js';
import { isSet, optionalString, requireString } from '../flags.js';
import { parseNetwork } from '../networks.js';
import { parseWalletName } from '../secrets.js';
import { loadWallet } from '../wallet.js';
import { cachePath } from '../wallet-cache.js';
import { NIGHT, startWallet, summarize, waitForState, waitForSync } from '../wallet-runtime.js';
import { SYNC_TIMEOUT_S, timeoutMs } from './wallet-status.js';

/** Default wait for faucet funds, in seconds. */
const FAUCET_TIMEOUT_S = 30 * 60;

/**
 * `akad faucet --name a0 --network preprod`: the one human step in funding.
 * The official faucets sit behind a captcha, and the CLI never automates
 * it (AUTOMATION.md section 4.1). It copies the wallet's unshielded address,
 * opens the faucet page for the operator, then waits for the tNIGHT.
 */
export const faucet: Command = {
  path: ['faucet'],
  summary: 'Open the official faucet for a wallet and wait for its tNIGHT',
  submits: false,
  flags: {
    name: { type: 'string' },
    timeout: { type: 'string' },
    'no-wait': { type: 'boolean' },
    'no-open': { type: 'boolean' },
  },
  async run(ctx, flags) {
    const name = parseWalletName(requireString(flags, 'name'));
    const network = parseNetwork(optionalString(flags, 'network'));
    const faucetUrl = ctx.config.networks[network].faucetUrl;
    if (faucetUrl === null) {
      throw new AkadError('NETWORK_NOT_CONFIGURED', `Network "${network}" has no faucet in akad.config.json.`);
    }
    const keys = loadWallet(ctx, name, network);
    const address = keys.addresses.unshielded;
    const rows: [string, string][] = [
      ['wallet', name],
      ['network', network],
      ['unshielded address', address],
      ['faucet', faucetUrl],
    ];
    if (isSet(flags, 'dry-run')) {
      rows.push(['action', 'none (dry run)']);
      ctx.out.fields(rows);
      return;
    }

    if (!isSet(flags, 'no-open')) {
      const copied = ctx.desktop.copyToClipboard(ctx.out.guard(address));
      const opened = ctx.desktop.openUrl(faucetUrl);
      rows.push(['clipboard', copied ? 'address copied' : 'copy the address above by hand']);
      rows.push(['browser', opened ? 'faucet page opened' : 'open the faucet URL by hand']);
    }
    rows.push(['next step', 'paste the address into the faucet and solve the captcha']);
    ctx.out.fields(rows);
    if (isSet(flags, 'no-wait')) return;

    const wallet = await startWallet(keys, resolveNetwork(ctx.config, network), cachePath(ctx.paths.repoRoot, network, name));
    try {
      if (wallet.restored) ctx.out.error('sync: resuming from the local cache');
      const synced = await waitForSync(wallet.facade, SYNC_TIMEOUT_S * 1000, (line) => ctx.out.error(line));
      const before = summarize(synced, ctx.now()).night;
      await wallet.save();
      ctx.out.line(`Waiting for tNIGHT to arrive (current balance ${before} base units)...`);
      const after = await waitForState(
        wallet.facade,
        (state) => (state.unshielded.balances[NIGHT] ?? 0n) > before,
        timeoutMs(optionalString(flags, 'timeout'), FAUCET_TIMEOUT_S),
        'faucet funds'
      );
      const night = summarize(after, ctx.now()).night;
      ctx.out.fields([
        ['received', `${night - before} base units`],
        ['tNIGHT', night.toString()],
      ]);
    } finally {
      await wallet.stop();
    }
  },
};
