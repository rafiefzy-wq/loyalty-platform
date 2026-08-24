'use client'

'use client'

import { ConvexProviderWithAuth } from 'convex/react'
import { useConvexAuth } from '@convex-dev/auth/react'
import { ConvexReactClient } from 'convex/react'
import { ThemeProvider } from '@/components/theme-provider'

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useConvexAuth}>
      <ThemeProvider>{children}</ThemeProvider>
    </ConvexProviderWithAuth>
  )
}
