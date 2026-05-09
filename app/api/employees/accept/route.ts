import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const svc = await createServiceClient()
  const { data: invitation } = await svc
    .from('employee_invitations')
    .select('*, businesses(name)')
    .eq('token', token)
    .is('accepted_at', null)
    .gte('expires_at', new Date().toISOString())
    .single()

  if (!invitation) return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 })

  const inv = invitation as any
  return NextResponse.json({
    invitation: {
      ...inv,
      business_name: inv.businesses?.name,
    },
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Must be logged in' }, { status: 401 })

  const { token } = await request.json()
  const svc = await createServiceClient()

  const { data: invitation } = await svc
    .from('employee_invitations')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .gte('expires_at', new Date().toISOString())
    .single()

  if (!invitation) return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 })

  // Create employee record
  const { error: empErr } = await svc.from('employees').insert({
    business_id: invitation.business_id,
    location_id: invitation.location_id,
    user_id: user.id,
    email: user.email!,
    name: user.user_metadata?.name || null,
    role: invitation.role,
  })

  if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 })

  // Mark invitation as accepted
  await svc
    .from('employee_invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  return NextResponse.json({ ok: true })
}
