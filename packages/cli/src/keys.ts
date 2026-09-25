import * as ledger from '@midnight-ntwrk/ledger-v8';
import {
  DustAddress,
  MidnightBech32m,
  ShieldedAddress,
  ShieldedCoinPublicKey,
  ShieldedEncryptionPublicKey,
} from '@midnight-ntwrk/wallet-sdk/address-format';
import { HDWallet, Roles, type Role } from '@midnight-ntwrk/wallet-sdk/hd';
import { createKeystore, type UnshieldedKeystore } from '@midnight-ntwrk/wallet-sdk/unshielded';
import { AkadError } from './errors.js';
import type { SecretRegistry } from './output.js';
import type { Seed } from './secrets.js';

/** The three public addresses of a wallet. Safe to print. */
export type WalletAddresses = {
  unshielded: string;
  shielded: string;
  dust: string;
};

/** Everything needed to run a wallet. Holds secrets; never print or serialise it. */
export type WalletKeys = {
  name: string;
  networkId: string;
  shieldedSecretKeys: ledger.ZswapSecretKeys;
  dustSecretKey: ledger.DustSecretKey;
  unshieldedKeystore: UnshieldedKeystore;
  addresses: WalletAddresses;
};

function deriveRoleKey(hdWallet: HDWallet, role: Role): Uint8Array {
  const result = hdWallet.selectAccount(0).selectRole(role).deriveKeyAt(0);
  if (result.type !== 'keyDerived') {
    throw new AkadError('INVALID_SEED', 'Key derivation failed for this seed.');
  }
  return result.key;
}

/**
 * Derives a wallet's keys and addresses from its seed, offline. Account 0,
 * key index 0 for the Zswap, NightExternal and Dust roles, as the Midnight.js
 * testkit does. Every secret it touches is added to `secrets`.
 *
 * @param name - The wallet name, for example `a1`.
 * @param seed - The wallet seed.
 * @param networkId - SDK network id (`undeployed`, `preview` or `preprod`).
 * @param secrets - Registry that output is checked against.
 * @returns Keys and addresses.
 * @throws AkadError `INVALID_SEED` when the HD wallet rejects the seed.
 */
export function deriveWalletKeys(name: string, seed: Seed, networkId: string, secrets: SecretRegistry): WalletKeys {
  secrets.addBytes(seed.bytes());
  const hd = HDWallet.fromSeed(seed.bytes());
  if (hd.type !== 'seedOk') {
    throw new AkadError('INVALID_SEED', 'The HD wallet rejected this seed.');
  }
  const zswapSeed = deriveRoleKey(hd.hdWallet, Roles.Zswap);
  const nightSeed = deriveRoleKey(hd.hdWallet, Roles.NightExternal);
  const dustSeed = deriveRoleKey(hd.hdWallet, Roles.Dust);
  hd.hdWallet.clear();
  for (const key of [zswapSeed, nightSeed, dustSeed]) secrets.addBytes(key);

  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(zswapSeed);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(dustSeed);
  const unshieldedKeystore = createKeystore(nightSeed, networkId);
  secrets.addBytes(unshieldedKeystore.getSecretKey());
  secrets.addBytes(shieldedSecretKeys.coinSecretKey.yesIKnowTheSecurityImplicationsOfThis_serialize());
  secrets.addBytes(shieldedSecretKeys.encryptionSecretKey.yesIKnowTheSecurityImplicationsOfThis_serialize());

  const shieldedAddress = new ShieldedAddress(
    ShieldedCoinPublicKey.fromHexString(shieldedSecretKeys.coinPublicKey),
    ShieldedEncryptionPublicKey.fromHexString(shieldedSecretKeys.encryptionPublicKey)
  );

  return {
    name,
    networkId,
    shieldedSecretKeys,
    dustSecretKey,
    unshieldedKeystore,
    addresses: {
      unshielded: unshieldedKeystore.getBech32Address().asString(),
      shielded: MidnightBech32m.encode(networkId, shieldedAddress).asString(),
      dust: DustAddress.encodePublicKey(networkId, dustSecretKey.publicKey),
    },
  };
}
