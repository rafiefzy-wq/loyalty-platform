import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

export const listMyLocations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []
    const business = await ctx.db.query('businesses').withIndex('by_owner', q => q.eq('ownerId', userId)).first()
    if (!business) return []
    return await ctx.db.query('locations').withIndex('by_business', q => q.eq('businessId', business._id)).collect()
  },
})

export const addLocation = mutation({
  args: { name: v.string(), address: v.optional(v.string()), city: v.optional(v.string()), country: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')
    const business = await ctx.db.query('businesses').withIndex('by_owner', q => q.eq('ownerId', userId)).first()
    if (!business) throw new Error('Business not found')
    return await ctx.db.insert('locations', { businessId: business._id, name: args.name, address: args.address, city: args.city, country: args.country, isActive: true })
  },
})

export const updateLocation = mutation({
  args: { locationId: v.id('locations'), name: v.string(), address: v.optional(v.string()), city: v.optional(v.string()), country: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')
    const loc = await ctx.db.get(args.locationId)
    if (!loc) throw new Error('Not found')
    const business = await ctx.db.get(loc.businessId)
    if (!business || business.ownerId !== userId) throw new Error('Forbidden')
    await ctx.db.patch(args.locationId, { name: args.name, address: args.address, city: args.city, country: args.country })
  },
})

export const deleteLocation = mutation({
  args: { locationId: v.id('locations') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')
    const loc = await ctx.db.get(args.locationId)
    if (!loc) throw new Error('Not found')
    const business = await ctx.db.get(loc.businessId)
    if (!business || business.ownerId !== userId) throw new Error('Forbidden')
    await ctx.db.delete(args.locationId)
  },
})
