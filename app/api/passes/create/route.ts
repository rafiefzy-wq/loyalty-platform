import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createGoogleWalletClass, createGoogleWalletObject, buildGoogleWalletJwt } from '@/lib/passes/google-wallet'

// POST /api/passes/create?card=<loyalty_card_id>
// Creates a new CustomerPass and returns Apple/Google wallet URLs
export async function POST(request: NextRequest) {
  const cardId = request.nextUrl.searchParams.get('card')
  if (!cardId) return NextResponse.json({ error: 'Missing card id' }, { status: 400 })

  const supabase = await createServiceClient()

  // Fetch loyalty card + business
  const { data: card, error: cardErr } = await supabase
    .from('loyalty_cards')
    .select('*, businesses(*)')
    .eq('id', cardId)
    .eq('is_active', true)
    .single()

  if (cardErr || !card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 })
  }

  const business = (card as any).businesses

  // Create the customer pass record
  const passId = crypto.randomUUID()
  const appleSerial = passId

  const passUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pass/${passId}`

  const { data: customerPass, error: passErr } = await supabase
    .from('customer_passes')
    .insert({
      id: passId,
      loyalty_card_id: cardId,
      apple_pass_serial: appleSerial,
      stamp_count: 0,
      pass_url: passUrl,
    })
    .select()
    .single()

  if (passErr || !customerPass) {
    return NextResponse.json({ error: 'Failed to create pass' }, { status: 500 })
  }

  // Try to create Google Wallet class + object
  let googleWalletUrl: string | null = null
  try {
    await createGoogleWalletClass(business, card)
    const objectId = await createGoogleWalletObject({ customerPass, loyaltyCard: card, business })
    const jwtToken = buildGoogleWalletJwt(objectId)
    googleWalletUrl = `https://pay.google.com/gp/v/save/${jwtToken}`

    await supabase
      .from('customer_passes')
      .update({ google_pass_id: objectId })
      .eq('id', passId)
  } catch {
    // Google Wallet not configured — skip silently
  }

  return NextResponse.json({
    passId,
    passUrl,
    applePassUrl: `/api/passes/apple/${passId}`,
    googleWalletUrl,
  })
}
