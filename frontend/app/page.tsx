import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <header className="flex items-center justify-between px-6 py-6 sm:px-10">
        <span className="font-mono text-sm tracking-tight">Akad</span>
        <Link
          href="https://github.com/dzakwannajmi/akad"
          className="text-xs text-white/50 hover:text-white/90 transition-colors font-mono"
        >
          GitHub
        </Link>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
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
      </div>
    </main>
  );
}
