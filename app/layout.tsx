import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import { Analytics } from "@vercel/analytics/next"
import { Providers } from "@/components/providers"
import "./globals.css"

export const metadata: Metadata = {
  title: "Services Central — Merchant Account Settings",
  description:
    "Self-service merchant account settings for eBay Payment Services: KYC, processing channels, logical accounts, bank accounts, payouts, and users.",
  generator: "v0.app",
}

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#ffffff" }],
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      {/* .evo-theme scopes the Evo semantic color tokens to the whole app */}
      <body className="evo-theme">
        <Providers>{children}</Providers>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
