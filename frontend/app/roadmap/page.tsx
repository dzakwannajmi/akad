import { SiteHeader } from '@/components/brand/site-header';
import { RoadmapFlow } from '@/components/roadmap/roadmap-flow';

export default function RoadmapPage() {
  return (
    <main className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <SiteHeader />

      <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-16 sm:px-8 sm:py-20">
        <h1 className="text-5xl font-medium leading-[0.95] tracking-[-0.03em] sm:text-6xl">
          Roadmap
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-white/50">
          Where Akad could go next. This is a direction, not a commitment: every cross-chain
          branch below depends entirely on Midnight shipping its own mainnet and bridge
          infrastructure first, which Akad has no control over and no timeline for.
        </p>

        <div className="mt-14">
          <RoadmapFlow />
        </div>

        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs text-white/40">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-akd-accent" />
            Live today
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white/40" />
            Planned, no date yet
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white/15" />
            Exploratory, not started
          </span>
        </div>
      </div>
    </main>
  );
}
