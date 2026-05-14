import { NextRequest, NextResponse } from 'next/server'
import { fetchMutation, fetchQuery } from 'convex/nextjs'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  const token = await convexAuthNextjsToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, role, locationId } = await request.json()

  try {
    const business = await fetchQuery(api.businesses.getMyBusiness, {}, { token })
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    const { token: inviteToken } = await fetchMutation(
      api.employees.inviteEmployee,
      { email, role: role || 'staff', locationId: locationId as Id<'locations'> | undefined },
      { token }
    )

    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/accept?token=${inviteToken}`
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

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
