import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendApplePushNotification } from '@/lib/passes/apple-wallet'
import { updateGoogleWalletObject } from '@/lib/passes/google-wallet'

// POST /api/stamps — add a stamp to a customer pass
// Body: { passId, locationId }
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Auth check — must be an authenticated employee
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { passId, locationId } = body

  if (!passId || !locationId) {
    return NextResponse.json({ error: 'Missing passId or locationId' }, { status: 400 })
  }

  // Find employee record for this user at this location's business
  const { data: employee } = await supabase
    .from('employees')
    .select('*, businesses(id)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!employee) {
    return NextResponse.json({ error: 'Employee record not found' }, { status: 403 })
  }

  // Verify the location belongs to this employee's business
  const { data: location } = await supabase
    .from('locations')
    .select('*')
    .eq('id', locationId)
    .eq('business_id', employee.business_id)
    .single()

  if (!location) {
    return NextResponse.json({ error: 'Location not found or access denied' }, { status: 403 })
  }

  // Fetch the customer pass
  const { data: pass } = await supabase
    .from('customer_passes')
    .select('*, loyalty_cards(*)')
    .eq('id', passId)
    .single()

  if (!pass) {
    return NextResponse.json({ error: 'Pass not found' }, { status: 404 })
  }

  const loyaltyCard = (pass as any).loyalty_cards

  // Verify the card belongs to this employee's business
  if (loyaltyCard.business_id !== employee.business_id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Use service client for the actual updates (bypasses RLS for atomic operations)
  const svc = await createServiceClient()

  const newStampCount = pass.stamp_count + 1
  const isRewardReady = newStampCount >= loyaltyCard.stamp_goal

  // Update pass stamp count
  await svc
    .from('customer_passes')
    .update({ stamp_count: newStampCount, last_visited_at: new Date().toISOString() })
    .eq('id', passId)

  // Log transaction
  await svc.from('stamp_transactions').insert({
    customer_pass_id: passId,
    location_id: locationId,
    employee_id: employee.id,
    type: 'stamp',
    note: isRewardReady ? 'Reward threshold reached' : null,
  })

  // Push wallet updates (fire and forget)
  Promise.all([
    // Apple push
    pass.apple_push_token
      ? sendApplePushNotification(pass.apple_push_token).catch(() => {})
      : Promise.resolve(),
    // Google Wallet update
    pass.google_pass_id
      ? updateGoogleWalletObject(
          { ...pass, stamp_count: newStampCount },
          loyaltyCard
        ).catch(() => {})
      : Promise.resolve(),
  ]).catch(() => {})

  return NextResponse.json({
    success: true,
    stampCount: newStampCount,
    stampGoal: loyaltyCard.stamp_goal,
    isRewardReady,
  })
}
