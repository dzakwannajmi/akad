import type * as ledger from '@midnight-ntwrk/ledger-v8';
import type { ContractProviders } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import type { ResolvedNetwork } from '../config.js';
import type { RunningWallet } from '../wallet-runtime.js';
import type { AkadPrivateState, AkadV1Contract } from './akad-v1-compiled.js';
import { memoryPrivateStateProvider } from './private-state.js';

/**
 * Runs after a transaction is proven and balanced, before it can be
 * submitted. Throwing here guarantees nothing reaches the network: this is
 * where the fee cap and the --yes confirmation are enforced.
 */
export type SubmitGate = (finalized: ledger.FinalizedTransaction) => Promise<void>;

/** Filled in when the transaction is handed to the node. */
export type Submission = { identifier: string | null };

const ONE_HOUR_MS = 60 * 60 * 1000;

/** The v1 contract's provable circuit ids, as the provider types spell them. */
type AkadV1CircuitId = Parameters<ContractProviders<AkadV1Contract>['zkConfigProvider']['getVerifierKey']>[0];

/**
 * Midnight.js providers for the v1 contract, backed by a running wallet.
 * Balancing follows the Midnight.js 4.1.1 testkit: balance the unbound
 * transaction, sign unshielded inputs with the wallet's keystore, finalize.
 *
 * @param wallet - Started, synced wallet.
 * @param network - Endpoints.
 * @param zkAssetsDir - contracts/managed/akad, with keys/ and zkir/.
 * @param gate - Pre-submission check.
 * @param submission - Receives the transaction identifier on submission.
 * @returns Providers for findDeployedContract.
 */
export function akadV1Providers(
  wallet: RunningWallet,
  network: ResolvedNetwork,
  zkAssetsDir: string,
  gate: SubmitGate,
  submission: Submission
): ContractProviders<AkadV1Contract> {
  const { facade, keys } = wallet;
  const zkConfigProvider = new NodeZkConfigProvider<AkadV1CircuitId>(zkAssetsDir);
  const walletAndMidnight = {
    getCoinPublicKey: () => keys.shieldedSecretKeys.coinPublicKey,
    getEncryptionPublicKey: () => keys.shieldedSecretKeys.encryptionPublicKey,
    async balanceTx(tx: Parameters<typeof facade.balanceUnboundTransaction>[0], ttl?: Date) {
      const recipe = await facade.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: keys.shieldedSecretKeys, dustSecretKey: keys.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + ONE_HOUR_MS) }
      );
      const signed = await facade.signRecipe(recipe, (payload) => keys.unshieldedKeystore.signData(payload));
      const finalized = await facade.finalizeRecipe(signed);
      await gate(finalized);
      return finalized;
    },
    async submitTx(tx: ledger.FinalizedTransaction) {
      const identifier = await facade.submitTransaction(tx);
      submission.identifier = identifier;
      return identifier;
    },
  };
  return {
    privateStateProvider: memoryPrivateStateProvider<AkadPrivateState>(),
    publicDataProvider: indexerPublicDataProvider(network.indexerHttp, network.indexerWs),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(network.proofServer, zkConfigProvider),
    walletProvider: walletAndMidnight,
    midnightProvider: walletAndMidnight,
  };
}
