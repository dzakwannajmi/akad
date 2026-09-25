import { describe, it, expect, afterEach, vi } from 'vitest';

// lib/networks.ts reads the stored network once, when the module loads, so
// each test installs its storage double first and then imports a fresh copy.
async function loadNetworks() {
  vi.resetModules();
  return import('../networks');
}

const originalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');

function installStorage(get: () => unknown): void {
  Object.defineProperty(window, 'localStorage', { configurable: true, get });
}

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

afterEach(() => {
  if (originalStorage) {
    Object.defineProperty(window, 'localStorage', originalStorage);
  } else {
    Reflect.deleteProperty(window, 'localStorage');
  }
  vi.restoreAllMocks();
});

describe('network store', () => {
  it('restores a stored network choice', async () => {
    installStorage(() => memoryStorage({ 'akad-network': 'preprod' }));
    const { getCurrentNetworkKey } = await loadNetworks();
    expect(getCurrentNetworkKey()).toBe('preprod');
  });

  it('ignores a stored value that is not a known network', async () => {
    installStorage(() => memoryStorage({ 'akad-network': 'mainnet' }));
    const { getCurrentNetworkKey, DEFAULT_NETWORK } = await loadNetworks();
    expect(getCurrentNetworkKey()).toBe(DEFAULT_NETWORK);
  });

  // Node 25 and later install their own localStorage global, which is
  // undefined unless Node runs with --localstorage-file.
  it('falls back to the default network when storage is missing', async () => {
    installStorage(() => undefined);
    const { getCurrentNetworkKey, DEFAULT_NETWORK } = await loadNetworks();
    expect(getCurrentNetworkKey()).toBe(DEFAULT_NETWORK);
  });

  // Browsers throw a SecurityError on access when site data is blocked.
  it('falls back to the default network when storage access throws', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    installStorage(() => {
      throw new DOMException('Storage is blocked', 'SecurityError');
    });
    const { getCurrentNetworkKey, DEFAULT_NETWORK } = await loadNetworks();
    expect(getCurrentNetworkKey()).toBe(DEFAULT_NETWORK);
    expect(logged).toHaveBeenCalledOnce();
  });

  it('saves a network switch to storage', async () => {
    const storage = memoryStorage();
    installStorage(() => storage);
    const { setCurrentNetwork, DEFAULT_NETWORK } = await loadNetworks();
    const other = DEFAULT_NETWORK === 'preview' ? 'preprod' : 'preview';
    setCurrentNetwork(other);
    expect(storage.data.get('akad-network')).toBe(other);
  });

  it('still switches and notifies subscribers when saving fails', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    installStorage(() => ({
      getItem: () => null,
      setItem: () => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      },
    }));
    const { setCurrentNetwork, subscribeToNetwork, getCurrentNetworkKey, DEFAULT_NETWORK } =
      await loadNetworks();
    const other = DEFAULT_NETWORK === 'preview' ? 'preprod' : 'preview';
    const listener = vi.fn();
    subscribeToNetwork(listener);
    setCurrentNetwork(other);
    expect(getCurrentNetworkKey()).toBe(other);
    expect(listener).toHaveBeenCalledWith(other);
    expect(logged).toHaveBeenCalledOnce();
  });
});
