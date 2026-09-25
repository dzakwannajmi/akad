import type { Command } from '../context.js';
import { AkadError } from '../errors.js';
import { isSet, optionalString, requireString } from '../flags.js';
import { deriveWalletKeys } from '../keys.js';
import { NETWORKS, parseNetwork, sdkNetworkId, type NetworkName } from '../networks.js';
import { appendSeedToEnvFile, parseWalletName, Seed, seedVariable } from '../secrets.js';

/** `akad wallet create --name a1`: new seed into .env.automation, addresses to stdout. */
export const walletCreate: Command = {
  path: ['wallet', 'create'],
  summary: 'Generate a wallet seed, store it in .env.automation, print its addresses',
  submits: false,
  flags: {
    name: { type: 'string' },
  },
  async run(ctx, flags) {
    const name = parseWalletName(requireString(flags, 'name'));
    if (ctx.env[seedVariable(name)] !== undefined) {
      throw new AkadError('WALLET_EXISTS', `Wallet ${name} already exists. Seeds are never overwritten.`);
    }
    const requested = optionalString(flags, 'network');
    const networks: NetworkName[] = requested === undefined
      ? NETWORKS.filter((network) => network !== 'local')
      : [parseNetwork(requested)];

    const seed = Seed.generate();
    const rows: [string, string][] = [['wallet', name]];
    for (const network of networks) {
      const { addresses } = deriveWalletKeys(name, seed, sdkNetworkId(network), ctx.secrets);
      rows.push([`${network} unshielded`, addresses.unshielded]);
      rows.push([`${network} shielded`, addresses.shielded]);
      rows.push([`${network} dust`, addresses.dust]);
    }

    if (isSet(flags, 'dry-run')) {
      rows.push(['stored', 'no (dry run)']);
      ctx.out.fields(rows);
      return;
    }
    appendSeedToEnvFile(ctx.paths.envFile, name, seed);
    rows.push(['stored', `${seedVariable(name)} in ${ctx.paths.envFile}`]);
    ctx.out.fields(rows);
  },
};
