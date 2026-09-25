import { AkadError } from './errors.js';

/** Where the CLI writes. Tests pass collectors; the entry point passes the process streams. */
export type OutputSink = {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
};

/**
 * Every secret value known to this process, in each encoding it could be
 * printed in. Output is checked against it before it leaves the process.
 */
export class SecretRegistry {
  readonly #needles = new Set<string>();

  /**
   * Registers secret bytes under their hex (lower and upper case) and base64
   * encodings.
   *
   * @param bytes - Secret material, for example a seed or a derived key.
   */
  addBytes(bytes: Uint8Array): void {
    if (bytes.length < 16) return;
    const buffer = Buffer.from(bytes);
    const hex = buffer.toString('hex');
    this.#needles.add(hex);
    this.#needles.add(hex.toUpperCase());
    this.#needles.add(buffer.toString('base64'));
  }

  /**
   * Tells whether a text contains any registered secret.
   *
   * @param text - Candidate output.
   * @returns True when a registered secret appears in it.
   */
  containsSecret(text: string): boolean {
    for (const needle of this.#needles) {
      if (text.includes(needle)) return true;
    }
    return false;
  }
}

/**
 * The only way commands write text. Each write is checked against the
 * secret registry and refused, not redacted, when it matches: a leak is a
 * bug to fix, never something to paper over.
 */
export class Output {
  readonly #sink: OutputSink;
  readonly #secrets: SecretRegistry;
  readonly json: boolean;

  constructor(sink: OutputSink, secrets: SecretRegistry, json: boolean) {
    this.#sink = sink;
    this.#secrets = secrets;
    this.json = json;
  }

  /** Writes one line to stdout. Throws AkadError `SECRET_IN_OUTPUT` on a match. */
  line(text: string): void {
    this.#sink.stdout(this.guard(text) + '\n');
  }

  /** Writes one line to stderr. Throws AkadError `SECRET_IN_OUTPUT` on a match. */
  error(text: string): void {
    this.#sink.stderr(this.guard(text) + '\n');
  }

  /** Writes aligned `label  value` rows, or one JSON object in `--json` mode. */
  fields(rows: ReadonlyArray<readonly [string, string]>): void {
    if (this.json) {
      this.line(JSON.stringify(Object.fromEntries(rows)));
      return;
    }
    const width = Math.max(...rows.map(([label]) => label.length));
    for (const [label, value] of rows) {
      this.line(`${label.padEnd(width)}  ${value}`);
    }
  }

  /**
   * Checks a string that will leave the process by another route, such as a
   * report file or the clipboard.
   *
   * @param text - The string to check.
   * @returns The same string.
   * @throws AkadError `SECRET_IN_OUTPUT` when it contains a registered secret.
   */
  guard(text: string): string {
    if (this.#secrets.containsSecret(text)) {
      throw new AkadError('SECRET_IN_OUTPUT', 'Refused to write output that contains a secret. This is a CLI bug.');
    }
    return text;
  }
}
