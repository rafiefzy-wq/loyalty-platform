import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { redirect } from 'next/navigation'
import { TeamClient } from './team-client'

export default async function TeamPage() {
  const token = await convexAuthNextjsToken()
  if (!token) redirect('/login')

  const business = await fetchQuery(api.businesses.getMyBusiness, {}, { token })
  if (!business) redirect('/onboarding')

  const { employees, invitations } = await fetchQuery(api.employees.listMyTeam, {}, { token })
  const locations = await fetchQuery(api.locations.listMyLocations, {}, { token })

  const empsForClient = employees.map((e: any) => ({ id: e._id, email: e.email, name: e.name ?? null, role: e.role, is_active: e.isActive }))
  const invsForClient = invitations.map((i: any) => ({ id: i._id, email: i.email, role: i.role, token: i.token, expires_at: new Date(i.expiresAt).toISOString() }))
  const locsForClient = locations.map((l: any) => ({ id: l._id, name: l.name }))

  return <TeamClient employees={empsForClient as any} invitations={invsForClient as any} locations={locsForClient as any} businessId={business._id} />
}
