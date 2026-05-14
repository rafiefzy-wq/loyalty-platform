import { NextRequest, NextResponse } from 'next/server'
import { fetchMutation, fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { generateApplePass } from '@/lib/passes/apple-wallet'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ passId: string }> }
) {
  const { passId } = await context.params
  const data = await fetchQuery(api.passes.getPass, { passId: passId as Id<'customerPasses'> })

  if (!data) return NextResponse.json({ error: 'Pass not found' }, { status: 404 })

  const { pass, card, business } = data

  if (!process.env.APPLE_PASS_CERTIFICATE) {
    return NextResponse.json(
      { error: 'Apple Wallet not configured. Set APPLE_PASS_CERTIFICATE in environment.' },
      { status: 503 }
    )
  }

  try {
    // Map Convex camelCase to the shape generateApplePass expects
    const passBuffer = await generateApplePass({
      customerPass: {
        id: pass._id,
        stamp_count: pass.stampCount,
        apple_pass_serial: pass.applePassSerial ?? '',
        apple_push_token: pass.applePushToken ?? null,
        google_pass_id: pass.googlePassId ?? null,
      } as any,
      loyaltyCard: {
        id: card._id,
        stamp_goal: card.stampGoal,
        reward_description: card.rewardDescription,
        background_color: card.backgroundColor,
        foreground_color: card.foregroundColor,
        label_color: card.labelColor,
        icon_url: card.iconUrl ?? null,
        strip_image_url: card.stripImageUrl ?? null,
      } as any,
      business: {
        id: business?._id,
        name: business?.name ?? '',
        brand_color: business?.brandColor ?? '#6366f1',
        logo_url: business?.logoUrl ?? null,
        background_image_url: business?.backgroundImageUrl ?? null,
      } as any,
    })

    return new NextResponse(passBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="${(business?.name ?? 'pass').replace(/[^a-z0-9]/gi, '-')}.pkpass"`,
        'Content-Length': passBuffer.length.toString(),
      },
    })
  } catch (err) {
    console.error('Apple pass generation failed:', err)
    return NextResponse.json({ error: 'Pass generation failed' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ passId: string }> }
) {
  const { passId } = await context.params
  const body = await request.json().catch(() => ({}))
  const pushToken = body.pushToken

  if (!pushToken) return NextResponse.json({ error: 'Missing pushToken' }, { status: 400 })

  try {
    const data = await fetchQuery(api.passes.getPass, { passId: passId as Id<'customerPasses'> })
    if (!data) return NextResponse.json({ error: 'Pass not found' }, { status: 404 })

    if (data.pass.applePassSerial) {
      await fetchMutation(api.passes.updateApplePushToken, { passSerial: data.pass.applePassSerial, pushToken })
    }
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
