import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { NetworkProvider } from "@/contexts/NetworkContext";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Body/heading font is Switzer, loaded via the @import in globals.css (see
// the comment there for why: Switzer isn't on Google Fonts, so next/font
// can't load it). Geist Mono stays on next/font and stays the mono
// typeface -- wallet addresses, tx hashes and base-unit numbers need a
// real monospace face to stay aligned/legible, so that one usage was kept
// instead of switching everything to Switzer.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  // Mono text (wallet addresses, tx hashes, balances) only ever renders
  // after wallet connect / async data loads, well past the "few seconds
  // from window load" window the browser checks -- so the automatic
  // <link rel=preload> next/font injects into every route (it's declared
  // in the root layout, so Next.js can't know a given page won't use it
  // right away) was flagged as unused. The font still loads normally on
  // first actual use, just without the eager preload hint.
  preload: false,
});

export const metadata: Metadata = {
  title: "Akad",
  description:
    "Privacy-optional AMM on Midnight Network. Swap AKD against NIGHT on a public constant-product curve, or hold your AKD as a native shielded Zswap coin that leaves the public ledger entirely.",
  // The icon files live at app/favicon.ico and app/icon.png, which Next.js
  // picks up by convention, so there is no icons field to keep in sync here.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NetworkProvider>{children}</NetworkProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
