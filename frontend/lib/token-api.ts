import { buildProviders } from './providers';
import { CONTRACT_PATH, PRIVATE_STATE_ID } from './wallet-constants';

// Our token.compact has no meaningful private state beyond the account witness,
// so this is intentionally empty.
export type TokenPrivateState = Record<string, never>;
export const createInitialPrivateState = (): TokenPrivateState => ({});

// The accountKey witness must return a STABLE identifier for the connected user
// (unlike a one-off random nonce) — derived from their shielded coin public key.
// Derives a stable 32-byte identifier from the wallet's Bech32m-encoded
// shielded coin public key (NOT hex, so fromHex() doesn't work here).
async function deriveAccountKey(coinPublicKey: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(coinPublicKey));
  return new Uint8Array(hashBuffer);
}

function createWitnesses(accountKeyBytes: Uint8Array) {
  return {
    accountKey: ({ privateState }: any): [TokenPrivateState, Uint8Array] => {
      return [privateState, accountKeyBytes];
    },
  };
}

let _compiledContract: any = null;
async function loadCompiledContract(accountKeyBytes: Uint8Array) {
  if (_compiledContract) return _compiledContract;

  const { CompiledContract } = await import('@midnight-ntwrk/compact-js');
  // Bundled via webpack (needs @midnight-ntwrk/compact-runtime resolved), NOT fetched over HTTP.
  const contractModule = await import('./contracts/token/contract/index.js');

  const cc = CompiledContract.make('token', contractModule.Contract);
  const withWitnesses = (CompiledContract as any).withWitnesses(createWitnesses(accountKeyBytes));
  // keys/ and zkir/ ARE fetched over HTTP from public/contracts/token, via CONTRACT_PATH.
  const withAssets = (CompiledContract as any).withCompiledFileAssets(CONTRACT_PATH);
  _compiledContract = withWitnesses(withAssets(cc));
  return _compiledContract;
}

// Step 1: deploy the token contract (ledger starts at defaults — totalSupply = 0).
// Uses createUnprovenDeployTx + submitTxAsync directly — deployContract() is
// known to hang on the Preview network.
export async function deployTokenContract(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string
): Promise<string> {
  const { createUnprovenDeployTx, submitTxAsync } = await import('@midnight-ntwrk/midnight-js-contracts');
  const { sampleSigningKey } = await import('@midnight-ntwrk/compact-runtime');

  const providers = await buildProviders(connectedApi, coinPublicKey, encryptionPublicKey);
  const accountKeyBytes = await deriveAccountKey(coinPublicKey);
  const compiledContract = await loadCompiledContract(accountKeyBytes);

  const deployTxData = await (createUnprovenDeployTx as any)(
    {
      zkConfigProvider: providers.zkConfigProvider,
      walletProvider: providers.walletProvider,
    },
    {
      compiledContract,
      args: [],
      privateStateId: PRIVATE_STATE_ID,
      initialPrivateState: createInitialPrivateState(),
      signingKey: sampleSigningKey(),
    }
  );

  const contractAddress = deployTxData.public.contractAddress;

  await (submitTxAsync as any)(providers, { unprovenTx: deployTxData.private.unprovenTx });

  await providers.privateStateProvider.setContractAddress(contractAddress);
  await providers.privateStateProvider.set(PRIVATE_STATE_ID, createInitialPrivateState());
  await providers.privateStateProvider.setSigningKey(contractAddress, deployTxData.private.signingKey);

  localStorage.setItem('akad_token_contract', contractAddress);
  return contractAddress;
}

// Step 2: call init() on the freshly deployed contract to mint the initial supply.
export async function initTokenContract(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string,
  contractAddress: string
): Promise<void> {
  const { submitCallTxAsync } = await import('@midnight-ntwrk/midnight-js-contracts');

  const providers = await buildProviders(connectedApi, coinPublicKey, encryptionPublicKey, contractAddress);
  const accountKeyBytes = await deriveAccountKey(coinPublicKey);
  const compiledContract = await loadCompiledContract(accountKeyBytes);

  await (submitCallTxAsync as any)(providers, {
    compiledContract,
    contractAddress,
    circuitId: 'init',
    args: [],
    privateStateId: PRIVATE_STATE_ID,
  });
}

// Wraps a public AKD amount into a native shielded coin sent to the caller.
export async function wrapTokens(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string,
  contractAddress: string,
  amount: bigint
): Promise<{ nonce: Uint8Array; value: bigint }> {
  const { submitCallTxAsync } = await import('@midnight-ntwrk/midnight-js-contracts');

  const providers = await buildProviders(connectedApi, coinPublicKey, encryptionPublicKey, contractAddress);

  // Ensure private state exists for this session (same fix as executeSwap).
  const existing = await providers.privateStateProvider.get(PRIVATE_STATE_ID);
  if (existing === null) {
    await providers.privateStateProvider.set(PRIVATE_STATE_ID, createInitialPrivateState());
  }
  await providers.privateStateProvider.setContractAddress(contractAddress);

  const compiledContract = await loadCompiledContract(await deriveAccountKey(coinPublicKey));

  // Random 32-byte nonce for the minted coin.
  const nonce = crypto.getRandomValues(new Uint8Array(32));

  await (submitCallTxAsync as any)(providers, {
    compiledContract,
    contractAddress,
    circuitId: 'wrap',
    args: [amount, nonce],
    privateStateId: PRIVATE_STATE_ID,
  });

  return { nonce, value: amount };
}

// Helper kept local to avoid re-importing fromHex if unused elsewhere.
function fromHexShim(_: string): Uint8Array {
  return new Uint8Array(32);
}

// Reads the AKD shielded color (token type) from the contract's ledger.
export async function getTokenColor(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string,
  contractAddress: string
): Promise<string> {
  const providers = await buildProviders(connectedApi, coinPublicKey, encryptionPublicKey, contractAddress);

  const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
  if (contractState === null) {
    throw new Error('Contract state not found');
  }
  const contractModule = await import('./contracts/token/contract/index.js');
  const ledgerState = (contractModule as any).ledger(contractState.data);

  return ledgerState.tokenColor;
}

// Unwraps a shielded AKD coin back to public balance.
export async function unwrapTokens(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string,
  contractAddress: string,
  coin: { nonce: Uint8Array; color: string; value: bigint }
): Promise<void> {
  const { submitCallTxAsync } = await import('@midnight-ntwrk/midnight-js-contracts');

  const providers = await buildProviders(connectedApi, coinPublicKey, encryptionPublicKey, contractAddress);

  const existing = await providers.privateStateProvider.get(PRIVATE_STATE_ID);
  if (existing === null) {
    await providers.privateStateProvider.set(PRIVATE_STATE_ID, createInitialPrivateState());
  }
  await providers.privateStateProvider.setContractAddress(contractAddress);

  const compiledContract = await loadCompiledContract(await deriveAccountKey(coinPublicKey));

  await (submitCallTxAsync as any)(providers, {
    compiledContract,
    contractAddress,
    circuitId: 'unwrap',
    args: [coin],
    privateStateId: PRIVATE_STATE_ID,
  });
}
