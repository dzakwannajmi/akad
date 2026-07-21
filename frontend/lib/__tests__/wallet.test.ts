import { describe, it, expect, beforeEach } from 'vitest';
import { getCompatibleWallets } from '../wallet';

describe('getCompatibleWallets', () => {
  beforeEach(() => {
    delete window.midnight;
  });

  it('returns an empty array when no wallet extension is installed', () => {
    expect(getCompatibleWallets()).toEqual([]);
  });

  it('filters out wallets with an incompatible API version', () => {
    (window as any).midnight = {
      lace: { name: 'Lace', apiVersion: '2.0.0', rdns: 'network.midnight.lace', icon: '', connect: async () => ({}) },
    };
    expect(getCompatibleWallets()).toEqual([]);
  });

  it('includes wallets matching the compatible API version range', () => {
    (window as any).midnight = {
      lace: { name: 'Lace', apiVersion: '4.0.1', rdns: 'network.midnight.lace', icon: '', connect: async () => ({}) },
    };
    expect(getCompatibleWallets()).toHaveLength(1);
  });
});
