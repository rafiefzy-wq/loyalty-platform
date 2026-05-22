export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ConvexAuthNextjsServerProvider } from '@convex-dev/auth/nextjs/server'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'StampPass — Digital Loyalty Cards for Apple & Google Wallet',
  description:
    'Give your customers a digital loyalty stamp card that lives natively in Apple Wallet and Google Wallet. No app required.',
  openGraph: {
    title: 'StampPass',
    description: 'Loyalty cards your customers actually keep.',
    type: 'website',
  },
}

// Inline script applies the stored theme synchronously on first paint to prevent
// a light-mode flash before React hydrates and the ThemeProvider takes over.
const themeBootstrapScript = `
(function() {
  try {
    var t = localStorage.getItem('stamppass-theme');
    if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    if (t === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="min-h-full flex flex-col antialiased bg-background text-foreground">
        <ConvexAuthNextjsServerProvider>
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </ConvexAuthNextjsServerProvider>
      </body>
    </html>
  )
}
