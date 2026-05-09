import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, role, locationId } = await request.json()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  // Check for existing pending invite
  const { data: existing } = await supabase
    .from('employee_invitations')
    .select('id')
    .eq('business_id', business.id)
    .eq('email', email)
    .is('accepted_at', null)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'An invitation is already pending for this email' }, { status: 409 })
  }

  const { data: invitation, error } = await supabase
    .from('employee_invitations')
    .insert({
      business_id: business.id,
      location_id: locationId || null,
      email,
      role: role || 'staff',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send invitation email
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/accept?token=${invitation.token}`
      await resend.emails.send({
        from: 'StampPass <noreply@stamppass.io>',
        to: email,
        subject: `You're invited to join ${business.name} on StampPass`,
        html: `
          <h2>You've been invited!</h2>
          <p>${business.name} has invited you to join their loyalty team as a <strong>${role}</strong>.</p>
          <p><a href="${acceptUrl}" style="background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Accept Invitation</a></p>
          <p>This link expires in 7 days.</p>
        `,
      })
    } catch {}
  }

  return NextResponse.json({ invitation })
}
