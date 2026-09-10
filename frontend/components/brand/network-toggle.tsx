'use client';

// Preview/Preprod switch, meant to sit next to the wallet connect button
// on pages that actually talk to a contract (swap, faucet, deploy) -- not
// rendered on marketing pages, where network selection has no effect.
// Deliberately small and out of the way: this is a dev/tester control, not
// a primary action.
import { useNetwork } from '@/contexts/NetworkContext';
import { NETWORKS, type NetworkKey } from '@/lib/networks';

const OPTIONS: NetworkKey[] = ['preview', 'preprod'];

export function NetworkToggle({ className = '' }: { className?: string }) {
  const { networkKey, setNetworkKey } = useNetwork();

  return (
    <div
      role="group"
      aria-label="Network"
      className={`flex items-center gap-0.5 rounded-full bg-white/5 p-0.5 font-mono text-[11px] uppercase tracking-wider ${className}`}
    >
      {OPTIONS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => setNetworkKey(key)}
          aria-pressed={networkKey === key}
          className={
            networkKey === key
              ? 'rounded-full bg-white/15 px-3 py-1.5 text-white'
              : 'rounded-full px-3 py-1.5 text-white/40 transition-colors hover:text-white/70'
          }
        >
          {NETWORKS[key].label}
        </button>
      ))}
    </div>
  );
}
