import { NextRequest, NextResponse } from 'next/server'
import { fetchQuery } from 'convex/nextjs'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { api } from '@/convex/_generated/api'
import { sendApplePushNotification } from '@/lib/passes/apple-wallet'

export async function POST(request: NextRequest) {
  const token = await convexAuthNextjsToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const business = await fetchQuery(api.businesses.getMyBusiness, {}, { token })
  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  const passes = await fetchQuery(api.passes.listPassesForBusiness, { businessId: business._id })

  const withTokens = passes.filter((p: any) => p.applePushToken)

  let count = 0
  await Promise.allSettled(
    withTokens.map(async (pass: any) => {
      await sendApplePushNotification(pass.applePushToken)
      count++
    })
  )

  return NextResponse.json({ count })
}
