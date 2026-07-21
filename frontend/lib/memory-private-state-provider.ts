export function createMemoryPrivateStateProvider(): any {
  const states = new Map<string, any>();
  const signingKeys = new Map<string, any>();
  let contractAddress: string | null = null;

  return {
    setContractAddress(address: string) {
      contractAddress = address;
    },
    async set(privateStateId: string, state: any) {
      states.set(privateStateId, state);
    },
    async get(privateStateId: string) {
      return states.has(privateStateId) ? states.get(privateStateId) : null;
    },
    async remove(privateStateId: string) {
      states.delete(privateStateId);
    },
    async clear() {
      states.clear();
    },
    async setSigningKey(address: string, signingKey: any) {
      signingKeys.set(address, signingKey);
    },
    async getSigningKey(address: string) {
      return signingKeys.has(address) ? signingKeys.get(address) : null;
    },
    async removeSigningKey(address: string) {
      signingKeys.delete(address);
    },
    async clearSigningKeys() {
      signingKeys.clear();
    },
    // Export/import not needed for Level 1-3 dev flow; stubbed to fail loudly
    // rather than silently, so future-you notices if this is ever relied on.
    async exportPrivateStates() {
      throw new Error('exportPrivateStates not implemented in memory provider');
    },
    async importPrivateStates() {
      throw new Error('importPrivateStates not implemented in memory provider');
    },
    async exportSigningKeys() {
      throw new Error('exportSigningKeys not implemented in memory provider');
    },
    async importSigningKeys() {
      throw new Error('importSigningKeys not implemented in memory provider');
    },
  };
}
