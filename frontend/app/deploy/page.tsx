'use client';

// English comments per code convention; explanations to the user stay in Indonesian.
import { useState } from 'react';
import { getCompatibleWallets, connectWallet } from '@/lib/wallet';
import { deployTokenContract, initTokenContract } from '@/lib/token-api';
import { deploySwapContract, addLiquidity } from '@/lib/swap-api';

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
  const [swapAddress, setSwapAddress] = useState<string | null>(null);
  const [swapStatus, setSwapStatus] = useState<string>('idle');
  const [liquidityStatus, setLiquidityStatus] = useState<string>('idle');
  const [connectedApi, setConnectedApi] = useState<any>(null);
  const [addresses, setAddresses] = useState<any>(null);

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

  const handleDeploySwap = async () => {
    if (!connectedApi || !addresses) {
      setError('Connect wallet first');
      return;
    }
    setSwapStatus('deploying');
    setError(null);
    try {
      const addr = await deploySwapContract(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey
      );
      setSwapAddress(addr);
      setSwapStatus('deployed');
    } catch (err: any) {
      console.error('[Deploy Swap] Error:', err);
      const detail =
        err?.cause?.cause?.message ||
        err?.cause?.message ||
        err?.message ||
        JSON.stringify(err);
      setError(detail || String(err));
      setSwapStatus('error');
    }
  };


  const handleSeedLiquidity = async () => {
    if (!connectedApi || !addresses || !swapAddress) {
      setError('Deploy the swap contract first');
      return;
    }
    setLiquidityStatus('seeding');
    setError(null);
    try {
      // Demo seed amounts — arbitrary starting ratio, builder-chosen (see README).
      await addLiquidity(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey,
        swapAddress,
        1000n,
        1000n
      );
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

  const handleDeploy = async () => {
    if (!connectedApi || !addresses) {
      setError('Connect wallet first');
      return;
    }
    setStatus('deploying');
    setError(null);
    try {
      const addr = await deployTokenContract(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey
      );
      setContractAddress(addr);
      setStatus('deployed');

      await initTokenContract(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey,
        addr
      );
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

  return (
    <div style={{ padding: 32, fontFamily: 'var(--font-inter), sans-serif', color: '#0e0f0c', background: '#ffffff', minHeight: '100vh' }}>
      <h1 style={{ fontFamily: 'var(--font-geist-mono), monospace', marginBottom: 8 }}>
        Akad — Token Deploy (dev)
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
          Deploy Token Contract
        </button>
        <button
          style={!connectedApi || swapStatus === 'deploying' ? disabledButtonStyle : buttonStyle}
          onClick={handleDeploySwap}
          disabled={!connectedApi || swapStatus === 'deploying'}
        >
          Deploy Swap Contract
        </button>
      </div>
      <p style={{ marginBottom: 16 }}>Swap status: <strong>{swapStatus}</strong></p>
      {swapAddress && (
        <p style={{ marginBottom: 16 }}>
          Swap contract address: <code>{swapAddress}</code>
        </p>
      )}
      <button
        style={!swapAddress || liquidityStatus === 'seeding' ? disabledButtonStyle : buttonStyle}
        onClick={handleSeedLiquidity}
        disabled={!swapAddress || liquidityStatus === 'seeding'}
      >
        Seed Liquidity (1000/1000)
      </button>
      <p style={{ marginTop: 16, marginBottom: 16 }}>Liquidity status: <strong>{liquidityStatus}</strong></p>

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
    </div>
  );
}
