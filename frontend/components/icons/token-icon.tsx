// Token icons used in the swap-preview animation on the landing page (and
// anywhere else a token needs a mark). Both AKD and NIGHT now use real
// brand marks: frontend/public/token/logo.svg (Akad) and
// frontend/public/token/midnight-token.svg (Midnight).

export function AkdTokenIcon({
  className = 'h-10 w-10',
}: {
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static asset from /public, no next/image optimization needed for a small SVG mark
    <img
      src="/token/logo.svg"
      alt="AKD"
      aria-hidden="true"
      className={`shrink-0 rounded-2xl ring-1 ring-white/15 ${className}`}
    />
  );
}

export function NightTokenIcon({
  className = 'h-10 w-10',
}: {
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static asset from /public, no next/image optimization needed for a small SVG mark
    <img
      src="/token/midnight-token.svg"
      alt="NIGHT"
      aria-hidden="true"
      className={`shrink-0 rounded-2xl ring-1 ring-white/15 ${className}`}
    />
  );
}
