import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendApplePushNotification } from '@/lib/passes/apple-wallet'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, message } = await request.json()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  const svc = await createServiceClient()

  // Get all loyalty cards for this business
  const { data: cards } = await svc
    .from('loyalty_cards')
    .select('id')
    .eq('business_id', business.id)

  if (!cards || cards.length === 0) return NextResponse.json({ count: 0 })

  // Get all customer passes with push tokens
  const { data: passes } = await svc
    .from('customer_passes')
    .select('id, apple_push_token')
    .in('loyalty_card_id', cards.map((c) => c.id))
    .not('apple_push_token', 'is', null)

  let count = 0
  await Promise.allSettled(
    (passes || []).map(async (pass) => {
      if (pass.apple_push_token) {
        await sendApplePushNotification(pass.apple_push_token)
        count++
      }
    })
  )

  return NextResponse.json({ count })
}
