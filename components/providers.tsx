"use client"

import { EbayIconProvider } from "@ebay/ui-core-react/ebay-icon"
import type { ReactNode } from "react"
import { AppStoreProvider } from "@/lib/store"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <EbayIconProvider>
      <AppStoreProvider>{children}</AppStoreProvider>
    </EbayIconProvider>
  )
}
