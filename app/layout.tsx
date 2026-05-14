import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
