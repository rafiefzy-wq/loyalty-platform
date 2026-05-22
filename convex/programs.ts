import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

type ProgramStatus = 'active' | 'draft' | 'archived'

// Derive a status from the legacy isActive boolean if no explicit status set.
function deriveStatus(card: { isActive: boolean; status?: string }): ProgramStatus {
  if (card.status === 'active' || card.status === 'draft' || card.status === 'archived') {
    return card.status
  }
  return card.isActive ? 'active' : 'draft'
}

// Verify the caller owns the business this card belongs to.
async function assertOwnsCard(ctx: any, cardId: string) {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new Error('Unauthorized')
  const card = await ctx.db.get(cardId)
  if (!card) throw new Error('Program not found')
  const business = await ctx.db.get(card.businessId)
  if (!business || business.ownerId !== userId) throw new Error('Forbidden')
  return { card, business, userId }
}

// Lists every loyalty program for the authenticated owner, with rich stats:
// status, customer count, total stamps redeemed, % progress across all customers,
// recent activity (7/30 days), and average stamps per customer.
export const listMyPrograms = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []
    const business = await ctx.db.query('businesses').withIndex('by_owner', q => q.eq('ownerId', userId)).first()
    if (!business) return []
    const cards = await ctx.db.query('loyaltyCards').withIndex('by_business', q => q.eq('businessId', business._id)).collect()

    const now = Date.now()
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

    const withStats = await Promise.all(cards.map(async (card) => {
      const passes = await ctx.db.query('customerPasses').withIndex('by_loyalty_card', q => q.eq('loyaltyCardId', card._id)).collect()
      const passIds = new Set(passes.map(p => p._id))

      // Pull transactions belonging to this card's passes
      let totalStamps = 0
      let totalRedemptions = 0
      let recent7Redemptions = 0
      let recent30Redemptions = 0
      for (const pass of passes) {
        const txs = await ctx.db
          .query('stampTransactions')
          .withIndex('by_customer_pass', q => q.eq('customerPassId', pass._id))
          .collect()
        for (const t of txs) {
          if (t.type === 'stamp') totalStamps++
          else if (t.type === 'reward_redeemed') {
            totalRedemptions++
            if (t._creationTime >= sevenDaysAgo) recent7Redemptions++
            if (t._creationTime >= thirtyDaysAgo) recent30Redemptions++
          }
        }
      }

      const totalStampsToReachGoal = passes.length * card.stampGoal
      const progressPct = totalStampsToReachGoal > 0
        ? Math.min(Math.round((totalStamps / totalStampsToReachGoal) * 100), 100)
        : 0

      return {
        id: card._id,
        name: card.name ?? `${card.stampGoal} stamps → ${card.rewardDescription}`,
        stampGoal: card.stampGoal,
        rewardDescription: card.rewardDescription,
        backgroundColor: card.backgroundColor,
        foregroundColor: card.foregroundColor,
        labelColor: card.labelColor,
        iconUrl: card.iconUrl ?? null,
        stripImageUrl: card.stripImageUrl ?? null,
        status: deriveStatus(card),
        isActive: card.isActive,
        customerCount: passes.length,
        totalStamps,
        totalRedemptions,
        recent7Redemptions,
        recent30Redemptions,
        progressPct,
        createdAt: card._creationTime,
      }
    }))

    // Order: active first, then draft, then archived; within group newest first
    const order: Record<ProgramStatus, number> = { active: 0, draft: 1, archived: 2 }
    return withStats.sort((a, b) => {
      const s = order[a.status] - order[b.status]
      return s !== 0 ? s : b.createdAt - a.createdAt
    })
  },
})

// Detail for the drawer: same stats + recent transactions list + top customers
export const getProgramDetail = query({
  args: { cardId: v.id('loyaltyCards') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    const card = await ctx.db.get(args.cardId)
    if (!card) return null
    const business = await ctx.db.get(card.businessId)
    if (!business || (business as any).ownerId !== userId) return null

    const passes = await ctx.db.query('customerPasses').withIndex('by_loyalty_card', q => q.eq('loyaltyCardId', card._id)).collect()

    // Gather all transactions
    const allTxs: Array<any> = []
    for (const pass of passes) {
      const txs = await ctx.db
        .query('stampTransactions')
        .withIndex('by_customer_pass', q => q.eq('customerPassId', pass._id))
        .collect()
      txs.forEach(t => allTxs.push({ ...t, customerName: pass.customerName ?? null, passId: pass._id }))
    }
    allTxs.sort((a, b) => b._creationTime - a._creationTime)

    // Resolve location names
    const locIds = Array.from(new Set(allTxs.map(t => t.locationId)))
    const locDocs = await Promise.all(locIds.map(id => ctx.db.get(id)))
    const locMap = new Map<string, string>()
    locDocs.forEach(l => { if (l) locMap.set(l._id, (l as any).name) })

    const now = Date.now()
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
    const totalStamps = allTxs.filter(t => t.type === 'stamp').length
    const totalRedemptions = allTxs.filter(t => t.type === 'reward_redeemed').length
    const recent7Redemptions = allTxs.filter(t => t.type === 'reward_redeemed' && t._creationTime >= sevenDaysAgo).length

    // Top customers by stamp count (top 5)
    const topCustomers = passes
      .map(p => ({
        id: p._id,
        name: p.customerName ?? 'Anonymous',
        stampCount: p.stampCount,
        stampGoal: card.stampGoal,
        isReady: p.stampCount >= card.stampGoal,
      }))
      .sort((a, b) => b.stampCount - a.stampCount)
      .slice(0, 5)

    return {
      card: {
        id: card._id,
        name: card.name ?? `${card.stampGoal} stamps → ${card.rewardDescription}`,
        status: deriveStatus(card),
        stampGoal: card.stampGoal,
        rewardDescription: card.rewardDescription,
        backgroundColor: card.backgroundColor,
        foregroundColor: card.foregroundColor,
        labelColor: card.labelColor,
        createdAt: card._creationTime,
      },
      stats: {
        customerCount: passes.length,
        totalStamps,
        totalRedemptions,
        recent7Redemptions,
      },
      topCustomers,
      recentActivity: allTxs.slice(0, 12).map(t => ({
        id: t._id,
        type: t.type,
        customerName: t.customerName,
        passId: t.passId,
        locationName: locMap.get(t.locationId) ?? 'Unknown',
        createdAt: t._creationTime,
      })),
    }
  },
})

export const createProgram = mutation({
  args: {
    name: v.string(),
    stampGoal: v.number(),
    rewardDescription: v.string(),
    backgroundColor: v.optional(v.string()),
    foregroundColor: v.optional(v.string()),
    labelColor: v.optional(v.string()),
    status: v.optional(v.union(v.literal('active'), v.literal('draft'), v.literal('archived'))),
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

    const status = args.status ?? 'draft'

    return await ctx.db.insert('loyaltyCards', {
      businessId: business._id,
      name,
      stampGoal: args.stampGoal,
      rewardDescription: reward,
      cardScope: business.isMultiLocation ? 'all_locations' : 'per_location',
      isActive: status === 'active',
      status,
      backgroundColor: args.backgroundColor ?? business.brandColor,
      foregroundColor: args.foregroundColor ?? '#ffffff',
      labelColor: args.labelColor ?? '#c7d2fe',
    })
  },
})

// Set status on a single program. If activating, deactivates other active programs
// so existing "active card" assumptions hold (single active card per business).
export const setProgramStatus = mutation({
  args: {
    cardId: v.id('loyaltyCards'),
    status: v.union(v.literal('active'), v.literal('draft'), v.literal('archived')),
  },
  handler: async (ctx, args) => {
    const { business } = await assertOwnsCard(ctx, args.cardId)

    if (args.status === 'active') {
      // Deactivate any existing active card
      const others = await ctx.db.query('loyaltyCards').withIndex('by_business', q => q.eq('businessId', business._id)).collect()
      for (const c of others) {
        if (c._id !== args.cardId && c.isActive) {
          await ctx.db.patch(c._id, { isActive: false, status: 'draft' as ProgramStatus })
        }
      }
    }
    await ctx.db.patch(args.cardId, { status: args.status, isActive: args.status === 'active' })
  },
})

// Apply status to multiple cards at once. Used by bulk actions toolbar.
export const bulkSetStatus = mutation({
  args: {
    cardIds: v.array(v.id('loyaltyCards')),
    status: v.union(v.literal('active'), v.literal('draft'), v.literal('archived')),
  },
  handler: async (ctx, args) => {
    if (args.cardIds.length === 0) return
    // Validate ownership of every card in one pass
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    let firstBusinessId: any = null
    for (const cardId of args.cardIds) {
      const card = await ctx.db.get(cardId)
      if (!card) throw new Error('Program not found')
      const business = await ctx.db.get(card.businessId)
      if (!business || (business as any).ownerId !== userId) throw new Error('Forbidden')
      if (!firstBusinessId) firstBusinessId = card.businessId
      if (card.businessId !== firstBusinessId) throw new Error('Cards must belong to the same business')
    }

    // If we're activating multiple, only the FIRST id becomes active; the rest become drafts.
    // Then deactivate everything else in the business.
    if (args.status === 'active') {
      const all = await ctx.db.query('loyaltyCards').withIndex('by_business', q => q.eq('businessId', firstBusinessId)).collect()
      const newActiveId = args.cardIds[0]
      for (const c of all) {
        const shouldBeActive = c._id === newActiveId
        await ctx.db.patch(c._id, {
          isActive: shouldBeActive,
          status: shouldBeActive ? 'active' : 'draft' as ProgramStatus,
        })
      }
    } else {
      for (const cardId of args.cardIds) {
        await ctx.db.patch(cardId, { status: args.status, isActive: false })
      }
    }
  },
})

// Clone an existing program (with new name, default to "draft" status, no customers).
export const duplicateProgram = mutation({
  args: { cardId: v.id('loyaltyCards') },
  handler: async (ctx, args) => {
    const { card, business } = await assertOwnsCard(ctx, args.cardId)
    const sourceName = card.name ?? `${card.stampGoal} stamps`
    return await ctx.db.insert('loyaltyCards', {
      businessId: business._id,
      name: `${sourceName} (Copy)`,
      stampGoal: card.stampGoal,
      rewardDescription: card.rewardDescription,
      cardScope: card.cardScope,
      isActive: false,
      status: 'draft' as ProgramStatus,
      backgroundColor: card.backgroundColor,
      foregroundColor: card.foregroundColor,
      labelColor: card.labelColor,
      stripImageUrl: card.stripImageUrl,
      iconUrl: card.iconUrl,
      description: card.description,
    })
  },
})

export const setActiveProgram = mutation({
  args: { cardId: v.id('loyaltyCards') },
  handler: async (ctx, args) => {
    const { business } = await assertOwnsCard(ctx, args.cardId)
    const allCards = await ctx.db.query('loyaltyCards').withIndex('by_business', q => q.eq('businessId', business._id)).collect()
    for (const c of allCards) {
      const shouldBeActive = c._id === args.cardId
      const shouldBe = { isActive: shouldBeActive, status: shouldBeActive ? 'active' as ProgramStatus : 'draft' as ProgramStatus }
      if (c.isActive !== shouldBe.isActive || (c.status ?? deriveStatus(c)) !== shouldBe.status) {
        await ctx.db.patch(c._id, shouldBe)
      }
    }
  },
})

export const deleteProgram = mutation({
  args: { cardId: v.id('loyaltyCards') },
  handler: async (ctx, args) => {
    const { card, business } = await assertOwnsCard(ctx, args.cardId)

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

    // Promote another card to active if we deleted the active one
    if (card.isActive) {
      const remaining = allCards.find(c => c._id !== args.cardId)
      if (remaining) await ctx.db.patch(remaining._id, { isActive: true, status: 'active' as ProgramStatus })
    }
  },
})

// Bulk delete — cascades same as single delete. Refuses to delete ALL programs.
export const bulkDeletePrograms = mutation({
  args: { cardIds: v.array(v.id('loyaltyCards')) },
  handler: async (ctx, args) => {
    if (args.cardIds.length === 0) return
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    let businessId: any = null
    const cards = await Promise.all(args.cardIds.map(id => ctx.db.get(id)))
    for (const card of cards) {
      if (!card) throw new Error('Program not found')
      const business = await ctx.db.get(card.businessId)
      if (!business || (business as any).ownerId !== userId) throw new Error('Forbidden')
      if (!businessId) businessId = card.businessId
    }

    const allCards = await ctx.db.query('loyaltyCards').withIndex('by_business', q => q.eq('businessId', businessId)).collect()
    if (args.cardIds.length >= allCards.length) {
      throw new Error('Cannot delete all programs. Keep at least one.')
    }

    for (const cardId of args.cardIds) {
      const passes = await ctx.db.query('customerPasses').withIndex('by_loyalty_card', q => q.eq('loyaltyCardId', cardId)).collect()
      for (const pass of passes) {
        const txs = await ctx.db.query('stampTransactions').withIndex('by_customer_pass', q => q.eq('customerPassId', pass._id)).collect()
        for (const t of txs) await ctx.db.delete(t._id)
        await ctx.db.delete(pass._id)
      }
      await ctx.db.delete(cardId)
    }

    // Ensure at least one is active
    const remaining = await ctx.db.query('loyaltyCards').withIndex('by_business', q => q.eq('businessId', businessId)).collect()
    if (remaining.length > 0 && !remaining.some(c => c.isActive)) {
      await ctx.db.patch(remaining[0]._id, { isActive: true, status: 'active' as ProgramStatus })
    }
  },
})

export const renameProgram = mutation({
  args: { cardId: v.id('loyaltyCards'), name: v.string() },
  handler: async (ctx, args) => {
    await assertOwnsCard(ctx, args.cardId)
    const name = args.name.trim()
    if (!name) throw new Error('Name cannot be empty')
    await ctx.db.patch(args.cardId, { name })
  },
})
