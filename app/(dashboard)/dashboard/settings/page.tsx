import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { redirect } from 'next/navigation'
import { SettingsClient } from './settings-client'

export default async function SettingsPage() {
  const token = await convexAuthNextjsToken()
  if (!token) redirect('/login')

  const business = await fetchQuery(api.businesses.getMyBusiness, {}, { token })
  if (!business) redirect('/onboarding')

  const locations = await fetchQuery(api.locations.listMyLocations, {}, { token })

  const bizForClient = {
    id: business._id,
    name: business.name,
    slug: business.slug,
    type: business.type,
    logo_url: business.logoUrl ?? null,
    brand_color: business.brandColor,
    secondary_color: business.secondaryColor,
    font_choice: business.fontChoice,
    plan: business.plan,
    is_multi_location: business.isMultiLocation,
  }

  const locsForClient = locations.map((l: any) => ({
    id: l._id,
    business_id: l.businessId,
    name: l.name,
    address: l.address ?? null,
    city: l.city ?? null,
    country: l.country ?? null,
    is_active: l.isActive,
  }))

  return <SettingsClient business={bizForClient as any} locations={locsForClient as any} />
}
