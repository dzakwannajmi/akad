import { parseArgs } from 'node:util';
import { faucet } from './commands/faucet.js';
import { walletCreate } from './commands/wallet-create.js';
import { walletStatus } from './commands/wallet-status.js';
import { loadConfig } from './config.js';
import type { CliEnv, CliPaths, Command, Desktop, FlagSpec, Flags } from './context.js';
import { AkadError, isAkadError } from './errors.js';
import { Output, SecretRegistry, type OutputSink } from './output.js';

/** Every command the CLI knows. The secret-leak test runs each one. */
export const COMMANDS: readonly Command[] = [walletCreate, walletStatus, faucet];

/** Flags every command accepts. */
export const GLOBAL_FLAGS: Readonly<Record<string, FlagSpec>> = {
  network: { type: 'string' },
  json: { type: 'boolean' },
  yes: { type: 'boolean' },
  'dry-run': { type: 'boolean' },
};

export type MainDeps = {
  sink: OutputSink;
  env: CliEnv;
  paths: CliPaths;
  desktop?: Desktop;
  now?: () => Date;
};

const NO_DESKTOP: Desktop = { copyToClipboard: () => false, openUrl: () => false };

function selectCommand(argv: readonly string[]): { command: Command; rest: string[] } {
  const matches = COMMANDS.filter((command) => command.path.every((word, index) => argv[index] === word));
  const best = matches.sort((a, b) => b.path.length - a.path.length)[0];
  if (best === undefined) {
    const known = COMMANDS.map((command) => command.path.join(' ')).join(', ');
    throw new AkadError('UNKNOWN_COMMAND', `Unknown command "${argv.join(' ')}". Commands: ${known}.`);
  }
  return { command: best, rest: argv.slice(best.path.length) };
}

function usage(out: Output): void {
  out.line('Usage: akad <command> [flags]');
  for (const command of COMMANDS) {
    out.line(`  ${command.path.join(' ').padEnd(24)}${command.summary}`);
  }
  out.line('Global flags: --network local|preview|preprod, --json, --yes, --dry-run');
}

/**
 * Runs one CLI invocation.
 *
 * @param argv - Arguments after the executable, for example ['wallet', 'create', '--name', 'a1'].
 * @param deps - Output sink, environment and file paths.
 * @returns The process exit code: 0 on success, 1 for an expected failure,
 *   2 for an unexpected one. Never throws.
 */
export async function main(argv: readonly string[], deps: MainDeps): Promise<number> {
  const secrets = new SecretRegistry();
  const out = new Output(deps.sink, secrets, argv.includes('--json'));
  try {
    if (argv.length === 0 || argv[0] === '--help' || argv[0] === 'help') {
      usage(out);
      return 0;
    }
    const { command, rest } = selectCommand(argv);
    const options = { ...GLOBAL_FLAGS, ...command.flags };
    let parsed: { values: Flags; positionals: string[] };
    try {
      parsed = parseArgs({ args: rest, options, allowPositionals: true, strict: true }) as {
        values: Flags;
        positionals: string[];
      };
    } catch (err) {
      throw new AkadError('INVALID_ARGS', (err as Error).message);
    }
    const expected = command.positionals?.length ?? 0;
    if (parsed.positionals.length !== expected) {
      const names = command.positionals?.join(' ') ?? '';
      throw new AkadError('INVALID_ARGS', `Usage: akad ${command.path.join(' ')} ${names}`.trim());
    }
    const config = loadConfig(deps.paths.configFile);
    await command.run(
      {
        env: deps.env,
        config,
        out,
        secrets,
        paths: deps.paths,
        desktop: deps.desktop ?? NO_DESKTOP,
        now: deps.now ?? (() => new Date()),
      },
      parsed.values,
      parsed.positionals
    );
    return 0;
  } catch (err) {
    const message = isAkadError(err)
      ? `error ${err.code}: ${err.message}`
      : `unexpected error: ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`;
    try {
      out.error(message);
    } catch {
      deps.sink.stderr('error: the error message contained a secret and was suppressed.\n');
    }
    return isAkadError(err) ? 1 : 2;
  }
}
