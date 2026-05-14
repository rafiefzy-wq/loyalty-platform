import { NextRequest, NextResponse } from 'next/server'
import { fetchMutation } from 'convex/nextjs'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { api } from '@/convex/_generated/api'

export async function POST(request: NextRequest) {
  const token = await convexAuthNextjsToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, address, city, country } = await request.json()

  try {
    const locationId = await fetchMutation(api.locations.addLocation, { name, address, city, country }, { token })
    return NextResponse.json({ location: { id: locationId, name, address, city, country, is_active: true } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
