import { mutation, query, action } from './_generated/server'
import { v } from 'convex/values'
import { api, internal } from './_generated/api'
import { getAuthUserId } from '@convex-dev/auth/server'

export const getPass = query({
  args: { passId: v.id('customerPasses') },
  handler: async (ctx, args) => {
    const pass = await ctx.db.get(args.passId)
    if (!pass) return null
    const card = await ctx.db.get(pass.loyaltyCardId)
    if (!card) return null
    const business = await ctx.db.get(card.businessId)
    return { pass, card, business }
  },
})

export const getCardById = query({
  args: { cardId: v.id('loyaltyCards') },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId)
    if (!card) return null
    const business = await ctx.db.get(card.businessId)
    return { card, business }
  },
})

// Owner-only view of a single pass with its transaction history
export const getPassDetail = query({
  args: { passId: v.id('customerPasses') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const pass = await ctx.db.get(args.passId)
    if (!pass) return null

    const card = await ctx.db.get(pass.loyaltyCardId)
    if (!card) return null

    // Authorization: only the business owner can see customer detail
    const business = await ctx.db.get(card.businessId)
    if (!business || (business as any).ownerId !== userId) return null

    const transactions = await ctx.db
      .query('stampTransactions')
      .withIndex('by_customer_pass', q => q.eq('customerPassId', pass._id))
      .order('desc')
      .collect()

    // Resolve unique location names
    const uniqueLocIds = Array.from(new Set(transactions.map(t => t.locationId)))
    const locDocs = await Promise.all(uniqueLocIds.map(id => ctx.db.get(id)))
    const locMap = new Map<string, string>()
    locDocs.forEach((l) => { if (l) locMap.set(l._id, (l as any).name) })

    return {
      pass: {
        id: pass._id,
        customerName: pass.customerName ?? null,
        customerEmail: pass.customerEmail ?? null,
        customerPhone: pass.customerPhone ?? null,
        avatarUrl: pass.avatarUrl ?? null,
        stampCount: pass.stampCount,
        device: pass.customerDevice ?? null,
        joinedAt: pass._creationTime,
        lastVisitedAt: pass.lastVisitedAt ?? null,
        applePassSerial: pass.applePassSerial ?? null,
        googlePassId: pass.googlePassId ?? null,
      },
      card: {
        stampGoal: card.stampGoal,
        rewardDescription: card.rewardDescription,
      },
      transactions: transactions.map(t => ({
        id: t._id,
        type: t.type,
        createdAt: t._creationTime,
        locationName: locMap.get(t.locationId as unknown as string) ?? 'Unknown',
      })),
    }
  },
})

export const createPass = mutation({
  args: { cardId: v.id('loyaltyCards') },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId)
    if (!card || !card.isActive) throw new Error('Card not found')

    const passId = await ctx.db.insert('customerPasses', {
      loyaltyCardId: args.cardId,
      stampCount: 0,
      applePassSerial: crypto.randomUUID(),
    })

    return passId
  },
})

export const createNamedPass = mutation({
  args: {
    customerName: v.string(),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const business = await ctx.db.query('businesses').withIndex('by_owner', q => q.eq('ownerId', userId)).first()
    if (!business) throw new Error('Business not found')

    const card = await ctx.db.query('loyaltyCards').withIndex('by_business', q => q.eq('businessId', business._id)).filter(q => q.eq(q.field('isActive'), true)).first()
    if (!card) throw new Error('No active loyalty card — complete onboarding first')

    const name = args.customerName.trim()
    if (!name) throw new Error('Customer name is required')

    const passId = await ctx.db.insert('customerPasses', {
      loyaltyCardId: card._id,
      stampCount: 0,
      applePassSerial: crypto.randomUUID(),
      customerName: name,
      customerEmail: args.customerEmail?.trim() || undefined,
      customerPhone: args.customerPhone?.trim() || undefined,
    })

    return { passId, cardId: card._id }
  },
})

// Verify the auth'd user owns the business this pass belongs to.
async function assertOwnsPass(ctx: any, passId: string) {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new Error('Unauthorized')
  const pass = await ctx.db.get(passId)
  if (!pass) throw new Error('Pass not found')
  const card = await ctx.db.get(pass.loyaltyCardId)
  if (!card) throw new Error('Card not found')
  const business = await ctx.db.get(card.businessId)
  if (!business || business.ownerId !== userId) throw new Error('Forbidden')
  return { pass, card, business, userId }
}

export const updateCustomer = mutation({
  args: {
    passId: v.id('customerPasses'),
    customerName: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertOwnsPass(ctx, args.passId)
    const patch: Record<string, any> = {}
    if (args.customerName !== undefined) {
      const n = args.customerName.trim()
      patch.customerName = n || undefined
    }
    if (args.customerEmail !== undefined) {
      const e = args.customerEmail.trim()
      patch.customerEmail = e || undefined
    }
    if (args.customerPhone !== undefined) {
      const p = args.customerPhone.trim()
      patch.customerPhone = p || undefined
    }
    if (args.avatarUrl !== undefined) {
      patch.avatarUrl = args.avatarUrl.trim() || undefined
    }
    await ctx.db.patch(args.passId, patch)
  },
})

export const deleteCustomer = mutation({
  args: { passId: v.id('customerPasses') },
  handler: async (ctx, args) => {
    await assertOwnsPass(ctx, args.passId)
    // Delete all associated transactions first
    const transactions = await ctx.db
      .query('stampTransactions')
      .withIndex('by_customer_pass', q => q.eq('customerPassId', args.passId))
      .collect()
    for (const t of transactions) {
      await ctx.db.delete(t._id)
    }
    await ctx.db.delete(args.passId)
  },
})

// Realtime version of listPassesForBusiness for the auth'd owner.
// Used in client components with useQuery for live updates.
export const listMyCustomers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    const business = await ctx.db.query('businesses').withIndex('by_owner', q => q.eq('ownerId', userId)).first()
    if (!business) return null
    const card = await ctx.db.query('loyaltyCards').withIndex('by_business', q => q.eq('businessId', business._id)).filter(q => q.eq(q.field('isActive'), true)).first()
    if (!card) return { passes: [], stampGoal: 0, rewardDescription: '' }
    const passes = await ctx.db
      .query('customerPasses')
      .withIndex('by_loyalty_card', q => q.eq('loyaltyCardId', card._id))
      .order('desc')
      .collect()
    return {
      passes: passes.map(p => ({
        id: p._id,
        stampCount: p.stampCount,
        customerName: p.customerName ?? null,
        customerEmail: p.customerEmail ?? null,
        customerPhone: p.customerPhone ?? null,
        avatarUrl: p.avatarUrl ?? null,
        device: p.customerDevice ?? null,
        joinedAt: p._creationTime,
        lastVisitedAt: p.lastVisitedAt ?? null,
        locationId: p.locationId ?? null,
      })),
      stampGoal: card.stampGoal,
      rewardDescription: card.rewardDescription,
    }
  },
})

export const updateGooglePassId = mutation({
  args: { passId: v.id('customerPasses'), googlePassId: v.string(), passUrl: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.passId, { googlePassId: args.googlePassId, passUrl: args.passUrl })
  },
})

export const updateApplePushToken = mutation({
  args: { passSerial: v.string(), pushToken: v.string() },
  handler: async (ctx, args) => {
    const pass = await ctx.db.query('customerPasses').withIndex('by_apple_serial', q => q.eq('applePassSerial', args.passSerial)).first()
    if (!pass) throw new Error('Pass not found')
    await ctx.db.patch(pass._id, { applePushToken: args.pushToken })
  },
})

export const getActiveCardForBusiness = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    const business = await ctx.db.query('businesses').withIndex('by_owner', q => q.eq('ownerId', userId)).first()
    if (!business) return null
    return await ctx.db.query('loyaltyCards').withIndex('by_business', q => q.eq('businessId', business._id)).filter(q => q.eq(q.field('isActive'), true)).first()
  },
})

export const getRecentPasses = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []
    const business = await ctx.db.query('businesses').withIndex('by_owner', q => q.eq('ownerId', userId)).first()
    if (!business) return []
    const card = await ctx.db.query('loyaltyCards').withIndex('by_business', q => q.eq('businessId', business._id)).filter(q => q.eq(q.field('isActive'), true)).first()
    if (!card) return []
    const passes = await ctx.db.query('customerPasses').withIndex('by_loyalty_card', q => q.eq('loyaltyCardId', card._id)).order('desc').take(args.limit ?? 8)
    return passes.map(p => ({
      id: p._id,
      stampCount: p.stampCount,
      stampGoal: card.stampGoal,
      device: p.customerDevice ?? 'unknown',
      customerName: p.customerName ?? null,
      lastVisitedAt: p.lastVisitedAt ?? p._creationTime,
      joinedAt: p._creationTime,
    }))
  },
})

export const listMyPasses = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []
    const business = await ctx.db.query('businesses').withIndex('by_owner', q => q.eq('ownerId', userId)).first()
    if (!business) return []
    const cards = await ctx.db.query('loyaltyCards').withIndex('by_business', q => q.eq('businessId', business._id)).collect()
    const passes: any[] = []
    for (const card of cards) {
      const cardPasses = await ctx.db.query('customerPasses').withIndex('by_loyalty_card', q => q.eq('loyaltyCardId', card._id)).collect()
      passes.push(...cardPasses.map(p => ({ ...p, loyaltyCard: card })))
    }
    return passes
  },
})

export const listPassesForBusiness = query({
  args: { businessId: v.id('businesses') },
  handler: async (ctx, args) => {
    const cards = await ctx.db.query('loyaltyCards').withIndex('by_business', q => q.eq('businessId', args.businessId)).collect()
    const passes: any[] = []
    for (const card of cards) {
      const cardPasses = await ctx.db.query('customerPasses').withIndex('by_loyalty_card', q => q.eq('loyaltyCardId', card._id)).collect()
      passes.push(...cardPasses.map(p => ({ ...p, loyaltyCard: card })))
    }
    return passes
  },
})

export const addStamp = mutation({
  args: {
    passId: v.id('customerPasses'),
    locationId: v.id('locations'),
    employeeId: v.optional(v.id('employees')),
  },
  handler: async (ctx, args) => {
    const pass = await ctx.db.get(args.passId)
    if (!pass) throw new Error('Pass not found')
    const newCount = pass.stampCount + 1
    await ctx.db.patch(args.passId, { stampCount: newCount, lastVisitedAt: Date.now() })
    await ctx.db.insert('stampTransactions', {
      customerPassId: args.passId,
      locationId: args.locationId,
      employeeId: args.employeeId,
      type: 'stamp',
    })
    return { stampCount: newCount }
  },
})

export const redeemReward = mutation({
  args: {
    passId: v.id('customerPasses'),
    locationId: v.id('locations'),
    employeeId: v.optional(v.id('employees')),
  },
  handler: async (ctx, args) => {
    const pass = await ctx.db.get(args.passId)
    if (!pass) throw new Error('Pass not found')
    await ctx.db.patch(args.passId, { stampCount: 0 })
    await ctx.db.insert('stampTransactions', {
      customerPassId: args.passId,
      locationId: args.locationId,
      employeeId: args.employeeId,
      type: 'reward_redeemed',
    })

    // Best-effort email notification to the business owner.
    // Scheduled as a separate action so the mutation succeeds even if email fails.
    try {
      const card = await ctx.db.get(pass.loyaltyCardId)
      if (!card) return
      const business = await ctx.db.get(card.businessId)
      if (!business) return
      const owner = await ctx.db.get(business.ownerId as any)
      const ownerEmail = (owner as any)?.email
      if (!ownerEmail) return
      const location = await ctx.db.get(args.locationId)

      await ctx.scheduler.runAfter(0, internal.notifications.sendRedemptionEmail, {
        ownerEmail,
        businessName: business.name,
        customerName: pass.customerName ?? undefined,
        rewardDescription: card.rewardDescription,
        locationName: (location as any)?.name ?? undefined,
      })
    } catch (err) {
      console.error('[redeemReward] failed to schedule notification', err)
    }
  },
})
