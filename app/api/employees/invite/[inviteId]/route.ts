import { NextRequest, NextResponse } from 'next/server'
import { fetchMutation } from 'convex/nextjs'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ inviteId: string }> }
) {
  const { inviteId } = await context.params
  const token = await convexAuthNextjsToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await fetchMutation(api.employees.cancelInvitation, { invitationId: inviteId as Id<'employeeInvitations'> }, { token })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
