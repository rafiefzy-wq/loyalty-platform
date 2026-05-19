import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { redirect } from 'next/navigation'
import { CustomerListClient } from './customer-list-client'

export default async function CustomersPage() {
  const token = await convexAuthNextjsToken()
  if (!token) redirect('/login')

  const business = await fetchQuery(api.businesses.getMyBusiness, {}, { token })
  if (!business) redirect('/onboarding')

  const passes = await fetchQuery(api.passes.listPassesForBusiness, { businessId: business._id }, { token })
  const locations = await fetchQuery(api.locations.listMyLocations, {}, { token })

  const passesForClient = passes.map((p: any) => ({
    id: p._id,
    loyalty_card_id: p.loyaltyCardId,
    stamp_count: p.stampCount,
    customer_device: p.customerDevice ?? null,
    customer_name: p.customerName ?? null,
    last_visited_at: p.lastVisitedAt ? new Date(p.lastVisitedAt).toISOString() : null,
    apple_pass_serial: p.applePassSerial ?? null,
    google_pass_id: p.googlePassId ?? null,
    joined_at: new Date(p._creationTime).toISOString(),
    loyaltyCard: p.loyaltyCard ? { stamp_goal: p.loyaltyCard.stampGoal, reward_description: p.loyaltyCard.rewardDescription } : null,
  }))
  // Most recent first
  passesForClient.sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime())

  const locsForClient = locations.map((l: any) => ({ id: l._id, name: l.name }))
  const card = passes[0]?.loyaltyCard ? { id: passes[0].loyaltyCard._id, stamp_goal: passes[0].loyaltyCard.stampGoal, reward_description: passes[0].loyaltyCard.rewardDescription } : null

  return <CustomerListClient passes={passesForClient as any} loyaltyCard={card as any} locations={locsForClient as any} />
}
