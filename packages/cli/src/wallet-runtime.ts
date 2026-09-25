import * as ledger from '@midnight-ntwrk/ledger-v8';
import { InMemoryTransactionHistoryStorage } from '@midnight-ntwrk/wallet-sdk';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk/dust';
import { mergeWalletEntries, WalletEntrySchema, WalletFacade, type FacadeState } from '@midnight-ntwrk/wallet-sdk/facade';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk/shielded';
import { PublicKey, UnshieldedWallet } from '@midnight-ntwrk/wallet-sdk/unshielded';
import * as Rx from 'rxjs';
import type { ResolvedNetwork } from './config.js';
import { AkadError } from './errors.js';
import type { WalletKeys } from './keys.js';

/** The raw token type of tNIGHT in wallet balance maps. */
export const NIGHT = ledger.nativeToken().raw;

/** A started wallet. Call stop() when done, or the process keeps its sockets open. */
export type RunningWallet = {
  keys: WalletKeys;
  facade: WalletFacade;
  stop: () => Promise<void>;
};

/** Balances of a synced wallet. Amounts are base units. */
export type WalletSummary = {
  night: bigint;
  otherUnshielded: Record<string, bigint>;
  nightUtxos: { total: number; registeredForDust: number };
  dust: bigint;
  shielded: { tokenType: string; coins: number; total: bigint }[];
};

/**
 * Builds and starts the wallet facade for a wallet, following the Midnight.js
 * 4.1.1 testkit: shielded, unshielded and dust wallets from the derived keys,
 * the node relay for submission, and the proof server for proving.
 *
 * @param keys - Keys from deriveWalletKeys.
 * @param network - Endpoints of the target network.
 * @returns The running wallet.
 */
export async function startWallet(keys: WalletKeys, network: ResolvedNetwork): Promise<RunningWallet> {
  const configuration = {
    networkId: keys.networkId,
    indexerClientConnection: { indexerHttpUrl: network.indexerHttp, indexerWsUrl: network.indexerWs },
    provingServerUrl: new URL(network.proofServer),
    relayURL: new URL(network.nodeWs),
    txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema, mergeWalletEntries),
    costParameters: { additionalFeeOverhead: 0n, feeBlocksMargin: 5 },
  };
  const facade = await WalletFacade.init({
    configuration,
    shielded: (config) => ShieldedWallet(config).startWithSecretKeys(keys.shieldedSecretKeys),
    unshielded: (config) => UnshieldedWallet(config).startWithPublicKey(PublicKey.fromKeyStore(keys.unshieldedKeystore)),
    dust: (config) =>
      DustWallet(config).startWithSecretKey(keys.dustSecretKey, ledger.LedgerParameters.initialParameters().dust),
  });
  await facade.start(keys.shieldedSecretKeys, keys.dustSecretKey);
  return { keys, facade, stop: () => facade.stop() };
}

/**
 * Waits until the shielded, unshielded and dust wallets have all caught up
 * with the indexer.
 *
 * @param facade - A started facade.
 * @param timeoutMs - How long to wait.
 * @returns The synced state.
 * @throws AkadError `TIMEOUT` when sync does not finish in time.
 */
export function waitForSync(facade: WalletFacade, timeoutMs: number): Promise<FacadeState> {
  return Rx.firstValueFrom(
    facade.state().pipe(
      Rx.filter((state) => state.isSynced),
      Rx.timeout({
        first: timeoutMs,
        with: () => Rx.throwError(() => new AkadError('TIMEOUT', `Wallet did not sync within ${timeoutMs / 1000} s.`)),
      })
    )
  );
}

/**
 * Waits for the first synced state that satisfies a condition, for example
 * a balance arriving from the faucet.
 *
 * @param facade - A started facade.
 * @param predicate - Condition on the synced state.
 * @param timeoutMs - How long to wait.
 * @param what - Description for the timeout message.
 * @returns The first matching state.
 * @throws AkadError `TIMEOUT`.
 */
export function waitForState(
  facade: WalletFacade,
  predicate: (state: FacadeState) => boolean,
  timeoutMs: number,
  what: string
): Promise<FacadeState> {
  return Rx.firstValueFrom(
    facade.state().pipe(
      Rx.filter((state) => state.isSynced && predicate(state)),
      Rx.timeout({
        first: timeoutMs,
        with: () => Rx.throwError(() => new AkadError('TIMEOUT', `Timed out after ${timeoutMs / 1000} s waiting for ${what}.`)),
      })
    )
  );
}

/**
 * Reads the balances out of a synced state.
 *
 * @param state - A synced facade state.
 * @param now - Current time; dust balance grows with time.
 * @returns The summary.
 */
export function summarize(state: FacadeState, now: Date): WalletSummary {
  const { [NIGHT]: night = 0n, ...otherUnshielded } = state.unshielded.balances;
  const nightCoins = state.unshielded.availableCoins.filter((coin) => coin.utxo.type === NIGHT);
  const byType = new Map<string, { coins: number; total: bigint }>();
  for (const { coin } of state.shielded.availableCoins) {
    const entry = byType.get(coin.type) ?? { coins: 0, total: 0n };
    byType.set(coin.type, { coins: entry.coins + 1, total: entry.total + coin.value });
  }
  return {
    night,
    otherUnshielded,
    nightUtxos: {
      total: nightCoins.length,
      registeredForDust: nightCoins.filter((coin) => coin.meta.registeredForDustGeneration).length,
    },
    dust: state.dust.balance(now),
    shielded: [...byType.entries()].map(([tokenType, entry]) => ({ tokenType, ...entry })),
  };
}
