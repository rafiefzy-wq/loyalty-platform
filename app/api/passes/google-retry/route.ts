import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

// Best-effort retry endpoint: triggers Google Wallet pass creation for an
// already-existing pass. Used by the landing page when the initial creation
// returned null (e.g. transient API failure or first-time config issue).
export async function POST(request: NextRequest) {
  const passId = request.nextUrl.searchParams.get('pass')
  if (!passId) return NextResponse.json({ error: 'Missing pass id' }, { status: 400 })

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
    const googleWalletUrl = await convex.action(api.walletActions.createGoogleWalletPass, {
      passId: passId as Id<'customerPasses'>,
      appUrl,
    })
    if (!googleWalletUrl) {
      return NextResponse.json(
        {
          googleWalletUrl: null,
          reason: 'Google Wallet integration is not fully configured for this business. The owner needs a valid Google Wallet API issuer ID — see https://pay.google.com/business/console',
        },
        { status: 200 },
      )
    }
    return NextResponse.json({ googleWalletUrl })
  } catch (err: any) {
    console.error('[google-retry] failed:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
