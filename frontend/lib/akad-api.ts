import { buildProviders } from './providers';
import { PRIVATE_STATE_ID } from './wallet-constants';

// akad.compact has no witness functions — caller identity comes from
// ownPublicKey() inside the circuits, not a self-declared witness — and no
// meaningful private state. This slot is kept only because midnight-js
// expects a private state provider entry per contract.
export type AkadPrivateState = Record<string, never>;
export const createInitialPrivateState = (): AkadPrivateState => ({});

const AKAD_CONTRACT_PATH = '/contracts/akad';

let _compiledContract: any = null;
async function loadCompiledContract() {
  if (_compiledContract) return _compiledContract;

  const { CompiledContract } = await import('@midnight-ntwrk/compact-js');
  // Bundled via webpack, NOT fetched over HTTP.
  const contractModule = await import('./contracts/akad/contract/index.js');

  const cc = (CompiledContract as any).make('akad', contractModule.Contract);
  // NOTE: cast to any because this MacBook's installed compact compiler emits
  // Promise-wrapped CircuitResults in the generated .d.ts, while
  // @midnight-ntwrk/compact-js@2.5.1's CompiledContract.make() generic bound
  // still expects the older non-Promise shape. Confirmed by recompiling the
  // previous token.compact fresh on this machine: same mismatch, so this is
  // toolchain version skew from the Windows->MacBook migration, not a defect
  // in this contract. Every other midnight-js call in this file already goes
  // through `as any` for the same underlying reason.
  const withWitnesses = (CompiledContract as any).withWitnesses({});
  const withAssets = (CompiledContract as any).withCompiledFileAssets(AKAD_CONTRACT_PATH);
  _compiledContract = withWitnesses(withAssets(cc));
  return _compiledContract;
}

// Step 1: deploy the merged Akad contract (ledger starts at defaults —
// totalSupply = 0, reserveAKD = 0, reserveNight = 0).
export async function deployAkadContract(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string
): Promise<string> {
  const { createUnprovenDeployTx, submitTxAsync } = await import('@midnight-ntwrk/midnight-js-contracts');
  const { sampleSigningKey } = await import('@midnight-ntwrk/compact-runtime');

  const providers = await buildProviders(connectedApi, coinPublicKey, encryptionPublicKey, undefined, AKAD_CONTRACT_PATH);
  const compiledContract = await loadCompiledContract();

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

  localStorage.setItem('akad_contract', contractAddress);
  return contractAddress;
}

// Waits until the indexer has picked up a just-submitted transaction for
// this contract address. Deploying and then immediately calling another
// circuit against the same address can race the indexer on Preview —
// "No public state found at contract address ..." is that race, not a
// real failure. Polls until state actually shows up, or times out.
export async function waitForContractState(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string,
  contractAddress: string,
  timeoutMs: number = 60000,
  intervalMs: number = 2000
): Promise<void> {
  const providers = await buildProviders(connectedApi, coinPublicKey, encryptionPublicKey, contractAddress, AKAD_CONTRACT_PATH);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const state = await providers.publicDataProvider.queryContractState(contractAddress);
    if (state !== null) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Timed out waiting for the indexer to pick up contract ${contractAddress}. ` +
    'The deploy transaction may still be pending, or may have failed — check the wallet and the block explorer before retrying.'
  );
}

// Step 2: call init() on the freshly deployed contract to mint the initial supply.
export async function initAkadContract(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string,
  contractAddress: string
): Promise<void> {
  const { submitCallTxAsync } = await import('@midnight-ntwrk/midnight-js-contracts');

  const providers = await buildProviders(connectedApi, coinPublicKey, encryptionPublicKey, contractAddress, AKAD_CONTRACT_PATH);

  const existing = await providers.privateStateProvider.get(PRIVATE_STATE_ID);
  if (!existing) {
    await providers.privateStateProvider.set(PRIVATE_STATE_ID, createInitialPrivateState());
  }

  const compiledContract = await loadCompiledContract();

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
): Promise<{ nonce: Uint8Array; value: bigint; txId: string }> {
  const { submitCallTxAsync } = await import('@midnight-ntwrk/midnight-js-contracts');

  const providers = await buildProviders(connectedApi, coinPublicKey, encryptionPublicKey, contractAddress, AKAD_CONTRACT_PATH);

  const existing = await providers.privateStateProvider.get(PRIVATE_STATE_ID);
  if (existing === null) {
    await providers.privateStateProvider.set(PRIVATE_STATE_ID, createInitialPrivateState());
  }
  await providers.privateStateProvider.setContractAddress(contractAddress);

  const compiledContract = await loadCompiledContract();

  // Random 32-byte nonce for the minted coin.
  const nonce = crypto.getRandomValues(new Uint8Array(32));

  const result = await (submitCallTxAsync as any)(providers, {
    compiledContract,
    contractAddress,
    circuitId: 'wrap',
    args: [amount, nonce],
    privateStateId: PRIVATE_STATE_ID,
  });

  return { nonce, value: amount, txId: result.txId };
}

// Reads the AKD shielded color (token type) from the contract's ledger.
export async function getTokenColor(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string,
  contractAddress: string
): Promise<Uint8Array> {
  const providers = await buildProviders(connectedApi, coinPublicKey, encryptionPublicKey, contractAddress, AKAD_CONTRACT_PATH);

  const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
  if (contractState === null) {
    throw new Error('Contract state not found');
  }
  const contractModule = await import('./contracts/akad/contract/index.js');
  const ledgerState = (contractModule as any).ledger(contractState.data);

  return ledgerState.tokenColor;
}

// Unwraps a shielded AKD coin back to public balance.
export async function unwrapTokens(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string,
  contractAddress: string,
  coin: { nonce: Uint8Array; color: Uint8Array; value: bigint }
): Promise<{ txId: string }> {
  const { submitCallTxAsync } = await import('@midnight-ntwrk/midnight-js-contracts');

  const providers = await buildProviders(connectedApi, coinPublicKey, encryptionPublicKey, contractAddress, AKAD_CONTRACT_PATH);

  const existing = await providers.privateStateProvider.get(PRIVATE_STATE_ID);
  if (existing === null) {
    await providers.privateStateProvider.set(PRIVATE_STATE_ID, createInitialPrivateState());
  }
  await providers.privateStateProvider.setContractAddress(contractAddress);

  const compiledContract = await loadCompiledContract();

  const result = await (submitCallTxAsync as any)(providers, {
    compiledContract,
    contractAddress,
    circuitId: 'unwrap',
    args: [coin],
    privateStateId: PRIVATE_STATE_ID,
  });

  return { txId: result.txId };
}

// Transfers AKD from the caller to a recipient. Not wired into the swap UI
// today, exposed for completeness / future use (e.g. a standalone send page).
export async function transferTokens(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string,
  contractAddress: string,
  to: Uint8Array,
  amount: bigint
): Promise<void> {
  const { submitCallTxAsync } = await import('@midnight-ntwrk/midnight-js-contracts');

  const providers = await buildProviders(connectedApi, coinPublicKey, encryptionPublicKey, contractAddress, AKAD_CONTRACT_PATH);
  const compiledContract = await loadCompiledContract();

  await (submitCallTxAsync as any)(providers, {
    compiledContract,
    contractAddress,
    circuitId: 'transfer',
    args: [to, amount],
    privateStateId: PRIVATE_STATE_ID,
  });
}

// Seeds the pool's initial liquidity. Call once, right after init(). This
// now moves amountAKD out of the caller's own public balance into the
// pool's on-chain custody (see contracts/src/akad.compact) — the caller
// needs at least that much AKD balance already, e.g. from init()'s mint.
export async function addLiquidity(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string,
  contractAddress: string,
  amountAKD: bigint,
  amountNight: bigint
): Promise<{ txId: string }> {
  const { submitCallTxAsync } = await import('@midnight-ntwrk/midnight-js-contracts');

  const providers = await buildProviders(connectedApi, coinPublicKey, encryptionPublicKey, contractAddress, AKAD_CONTRACT_PATH);
  const compiledContract = await loadCompiledContract();

  const result = await (submitCallTxAsync as any)(providers, {
    compiledContract,
    contractAddress,
    circuitId: 'addLiquidity',
    args: [amountAKD, amountNight],
    privateStateId: PRIVATE_STATE_ID,
  });

  return { txId: result.txId };
}

// Reads the faucet's custody account bytes directly from ledger state
// (written once by init(), see contracts/src/akad.compact), so the caller
// of transferTokens() below doesn't need to reimplement persistentHash()
// in TypeScript to compute it.
export async function getFaucetAddress(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string,
  contractAddress: string
): Promise<Uint8Array> {
  const providers = await buildProviders(connectedApi, coinPublicKey, encryptionPublicKey, contractAddress, AKAD_CONTRACT_PATH);

  const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
  if (contractState === null) {
    throw new Error('Contract state not found');
  }
  const contractModule = await import('./contracts/akad/contract/index.js');
  const ledgerState = (contractModule as any).ledger(contractState.data);

  return ledgerState.faucetAddress;
}

// Claims a one-time, fixed 50 AKD bootstrap amount from the on-chain public
// faucet (see contracts/src/akad.compact claimFaucet()), for a wallet that
// has never held AKD before and needs enough to try a real swap. Each
// wallet can only succeed here once — a second call fails on-chain with
// "this wallet has already claimed from the faucet".
export async function claimFaucet(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string,
  contractAddress: string
): Promise<{ txId: string }> {
  const { submitCallTxAsync } = await import('@midnight-ntwrk/midnight-js-contracts');

  const providers = await buildProviders(connectedApi, coinPublicKey, encryptionPublicKey, contractAddress, AKAD_CONTRACT_PATH);

  const existing = await providers.privateStateProvider.get(PRIVATE_STATE_ID);
  if (existing === null) {
    await providers.privateStateProvider.set(PRIVATE_STATE_ID, createInitialPrivateState());
  }
  await providers.privateStateProvider.setContractAddress(contractAddress);

  const compiledContract = await loadCompiledContract();

  const result = await (submitCallTxAsync as any)(providers, {
    compiledContract,
    contractAddress,
    circuitId: 'claimFaucet',
    args: [],
    privateStateId: PRIVATE_STATE_ID,
  });

  return { txId: result.txId };
}

// Reads the faucet's own AKD balance directly from ledger state (read-only,
// no wallet tx needed) — lets the UI show whether the faucet still has
// funds before someone tries to claim from an empty one.
export async function getFaucetBalance(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string,
  contractAddress: string
): Promise<bigint> {
  const providers = await buildProviders(connectedApi, coinPublicKey, encryptionPublicKey, contractAddress, AKAD_CONTRACT_PATH);

  const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
  if (contractState === null) {
    throw new Error('Contract state not found');
  }
  const contractModule = await import('./contracts/akad/contract/index.js');
  const ledgerState = (contractModule as any).ledger(contractState.data);

  const faucetAddress = ledgerState.faucetAddress;
  if (!ledgerState.balances.member(faucetAddress)) {
    return 0n;
  }
  return BigInt(ledgerState.balances.lookup(faucetAddress));
}

// Reads current pool reserves directly from the indexer (read-only, no wallet tx needed).
export async function getReserves(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string,
  contractAddress: string
): Promise<{ reserveAKD: bigint; reserveNight: bigint }> {
  const providers = await buildProviders(connectedApi, coinPublicKey, encryptionPublicKey, contractAddress, AKAD_CONTRACT_PATH);

  const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
  if (contractState === null) {
    throw new Error('Contract state not found');
  }
  const contractModule = await import('./contracts/akad/contract/index.js');
  const ledgerState = (contractModule as any).ledger(contractState.data);

  return {
    reserveAKD: BigInt(ledgerState.reserveAKD),
    reserveNight: BigInt(ledgerState.reserveNight),
  };
}

// Executes a swap in either direction. dy must be pre-computed client-side
// via computeSwapOutput() from bonding-curve.ts before calling this. The
// AKD leg now moves real balance between the trader and the pool's custody
// account; the NIGHT leg is still simulated (see contracts/src/akad.compact).
export async function executeSwap(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string,
  contractAddress: string,
  direction: 'AkdToNight' | 'NightToAkd',
  dx: bigint,
  dy: bigint,
  minOut: bigint
): Promise<{ txId: string }> {
  const { submitCallTxAsync } = await import('@midnight-ntwrk/midnight-js-contracts');

  const providers = await buildProviders(connectedApi, coinPublicKey, encryptionPublicKey, contractAddress, AKAD_CONTRACT_PATH);

  const existing = await providers.privateStateProvider.get(PRIVATE_STATE_ID);
  if (existing === null) {
    await providers.privateStateProvider.set(PRIVATE_STATE_ID, createInitialPrivateState());
  }
  await providers.privateStateProvider.setContractAddress(contractAddress);

  const compiledContract = await loadCompiledContract();

  const circuitId = direction === 'AkdToNight' ? 'swapAkdToNight' : 'swapNightToAkd';

  const result = await (submitCallTxAsync as any)(providers, {
    compiledContract,
    contractAddress,
    circuitId,
    args: [dx, dy, minOut],
    privateStateId: PRIVATE_STATE_ID,
  });

  return { txId: result.txId };
}

// Private swap AKD -> tNIGHT: spends a shielded AKD coin directly as the
// swap's input instead of debiting a public balance (see
// contracts/src/akad.compact privateSwapAkdToNight()). The caller's wallet
// identity never touches the public balances map for this trade. `coin`
// must already carry the correct color (fetch via getTokenColor(), same
// as unwrapTokens() above) -- the circuit asserts it on-chain and rejects
// anything else. dy must be pre-computed client-side via
// computeSwapOutput(), same convention as executeSwap().
export async function privateSwapAkdToNight(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string,
  contractAddress: string,
  coin: { nonce: Uint8Array; color: Uint8Array; value: bigint },
  dy: bigint,
  minOut: bigint
): Promise<{ txId: string }> {
  const { submitCallTxAsync } = await import('@midnight-ntwrk/midnight-js-contracts');

  const providers = await buildProviders(connectedApi, coinPublicKey, encryptionPublicKey, contractAddress, AKAD_CONTRACT_PATH);

  const existing = await providers.privateStateProvider.get(PRIVATE_STATE_ID);
  if (existing === null) {
    await providers.privateStateProvider.set(PRIVATE_STATE_ID, createInitialPrivateState());
  }
  await providers.privateStateProvider.setContractAddress(contractAddress);

  const compiledContract = await loadCompiledContract();

  const result = await (submitCallTxAsync as any)(providers, {
    compiledContract,
    contractAddress,
    circuitId: 'privateSwapAkdToNight',
    args: [coin, dy, minOut],
    privateStateId: PRIVATE_STATE_ID,
  });

  return { txId: result.txId };
}

// Private swap tNIGHT -> AKD: instead of crediting the trader's public
// balance, mints their AKD output as a fresh shielded coin (see
// contracts/src/akad.compact privateSwapNightToAkd()), same pattern as
// wrapTokens() above. The caller's wallet identity never touches the
// public balances map on this side either. dx/dy/minOut follow the same
// convention as executeSwap(); the returned coin can be unwrapped later
// via unwrapTokens() exactly like a coin from wrapTokens().
export async function privateSwapNightToAkd(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string,
  contractAddress: string,
  dx: bigint,
  dy: bigint,
  minOut: bigint
): Promise<{ nonce: Uint8Array; value: bigint; txId: string }> {
  const { submitCallTxAsync } = await import('@midnight-ntwrk/midnight-js-contracts');

  const providers = await buildProviders(connectedApi, coinPublicKey, encryptionPublicKey, contractAddress, AKAD_CONTRACT_PATH);

  const existing = await providers.privateStateProvider.get(PRIVATE_STATE_ID);
  if (existing === null) {
    await providers.privateStateProvider.set(PRIVATE_STATE_ID, createInitialPrivateState());
  }
  await providers.privateStateProvider.setContractAddress(contractAddress);

  const compiledContract = await loadCompiledContract();

  // Random 32-byte nonce for the newly minted coin, same as wrapTokens().
  const nonce = crypto.getRandomValues(new Uint8Array(32));

  const result = await (submitCallTxAsync as any)(providers, {
    compiledContract,
    contractAddress,
    circuitId: 'privateSwapNightToAkd',
    args: [dx, dy, minOut, nonce],
    privateStateId: PRIVATE_STATE_ID,
  });

  return { nonce, value: dy, txId: result.txId };
}
