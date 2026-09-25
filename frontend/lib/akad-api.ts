import { buildProviders } from './providers';
import { buildReadOnlyProviders } from './read-only-providers';
import { PRIVATE_STATE_ID } from './wallet-constants';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { MidnightBech32m, ShieldedCoinPublicKey, UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';
import { encodeUserAddress } from '@midnight-ntwrk/ledger-v8';

// akad.compact declares two witnesses, and this is the private state they
// read from. Caller identity is still NOT a witness: it comes from
// ownPublicKey() inside the circuits, so it cannot be self-declared.
//
// What is a witness is coin material. A circuit argument becomes a public
// input to that circuit's ZK proof, so passing a coin nonce as an argument
// publishes it, at mint time and again at spend time, which is all an
// observer needs to link a shielded coin to the wallet that created it.
// Routing both through private state keeps them out of the proof's public
// inputs. Neither value ever leaves the browser.
export type ShieldedCoin = {
  nonce: Uint8Array;
  color: Uint8Array;
  value: bigint;
};

export type AkadPrivateState = {
  // Randomness for a coin the contract is about to mint. Set immediately
  // before wrap() or either shielded swap; read by the coinNonce()
  // witness.
  pendingNonce: Uint8Array | null;
  // The shielded coin the contract is about to receive. Set immediately
  // before unwrap(), unwrapNight() or either shielded swap; read by the
  // spentCoin() witness.
  pendingCoin: ShieldedCoin | null;
};

export const createInitialPrivateState = (): AkadPrivateState => ({
  pendingNonce: null,
  pendingCoin: null,
});

// The witness implementations handed to the compiled contract. They are
// deliberately dumb: they read what the caller staged and hand it to the
// circuit. Throwing here rather than returning a zero value is the point —
// a silently-zero nonce would mint a coin nobody can ever spend, and a
// silently-empty coin would fail deep inside proving with an opaque error.
const akadWitnesses = {
  coinNonce: (
    context: { privateState: AkadPrivateState }
  ): [AkadPrivateState, Uint8Array] => {
    const state = context.privateState;
    if (!state || !state.pendingNonce) {
      throw new Error(
        'coinNonce witness called with no pending nonce in private state. ' +
        'stagePendingNonce() must run before any circuit that mints a coin.'
      );
    }
    return [state, state.pendingNonce];
  },
  spentCoin: (
    context: { privateState: AkadPrivateState }
  ): [AkadPrivateState, ShieldedCoin] => {
    const state = context.privateState;
    if (!state || !state.pendingCoin) {
      throw new Error(
        'spentCoin witness called with no pending coin in private state. ' +
        'stagePendingCoin() must run before any circuit that spends a coin.'
      );
    }
    return [state, state.pendingCoin];
  },
};

// Stages a value into private state for the witness that is about to read
// it, merging rather than replacing so the other slot survives.
async function stagePrivateState(
  providers: any,
  contractAddress: string,
  patch: Partial<AkadPrivateState>
): Promise<void> {
  const existing: AkadPrivateState | null = await providers.privateStateProvider.get(PRIVATE_STATE_ID);
  const base = existing ?? createInitialPrivateState();
  await providers.privateStateProvider.set(PRIVATE_STATE_ID, { ...base, ...patch });
  await providers.privateStateProvider.setContractAddress(contractAddress);
}

const AKAD_CONTRACT_PATH = '/contracts/akad';

let _compiledContract: any = null;
async function loadCompiledContract() {
  if (_compiledContract) return _compiledContract;

  const { CompiledContract } = await import('@midnight-ntwrk/compact-js');
  // Bundled via webpack, NOT fetched over HTTP.
  const contractModule = await import('./contracts/akad/contract/index.js');

  const cc = CompiledContract.make('akad', contractModule.Contract);
  // The curried forms below take their type parameters from the contract
  // they are later applied to. TypeScript cannot infer them at this call, so
  // without the casts tsc resolves each parameter type to `never`.
  const withWitnesses = (CompiledContract as any).withWitnesses(akadWitnesses); // interop: compact-js 2.5.1 curried withWitnesses cannot infer C, PS, R here
  const withAssets = (CompiledContract as any).withCompiledFileAssets(AKAD_CONTRACT_PATH); // interop: compact-js 2.5.1 curried withCompiledFileAssets cannot infer C, PS, R here
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

  const deployTxData = await (createUnprovenDeployTx as any)( // interop: midnight-js-contracts 4.1.1 deploy options have no privateStateId field; createUnprovenDeployTx ignores it
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

  await submitTxAsync(providers, { unprovenTx: deployTxData.private.unprovenTx });

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

// There is no init() step any more: the contract's constructor mints the
// initial supply to the deployer as part of the deploy transaction. See
// contracts/src/akad.compact for why (the old init() circuit was
// front-runnable between deploy and the first call).
//
// One post-deploy call does remain. tokenColor cannot be derived in the
// constructor, because kernel.self() does not return the deployed
// contract's address there, so recordTokenColor() writes it (and
// sNightColor) from inside a circuit instead. It needs no access control
// and is safe to repeat: every caller writes byte-identical data. Contract
// correctness does not depend on it either, since every circuit that
// accepts a coin derives the colour itself; this only populates the ledger
// fields the frontend reads so it does not need a transaction to learn the
// colours.
export async function recordTokenColor(
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

  await submitCallTxAsync(providers, {
    compiledContract,
    contractAddress,
    circuitId: 'recordTokenColor',
    args: [],
    privateStateId: PRIVATE_STATE_ID,
  });
}

export type PublicPoolState = {
  reserveAKD: bigint;
  reserveNight: bigint;
  totalSupply: bigint;
  contractAddress: string;
  network: string;
};

// Reads the pool's public state without a wallet. Everything here already
// lives in public ledger state, so requiring a DApp connector to see it was
// a limitation of how the readers were wired, not of the chain. Keeping a
// wallet-free path matters for anyone verifying the pool is real before
// deciding to install anything.
export async function getPublicPoolState(contractAddress: string): Promise<PublicPoolState> {
  const { publicDataProvider, network } = buildReadOnlyProviders();

  const contractState = await publicDataProvider.queryContractState(contractAddress);
  if (contractState === null) {
    throw new Error(
      `No contract state found at ${contractAddress} on ${network.label}. The address may be wrong for this network, or the indexer may not have caught up with a very recent deployment.`
    );
  }

  const contractModule = await import('./contracts/akad/contract/index.js');
  const ledgerState = contractModule.ledger(contractState.data);

  return {
    reserveAKD: BigInt(ledgerState.reserveAKD),
    reserveNight: BigInt(ledgerState.reserveNight),
    totalSupply: BigInt(ledgerState.totalSupply),
    contractAddress,
    network: network.label,
  };
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

  const compiledContract = await loadCompiledContract();

  // Random 32-byte nonce for the minted coin. It is staged into private
  // state rather than passed as an argument, so it stays out of the
  // proof's public inputs. The caller still gets it back, because the
  // wallet needs it to spend the coin later.
  const nonce = crypto.getRandomValues(new Uint8Array(32));
  await stagePrivateState(providers, contractAddress, { pendingNonce: nonce });

  const result = await submitCallTxAsync(providers, {
    compiledContract,
    contractAddress,
    circuitId: 'wrap',
    args: [amount],
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
  const ledgerState = contractModule.ledger(contractState.data);

  const color = ledgerState.tokenColor as Uint8Array;
  // An all-zero colour means recordTokenColor() has never run against this
  // deployment. Failing loudly here beats handing callers 32 zero bytes,
  // which the wallet would then fail to match against any coin it holds and
  // report only as an opaque "Balance failed: Insufficient funds".
  if (color.every((b) => b === 0)) {
    throw new Error(
      'This contract has no token colour recorded yet. Call recordTokenColor() once against it (the Deploy page does this automatically for new deployments) before wrapping or unwrapping.'
    );
  }
  return color;
}

// Same read for sNIGHT's colour. Both colours are written by the single
// recordTokenColor() call, so if AKD's colour is present this one is too.
export async function getNightColor(
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
  const ledgerState = contractModule.ledger(contractState.data);

  const color = ledgerState.sNightColor as Uint8Array;
  if (color.every((b) => b === 0)) {
    throw new Error(
      'This contract has no sNIGHT colour recorded yet. Call recordTokenColor() once against it (the Deploy page does this automatically for new deployments) before wrapping tNIGHT or using a shielded swap.'
    );
  }
  return color;
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

  const compiledContract = await loadCompiledContract();

  // The coin goes through private state, not through the argument list.
  // unwrap() therefore takes no arguments at all and its proof has zero
  // public inputs: nothing about which coin was spent is published.
  await stagePrivateState(providers, contractAddress, { pendingCoin: coin });

  const result = await submitCallTxAsync(providers, {
    compiledContract,
    contractAddress,
    circuitId: 'unwrap',
    args: [],
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

  await submitCallTxAsync(providers, {
    compiledContract,
    contractAddress,
    circuitId: 'transfer',
    args: [to, amount],
    privateStateId: PRIVATE_STATE_ID,
  });
}

// Seeds the pool's initial liquidity. Call once, after deploy and
// recordTokenColor(). This moves amountAKD out of the caller's own public
// balance into the pool's on-chain custody, and pulls amountNight of real
// tNIGHT into the pool's own native-token custody via receiveUnshielded
// (see contracts/src/akad.compact) -- the caller's wallet needs at least
// that much AKD balance (e.g. from the constructor's mint) AND at least
// that much real tNIGHT on hand, or the transaction fails during wallet
// balancing.
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

  const result = await submitCallTxAsync(providers, {
    compiledContract,
    contractAddress,
    circuitId: 'addLiquidity',
    args: [amountAKD, amountNight],
    privateStateId: PRIVATE_STATE_ID,
  });

  return { txId: result.txId };
}

// Reads the faucet's custody account bytes directly from ledger state
// (written once by the constructor, see contracts/src/akad.compact), so
// the caller of transferTokens() below doesn't need to reimplement
// persistentHash() in TypeScript to compute it.
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
  const ledgerState = contractModule.ledger(contractState.data);

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

  const result = await submitCallTxAsync(providers, {
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
  const ledgerState = contractModule.ledger(contractState.data);

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
  const ledgerState = contractModule.ledger(contractState.data);

  return {
    reserveAKD: BigInt(ledgerState.reserveAKD),
    reserveNight: BigInt(ledgerState.reserveNight),
  };
}

// Reads the connected wallet's own public AKD balance directly from ledger
// state (read-only, no wallet tx needed) -- same pattern as
// getFaucetBalance() above. The `balances` map is keyed by Bytes<32>
// derived from ownPublicKey().bytes inside the contract (see callerKey()
// in akad.compact), which is exactly the wallet's shielded coin public key
// already passed into every call in this file as `coinPublicKey` (see
// buildProviders() in providers.ts, which wires it straight into
// WalletProvider.getCoinPublicKey() -- the same value the SDK uses to bind
// every transaction to this wallet's identity). So the same bytes can be
// looked up here without needing a new circuit or an on-chain call.
//
// coinPublicKey here is `addresses.shieldedCoinPublicKey` from the
// wallet's getShieldedAddresses() call. Per @midnight-ntwrk/dapp-connector-api's
// own doc comment, that field (like shieldedAddress/shieldedEncryptionPublicKey)
// is "provided in Bech32m format" (e.g. "mn_shield-cpk_..."), NOT raw hex --
// confirmed live: naively fromHex()-ing it produced an empty buffer (Buffer.from
// silently stops at the first non-hex character instead of throwing), which
// balances.member() then rejected as an empty Bytes<32>. Decode it through the
// wallet SDK's own Bech32m codec to get the real 32 raw bytes, which is what
// ownPublicKey().bytes inside the contract actually compares against (see
// callerKey() in akad.compact).
export async function getMyAkdBalance(
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
  const ledgerState = contractModule.ledger(contractState.data);

  const parsedKey = MidnightBech32m.parse(coinPublicKey);
  const decodedKey = ShieldedCoinPublicKey.codec.decode(getNetworkId(), parsedKey);
  const accountKey = new Uint8Array(decodedKey.data);
  if (!ledgerState.balances.member(accountKey)) {
    return 0n;
  }
  return BigInt(ledgerState.balances.lookup(accountKey));
}

// Executes a swap in either direction. dy must be pre-computed client-side
// via computeSwapOutput() from bonding-curve.ts before calling this. Both
// legs now move real value (see contracts/src/akad.compact): the AKD leg
// moves balance between the trader and the pool's custody account, and the
// tNIGHT leg moves real native-token custody via sendUnshielded /
// receiveUnshielded.
//
// unshieldedAddress is required for the AkdToNight direction only --
// swapAkdToNight() pays real tNIGHT out to that address via sendUnshielded,
// which (unlike receiveShielded/receiveUnshielded) needs a concrete
// destination rather than implicitly paying whoever is calling. Pass the
// connected wallet's own getUnshieldedAddress() value (Bech32m string,
// e.g. mn_addr_...) -- swapNightToAkd() doesn't need it and it's ignored
// for that direction.
export async function executeSwap(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string,
  contractAddress: string,
  direction: 'AkdToNight' | 'NightToAkd',
  dx: bigint,
  dy: bigint,
  minOut: bigint,
  unshieldedAddress?: string
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

  const args: unknown[] = [dx, dy, minOut];
  if (direction === 'AkdToNight') {
    if (!unshieldedAddress) {
      throw new Error('unshieldedAddress is required for an AKD -> tNIGHT swap (sendUnshielded needs a real payout destination).');
    }
    // getUnshieldedAddress() comes back Bech32m-encoded (e.g. mn_addr_...),
    // not raw hex -- same class of bug as the shielded coin public key fix
    // in getMyAkdBalance() above. Decode it to the ledger's own UserAddress
    // hex-string form, then encode that into the Uint8Array Compact's
    // UserAddress circuit type expects.
    const parsedAddress = MidnightBech32m.parse(unshieldedAddress);
    const decodedAddress = UnshieldedAddress.codec.decode(getNetworkId(), parsedAddress);
    const recipientBytes = new Uint8Array(encodeUserAddress(decodedAddress.hexString));
    // The compiled contract's generated bindings expect Compact's
    // UserAddress type as { bytes: Uint8Array }, not a bare Uint8Array --
    // confirmed directly from lib/contracts/akad/contract/index.d.ts
    // (same wrapped shape as ZswapCoinPublicKey/ContractAddress elsewhere
    // in this contract, e.g. ownPublicKey() in wrap()). Passing the raw
    // array here throws "Cannot read properties of undefined (reading
    // 'buffer')" deep in the runtime's argument encoder.
    args.push({ bytes: recipientBytes });
  }

  const result = await submitCallTxAsync(providers, {
    compiledContract,
    contractAddress,
    circuitId,
    args,
    privateStateId: PRIVATE_STATE_ID,
  });

  return { txId: result.txId };
}

// ---------------------------------------------------------------------------
// sNIGHT: the shielded counterpart to tNIGHT.
//
// tNIGHT can never be private. Midnight's own token documentation is explicit:
// "NIGHT is an unshielded token: its balances and transfers are always public,
// and holding NIGHT at a shielded address does not make it private."
//
// The previous privateSwapAkdToNight / privateSwapNightToAkd pair was built on
// that token anyway, so every call published the trader's unshielded address.
// Both were removed. Trades now run shielded AKD against shielded sNIGHT, a
// 1:1 claim on tNIGHT the contract holds in custody, and no address appears in
// a swap at all. What stays visible is entering and leaving the pool.
// ---------------------------------------------------------------------------

// wrapNight() was removed from the contract to stay inside Midnight's
// deploy-transaction block limits. sNIGHT now enters circulation only
// through shieldedSwapAkdToNight(), which mints it against the pool's own
// tNIGHT reserve. Redemption below is kept: a receipt nobody can redeem is
// not a receipt.

// Redeem a shielded sNIGHT coin for real tNIGHT. `coin.color` must be the
// sNIGHT colour from getNightColor(); the circuit asserts it. The payout
// destination is published, as with every unshielded transfer.
export async function unwrapNight(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string,
  contractAddress: string,
  coin: ShieldedCoin,
  unshieldedAddress: string
): Promise<{ txId: string }> {
  const { submitCallTxAsync } = await import('@midnight-ntwrk/midnight-js-contracts');

  if (!unshieldedAddress) {
    throw new Error('unshieldedAddress is required to redeem sNIGHT (sendUnshielded needs a real payout destination).');
  }

  const providers = await buildProviders(connectedApi, coinPublicKey, encryptionPublicKey, contractAddress, AKAD_CONTRACT_PATH);
  const compiledContract = await loadCompiledContract();

  await stagePrivateState(providers, contractAddress, { pendingCoin: coin });

  const parsedAddress = MidnightBech32m.parse(unshieldedAddress);
  const decodedAddress = UnshieldedAddress.codec.decode(getNetworkId(), parsedAddress);
  const recipientBytes = new Uint8Array(encodeUserAddress(decodedAddress.hexString));

  const result = await submitCallTxAsync(providers, {
    compiledContract,
    contractAddress,
    circuitId: 'unwrapNight',
    args: [{ bytes: recipientBytes }],
    privateStateId: PRIVATE_STATE_ID,
  });

  return { txId: result.txId };
}

// Shielded AKD in, shielded sNIGHT out. No address is published.
//
// Both a spent coin and a minted coin are involved, so both private-state
// slots are staged in one write: the AKD coin for the spentCoin() witness,
// and fresh randomness for the coinNonce() witness. The returned nonce
// describes the new sNIGHT coin and must be kept to spend it later.
//
// dy is pre-computed client-side via computeSwapOutput(), same convention as
// executeSwap(). dx is not passed at all: the circuit reads it from the coin.
export async function shieldedSwapAkdToNight(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string,
  contractAddress: string,
  coin: ShieldedCoin,
  dy: bigint,
  minOut: bigint
): Promise<{ nonce: Uint8Array; value: bigint; txId: string }> {
  const { submitCallTxAsync } = await import('@midnight-ntwrk/midnight-js-contracts');

  const providers = await buildProviders(connectedApi, coinPublicKey, encryptionPublicKey, contractAddress, AKAD_CONTRACT_PATH);
  const compiledContract = await loadCompiledContract();

  const nonce = crypto.getRandomValues(new Uint8Array(32));
  await stagePrivateState(providers, contractAddress, { pendingCoin: coin, pendingNonce: nonce });

  const result = await submitCallTxAsync(providers, {
    compiledContract,
    contractAddress,
    circuitId: 'shieldedSwapAkdToNight',
    args: [dy, minOut],
    privateStateId: PRIVATE_STATE_ID,
  });

  return { nonce, value: dy, txId: result.txId };
}

// Shielded sNIGHT in, shielded AKD out. Mirror of the call above; the
// returned nonce describes the new AKD coin, which unwrapTokens() can later
// convert back to a public balance.
export async function shieldedSwapNightToAkd(
  connectedApi: any,
  coinPublicKey: string,
  encryptionPublicKey: string,
  contractAddress: string,
  coin: ShieldedCoin,
  dy: bigint,
  minOut: bigint
): Promise<{ nonce: Uint8Array; value: bigint; txId: string }> {
  const { submitCallTxAsync } = await import('@midnight-ntwrk/midnight-js-contracts');

  const providers = await buildProviders(connectedApi, coinPublicKey, encryptionPublicKey, contractAddress, AKAD_CONTRACT_PATH);
  const compiledContract = await loadCompiledContract();

  const nonce = crypto.getRandomValues(new Uint8Array(32));
  await stagePrivateState(providers, contractAddress, { pendingCoin: coin, pendingNonce: nonce });

  const result = await submitCallTxAsync(providers, {
    compiledContract,
    contractAddress,
    circuitId: 'shieldedSwapNightToAkd',
    args: [dy, minOut],
    privateStateId: PRIVATE_STATE_ID,
  });

  return { nonce, value: dy, txId: result.txId };
}
