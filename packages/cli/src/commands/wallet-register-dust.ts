import { resolveNetwork } from '../config.js';
import type { Command } from '../context.js';
import { readFeeCap } from '../fees.js';
import { isSet, optionalString, requireString } from '../flags.js';
import { parseNetwork } from '../networks.js';
import { parseWalletName } from '../secrets.js';
import { loadWallet } from '../wallet.js';
import { cachePath } from '../wallet-cache.js';
import { startWallet, waitForSync } from '../wallet-runtime.js';
import { registerForDust, waitForDust } from '../wallet-tx.js';
import { SYNC_TIMEOUT_S, timeoutMs } from './wallet-status.js';

/** Default wait for the first DUST after registration, in seconds. */
export const DUST_TIMEOUT_S = 30 * 60;

/** `akad wallet register-dust --name a0 --network preprod --yes`: register NIGHT for DUST, wait for DUST. */
export const walletRegisterDust: Command = {
  path: ['wallet', 'register-dust'],
  summary: 'Register a wallet\'s NIGHT UTXOs for DUST generation and wait for DUST',
  submits: true,
  flags: {
    name: { type: 'string' },
    timeout: { type: 'string' },
  },
  async run(ctx, flags) {
    const name = parseWalletName(requireString(flags, 'name'));
    const network = parseNetwork(optionalString(flags, 'network'));
    const keys = loadWallet(ctx, name, network);
    const plan: [string, string][] = [
      ['action', 'register NIGHT UTXOs for DUST generation'],
      ['wallet', `${name} ${keys.addresses.unshielded}`],
      ['network', network],
      ['becomes public', 'the registered UTXOs and the dust address they generate for'],
    ];
    if (isSet(flags, 'dry-run')) {
      ctx.out.fields([...plan, ['fee estimate', 'computed from the wallet state; not in a dry run']]);
      return;
    }
    const cap = readFeeCap(ctx.env);
    const resolved = resolveNetwork(ctx.config, network);
    const wallet = await startWallet(keys, resolved, cachePath(ctx.paths.repoRoot, network, name));
    try {
      if (wallet.restored) ctx.out.error('sync: resuming from the local cache');
      await waitForSync(wallet.facade, SYNC_TIMEOUT_S * 1000, (line) => ctx.out.error(line));
      await wallet.save();
      const { registered } = await registerForDust(ctx, wallet, ctx.indexerFor(resolved), {
        cap,
        yes: isSet(flags, 'yes'),
        plan,
      });
      ctx.out.line(registered === 0 ? 'Every NIGHT UTXO is already registered.' : `Registered ${registered} UTXO(s).`);
      const { dust, waitedMs } = await waitForDust(ctx, wallet, timeoutMs(optionalString(flags, 'timeout'), DUST_TIMEOUT_S));
      ctx.out.fields([
        ['DUST', `${dust} base units`],
        ['DUST wait', `${Math.round(waitedMs / 1000)} s after registration was confirmed`],
      ]);
    } finally {
      await wallet.stop();
    }
  },
};
