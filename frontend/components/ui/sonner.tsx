"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

// Akad's UI never toggles Tailwind's `.dark` class (the whole app is a
// single always-black theme), so shadcn's default `var(--popover)` here
// resolves to the light-mode value -- a near-white background -- even on
// this black page. Rather than depend on `next-themes` (unused elsewhere in
// this app, no <ThemeProvider> wraps it), the toast is forced to `theme="dark"`
// and given explicit gray colors that contrast against `bg-black`.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "#1c1c1f",
          "--normal-text": "#f5f5f5",
          "--normal-border": "rgba(255, 255, 255, 0.12)",
          "--success-bg": "#1c1c1f",
          "--success-text": "#d0f864",
          "--success-border": "rgba(208, 248, 100, 0.25)",
          "--error-bg": "#1c1c1f",
          "--error-text": "#ff6b6b",
          "--error-border": "rgba(255, 107, 107, 0.25)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
