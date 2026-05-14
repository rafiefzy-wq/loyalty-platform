import { NextRequest, NextResponse } from 'next/server'
import { fetchMutation } from 'convex/nextjs'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { api } from '@/convex/_generated/api'

export async function PUT(request: NextRequest) {
  const token = await convexAuthNextjsToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, type, isMultiLocation } = await request.json()

  try {
    await fetchMutation(api.businesses.updateSettings, { name, type, isMultiLocation }, { token })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
