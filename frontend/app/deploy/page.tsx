'use client';
import { useState, useEffect } from 'react';
import { useWalletConnect } from '@/hooks/use-wallet-connect';
import { WalletConnectButton } from '@/components/brand/wallet-connect-button';
import {
  deployAkadContract,
  waitForContractState,
  recordTokenColor,
  addLiquidity,
  wrapTokens,
  unwrapTokens,
  getTokenColor,
  getFaucetAddress,
  transferTokens,
  getFaucetBalance,
} from '@/lib/akad-api';
import { recordActivity } from '@/lib/activity-api';
import { useNetwork } from '@/contexts/NetworkContext';
import { NETWORKS, type NetworkKey } from '@/lib/networks';

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

const seedInputStyle: React.CSSProperties = {
  fontFamily: 'var(--font-geist-mono), monospace',
  padding: '8px 10px',
  border: '1px solid #0e0f0c',
  width: 200,
  marginTop: 4,
};

const disabledButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: '#555',
  borderColor: '#555',
  cursor: 'not-allowed',
};

export default function DeployPage() {
  const { networkKey, network, setNetworkKey } = useNetwork();
  const CONTRACT_ADDRESS = network.contractAddress;
  const [status, setStatus] = useState<string>('idle');
  const [error, setError] = useState<string | null>(null);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [readyStatus, setReadyStatus] = useState<string>('idle');
  const [liquidityStatus, setLiquidityStatus] = useState<string>('idle');
  // Seed amounts are editable rather than hardcoded: the right size depends
  // on how much unshielded NIGHT the seeding wallet actually holds, and
  // addLiquidity() can only be called once per deployment, so getting it
  // wrong means redeploying. Values are in base units at AKD's 6 decimals.
  const [seedAkd, setSeedAkd] = useState<string>('1000000000');
  const [seedNight, setSeedNight] = useState<string>('1000000000');
  const [wrapStatus, setWrapStatus] = useState<string>('idle');
  const [wrappedCoin, setWrappedCoin] = useState<{ nonce: Uint8Array; value: bigint } | null>(null);
  const [unwrapStatus, setUnwrapStatus] = useState<string>('idle');
  const wallet = useWalletConnect();
  const { connectedApi, addresses } = wallet;
  const [faucetStatus, setFaucetStatus] = useState<string>('idle');
  const [faucetBalance, setFaucetBalance] = useState<bigint | null>(null);

  useEffect(() => {
    setStatus('idle');
    setError(null);
    setContractAddress(null);
    setReadyStatus('idle');
    setLiquidityStatus('idle');
    setFaucetStatus('idle');
    setFaucetBalance(null);
    // Only ever needs to react to networkKey changing. Wallet state itself
    // is reset by useWalletConnect() on the same networkKey change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkKey]);

  const targetAddress = contractAddress || CONTRACT_ADDRESS;

  // Deploys the merged Akad contract. The contract's constructor mints the
  // initial supply to the deployer as part of this same transaction, so
  // there is no separate init() step, and addLiquidity() below already has
  // the balance it needs once the indexer catches up.
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

      // Submitting the next transaction immediately after a deploy can
      // race the indexer on Preview — wait until the indexer actually has
      // state at this address before continuing.
      setStatus('waiting for indexer');
      await waitForContractState(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey,
        addr
      );

      // tokenColor has to be written from inside a circuit, so this is the
      // one step a freshly deployed contract still needs before wrap and
      // unwrap will work. See recordTokenColor() in lib/akad-api.ts.
      setStatus('recording token colour');
      await recordTokenColor(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey,
        addr
      );

      setReadyStatus('ready');
      setStatus('ready');
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

  // Seeds the pool. This moves real AKD out of the deployer's own balance
  // (minted by the constructor at deploy time) into the pool's on-chain
  // custody, so the deployer needs at least this much AKD.
  const handleSeedLiquidity = async () => {
    if (!connectedApi || !addresses || !targetAddress) {
      setError('Deploy the contract first');
      return;
    }
    setLiquidityStatus('seeding');
    setError(null);
    try {
      // Demo seed amounts — arbitrary starting ratio, builder-chosen (see
      // README), expressed at AKD's 6-decimal scale: 1000 AKD / 1000 NIGHT
      // (1_000_000_000 base units each). Kept well under the
      // 4_000_000_000 safe bound in the contract, with 4x headroom for
      // trades on top.
      let akdAmount: bigint;
      let nightAmount: bigint;
      try {
        akdAmount = BigInt(seedAkd.trim());
        nightAmount = BigInt(seedNight.trim());
      } catch {
        setError('Seed amounts must be whole numbers of base units.');
        setLiquidityStatus('error');
        return;
      }
      if (akdAmount <= 0n || nightAmount <= 0n) {
        setError('Seed amounts must both be greater than zero.');
        setLiquidityStatus('error');
        return;
      }
      if (akdAmount > 4000000000n || nightAmount > 4000000000n) {
        setError('Seed amounts must each stay at or under 4000000000 base units, the reserve bound the contract asserts.');
        setLiquidityStatus('error');
        return;
      }

      const { txId } = await addLiquidity(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey,
        targetAddress,
        akdAmount,
        nightAmount
      );
      recordActivity({
        txId,
        txType: 'addLiquidity',
        wallet: addresses.unshieldedAddress,
        amountIn: String(akdAmount),
        amountOut: String(nightAmount),
        tokenIn: 'AKD',
        tokenOut: 'NIGHT',
        network: networkKey,
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
      setError('Deploy the contract first');
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
      // Funds 100 claims of 50 AKD each (50_000_000 base units at AKD's
      // 6-decimal scale, see claimFaucet() in akad.compact), comfortably
      // above the Level 6 target of 70 wallets.
      await transferTokens(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey,
        targetAddress,
        faucetAddress,
        5000000000n
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
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 13 }}>
          Deploying to:
        </span>
        {(Object.keys(NETWORKS) as NetworkKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setNetworkKey(key)}
            style={
              networkKey === key
                ? { ...buttonStyle, marginRight: 0 }
                : { ...buttonStyle, marginRight: 0, background: '#ffffff', color: '#0e0f0c' }
            }
          >
            {NETWORKS[key].label}
          </button>
        ))}
      </div>
      {!CONTRACT_ADDRESS && !contractAddress && (
        <p style={{ marginBottom: 16, color: '#a15c00', fontSize: 13 }}>
          No NEXT_PUBLIC_AKAD_CONTRACT_ADDRESS_{network.id.toUpperCase()} set yet -- deploy a
          fresh contract below, then copy the resulting address into that env var so the rest
          of the app can find it on {network.label}.
        </p>
      )}
      <p style={{ marginBottom: 16 }}>Status: <strong>{status}</strong></p>
      {error && <p style={{ color: '#c0392b', marginBottom: 16 }}>Error: {error}</p>}

      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <WalletConnectButton
          wallet={wallet}
          idleClassName="cursor-pointer border-none bg-[#0e0f0c] px-5 py-2.5 font-mono text-sm text-white"
        />
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
      <p style={{ marginTop: 16 }}>Contract status: <strong>{readyStatus}</strong></p>

      <div style={{ marginTop: 16, marginBottom: 12, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12 }}>
          AKD (base units)
          <input
            style={seedInputStyle}
            value={seedAkd}
            onChange={(e) => setSeedAkd(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12 }}>
          NIGHT (base units)
          <input
            style={seedInputStyle}
            value={seedNight}
            onChange={(e) => setSeedNight(e.target.value)}
            inputMode="numeric"
          />
        </label>
      </div>
      <p style={{ fontSize: 12, marginBottom: 12, maxWidth: 620 }}>
        6 decimals, so 1000000000 is 1000 tokens. The NIGHT side is pulled
        from this wallet as real unshielded tNIGHT, so it must be an amount
        the wallet can actually supply. Each side is capped at 4000000000 by
        the contract. addLiquidity can only ever be called once per
        deployment.
      </p>
      <button
        style={!targetAddress || readyStatus !== 'ready' || liquidityStatus === 'seeding' ? disabledButtonStyle : buttonStyle}
        onClick={handleSeedLiquidity}
        disabled={!targetAddress || readyStatus !== 'ready' || liquidityStatus === 'seeding'}
      >
        Seed Liquidity
      </button>
      <p style={{ marginTop: 16, marginBottom: 16 }}>Liquidity status: <strong>{liquidityStatus}</strong></p>

      <button
        style={!targetAddress || readyStatus !== 'ready' || faucetStatus === 'funding' ? disabledButtonStyle : buttonStyle}
        onClick={handleFundFaucet}
        disabled={!targetAddress || readyStatus !== 'ready' || faucetStatus === 'funding'}
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
