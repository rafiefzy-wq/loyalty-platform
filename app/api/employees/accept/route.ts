import { NextRequest, NextResponse } from 'next/server'
import { fetchMutation, fetchQuery } from 'convex/nextjs'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { api } from '@/convex/_generated/api'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const invitation = await fetchQuery(api.employees.getInvitationByToken, { token })
  if (!invitation) return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 })

  return NextResponse.json({
    invitation: {
      role: invitation.role,
      business_name: invitation.businessName,
    },
  })
}

export async function POST(request: NextRequest) {
  const authToken = await convexAuthNextjsToken()
  if (!authToken) return NextResponse.json({ error: 'Must be logged in' }, { status: 401 })

  const { token } = await request.json()

  try {
    await fetchMutation(api.employees.acceptInvitation, { token }, { token: authToken })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
