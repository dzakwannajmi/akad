'use client';

// Preview/Preprod switch, meant to sit next to the wallet connect button
// on pages that actually talk to a contract (swap, faucet, deploy) -- not
// rendered on marketing pages, where network selection has no effect.
// Built on the shadcn base/select primitive (components/ui/select.tsx,
// itself Base UI's Select) so it matches the dropdown pattern used for
// wallet connect: each network gets a colored status dot (green for
// Preview, yellow for Preprod) and the shadcn select's own checkmark marks
// which one is currently selected.
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNetwork } from '@/contexts/NetworkContext';
import { NETWORKS, type NetworkKey } from '@/lib/networks';

const OPTIONS: NetworkKey[] = ['preview', 'preprod'];

const DOT_CLASS: Record<NetworkKey, string> = {
  preview: 'bg-green-400',
  preprod: 'bg-yellow-400',
};

export function NetworkToggle({ className = '' }: { className?: string }) {
  const { networkKey, setNetworkKey } = useNetwork();

  return (
    <Select value={networkKey} onValueChange={(value) => setNetworkKey(value as NetworkKey)}>
      <SelectTrigger
        aria-label="Network"
        className={`h-8 gap-2 rounded-full border-white/10 bg-white/5 px-3 font-mono text-[11px] uppercase tracking-wider text-white hover:bg-white/10 ${className}`}
      >
        <SelectValue>
          {(value: NetworkKey | null) => {
            const key = value ?? networkKey;
            return (
              <>
                <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_CLASS[key]}`} />
                {NETWORKS[key].label}
              </>
            );
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end" className="min-w-[9.5rem]">
        {OPTIONS.map((key) => (
          <SelectItem
            key={key}
            value={key}
            className="font-mono text-[11px] uppercase tracking-wider"
          >
            <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_CLASS[key]}`} />
            {NETWORKS[key].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
