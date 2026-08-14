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
    a: 'Ownership of a wrapped balance is private \u2014 a shielded coin is not linkable to the public balance it came from. Your slippage tolerance is proven correct without ever being published. Trade sizes and pool reserves are public, because a constant-product AMM cannot price trades without them.',
  },
  {
    q: 'Does swapping move my tokens?',
    a: 'Not yet. The pool contract tracks reserves and enforces the constant-product invariant, but it does not transfer AKD between accounts. Wiring the AMM to the token contract\u2019s balances is planned work, not a shipped feature.',
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

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <header className="flex items-center justify-between px-6 py-6 sm:px-10">
        <span className="font-mono text-sm tracking-tight">Akad</span>
        <nav className="flex items-center gap-5">
          <Link
            href="https://x.com/akadtok"
            className="text-xs text-white/50 hover:text-white/90 transition-colors font-mono"
          >
            X
          </Link>
          <Link
            href="https://github.com/dzakwannajmi/akad"
            className="text-xs text-white/50 hover:text-white/90 transition-colors font-mono"
          >
            GitHub
          </Link>
        </nav>
      </header>

      <section className="flex flex-col items-center justify-center px-6 py-24 sm:py-32 text-center">
        <h1 className="text-4xl sm:text-6xl font-medium tracking-tight max-w-3xl leading-[1.1]">
          Akad
        </h1>
        <p className="mt-6 max-w-lg text-base sm:text-lg text-white/60 leading-relaxed">
          Swap AKD ⇄ tNIGHT. Publicly, or privately — your choice, every trade.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <Link
            href="/swap"
            className="rounded-full bg-white text-black px-6 py-2.5 text-sm font-medium hover:bg-white/90 transition-colors"
          >
            Launch App
          </Link>
        </div>
        <p className="mt-16 text-xs text-white/30 font-mono">
          Built on Midnight Network — Preview testnet
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-24 sm:pb-32">
        <h2 className="font-mono text-xs text-white/40 mb-10">How it works</h2>
        <div className="grid gap-px bg-white/10 sm:grid-cols-3 rounded-2xl overflow-hidden">
          {steps.map((s) => (
            <div key={s.n} className="bg-black p-6">
              <span className="font-mono text-xs text-white/30">{s.n}</span>
              <h3 className="mt-4 text-base font-medium tracking-tight">{s.title}</h3>
              <p className="mt-3 text-sm text-white/50 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-24 sm:pb-32">
        <h2 className="font-mono text-xs text-white/40 mb-10">What stays private</h2>
        <div className="grid gap-8 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 p-6">
            <h3 className="font-mono text-xs text-white/40">Private</h3>
            <ul className="mt-4 space-y-3 text-sm text-white/60 leading-relaxed">
              <li>Ownership of any AKD held in shielded form</li>
              <li>Your slippage tolerance — proven, never published</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 p-6">
            <h3 className="font-mono text-xs text-white/40">Public</h3>
            <ul className="mt-4 space-y-3 text-sm text-white/60 leading-relaxed">
              <li>Pool reserves, and the size and direction of every swap</li>
              <li>Unwrapped AKD balances, keyed by a hashed identifier</li>
            </ul>
          </div>
        </div>
        <p className="mt-6 text-xs text-white/30 leading-relaxed">
          Akad does not claim trade-amount privacy. A constant-product AMM needs public reserves to
          price trades at all — the privacy boundary is drawn around custody, not around the trade.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-24 sm:pb-32">
        <h2 className="font-mono text-xs text-white/40 mb-10">FAQ</h2>
        <div className="divide-y divide-white/10 border-y border-white/10">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="cursor-pointer list-none text-sm font-medium tracking-tight marker:hidden flex items-center justify-between gap-4">
                {f.q}
                <span className="font-mono text-white/30 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-4 text-sm text-white/50 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-10 sm:px-10">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-mono text-xs text-white/30">
            Akad — Rise In × Midnight, New Moon to Full
          </span>
          <nav className="flex items-center gap-5">
            <Link
              href="https://github.com/dzakwannajmi/akad"
              className="font-mono text-xs text-white/50 hover:text-white/90 transition-colors"
            >
              GitHub
            </Link>
            <Link
              href="https://x.com/akadtok"
              className="font-mono text-xs text-white/50 hover:text-white/90 transition-colors"
            >
              @akadtok
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
