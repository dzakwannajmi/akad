import Link from 'next/link';
import { SiteHeader } from '@/components/brand/site-header';
import { NavLogo } from '@/components/brand/nav-logo';
import { Icon } from '@iconify/react';
import { NightTokenIcon } from '@/components/icons/token-icon';
import { SwapPreviewCard } from '@/components/landing/swap-preview-card';
import CardSwap, { Card } from '@/components/landing/card-swap';
import { LoopingWord } from '@/components/landing/looping-word';
import { CursorGrid } from '@/components/landing/cursor-grid';
import { PixelSwapCta } from '@/components/landing/pixel-swap-cta';

const advantages = [
  {
    icon: 'lucide:repeat',
    title: 'Swap publicly',
    body: 'AKD and NIGHT trade on a constant-product curve. Reserves are public, so anyone can verify the price you got.',
  },
  {
    icon: 'lucide:shield',
    title: 'Wrap to private',
    body: 'Burn a public AKD balance and mint a shielded coin to yourself. While wrapped, that balance is no longer a public ledger row tied to your address.',
  },
  {
    icon: 'lucide:unlock',
    title: 'Unwrap anytime',
    body: 'Send the shielded coin back to the contract and your public balance is credited again, verified on Preprod.',
  },
  {
    icon: 'lucide:eye-off',
    title: 'Holdings leave the public ledger',
    body: 'Wrapping takes your AKD out of the public balance map, so your holding is no longer a public row. The wrap itself is visible: the ledger shows your wallet key and how much left your balance.',
  },
  {
    icon: 'lucide:globe',
    title: 'Reserves stay public',
    body: 'Pool reserves and the size of every swap are public by design: a constant-product AMM cannot price trades without them.',
  },
];

const faqs = [
  {
    q: 'What is AKD?',
    a: 'A demo token created for this project. Akad runs on Midnight’s Preview and Preprod testnets, so AKD and NIGHT have no real value, and nothing here involves real money.',
  },
  {
    q: 'Which wallet do I need?',
    a: 'Either 1AM or Lace, set to the same network as the app’s network toggle (Preview or Preprod). Public swaps and wrapping work in both. Unwrapping and shielded swaps need 1AM: on Lace, spending a shielded coin hangs inside the wallet’s own balancing step and never completes.',
  },
  {
    q: 'What stays private, and what does not?',
    a: 'Private: what you hold while it is wrapped, and who you are on a shielded swap. A wrapped balance has no public ledger row, and a shielded swap moves both legs as shielded coins, so no address appears in it. Public: pool reserves and the size of every trade, which the reserve change reveals; wrapping and unwrapping, which show your wallet key and the amount; and the recipient address whenever sNIGHT is redeemed for tNIGHT. The full boundary is written up in docs/hackathon/MIDNIGHT_IMPLEMENTATION.md in the repo.',
  },
  {
    q: 'Does swapping move my tokens?',
    a: 'Yes, both legs. AKD moves through the pool’s custody account in the same balance ledger that transfer uses, and the NIGHT leg moves real tNIGHT in and out of the contract’s own custody through Midnight’s native unshielded-token primitives.',
  },
  {
    q: 'I have a new wallet with no AKD. How do I test a swap?',
    a: 'Connect your wallet on the Swap page and click Claim faucet. Every wallet can claim a one-time 50 AKD from the public faucet, enough to try a real swap. Each wallet can only claim once.',
  },
  {
    q: 'What units are amounts in?',
    a: 'AKD uses six decimals. The contract counts base units, so 1 AKD is 1,000,000 of them, and the swap, pool, and deploy screens convert to whole tokens for you.',
  },
  {
    q: 'Is this production ready?',
    a: 'Akad runs on Midnight’s Preview and Preprod testnets, so AKD and NIGHT are demo assets with no real value by design. Every swap, wrap, and unwrap is an on-chain transaction, and the activity feed lists one only after the indexer confirms it succeeded. See the changelog for what has shipped and what is next.',
  },
];

const footerColumns = [
  {
    title: 'Product',
    links: [
      { label: 'Swap', href: '/swap?tab=swap' },
      { label: 'Wrap / Unwrap', href: '/swap?tab=wrap' },
      { label: 'Faucet', href: '/faucet' },
    ],
  },
  {
    title: 'About',
    links: [
      { label: 'Changelog', href: '/changelog' },
      { label: 'Roadmap', href: '/roadmap' },
      { label: 'GitHub', href: 'https://github.com/dzakwannajmi/akad' },
      { label: 'X', href: 'https://x.com/akadtok' },
    ],
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <CursorGrid />

        <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 pb-28 pt-24 sm:grid-cols-2 sm:px-10 sm:pb-40 sm:pt-32">
        <div className="text-center sm:text-left">
          <h1 className="text-6xl font-medium leading-[0.9] tracking-[-0.04em] text-white sm:text-[5rem]">
            Akad
          </h1>
          <p className="mx-auto mt-8 max-w-lg text-2xl font-medium leading-[1.3] tracking-tight text-white/60 sm:mx-0 sm:text-3xl">
            Swap in the open. Hold in private.
          </p>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4 sm:justify-start">
            <Link
              href="/swap"
              className="rounded-full bg-akd-accent px-8 py-3.5 text-base font-medium text-black"
            >
              Get Started
            </Link>
            <Link
              href="#how-it-works"
              className="rounded-full border border-white/15 px-8 py-3.5 text-base font-medium text-white transition-colors hover:border-white"
            >
              How it works
            </Link>
          </div>
        </div>

        <SwapPreviewCard />
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-6 pb-28 sm:px-10 sm:pb-40">
        <div className="grid gap-16 sm:grid-cols-2 sm:items-center">
          <div>
            <h2 className="text-5xl font-medium leading-[0.95] tracking-[-0.03em] text-white sm:text-7xl">
              Swap <LoopingWord words={['Publicly.', 'Privately.', 'Confidently.']} />
            </h2>
            <p className="mt-8 max-w-md text-lg leading-relaxed text-white/50">
              One AMM, two ways to hold AKD: priced from public reserves, held in a balance that
              is provably yours alone.
            </p>
          </div>

          <div className="relative h-[420px] sm:h-[520px]">
            <CardSwap
              width={380}
              height={260}
              cardDistance={45}
              verticalDistance={55}
              delay={4200}
              skewAmount={5}
              pauseOnHover
            >
              {advantages.map((a) => (
                <Card key={a.title}>
                  <div className="flex h-full flex-col justify-between p-7">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-black/10 text-black">
                      <Icon icon={a.icon} width={20} height={20} />
                    </span>
                    <div>
                      <h3 className="text-xl font-medium tracking-tight text-black">{a.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-black/60">{a.body}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </CardSwap>
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-6xl px-6 pb-28 sm:px-10 sm:pb-40">
        <h2 className="text-5xl font-medium leading-[0.95] tracking-[-0.03em] text-white sm:text-7xl">
          FAQ
        </h2>
        <div className="mt-16 border-t border-white/10">
          {faqs.map((f) => (
            <details key={f.q} className="group border-b border-white/10 py-7">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-2xl font-medium tracking-tight text-white transition-colors marker:hidden hover:text-white [&::-webkit-details-marker]:hidden sm:text-3xl">
                {f.q}
                <span className="font-mono text-2xl text-white/25 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-6 max-w-3xl text-base leading-relaxed text-white/50">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-28 sm:px-10 sm:pb-40">
        <PixelSwapCta
          heading="Ready when you are."
          body="Connect a wallet, claim test AKD from the faucet, and make your first swap on Preview or Preprod."
          hoverHeading="Your move."
          hoverBody="Your wallet, your terms. Swap now."
          href="/swap"
          label="Launch App"
        />
      </section>

      <footer className="border-t border-white/10 px-6 pb-10 pt-16 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-14 lg:grid-cols-[1fr_2fr]">
            <div>
              <NavLogo imgClassName="h-11 w-auto" />
              <p className="mt-6 max-w-xs text-base leading-relaxed text-white/50">
                One AMM, two ways to hold AKD: as a public balance, or as a shielded coin
                that leaves the public ledger. Every trade is checked against the
                constant-product invariant, on-chain.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
              {footerColumns.map((col) => (
                <div key={col.title}>
                  <h3 className="font-mono text-xs uppercase tracking-wider text-white/40">
                    {col.title}
                  </h3>
                  <ul className="mt-5 space-y-3">
                    {col.links.map((l) => (
                      <li key={l.label}>
                        <Link
                          href={l.href}
                          className="text-sm text-white/60 transition-colors hover:text-white"
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-xs text-white/30">Akad © 2026. All rights reserved.</p>
            <p className="flex items-center gap-1.5 font-mono text-xs text-white/30">
              <NightTokenIcon className="h-4 w-4" />
              Supported by Midnight
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
