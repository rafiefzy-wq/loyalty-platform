import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendApplePushNotification } from '@/lib/passes/apple-wallet'
import { updateGoogleWalletObject } from '@/lib/passes/google-wallet'

// POST /api/stamps/redeem — confirm reward redemption
// Body: { passId, locationId }
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { passId, locationId } = await request.json()

  // Must be manager or owner
  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!employee || !['owner', 'manager'].includes(employee.role)) {
    return NextResponse.json({ error: 'Only managers can redeem rewards' }, { status: 403 })
  }

  const { data: pass } = await supabase
    .from('customer_passes')
    .select('*, loyalty_cards(*)')
    .eq('id', passId)
    .single()

  if (!pass) return NextResponse.json({ error: 'Pass not found' }, { status: 404 })

  const loyaltyCard = (pass as any).loyalty_cards
  if (loyaltyCard.business_id !== employee.business_id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  if (pass.stamp_count < loyaltyCard.stamp_goal) {
    return NextResponse.json({ error: 'Reward not yet earned' }, { status: 400 })
  }

  const svc = await createServiceClient()

  // Reset stamp count
  await svc.from('customer_passes').update({ stamp_count: 0 }).eq('id', passId)

  // Log redemption
  await svc.from('stamp_transactions').insert({
    customer_pass_id: passId,
    location_id: locationId,
    employee_id: employee.id,
    type: 'reward_redeemed',
  })

  // Push wallet updates
  Promise.all([
    pass.apple_push_token
      ? sendApplePushNotification(pass.apple_push_token).catch(() => {})
      : Promise.resolve(),
    pass.google_pass_id
      ? updateGoogleWalletObject({ ...pass, stamp_count: 0 }, loyaltyCard).catch(() => {})
      : Promise.resolve(),
  ]).catch(() => {})

  return NextResponse.json({ success: true })
}
