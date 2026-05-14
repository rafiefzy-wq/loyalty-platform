import { mutation, query, action } from './_generated/server'
import { v } from 'convex/values'
import { api } from './_generated/api'

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

export const listMyPasses = query({
  args: {},
  handler: async (ctx) => {
    // For dashboard — get all passes for the owner's loyalty card
    // This query is called from server context so we handle it via businessId
    return []
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
  },
})
