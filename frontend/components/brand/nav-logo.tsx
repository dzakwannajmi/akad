import Link from 'next/link';

// Full brand lockup (icon tile + "AKAD" wordmark) as a single flat SVG,
// used in every header and in the footer.
// frontend/public/brand/logo-complete.svg
export function NavLogo({
  className = '',
  imgClassName = 'h-9 w-auto',
}: {
  className?: string;
  imgClassName?: string;
}) {
  return (
    <Link href="/" className={`flex items-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static asset from /public, no next/image optimization needed for a small SVG mark */}
      <img src="/brand/logo-complete.svg" alt="Akad" className={imgClassName} />
    </Link>
  );
}
