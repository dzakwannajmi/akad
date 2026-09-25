import type { SigningKey } from '@midnight-ntwrk/compact-runtime';
import type { PrivateStateId, PrivateStateProvider } from '@midnight-ntwrk/midnight-js-types';

/**
 * In-memory PrivateStateProvider. Each CLI process stages the witness input
 * of one call and exits, so nothing needs to outlive it. Export and import
 * fail loudly instead of pretending to work.
 *
 * @returns A provider scoped to the contract address set on it.
 */
export function memoryPrivateStateProvider<PS>(): PrivateStateProvider<PrivateStateId, PS> {
  const states = new Map<string, PS>();
  const signingKeys = new Map<string, SigningKey>();
  let scope = '';
  const key = (id: string) => `${scope}:${id}`;
  const unsupported = (what: string) => async (): Promise<never> => {
    throw new Error(`${what} is not supported by the CLI's in-memory private state`);
  };
  return {
    setContractAddress(address) {
      scope = address;
    },
    async set(id, state) {
      states.set(key(id), state);
    },
    async get(id) {
      return states.get(key(id)) ?? null;
    },
    async remove(id) {
      states.delete(key(id));
    },
    async clear() {
      states.clear();
    },
    async setSigningKey(address, signingKey) {
      signingKeys.set(address, signingKey);
    },
    async getSigningKey(address) {
      return signingKeys.get(address) ?? null;
    },
    async removeSigningKey(address) {
      signingKeys.delete(address);
    },
    async clearSigningKeys() {
      signingKeys.clear();
    },
    exportPrivateStates: unsupported('exportPrivateStates'),
    importPrivateStates: unsupported('importPrivateStates'),
    exportSigningKeys: unsupported('exportSigningKeys'),
    importSigningKeys: unsupported('importSigningKeys'),
  };
}
