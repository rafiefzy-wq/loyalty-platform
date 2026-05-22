import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

// Generate a short-lived URL the client can POST a file to.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')
    return await ctx.storage.generateUploadUrl()
  },
})

// Resolve a storage ID to a public URL. Called from server pages.
export const getUrl = query({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId)
  },
})

// Save the uploaded logo as the business's logoUrl.
export const setBusinessLogo = mutation({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')
    const business = await ctx.db.query('businesses').withIndex('by_owner', q => q.eq('ownerId', userId)).first()
    if (!business) throw new Error('Business not found')
    const url = await ctx.storage.getUrl(args.storageId)
    if (!url) throw new Error('Could not resolve upload URL')
    await ctx.db.patch(business._id, { logoUrl: url })
    // Also mirror to active loyalty card so wallet passes pick it up
    const card = await ctx.db.query('loyaltyCards').withIndex('by_business', q => q.eq('businessId', business._id)).filter(q => q.eq(q.field('isActive'), true)).first()
    if (card) await ctx.db.patch(card._id, { iconUrl: url })
    return url
  },
})

// Save the uploaded strip image on the active loyalty card.
export const setCardStripImage = mutation({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')
    const business = await ctx.db.query('businesses').withIndex('by_owner', q => q.eq('ownerId', userId)).first()
    if (!business) throw new Error('Business not found')
    const card = await ctx.db.query('loyaltyCards').withIndex('by_business', q => q.eq('businessId', business._id)).filter(q => q.eq(q.field('isActive'), true)).first()
    if (!card) throw new Error('No active loyalty card')
    const url = await ctx.storage.getUrl(args.storageId)
    if (!url) throw new Error('Could not resolve upload URL')
    await ctx.db.patch(card._id, { stripImageUrl: url })
    // Mirror to business so existing places that read business.backgroundImageUrl stay aligned
    await ctx.db.patch(business._id, { backgroundImageUrl: url })
    return url
  },
})
