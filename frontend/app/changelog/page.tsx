import { SiteHeader } from '@/components/brand/site-header';

type Entry = {
  version: string;
  date: string;
  title: string;
  groups: { label: string; items: React.ReactNode[] }[];
  breaking?: React.ReactNode[];
};

// Real project history, grouped from the actual git log (dzakwannajmi/akad)
// into milestones. Version numbers are Akad's own sequential numbering
// starting from this changelog, not a formal semver scheme that existed
// at the time -- the dates and every claim below are pulled from real
// commits, not invented.
const entries: Entry[] = [
  {
    version: 'v0.8',
    date: 'September 10, 2026',
    title: 'Private swap, both directions',
    groups: [
      {
        label: 'Added',
        items: [
          <><code>privateSwapAkdToNight</code> and <code>privateSwapNightToAkd</code>: spend or receive the AKD leg of a swap as a shielded coin directly, instead of wrap to public swap to unwrap. The swap page&apos;s existing Public/Private toggle is now live for both directions.</>,
        ],
      },
      {
        label: 'Security',
        items: [
          <><code>unwrap()</code> didn&apos;t check a received shielded coin&apos;s color against AKD&apos;s own, so any shielded coin of any type could be credited 1:1 as AKD. Fixed with an explicit color assertion, applied to <code>unwrap</code> and both new private-swap circuits from the start.</>,
        ],
      },
    ],
    breaking: [
      <>The contract was redeployed for this release. Coins wrapped against the previous deployment cannot be unwrapped against this one.</>,
    ],
  },
  {
    version: 'v0.7',
    date: 'September 10, 2026',
    title: 'Dark-theme dropdown UI, shared wallet flow',
    groups: [
      {
        label: 'Changed',
        items: [
          <>Network switching and wallet connect rebuilt on shadcn&apos;s select and dropdown-menu primitives, always opening below the trigger with a proper animation instead of aligning the selected item over it.</>,
          <>Wallet connect is now a dropdown listing every detected wallet with its icon, a Detected/Active badge, and Disconnect, instead of a full-screen picker that only ever auto-connected the first wallet found.</>,
          <>The deploy, faucet, and swap pages now share one wallet-connect hook and component instead of three separate ad-hoc flows.</>,
          <>The activity table gained a Status column and client-side pagination.</>,
        ],
      },
      {
        label: 'Fixed',
        items: [
          <>The empty wallet-icon console error: a wallet with no supplied icon now falls back to a generic glyph, or to 1AM&apos;s real brand mark specifically, since its icon field is confirmed empty in practice.</>,
        ],
      },
    ],
  },
  {
    version: 'v0.6',
    date: 'September 10, 2026',
    title: 'Preview/Preprod network toggle',
    groups: [
      {
        label: 'Added',
        items: [
          <>A network toggle so Akad can run against Midnight <strong>Preview</strong> or <strong>Preprod</strong> from the same deployed site, switching indexer endpoints, the wallet&apos;s <code>connect()</code> target, and the contract address without editing env vars or redeploying.</>,
          <>Activity rows now record which network they were verified on, shown in the activity feed.</>,
        ],
      },
      {
        label: 'Fixed',
        items: [
          <>Extended the activity feed&apos;s indexer-verification retry window from ~15s to ~62s, after a real, successful transaction was still unindexed at the old cutoff and silently dropped from the feed.</>,
        ],
      },
    ],
  },
  {
    version: 'v0.5',
    date: 'September 8, 2026',
    title: 'Brand refresh',
    groups: [
      {
        label: 'Changed',
        items: [
          <>Landing page redesigned end to end: unified swap-preview card, new type and color system, and this page.</>,
          <>Body and heading typeface switched to Switzer; <code>Geist Mono</code> stays for wallet addresses, tx hashes, and base-unit numbers.</>,
          <>Swap and Wrap/Unwrap widgets merged the send/receive panels into a single card with the direction control sitting in the seam, replacing two separate floating cards.</>,
        ],
      },
    ],
  },
  {
    version: 'v0.4',
    date: 'September 7 – 8, 2026',
    title: 'Real transfers, activity feed, public faucet',
    groups: [
      {
        label: 'Added',
        items: [
          <>A public AKD faucet: any wallet can claim a one-time 50 AKD via <code>claimFaucet</code> to try a real swap, one claim per wallet.</>,
          <>A contract-wide activity feed: every wrap, unwrap, and swap is independently re-verified against the indexer before being recorded, and shown for every wallet, not just the current session.</>,
        ],
      },
      {
        label: 'Changed',
        items: [
          <>The token and swap contracts were merged into one <code>akad.compact</code> contract. Swaps now move real AKD balances through the pool&apos;s custody account on both legs of the trade, rather than simulating one side.</>,
        ],
      },
    ],
    breaking: [
      <>The contract merge required a redeploy. Balances and liquidity from the previous separate token/swap contracts do not carry over to the new contract address.</>,
    ],
  },
  {
    version: 'v0.3',
    date: 'August 14, 2026',
    title: 'Rebuilt trade UI, real balances',
    groups: [
      {
        label: 'Changed',
        items: [
          <>The trade UI was rebuilt as a tabbed widget: Swap, Wrap, and Unwrap in one place instead of separate flows.</>,
          <>The landing page was restructured with a proper hero, a &quot;How it works&quot; section, an FAQ, and a shared navbar/footer.</>,
        ],
      },
      {
        label: 'Fixed',
        items: [
          <><code>tokenColor</code> is now written to the ledger inside <code>init()</code>, and compiled contract artifacts are synced into the frontend by script instead of by hand.</>,
        ],
      },
    ],
  },
  {
    version: 'v0.2',
    date: 'July 22 – 23, 2026',
    title: 'Private balances',
    groups: [
      {
        label: 'Added',
        items: [
          <>Wrap and unwrap circuits for native shielded AKD, built on Midnight&apos;s native Zswap, and wired into the swap page&apos;s &quot;Wrap to Private&quot; section.</>,
        ],
      },
    ],
  },
  {
    version: 'v0.1',
    date: 'July 21, 2026',
    title: 'AMM core',
    groups: [
      {
        label: 'Added',
        items: [
          <>Compact contracts for the AKD token and a constant-product AKD ⇄ NIGHT pool, deployed to the Midnight Preview testnet.</>,
          <>The first working Swap page: live reserves, bonding-curve pricing, and real on-chain swap execution.</>,
          <>A wallet connector, deploy pipeline, and a Vitest suite covering the bonding-curve math, wired into CI (typecheck, test, build).</>,
        ],
      },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <main className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <SiteHeader />

      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 sm:px-8 sm:py-20">
        <h1 className="text-5xl font-medium leading-[0.95] tracking-[-0.03em] sm:text-6xl">
          Changelog
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-white/50">
          What has shipped on Akad, in order. Every entry here is pulled from the project&apos;s
          real commit history, not a roadmap.
        </p>

        <div className="mt-16 space-y-16">
          {entries.map((entry) => (
            <article key={entry.version} className="border-t border-white/10 pt-10">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-2xl font-medium tracking-tight">{entry.version}</h2>
                <span className="text-lg text-white/60">{entry.title}</span>
              </div>
              <p className="mt-1.5 font-mono text-xs italic text-white/35">{entry.date}</p>

              {entry.groups.map((group) => (
                <div key={group.label} className="mt-6">
                  <ul className="space-y-2.5">
                    {group.items.map((item, i) => (
                      <li
                        key={i}
                        className="pl-5 text-sm leading-relaxed text-white/70 [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-white/90"
                        style={{ textIndent: '-1.25rem' }}
                      >
                        <span className="mr-2 font-medium text-white">{group.label}:</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {entry.breaking && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <h3 className="font-mono text-xs uppercase tracking-wider text-white/40">
                    Breaking changes
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {entry.breaking.map((item, i) => (
                      <li key={i} className="text-sm leading-relaxed text-white/60">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
