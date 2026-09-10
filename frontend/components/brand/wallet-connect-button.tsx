'use client';

import { Icon } from '@iconify/react';
import type { InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import { Spinner } from '@/components/icons/spinner';
import type { useWalletConnect } from '@/hooks/use-wallet-connect';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type WalletConnectState = ReturnType<typeof useWalletConnect>;

// Connect trigger + wallet dropdown for the wallet returned by
// useWalletConnect(). Always opens the dropdown (rather than auto-picking
// the only detected wallet) so its Detected/Active status is visible even
// with a single wallet installed; picking a different wallet while
// connected switches the connection, and Disconnect lives at the bottom.
export function WalletConnectButton({
  wallet,
  idleClassName,
}: {
  wallet: WalletConnectState;
  /** Overrides the default compact-pill idle button, e.g. for a full-width card CTA. */
  idleClassName?: string;
}) {
  const {
    connectedApi,
    connectedWallet,
    addresses,
    connecting,
    pickerOpen,
    pickerWallets,
    onPickerOpenChange,
    pick,
    disconnect,
  } = wallet;

  return (
    <DropdownMenu open={pickerOpen} onOpenChange={onPickerOpenChange}>
      <DropdownMenuTrigger
        disabled={connecting}
        className={
          connectedApi
            ? 'flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 font-mono text-xs text-white/70 transition-colors hover:bg-white/20'
            : (idleClassName ??
              'flex items-center gap-2 rounded-full bg-akd-accent px-6 py-2.5 text-base font-medium text-black disabled:cursor-not-allowed disabled:opacity-40')
        }
      >
        {connecting ? (
          <>
            <Spinner className="h-4 w-4" />
            Connecting…
          </>
        ) : connectedApi ? (
          <>
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-green-400" />
            {addresses?.unshieldedAddress.slice(0, 10)}…
          </>
        ) : (
          'Connect'
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="min-w-[17rem] p-2">
        <div className="px-2 pb-1 pt-1 text-xs font-medium text-white/40">
          {pickerWallets.length > 0 ? 'Select a wallet' : 'No wallet detected'}
        </div>

        {pickerWallets.map((w) => {
          const isActive = connectedWallet?.rdns === w.rdns;
          return (
            <DropdownMenuItem
              key={w.rdns}
              onClick={() => pick(w)}
              className="gap-3 rounded-2xl px-2 py-2.5"
            >
              <WalletIcon wallet={w} />
              <span className="flex-1 text-sm font-medium text-white">{w.name}</span>
              <span
                className={
                  isActive
                    ? 'rounded-full bg-green-400/15 px-2.5 py-1 font-mono text-[11px] text-green-400'
                    : 'rounded-full bg-white/10 px-2.5 py-1 font-mono text-[11px] text-white/50'
                }
              >
                {isActive ? 'Active' : 'Detected'}
              </span>
            </DropdownMenuItem>
          );
        })}

        {connectedApi && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={disconnect}
              className="rounded-2xl px-2 py-2.5 text-sm text-red-400 data-highlighted:bg-red-500/10 data-highlighted:text-red-400"
            >
              Disconnect
            </DropdownMenuItem>
          </>
        )}

        <p className="px-2 pb-1 pt-2 text-xs leading-relaxed text-white/30">
          Only wallets that support Midnight&apos;s connector API and are unlocked in this browser show up here.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Wallets are supposed to supply an icon URL via the connector API, but not
// every extension actually does -- the 1AM extension in particular ships
// with icon: "" (confirmed via console error, empty-string <img src>
// triggers a full page re-download warning in Next.js). Since 1AM is a
// known, identifiable case (its `name` is always "1AM"), fall back to its
// real brand mark hosted on 1am.xyz instead of a generic glyph; any other
// wallet with a missing icon still gets the generic wallet glyph.
const KNOWN_WALLET_ICONS: Record<string, string> = {
  '1am': 'https://1am.xyz/apple-touch-icon.png',
};

function WalletIcon({ wallet }: { wallet: InitialAPI }) {
  const knownIcon = !wallet.icon ? KNOWN_WALLET_ICONS[wallet.name.trim().toLowerCase()] : undefined;

  if (!wallet.icon && !knownIcon) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/60">
        <Icon icon="lucide:wallet" width={18} height={18} />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- wallet-supplied icon URL (often a data: URL), next/image can't optimize that
    <img src={wallet.icon || knownIcon} alt="" aria-hidden="true" className="h-9 w-9 shrink-0 rounded-xl bg-white/10 object-cover" />
  );
}
