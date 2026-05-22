import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

// Lists every loyalty card (program) owned by the authenticated business.
// Each row includes a customer count for the program list page.
export const listMyPrograms = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []
    const business = await ctx.db.query('businesses').withIndex('by_owner', q => q.eq('ownerId', userId)).first()
    if (!business) return []
    const cards = await ctx.db.query('loyaltyCards').withIndex('by_business', q => q.eq('businessId', business._id)).collect()

    // Resolve customer counts in parallel
    const withCounts = await Promise.all(cards.map(async (card) => {
      const passes = await ctx.db.query('customerPasses').withIndex('by_loyalty_card', q => q.eq('loyaltyCardId', card._id)).collect()
      return {
        id: card._id,
        name: card.name ?? `${card.stampGoal} stamps → ${card.rewardDescription}`,
        stampGoal: card.stampGoal,
        rewardDescription: card.rewardDescription,
        backgroundColor: card.backgroundColor,
        foregroundColor: card.foregroundColor,
        isActive: card.isActive,
        customerCount: passes.length,
        createdAt: card._creationTime,
      }
    }))

    // Active first, then by creation time desc
    return withCounts.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
      return b.createdAt - a.createdAt
    })
  },
})

// Create a new loyalty program for the auth'd business.
// New programs are inactive by default — owner explicitly chooses to activate.
export const createProgram = mutation({
  args: {
    name: v.string(),
    stampGoal: v.number(),
    rewardDescription: v.string(),
    backgroundColor: v.optional(v.string()),
    foregroundColor: v.optional(v.string()),
    labelColor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')
    const business = await ctx.db.query('businesses').withIndex('by_owner', q => q.eq('ownerId', userId)).first()
    if (!business) throw new Error('Business not found')

    const name = args.name.trim()
    if (!name) throw new Error('Program name is required')
    if (args.stampGoal < 1 || args.stampGoal > 30) throw new Error('Stamp goal must be 1-30')
    const reward = args.rewardDescription.trim()
    if (!reward) throw new Error('Reward description is required')

    return await ctx.db.insert('loyaltyCards', {
      businessId: business._id,
      name,
      stampGoal: args.stampGoal,
      rewardDescription: reward,
      cardScope: business.isMultiLocation ? 'all_locations' : 'per_location',
      isActive: false,
      backgroundColor: args.backgroundColor ?? business.brandColor,
      foregroundColor: args.foregroundColor ?? '#ffffff',
      labelColor: args.labelColor ?? '#c7d2fe',
    })
  },
})

// Activate one program — deactivates all others in the same business.
// Existing single-active-card assumptions in the rest of the app continue to work.
export const setActiveProgram = mutation({
  args: { cardId: v.id('loyaltyCards') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')
    const target = await ctx.db.get(args.cardId)
    if (!target) throw new Error('Program not found')
    const business = await ctx.db.get(target.businessId)
    if (!business || (business as any).ownerId !== userId) throw new Error('Forbidden')

    const allCards = await ctx.db.query('loyaltyCards').withIndex('by_business', q => q.eq('businessId', business._id)).collect()
    for (const c of allCards) {
      const shouldBeActive = c._id === args.cardId
      if (c.isActive !== shouldBeActive) {
        await ctx.db.patch(c._id, { isActive: shouldBeActive })
      }
    }
  },
})

// Delete a program. Refuses to delete if it's the only program left,
// and cascades to delete all associated passes + transactions.
export const deleteProgram = mutation({
  args: { cardId: v.id('loyaltyCards') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')
    const target = await ctx.db.get(args.cardId)
    if (!target) throw new Error('Program not found')
    const business = await ctx.db.get(target.businessId)
    if (!business || (business as any).ownerId !== userId) throw new Error('Forbidden')

    const allCards = await ctx.db.query('loyaltyCards').withIndex('by_business', q => q.eq('businessId', business._id)).collect()
    if (allCards.length === 1) throw new Error('Cannot delete the only program. Create another first.')

    // Cascade delete passes + their transactions
    const passes = await ctx.db.query('customerPasses').withIndex('by_loyalty_card', q => q.eq('loyaltyCardId', args.cardId)).collect()
    for (const pass of passes) {
      const txs = await ctx.db.query('stampTransactions').withIndex('by_customer_pass', q => q.eq('customerPassId', pass._id)).collect()
      for (const t of txs) await ctx.db.delete(t._id)
      await ctx.db.delete(pass._id)
    }

    await ctx.db.delete(args.cardId)

    // If we deleted the active program, activate another one
    if (target.isActive) {
      const remaining = allCards.find(c => c._id !== args.cardId)
      if (remaining) await ctx.db.patch(remaining._id, { isActive: true })
    }
  },
})

// Rename a program.
export const renameProgram = mutation({
  args: { cardId: v.id('loyaltyCards'), name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')
    const target = await ctx.db.get(args.cardId)
    if (!target) throw new Error('Program not found')
    const business = await ctx.db.get(target.businessId)
    if (!business || (business as any).ownerId !== userId) throw new Error('Forbidden')

    const name = args.name.trim()
    if (!name) throw new Error('Name cannot be empty')
    await ctx.db.patch(args.cardId, { name })
  },
})
