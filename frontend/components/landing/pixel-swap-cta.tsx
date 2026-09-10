import Link from 'next/link';
import { Icon } from '@iconify/react';

type PixelSwapCtaProps = {
  heading: string;
  body: string;
  hoverHeading: string;
  hoverBody: string;
  href: string;
  label: string;
};

const TILE_COLS = 12;
const TILE_ROWS = 5;

// Reimplemented from reactbits.dev's Pixel Swap description ("pixel
// fragments assemble into a full cover") applied to the whole CTA card
// instead of a small icon tile: at rest the card keeps its current look
// (bg-white/[0.04], white text); on hover a grid of accent-colored tiles
// assembles outward from the center, staggered per tile via
// transitionDelay, flipping the card to a solid akd-accent background with
// black text for contrast. Pure CSS (group-hover + per-tile delay), no
// canvas or JS state needed, so the real heading/paragraph/button stay
// native DOM the whole time -- keyboard focus and screen readers are
// unaffected by the decorative tile wash.
export function PixelSwapCta({
  heading,
  body,
  hoverHeading,
  hoverBody,
  href,
  label,
}: PixelSwapCtaProps) {
  const tiles = buildTileDelays();

  return (
    <div className="group relative overflow-hidden rounded-[2.5rem] bg-white/[0.04] px-8 py-16 text-center transition-colors duration-500 sm:px-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${TILE_COLS}, 1fr)`,
          gridTemplateRows: `repeat(${TILE_ROWS}, 1fr)`,
        }}
      >
        {tiles.map((delay, i) => (
          <span
            key={i}
            className="scale-0 bg-akd-accent opacity-0 transition-all duration-300 ease-out group-hover:scale-100 group-hover:opacity-100 motion-reduce:transition-none"
            style={{ transitionDelay: `${delay}ms` }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Rest and hover copy are stacked in the same grid cell (grid
            auto-sizes the track to whichever is taller) and crossfade via
            opacity, so the card doesn't jump when the message changes on
            hover -- only the visible one is announced to screen readers. */}
        <div className="grid w-full place-items-center">
          <h2 className="col-start-1 row-start-1 text-5xl font-medium leading-[0.95] tracking-[-0.03em] text-white opacity-100 transition-opacity delay-150 duration-300 group-hover:opacity-0 sm:text-6xl">
            {heading}
          </h2>
          <h2
            aria-hidden="true"
            className="col-start-1 row-start-1 text-5xl font-medium leading-[0.95] tracking-[-0.03em] text-black opacity-0 transition-opacity delay-150 duration-300 group-hover:opacity-100 sm:text-6xl"
          >
            {hoverHeading}
          </h2>
        </div>
        <div className="grid w-full max-w-lg place-items-center">
          <p className="col-start-1 row-start-1 text-lg leading-relaxed text-white/50 opacity-100 transition-opacity delay-150 duration-300 group-hover:opacity-0">
            {body}
          </p>
          <p aria-hidden="true" className="col-start-1 row-start-1 text-lg leading-relaxed text-black/70 opacity-0 transition-opacity delay-150 duration-300 group-hover:opacity-100">
            {hoverBody}
          </p>
        </div>
        <Link
          href={href}
          className="inline-flex items-center gap-2 rounded-full bg-akd-accent px-8 py-3.5 text-base font-medium text-black transition-colors delay-150 duration-300 group-hover:bg-black group-hover:text-akd-accent"
        >
          {label}
          <Icon icon="lucide:arrow-up-right" width={16} height={16} />
        </Link>
      </div>
    </div>
  );
}

// Distance-from-center delay so the tile wash reads as assembling outward
// from the middle of the card, rather than a flat uniform fade.
function buildTileDelays(): number[] {
  const centerCol = (TILE_COLS - 1) / 2;
  const centerRow = (TILE_ROWS - 1) / 2;
  const maxDist = Math.hypot(centerCol, centerRow);
  const delays: number[] = [];
  for (let row = 0; row < TILE_ROWS; row++) {
    for (let col = 0; col < TILE_COLS; col++) {
      const dist = Math.hypot(col - centerCol, row - centerRow);
      delays.push(Math.round((dist / maxDist) * 220));
    }
  }
  return delays;
}
