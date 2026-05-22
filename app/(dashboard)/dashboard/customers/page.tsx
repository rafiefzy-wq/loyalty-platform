import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { redirect } from 'next/navigation'
import { CustomerListClient } from './customer-list-client'

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
  const token = await convexAuthNextjsToken()
  if (!token) redirect('/login')

  const business = await fetchQuery(api.businesses.getMyBusiness, {}, { token })
  if (!business) redirect('/onboarding')

  // Locations are stable enough to pre-fetch on the server.
  // Customer passes themselves are loaded via live useQuery for realtime updates.
  const locations = await fetchQuery(api.locations.listMyLocations, {}, { token })
  const locsForClient = locations.map((l: any) => ({ id: l._id, name: l.name }))

  return <CustomerListClient initialLocations={locsForClient} />
}
