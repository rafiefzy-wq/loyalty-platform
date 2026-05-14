import { NextRequest, NextResponse } from 'next/server'
import { fetchMutation, fetchQuery } from 'convex/nextjs'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

export async function POST(request: NextRequest) {
  const token = await convexAuthNextjsToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { passId, locationId } = await request.json()
  if (!passId || !locationId) return NextResponse.json({ error: 'Missing passId or locationId' }, { status: 400 })

  try {
    const result = await fetchMutation(
      api.passes.addStamp,
      { passId: passId as Id<'customerPasses'>, locationId: locationId as Id<'locations'> },
      { token }
    )

    const data = await fetchQuery(api.passes.getPass, { passId: passId as Id<'customerPasses'> })
    const isRewardReady = result.stampCount >= (data?.card.stampGoal ?? 999)

    // Fire-and-forget Google Wallet update
    if (data?.pass.googlePassId) {
      const { ConvexHttpClient } = await import('convex/browser')
      const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
      convex.action(api.walletActions.updateGoogleWalletPass, { passId: passId as Id<'customerPasses'> }).catch(() => {})
    }

    return NextResponse.json({ success: true, stampCount: result.stampCount, stampGoal: data?.card.stampGoal, isRewardReady })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
