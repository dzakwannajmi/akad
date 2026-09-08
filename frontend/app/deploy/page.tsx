'use client';
import { useState } from 'react';
import { getCompatibleWallets, connectWallet } from '@/lib/wallet';
import {
  deployAkadContract,
  waitForContractState,
  initAkadContract,
  addLiquidity,
  wrapTokens,
  unwrapTokens,
  getTokenColor,
  getFaucetAddress,
  transferTokens,
  getFaucetBalance,
} from '@/lib/akad-api';
import { recordActivity } from '@/lib/activity-api';
import { CONTRACT_ADDRESS } from '@/lib/wallet-constants';

const buttonStyle: React.CSSProperties = {
  fontFamily: 'var(--font-geist-mono), monospace',
  background: '#0e0f0c',
  color: '#ffffff',
  border: '1px solid #0e0f0c',
  padding: '10px 20px',
  marginRight: 12,
  cursor: 'pointer',
  fontSize: 14,
};

const disabledButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: '#555',
  borderColor: '#555',
  cursor: 'not-allowed',
};

export default function DeployPage() {
  const [status, setStatus] = useState<string>('idle');
  const [error, setError] = useState<string | null>(null);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [initStatus, setInitStatus] = useState<string>('idle');
  const [liquidityStatus, setLiquidityStatus] = useState<string>('idle');
  const [wrapStatus, setWrapStatus] = useState<string>('idle');
  const [wrappedCoin, setWrappedCoin] = useState<{ nonce: Uint8Array; value: bigint } | null>(null);
  const [unwrapStatus, setUnwrapStatus] = useState<string>('idle');
  const [connectedApi, setConnectedApi] = useState<any>(null);
  const [addresses, setAddresses] = useState<any>(null);
  const [faucetStatus, setFaucetStatus] = useState<string>('idle');
  const [faucetBalance, setFaucetBalance] = useState<bigint | null>(null);

  const targetAddress = contractAddress || CONTRACT_ADDRESS;

  const handleConnect = async () => {
    setError(null);
    try {
      const wallets = getCompatibleWallets();
      if (wallets.length === 0) {
        setError('No compatible wallet found. Install/unlock Lace.');
        return;
      }
      const { connectedApi: api, addresses: addr } = await connectWallet(wallets[0]);
      setConnectedApi(api);
      setAddresses(addr);
      setStatus('connected');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // Deploys the merged Akad contract, then immediately calls init() to mint
  // the initial supply to the deployer — addLiquidity() below needs that
  // balance to actually be there before it can seed the pool.
  const handleDeploy = async () => {
    if (!connectedApi || !addresses) {
      setError('Connect wallet first');
      return;
    }
    setStatus('deploying');
    setError(null);
    try {
      const addr = await deployAkadContract(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey
      );
      setContractAddress(addr);
      setStatus('deployed');

      // Deploying then immediately calling init() can race the indexer on
      // Preview — wait until the indexer actually has state at this
      // address before submitting the next transaction.
      setStatus('waiting for indexer');
      await waitForContractState(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey,
        addr
      );

      setInitStatus('initializing');
      setStatus('initializing');
      await initAkadContract(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey,
        addr
      );
      setInitStatus('initialized');
      setStatus('initialized');
    } catch (err: any) {
      console.error('[Deploy] Error:', err);
      console.error('[Deploy] Cause:', err?.cause);
      console.error('[Deploy] Cause.cause:', err?.cause?.cause);
      const detail =
        err?.cause?.cause?.message ||
        err?.cause?.message ||
        err?.message ||
        JSON.stringify(err);
      setError(detail || String(err));
      setStatus('error');
    }
  };

  // Seeds the pool. This now moves real AKD out of the deployer's own
  // balance (from init()'s mint) into the pool's on-chain custody — the
  // deployer needs at least this much AKD, so run this after init().
  const handleSeedLiquidity = async () => {
    if (!connectedApi || !addresses || !targetAddress) {
      setError('Deploy and init the contract first');
      return;
    }
    setLiquidityStatus('seeding');
    setError(null);
    try {
      // Demo seed amounts — arbitrary starting ratio, builder-chosen (see README).
      // Kept well under the 4_000_000_000 safe bound in the contract.
      const { txId } = await addLiquidity(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey,
        targetAddress,
        1000n,
        1000n
      );
      recordActivity({
        txId,
        txType: 'addLiquidity',
        wallet: addresses.unshieldedAddress,
        amountIn: '1000',
        amountOut: '1000',
        tokenIn: 'AKD',
        tokenOut: 'tNIGHT',
      }).catch((err) => console.error('[Activity] Failed to record addLiquidity:', err));
      setLiquidityStatus('seeded');
    } catch (err: any) {
      console.error('[Seed Liquidity] Error:', err);
      const detail =
        err?.cause?.cause?.message ||
        err?.cause?.message ||
        err?.message ||
        JSON.stringify(err);
      setError(detail || String(err));
      setLiquidityStatus('error');
    }
  };

  // One-time admin step: moves AKD from the deployer's own balance into the
  // faucet's custody account (see contracts/src/akad.compact claimFaucet())
  // so new wallets without any AKD yet can self-serve 50 AKD each to try a
  // real swap, instead of the deployer transferring to each one by hand.
  // Safe to call again later to top the faucet back up once it runs low.
  const handleFundFaucet = async () => {
    if (!connectedApi || !addresses || !targetAddress) {
      setError('Deploy and init the contract first');
      return;
    }
    setFaucetStatus('funding');
    setError(null);
    try {
      const faucetAddress = await getFaucetAddress(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey,
        targetAddress
      );
      // Funds 100 claims of 50 AKD each, comfortably above the Level 6
      // target of 70 wallets.
      await transferTokens(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey,
        targetAddress,
        faucetAddress,
        5000n
      );
      const balance = await getFaucetBalance(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey,
        targetAddress
      );
      setFaucetBalance(balance);
      setFaucetStatus('funded');
    } catch (err: any) {
      console.error('[Fund Faucet] Error:', err);
      const detail = err?.cause?.cause?.message || err?.cause?.message || err?.message || String(err);
      setError(detail);
      setFaucetStatus('error');
    }
  };

  const handleCheckFaucetBalance = async () => {
    if (!connectedApi || !addresses || !targetAddress) return;
    try {
      const balance = await getFaucetBalance(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey,
        targetAddress
      );
      setFaucetBalance(balance);
    } catch (err: any) {
      console.error('[Check Faucet Balance] Error:', err);
      setError(err?.message || String(err));
    }
  };

  const handleTestWrap = async () => {
    if (!connectedApi || !addresses || !targetAddress) {
      setError('No contract address available');
      return;
    }
    setWrapStatus('wrapping');
    setError(null);
    try {
      const result = await wrapTokens(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey,
        targetAddress,
        10n
      );
      setWrappedCoin(result);
      setWrapStatus('wrapped');
    } catch (err: any) {
      console.error('[Test Wrap] Error:', err);
      const detail = err?.cause?.cause?.message || err?.cause?.message || err?.message || String(err);
      setError(detail);
      setWrapStatus('error');
    }
  };

  const handleTestUnwrap = async () => {
    if (!connectedApi || !addresses || !targetAddress || !wrappedCoin) {
      setError('Wrap something first');
      return;
    }
    setUnwrapStatus('unwrapping');
    setError(null);
    try {
      const color = await getTokenColor(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey,
        targetAddress
      );
      await unwrapTokens(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey,
        targetAddress,
        { nonce: wrappedCoin.nonce, color, value: wrappedCoin.value }
      );
      setUnwrapStatus('unwrapped');
    } catch (err: any) {
      console.error('[Test Unwrap] Error:', err);
      const detail = err?.cause?.cause?.message || err?.cause?.message || err?.message || String(err);
      setError(detail);
      setUnwrapStatus('error');
    }
  };

  return (
    <div style={{ padding: 32, fontFamily: 'var(--font-inter), sans-serif', color: '#0e0f0c', background: '#ffffff', minHeight: '100vh' }}>
      <h1 style={{ fontFamily: 'var(--font-geist-mono), monospace', marginBottom: 8 }}>
        Akad — Deploy (dev)
      </h1>
      <p style={{ marginBottom: 16 }}>Status: <strong>{status}</strong></p>
      {error && <p style={{ color: '#c0392b', marginBottom: 16 }}>Error: {error}</p>}

      <div style={{ marginBottom: 24 }}>
        <button style={buttonStyle} onClick={handleConnect} disabled={status === 'connected'}>
          Connect Wallet
        </button>
        <button
          style={!connectedApi || status === 'deploying' ? disabledButtonStyle : buttonStyle}
          onClick={handleDeploy}
          disabled={!connectedApi || status === 'deploying'}
        >
          Deploy + Init Akad Contract
        </button>
      </div>

      {addresses && (
        <pre style={{ background: '#f4f4f4', padding: 16, fontSize: 12, overflow: 'auto' }}>
          {JSON.stringify(addresses, null, 2)}
        </pre>
      )}
      {contractAddress && (
        <p style={{ marginTop: 16 }}>
          Contract address: <code>{contractAddress}</code>
        </p>
      )}
      <p style={{ marginTop: 16 }}>Init status: <strong>{initStatus}</strong></p>

      <button
        style={!targetAddress || initStatus !== 'initialized' || liquidityStatus === 'seeding' ? disabledButtonStyle : buttonStyle}
        onClick={handleSeedLiquidity}
        disabled={!targetAddress || initStatus !== 'initialized' || liquidityStatus === 'seeding'}
      >
        Seed Liquidity (1000/1000)
      </button>
      <p style={{ marginTop: 16, marginBottom: 16 }}>Liquidity status: <strong>{liquidityStatus}</strong></p>

      <button
        style={!targetAddress || initStatus !== 'initialized' || faucetStatus === 'funding' ? disabledButtonStyle : buttonStyle}
        onClick={handleFundFaucet}
        disabled={!targetAddress || initStatus !== 'initialized' || faucetStatus === 'funding'}
      >
        Fund Faucet (5000 AKD)
      </button>
      <button
        style={!targetAddress ? disabledButtonStyle : buttonStyle}
        onClick={handleCheckFaucetBalance}
        disabled={!targetAddress}
      >
        Check Faucet Balance
      </button>
      <p style={{ marginTop: 16, marginBottom: 16 }}>
        Faucet status: <strong>{faucetStatus}</strong>
        {faucetBalance !== null && <>, balance: <strong>{faucetBalance.toString()}</strong> AKD (approx. {(faucetBalance / 50n).toString()} claims left)</>}
      </p>

      <button
        style={!targetAddress || wrapStatus === 'wrapping' ? disabledButtonStyle : buttonStyle}
        onClick={handleTestWrap}
        disabled={!targetAddress || wrapStatus === 'wrapping'}
      >
        Test Wrap (10 AKD)
      </button>
      <p style={{ marginTop: 16 }}>Wrap status: <strong>{wrapStatus}</strong></p>
      <button
        style={!wrappedCoin || unwrapStatus === 'unwrapping' ? disabledButtonStyle : buttonStyle}
        onClick={handleTestUnwrap}
        disabled={!wrappedCoin || unwrapStatus === 'unwrapping'}
      >
        Test Unwrap
      </button>
      <p style={{ marginTop: 16 }}>Unwrap status: <strong>{unwrapStatus}</strong></p>
    </div>
  );
}
