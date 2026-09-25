import type { AkadConfig } from './config.js';
import type { Output, SecretRegistry } from './output.js';

/** Environment variables, read once by the entry point and passed down. */
export type CliEnv = Readonly<Record<string, string | undefined>>;

/** File locations the CLI reads and writes. */
export type CliPaths = {
  repoRoot: string;
  envFile: string;
  configFile: string;
  reportsDir: string;
};

/** Parsed flags: strings, booleans, or repeated strings. */
export type Flags = Readonly<Record<string, string | boolean | string[] | undefined>>;

/**
 * Side effects on the operator's machine. Each returns false when it could
 * not act, for example off macOS, and the command prints a manual step.
 */
export type Desktop = {
  copyToClipboard: (text: string) => boolean;
  openUrl: (url: string) => boolean;
};

/** Everything a command may touch. Commands never read process.env or process.stdout directly. */
export type CliContext = {
  env: CliEnv;
  config: AkadConfig;
  out: Output;
  secrets: SecretRegistry;
  paths: CliPaths;
  desktop: Desktop;
  now: () => Date;
};

export type FlagSpec = { type: 'string' | 'boolean'; multiple?: boolean };

/** One CLI command, for example `wallet create`. */
export type Command = {
  /** Words that select the command, for example ['wallet', 'create']. */
  path: readonly string[];
  summary: string;
  /** True when the command can submit a transaction. */
  submits: boolean;
  /** Positional arguments after the command words, for example the circuit name of `call`. */
  positionals?: readonly string[];
  flags: Readonly<Record<string, FlagSpec>>;
  run: (ctx: CliContext, flags: Flags, positionals: readonly string[]) => Promise<void>;
};
