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
import { persistentSubmissionService } from './submission.js';
import { readWalletCache, writeWalletCache, type WalletCache } from './wallet-cache.js';

/** The raw token type of tNIGHT in wallet balance maps. */
export const NIGHT = ledger.nativeToken().raw;

/** A started wallet. Call stop() when done, or the process keeps its sockets open. */
export type RunningWallet = {
  keys: WalletKeys;
  facade: WalletFacade;
  /** True when sync resumed from the local cache instead of index 0. */
  restored: boolean;
  /**
   * Saves the current sync state to the cache, if one is configured. Never
   * throws: the cache only saves time, so a failure is reported as a warning.
   */
  save: () => Promise<void>;
  /** Saves the sync state, then stops the wallet. Never throws, so it cannot mask the error that ended a command. */
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
 * the node relay for submission, and the proof server for proving. When a
 * cache file for this wallet exists, sync resumes from it.
 *
 * @param keys - Keys from deriveWalletKeys.
 * @param network - Endpoints of the target network.
 * @param cacheFile - Sync cache path, or null to always sync from index 0.
 * @param warn - Receives non-fatal problems, such as a cache that could not be saved.
 * @returns The running wallet.
 */
export async function startWallet(
  keys: WalletKeys,
  network: ResolvedNetwork,
  cacheFile: string | null,
  warn: (message: string) => void = () => {}
): Promise<RunningWallet> {
  const configuration = {
    networkId: keys.networkId,
    indexerClientConnection: { indexerHttpUrl: network.indexerHttp, indexerWsUrl: network.indexerWs },
    provingServerUrl: new URL(network.proofServer),
    relayURL: new URL(network.nodeWs),
    txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema, mergeWalletEntries),
    costParameters: { additionalFeeOverhead: 0n, feeBlocksMargin: 5 },
  };
  const init = (cache: WalletCache | null) =>
    WalletFacade.init({
      configuration,
      submissionService: () => persistentSubmissionService(new URL(network.nodeWs)),
      shielded: (config) =>
        cache === null
          ? ShieldedWallet(config).startWithSecretKeys(keys.shieldedSecretKeys)
          : ShieldedWallet(config).restore(cache.shielded),
      unshielded: (config) =>
        cache === null
          ? UnshieldedWallet(config).startWithPublicKey(PublicKey.fromKeyStore(keys.unshieldedKeystore))
          : UnshieldedWallet(config).restore(cache.unshielded),
      dust: (config) =>
        cache === null
          ? DustWallet(config).startWithSecretKey(keys.dustSecretKey, ledger.LedgerParameters.initialParameters().dust)
          : DustWallet(config).restore(cache.dust),
    });

  const cache = cacheFile === null ? null : readWalletCache(cacheFile, network.name, keys.addresses.unshielded);
  let facade: WalletFacade;
  let restored = false;
  if (cache === null) {
    facade = await init(null);
  } else {
    try {
      facade = await init(cache);
      restored = true;
    } catch {
      facade = await init(null);
    }
  }
  await facade.start(keys.shieldedSecretKeys, keys.dustSecretKey);

  const save = async (): Promise<void> => {
    if (cacheFile === null) return;
    try {
      const [shielded, unshielded, dust] = await Promise.all([
        facade.shielded.serializeState(),
        facade.unshielded.serializeState(),
        facade.dust.serializeState(),
      ]);
      writeWalletCache(cacheFile, {
        version: 1,
        network: network.name,
        unshieldedAddress: keys.addresses.unshielded,
        shielded,
        unshielded,
        dust,
        savedAt: new Date().toISOString(),
      });
    } catch (err) {
      warn(`wallet cache not saved: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
    }
  };
  return {
    keys,
    facade,
    restored,
    save,
    stop: async () => {
      await save();
      try {
        await facade.stop();
      } catch (err) {
        warn(`wallet did not stop cleanly: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
      }
    },
  };
}

/** Receives a one-line progress report while a wallet syncs. */
export type ProgressReporter = (line: string) => void;

/**
 * Describes sync progress as applied and highest index per wallet.
 *
 * @param state - Any facade state.
 * @returns For example `shielded 120000/350000, dust 98000/350000, unshielded done`.
 */
export function describeProgress(state: FacadeState): string {
  const index = (progress: { appliedIndex: bigint; highestIndex: bigint }) =>
    `${progress.appliedIndex}/${progress.highestIndex}`;
  const unshielded = state.unshielded.progress.isStrictlyComplete() ? 'done' : 'syncing';
  return `shielded ${index(state.shielded.state.progress)}, dust ${index(state.dust.state.progress)}, unshielded ${unshielded}`;
}

/**
 * Waits until the shielded, unshielded and dust wallets have all caught up
 * with the indexer.
 *
 * @param facade - A started facade.
 * @param timeoutMs - How long to wait.
 * @param report - Optional receiver of a progress line every `everyMs`.
 * @param everyMs - Interval between progress lines.
 * @returns The synced state.
 * @throws AkadError `TIMEOUT` when sync does not finish in time.
 */
export async function waitForSync(
  facade: WalletFacade,
  timeoutMs: number,
  report?: ProgressReporter,
  everyMs = 30_000
): Promise<FacadeState> {
  const progress = report === undefined
    ? undefined
    : facade.state().pipe(Rx.throttleTime(everyMs)).subscribe((state) => {
        if (!state.isSynced) report(`sync: ${describeProgress(state)}`);
      });
  try {
    return await Rx.firstValueFrom(
      facade.state().pipe(
        Rx.filter((state) => state.isSynced),
        Rx.timeout({
          first: timeoutMs,
          with: () =>
            Rx.throwError(
              () => new AkadError('TIMEOUT', `Wallet did not sync within ${timeoutMs / 1000} s. Progress is cached; run the command again to continue.`)
            ),
        })
      )
    );
  } finally {
    progress?.unsubscribe();
  }
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
