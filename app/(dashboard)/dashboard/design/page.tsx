import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { redirect } from 'next/navigation'
import { CardDesignClient } from './card-design-client'

export default async function CardDesignPage() {
  const token = await convexAuthNextjsToken()
  if (!token) redirect('/login')

  const business = await fetchQuery(api.businesses.getMyBusiness, {}, { token })
  if (!business) redirect('/onboarding')

  // Find active loyalty card
  const passes = await fetchQuery(api.passes.listPassesForBusiness, { businessId: business._id }, { token })
  const card = (passes as any)?.[0]?.loyaltyCard ?? null

  const bizForClient = {
    id: business._id,
    name: business.name,
    slug: business.slug,
    type: business.type,
    logo_url: business.logoUrl ?? null,
    brand_color: business.brandColor,
    secondary_color: business.secondaryColor,
    background_image_url: business.backgroundImageUrl ?? null,
    font_choice: business.fontChoice,
    plan: business.plan,
    is_multi_location: business.isMultiLocation,
  }

  const cardForClient = card ? {
    id: card._id,
    business_id: card.businessId,
    stamp_goal: card.stampGoal,
    reward_description: card.rewardDescription,
    card_scope: card.cardScope,
    is_active: card.isActive,
    strip_image_url: card.stripImageUrl ?? null,
    icon_url: card.iconUrl ?? null,
    background_color: card.backgroundColor,
    foreground_color: card.foregroundColor,
    label_color: card.labelColor,
  } : null

  return <CardDesignClient business={bizForClient as any} loyaltyCard={cardForClient as any} />
}
