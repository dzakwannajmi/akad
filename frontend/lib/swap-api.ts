import { buildProviders } from './providers';
import { PRIVATE_STATE_ID } from './wallet-constants';

// swap.compact has no witness functions and no meaningful private state.
export type SwapPrivateState = Record<string, never>;
export const createInitialSwapPrivateState = (): SwapPrivateState => ({});

const SWAP_CONTRACT_PATH = '/contracts/swap';

let _compiledSwapContract: any = null;
async function loadCompiledSwapContract() {
  if (_compiledSwapContract) return _compiledSwapContract;

  const { CompiledContract } = await import('@midnight-ntwrk/compact-js');
  // Bundled via webpack, NOT fetched over HTTP.
  const contractModule = await import('./contracts/swap/contract/index.js');

  const cc = CompiledContract.make('swap', contractModule.Contract);
  // No witnesses needed for swap.compact.
  const withWitnesses = (CompiledContract as any).withWitnesses({});
  const withAssets = (CompiledContract as any).withCompiledFileAssets(SWAP_CONTRACT_PATH);
  _compiledSwapContract = withWitnesses(withAssets(cc));
  return _compiledSwapContract;
}

// Deploys the swap contract. Reserves start at 0/0 — no separate init()
// circuit exists for swap.compact, unlike token.compact.
export async function deploySwapContract(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string
): Promise<string> {
  const { createUnprovenDeployTx, submitTxAsync } = await import('@midnight-ntwrk/midnight-js-contracts');
  const { sampleSigningKey } = await import('@midnight-ntwrk/compact-runtime');

  const providers = await buildProviders(connectedApi, coinPublicKey, encryptionPublicKey, undefined, SWAP_CONTRACT_PATH);
  const compiledContract = await loadCompiledSwapContract();

  const deployTxData = await (createUnprovenDeployTx as any)(
    {
      zkConfigProvider: providers.zkConfigProvider,
      walletProvider: providers.walletProvider,
    },
    {
      compiledContract,
      args: [],
      privateStateId: PRIVATE_STATE_ID + '-swap',
      initialPrivateState: createInitialSwapPrivateState(),
      signingKey: sampleSigningKey(),
    }
  );

  const contractAddress = deployTxData.public.contractAddress;

  await (submitTxAsync as any)(providers, { unprovenTx: deployTxData.private.unprovenTx });

  await providers.privateStateProvider.setContractAddress(contractAddress);
  await providers.privateStateProvider.set(PRIVATE_STATE_ID + '-swap', createInitialSwapPrivateState());
  await providers.privateStateProvider.setSigningKey(contractAddress, deployTxData.private.signingKey);

  localStorage.setItem('akad_swap_contract', contractAddress);
  return contractAddress;
}

// Seeds the pool's initial liquidity. Call once, right after deploySwapContract.
export async function addLiquidity(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string,
  contractAddress: string,
  amountAKD: bigint,
  amountNight: bigint
): Promise<void> {
  const { submitCallTxAsync } = await import('@midnight-ntwrk/midnight-js-contracts');

  const providers = await buildProviders(
    connectedApi,
    coinPublicKey,
    encryptionPublicKey,
    contractAddress,
    SWAP_CONTRACT_PATH
  );
  const compiledContract = await loadCompiledSwapContract();

  await (submitCallTxAsync as any)(providers, {
    compiledContract,
    contractAddress,
    circuitId: 'addLiquidity',
    args: [amountAKD, amountNight],
    privateStateId: PRIVATE_STATE_ID + '-swap',
  });
}

// Reads current pool reserves directly from the indexer (read-only, no wallet tx needed).
export async function getReserves(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string,
  contractAddress: string
): Promise<{ reserveAKD: bigint; reserveNight: bigint }> {
  const providers = await buildProviders(
    connectedApi,
    coinPublicKey,
    encryptionPublicKey,
    contractAddress,
    SWAP_CONTRACT_PATH
  );

  const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
  const compiledContract = await loadCompiledSwapContract();
  if (contractState === null) {
    throw new Error('Contract state not found');
  }
  const ledgerState = (compiledContract as any).ledger(contractState.data);

  return {
    reserveAKD: BigInt(ledgerState.reserveAKD),
    reserveNight: BigInt(ledgerState.reserveNight),
  };
}

// Executes a swap in either direction. dy must be pre-computed client-side
// via computeSwapOutput() from bonding-curve.ts before calling this.
export async function executeSwap(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string,
  contractAddress: string,
  direction: 'AkdToNight' | 'NightToAkd',
  dx: bigint,
  dy: bigint,
  minOut: bigint
): Promise<void> {
  const { submitCallTxAsync } = await import('@midnight-ntwrk/midnight-js-contracts');

  const providers = await buildProviders(
    connectedApi,
    coinPublicKey,
    encryptionPublicKey,
    contractAddress,
    SWAP_CONTRACT_PATH
  );
  const compiledContract = await loadCompiledSwapContract();

  const circuitId = direction === 'AkdToNight' ? 'swapAkdToNight' : 'swapNightToAkd';

  await (submitCallTxAsync as any)(providers, {
    compiledContract,
    contractAddress,
    circuitId,
    args: [dx, dy, minOut],
    privateStateId: PRIVATE_STATE_ID + '-swap',
  });
}
