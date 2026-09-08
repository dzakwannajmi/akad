import Link from 'next/link';

const steps = [
  {
    n: '01',
    title: 'Swap publicly',
    body: 'AKD ⇄ tNIGHT on a constant-product curve. Reserves are public, so anyone can verify the price you got.',
  },
  {
    n: '02',
    title: 'Wrap to private',
    body: 'Burn a public AKD balance and mint a native shielded coin to yourself. Once wrapped, that balance is no longer linkable to you.',
  },
  {
    n: '03',
    title: 'Unwrap when you want',
    body: 'Send the shielded coin back to the contract and your public balance is credited again. Both directions are verified on Preview.',
  },
];

const faqs = [
  {
    q: 'What is AKD?',
    a: 'A demo token created for this project. Akad runs on the Midnight Preview testnet — AKD and tNIGHT have no real value, and nothing here involves real money.',
  },
  {
    q: 'Which wallet do I need?',
    a: 'Either 1AM or Lace, set to the Preview network. Swapping and wrapping work in both. Unwrapping is verified on 1AM only: on Lace the transaction hangs inside the wallet\u2019s own balancing step and never completes.',
  },
  {
    q: 'What stays private, and what does not?',
    a: 'Ownership of a wrapped balance is private — a shielded coin is not linkable to the public balance it came from. Your slippage tolerance is proven correct without ever being published. Trade sizes and pool reserves are public, because a constant-product AMM cannot price trades without them.',
  },
  {
    q: 'Does swapping move my tokens?',
    a: 'Yes for AKD. Swapping moves your real AKD balance to or from the pool\u2019s custody account, the same balance ledger transfer uses. tNIGHT is still simulated on both swap legs: reserves update for correct pricing, but no real tNIGHT changes custody yet.',
  },
  {
    q: 'I have a new wallet with no AKD. How do I test a swap?',
    a: 'Connect your wallet on the Swap page and click Claim faucet. Every wallet can claim a one-time 50 AKD from the public faucet, enough to try a real swap. Each wallet can only claim once.',
  },
  {
    q: 'Why are the amounts so small?',
    a: 'All values are in base units. AKD uses six decimals, so the interface currently shows raw units rather than whole tokens. Decimal formatting is on the roadmap.',
  },
  {
    q: 'Is this production ready?',
    a: 'No. Akad is a testnet project built for a builder program. It has not been audited, and the liquidity pool is seeded once by the builder with no support for other providers.',
  },
];

const footerColumns = [
  {
    title: 'Product',
    links: [
      { label: 'Launch app', href: '/swap' },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'FAQ', href: '#faq' },
      { label: 'Activity', href: '/activity' },
    ],
  },
];

function IconX({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function IconGitHub({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur">
        <div className="flex items-center justify-between px-6 py-4 sm:px-8">
          <nav className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-medium tracking-tight sm:text-3xl">
              Akad
            </Link>
            <Link
              href="#how-it-works"
              className="hidden text-base text-white/50 transition-colors hover:text-white sm:block sm:text-lg"
            >
              How it works
            </Link>
            <Link
              href="#faq"
              className="hidden text-base text-white/50 transition-colors hover:text-white sm:block sm:text-lg"
            >
              FAQ
            </Link>
            <Link
              href="/activity"
              className="hidden text-base text-white/50 transition-colors hover:text-white sm:block sm:text-lg"
            >
              Activity
            </Link>
          </nav>
          <Link
            href="/swap"
            className="rounded-full bg-white px-6 py-2.5 text-base font-medium text-black transition-colors hover:bg-white/85"
          >
            Launch App
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 pb-28 pt-24 text-center sm:px-10 sm:pb-40 sm:pt-32">
        <h1 className="text-6xl font-medium leading-[0.9] tracking-[-0.04em] sm:text-[5rem]">
          Akad
        </h1>
        <p className="mx-auto mt-8 max-w-2xl text-2xl leading-[1.3] tracking-tight text-white/60 sm:text-3xl">
          Swap AKD ⇄ tNIGHT. Publicly, or privately — your choice, every trade.
        </p>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/swap"
            className="rounded-full bg-white px-8 py-3.5 text-base font-medium text-black transition-colors hover:bg-white/85"
          >
            Launch App
          </Link>
          <Link
            href="#how-it-works"
            className="rounded-full border border-white/20 px-8 py-3.5 text-base font-medium text-white/70 transition-colors hover:border-white/40 hover:text-white"
          >
            How it works
          </Link>
        </div>
        <p className="mt-20 font-mono text-xs text-white/30">
          Built on Midnight Network — Preview testnet
        </p>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-6 pb-28 sm:px-10 sm:pb-40">
        <h2 className="text-5xl font-medium leading-[0.95] tracking-[-0.03em] sm:text-7xl">
          How it works
        </h2>
        <div className="mt-16 grid gap-14 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n}>
              <span className="font-mono text-5xl text-white/15 sm:text-6xl">{s.n}</span>
              <h3 className="mt-6 text-2xl font-medium tracking-tight sm:text-3xl">{s.title}</h3>
              <p className="mt-4 text-base leading-relaxed text-white/50">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-28 sm:px-10 sm:pb-40">
        <h2 className="text-5xl font-medium leading-[0.95] tracking-[-0.03em] sm:text-7xl">
          What stays private
        </h2>
        <div className="mt-16 grid gap-10 sm:grid-cols-2">
          <div className="border-t border-white/20 pt-6">
            <h3 className="font-mono text-sm text-white/40">Private</h3>
            <ul className="mt-6 space-y-4 text-xl leading-snug tracking-tight text-white/70 sm:text-2xl">
              <li>Ownership of any AKD held in shielded form</li>
              <li>Your slippage tolerance — proven, never published</li>
            </ul>
          </div>
          <div className="border-t border-white/20 pt-6">
            <h3 className="font-mono text-sm text-white/40">Public</h3>
            <ul className="mt-6 space-y-4 text-xl leading-snug tracking-tight text-white/70 sm:text-2xl">
              <li>Pool reserves, and the size and direction of every swap</li>
              <li>Unwrapped AKD balances, keyed by a hashed identifier</li>
            </ul>
          </div>
        </div>
        <p className="mt-10 max-w-2xl text-sm leading-relaxed text-white/30">
          Akad does not claim trade-amount privacy. A constant-product AMM needs public reserves to
          price trades at all — the privacy boundary is drawn around custody, not around the trade.
        </p>
      </section>

      <section id="faq" className="mx-auto max-w-6xl px-6 pb-28 sm:px-10 sm:pb-40">
        <h2 className="text-5xl font-medium leading-[0.95] tracking-[-0.03em] sm:text-7xl">FAQ</h2>
        <div className="mt-16 border-t border-white/10">
          {faqs.map((f) => (
            <details key={f.q} className="group border-b border-white/10 py-7">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-2xl font-medium tracking-tight marker:hidden [&::-webkit-details-marker]:hidden sm:text-3xl">
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

      <footer className="border-t border-white/10 px-6 pb-10 pt-16 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-14 lg:grid-cols-[1fr_2fr]">
            <h2 className="text-4xl font-medium uppercase leading-[0.95] tracking-[-0.03em] sm:text-5xl">
              Swap public.
              <br />
              Hold private.
            </h2>

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
            <p className="font-mono text-xs text-white/30">
              Preview testnet — AKD and tNIGHT carry no real value.
            </p>
            <div className="flex items-center gap-6">
              <span className="font-mono text-xs text-white/30">Akad © 2026</span>
              <Link
                href="https://x.com/akadtok"
                aria-label="Akad on X"
                className="text-white/50 transition-colors hover:text-white"
              >
                <IconX className="h-4 w-4" />
              </Link>
              <Link
                href="https://github.com/dzakwannajmi/akad"
                aria-label="Akad on GitHub"
                className="text-white/50 transition-colors hover:text-white"
              >
                <IconGitHub className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
