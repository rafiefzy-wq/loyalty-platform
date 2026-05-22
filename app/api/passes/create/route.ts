import { NextRequest, NextResponse } from 'next/server'
import { fetchMutation, fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

export async function POST(request: NextRequest) {
  const cardId = request.nextUrl.searchParams.get('card')
  if (!cardId) return NextResponse.json({ error: 'Missing card id' }, { status: 400 })

  try {
    const passId = await fetchMutation(api.passes.createPass, { cardId: cardId as Id<'loyaltyCards'> })
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const passUrl = `${appUrl}/pass/${passId}`

    // Trigger Google Wallet creation. Action handles its own errors and returns null
    // on failure — we still surface any wrapping error here so it shows in Vercel logs.
    let googleWalletUrl: string | null = null
    try {
      const { ConvexHttpClient } = await import('convex/browser')
      const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
      googleWalletUrl = await convex.action(api.walletActions.createGoogleWalletPass, {
        passId: passId as Id<'customerPasses'>,
        appUrl,
      })
      if (!googleWalletUrl) {
        console.warn('[passes/create] Google Wallet URL was null — check Convex logs for [google-wallet] entries')
      }
    } catch (err: any) {
      console.error('[passes/create] Google Wallet action threw:', err?.message || err)
    }

    return NextResponse.json({
      passId,
      passUrl,
      applePassUrl: `/api/passes/apple/${passId}`,
      googleWalletUrl,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
