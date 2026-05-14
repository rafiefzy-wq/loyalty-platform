import { NextRequest, NextResponse } from 'next/server'
import { fetchMutation } from 'convex/nextjs'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { api } from '@/convex/_generated/api'

export async function PUT(request: NextRequest) {
  const token = await convexAuthNextjsToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessName, brandColor, foregroundColor, labelColor, fontChoice, stampGoal, rewardDescription, logoUrl, stripImageUrl } = await request.json()

  await fetchMutation(api.businesses.updateDesign, {
    businessName,
    brandColor,
    foregroundColor,
    labelColor,
    fontChoice,
    stampGoal,
    rewardDescription,
    logoUrl: logoUrl || undefined,
    stripImageUrl: stripImageUrl || undefined,
  }, { token })

  return NextResponse.json({ ok: true })
}
