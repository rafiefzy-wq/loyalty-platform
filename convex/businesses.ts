import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export const getMyBusiness = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    return await ctx.db.query('businesses').withIndex('by_owner', q => q.eq('ownerId', userId)).first()
  },
})

export const completeOnboarding = mutation({
  args: {
    businessName: v.string(),
    businessType: v.string(),
    isMultiLocation: v.boolean(),
    locations: v.array(v.object({
      name: v.string(),
      address: v.optional(v.string()),
      city: v.optional(v.string()),
      country: v.optional(v.string()),
    })),
    logoUrl: v.optional(v.string()),
    stripImageUrl: v.optional(v.string()),
    brandColor: v.string(),
    secondaryColor: v.string(),
    foregroundColor: v.string(),
    labelColor: v.string(),
    fontChoice: v.string(),
    stampGoal: v.number(),
    rewardDescription: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const slug = slugify(args.businessName) || `business-${Date.now()}`

    const businessId = await ctx.db.insert('businesses', {
      ownerId: userId,
      name: args.businessName,
      slug,
      type: args.businessType,
      logoUrl: args.logoUrl,
      brandColor: args.brandColor,
      secondaryColor: args.secondaryColor,
      backgroundImageUrl: args.stripImageUrl,
      fontChoice: args.fontChoice,
      isMultiLocation: args.isMultiLocation,
      plan: 'free_trial',
    })

    for (const loc of args.locations.filter(l => l.name)) {
      await ctx.db.insert('locations', {
        businessId,
        name: loc.name,
        address: loc.address,
        city: loc.city,
        country: loc.country,
        isActive: true,
      })
    }

    const cardId = await ctx.db.insert('loyaltyCards', {
      businessId,
      stampGoal: args.stampGoal,
      rewardDescription: args.rewardDescription,
      cardScope: args.isMultiLocation ? 'all_locations' : 'per_location',
      isActive: true,
      stripImageUrl: args.stripImageUrl,
      iconUrl: args.logoUrl,
      backgroundColor: args.brandColor,
      foregroundColor: args.foregroundColor,
      labelColor: args.labelColor,
    })

    const user = await ctx.db.get(userId as any)
    await ctx.db.insert('employees', {
      businessId,
      userId,
      email: (user as any)?.email ?? '',
      name: (user as any)?.name ?? undefined,
      role: 'owner',
      isActive: true,
    })

    return { cardId }
  },
})

export const updateDesign = mutation({
  args: {
    businessName: v.string(),
    brandColor: v.string(),
    foregroundColor: v.string(),
    labelColor: v.string(),
    fontChoice: v.string(),
    stampGoal: v.number(),
    rewardDescription: v.string(),
    logoUrl: v.optional(v.string()),
    stripImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const business = await ctx.db.query('businesses').withIndex('by_owner', q => q.eq('ownerId', userId)).first()
    if (!business) throw new Error('Business not found')

    await ctx.db.patch(business._id, {
      name: args.businessName,
      brandColor: args.brandColor,
      fontChoice: args.fontChoice,
      logoUrl: args.logoUrl,
    })

    const card = await ctx.db.query('loyaltyCards').withIndex('by_business', q => q.eq('businessId', business._id)).filter(q => q.eq(q.field('isActive'), true)).first()
    if (card) {
      await ctx.db.patch(card._id, {
        backgroundColor: args.brandColor,
        foregroundColor: args.foregroundColor,
        labelColor: args.labelColor,
        stampGoal: args.stampGoal,
        rewardDescription: args.rewardDescription,
        stripImageUrl: args.stripImageUrl,
        iconUrl: args.logoUrl,
      })
    }
  },
})

export const updateSettings = mutation({
  args: {
    name: v.optional(v.string()),
    type: v.optional(v.string()),
    isMultiLocation: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const business = await ctx.db.query('businesses').withIndex('by_owner', q => q.eq('ownerId', userId)).first()
    if (!business) throw new Error('Business not found')

    const patch: Record<string, unknown> = {}
    if (args.name !== undefined) patch.name = args.name
    if (args.type !== undefined) patch.type = args.type
    if (args.isMultiLocation !== undefined) patch.isMultiLocation = args.isMultiLocation
    await ctx.db.patch(business._id, patch as any)
  },
})

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const business = await ctx.db.query('businesses').withIndex('by_owner', q => q.eq('ownerId', userId)).first()
    if (!business) return null

    const card = await ctx.db.query('loyaltyCards').withIndex('by_business', q => q.eq('businessId', business._id)).filter(q => q.eq(q.field('isActive'), true)).first()
    if (!card) return { customers: 0, visits: 0, rewards: 0, passes: 0, apple: 0, google: 0, chartData: [] }

    const passes = await ctx.db.query('customerPasses').withIndex('by_loyalty_card', q => q.eq('loyaltyCardId', card._id)).collect()
    const appleCount = passes.filter(p => p.customerDevice === 'apple').length
    const googleCount = passes.filter(p => p.customerDevice === 'google').length
    const unknownCount = passes.filter(p => !p.customerDevice).length

    const myPassIds = new Set(passes.map(p => p._id))
    const allTransactions = await ctx.db.query('stampTransactions').collect()
    const myTransactions = allTransactions.filter(t => myPassIds.has(t.customerPassId))
    const rewards = myTransactions.filter(t => t.type === 'reward_redeemed').length

    // Build 30-day daily chart data using _creationTime
    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
    const dailyMap = new Map<string, { stamps: number; redemptions: number }>()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000)
      dailyMap.set(d.toISOString().slice(0, 10), { stamps: 0, redemptions: 0 })
    }
    for (const t of myTransactions) {
      if (t._creationTime < thirtyDaysAgo) continue
      const day = new Date(t._creationTime).toISOString().slice(0, 10)
      const entry = dailyMap.get(day)
      if (entry) {
        if (t.type === 'stamp') entry.stamps++
        else if (t.type === 'reward_redeemed') entry.redemptions++
      }
    }
    const chartData = Array.from(dailyMap.entries()).map(([date, v]) => ({ date, stamps: v.stamps, redemptions: v.redemptions }))

    return {
      customers: passes.length,
      visits: myTransactions.filter(t => t.type === 'stamp').length,
      rewards,
      passes: passes.length,
      apple: appleCount,
      google: googleCount,
      unknown: unknownCount,
      chartData,
    }
  },
})
