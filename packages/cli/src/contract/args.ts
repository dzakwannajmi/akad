import { AkadError } from '../errors.js';

/** A circuit argument type as recorded in the compiler's contract-info.json. */
export type ArgType =
  | { 'type-name': 'Uint'; maxval: number }
  | { 'type-name': 'Bytes'; length: number }
  | { 'type-name': 'Boolean' }
  | { 'type-name': 'Struct'; name: string; elements: { name: string; type: ArgType }[] };

export type CircuitArg = bigint | Uint8Array | boolean | { [field: string]: CircuitArg };

const MAX_UINT128 = (1n << 128n) - 1n;

function fail(path: string, message: string): never {
  throw new AkadError('INVALID_ARGS', `Argument ${path}: ${message}`);
}

/**
 * Converts one JSON value to the runtime value a circuit expects. Uints take
 * a decimal string (JSON numbers lose precision above 2^53); Bytes take hex;
 * structs take an object with the same field names.
 *
 * @param value - Parsed JSON value.
 * @param type - Argument type from contract-info.json.
 * @param path - Argument name, for error messages.
 * @returns The converted value.
 * @throws AkadError `INVALID_ARGS` with the argument's name.
 */
export function convertArg(value: unknown, type: ArgType, path: string): CircuitArg {
  switch (type['type-name']) {
    case 'Uint': {
      if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value)) {
        return fail(path, 'must be a decimal string such as "1000000"');
      }
      const n = BigInt(value);
      const max = type.maxval >= 3.4e38 ? MAX_UINT128 : BigInt(Math.floor(type.maxval));
      return n <= max ? n : fail(path, `exceeds the maximum ${max}`);
    }
    case 'Bytes': {
      const hex = typeof value === 'string' ? value.toLowerCase().replace(/^0x/, '') : '';
      if (!new RegExp(`^[0-9a-f]{${type.length * 2}}$`).test(hex)) {
        return fail(path, `must be ${type.length} bytes of hex`);
      }
      return Uint8Array.from(Buffer.from(hex, 'hex'));
    }
    case 'Boolean':
      return typeof value === 'boolean' ? value : fail(path, 'must be true or false');
    case 'Struct': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return fail(path, `must be an object with fields ${type.elements.map((e) => e.name).join(', ')}`);
      }
      const record = value as Record<string, unknown>;
      return Object.fromEntries(
        type.elements.map((element) => [element.name, convertArg(record[element.name], element.type, `${path}.${element.name}`)])
      );
    }
  }
}

/**
 * Converts a `--args` JSON array for a circuit.
 *
 * @param json - The raw `--args` value, for example `["1000000"]`.
 * @param params - Parameter names and types from contract-info.json.
 * @returns Converted arguments in order.
 * @throws AkadError `INVALID_ARGS` for bad JSON, a wrong count, or a bad value.
 */
export function convertArgs(json: string, params: readonly { name: string; type: ArgType }[]): CircuitArg[] {
  let values: unknown;
  try {
    values = JSON.parse(json);
  } catch {
    throw new AkadError('INVALID_ARGS', '--args must be a JSON array, for example \'["1000000"]\'.');
  }
  if (!Array.isArray(values) || values.length !== params.length) {
    const names = params.map((p) => p.name).join(', ') || 'none';
    throw new AkadError('INVALID_ARGS', `This circuit takes ${params.length} argument(s): ${names}.`);
  }
  return params.map((param, index) => convertArg(values[index], param.type, param.name));
}
