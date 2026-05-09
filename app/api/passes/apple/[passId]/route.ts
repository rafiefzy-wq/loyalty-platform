import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateApplePass } from '@/lib/passes/apple-wallet'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ passId: string }> }
) {
  const { passId } = await context.params
  const supabase = await createServiceClient()

  const { data: customerPass, error } = await supabase
    .from('customer_passes')
    .select('*, loyalty_cards(*, businesses(*))')
    .eq('id', passId)
    .single()

  if (error || !customerPass) {
    return NextResponse.json({ error: 'Pass not found' }, { status: 404 })
  }

  const loyaltyCard = (customerPass as any).loyalty_cards
  const business = loyaltyCard.businesses

  if (!process.env.APPLE_PASS_CERTIFICATE) {
    return NextResponse.json(
      { error: 'Apple Wallet not configured. Set APPLE_PASS_CERTIFICATE in environment.' },
      { status: 503 }
    )
  }

  try {
    const passBuffer = await generateApplePass({ customerPass: customerPass as any, loyaltyCard, business })

    return new NextResponse(passBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="${(business.name as string).replace(/[^a-z0-9]/gi, '-')}.pkpass"`,
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

  const supabase = await createServiceClient()
  await supabase
    .from('customer_passes')
    .update({ apple_push_token: pushToken } as any)
    .eq('id', passId)

  return NextResponse.json({ ok: true })
}
