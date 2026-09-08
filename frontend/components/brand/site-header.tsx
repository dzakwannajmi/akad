'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { NavLogo } from './nav-logo';

// Changelog isn't repeated here -- it already lives in the footer, so the
// navbar only carries the links a visitor needs while exploring the
// product itself.
const NAV_LINKS = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/activity', label: 'Activity' },
];

// Single header shared by every page (/, /swap, /activity, /changelog) so
// the nav links, logo, and scroll behavior can't drift out of sync again.
// Transparent over the hero, glassmorphic once the page scrolls. `right`
// swaps in a page-specific action (the Swap page needs a wallet
// connect/status button instead of "Launch App"); `leftExtra` inserts
// page-specific nav items (the Swap page's Trade dropdown) next to the
// logo. A three-column grid (logo+extras / links / action) keeps the nav
// links visually centered regardless of how wide the left and right
// groups end up.
export function SiteHeader({
  right,
  leftExtra,
}: {
  right?: React.ReactNode;
  leftExtra?: React.ReactNode;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? 'border-white/10 bg-black/60 backdrop-blur-xl'
          : 'border-transparent bg-transparent'
      }`}
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-4 sm:px-8">
        <div className="flex items-center gap-8">
          <NavLogo />
          {leftExtra}
        </div>

        <nav className="hidden items-center gap-8 sm:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-base text-white/50 transition-colors hover:text-white sm:text-lg"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex justify-end">
          {right ?? (
            <Link
              href="/swap"
              className="rounded-full bg-akd-accent px-6 py-2.5 text-base font-medium text-black"
            >
              Launch App
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
