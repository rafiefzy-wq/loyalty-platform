import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

export const listMyTeam = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return { employees: [], invitations: [] }
    const business = await ctx.db.query('businesses').withIndex('by_owner', q => q.eq('ownerId', userId)).first()
    if (!business) return { employees: [], invitations: [] }
    const employees = await ctx.db.query('employees').withIndex('by_business', q => q.eq('businessId', business._id)).collect()
    const invitations = await ctx.db.query('employeeInvitations').withIndex('by_business', q => q.eq('businessId', business._id)).collect()
    return { employees, invitations }
  },
})

export const inviteEmployee = mutation({
  args: { email: v.string(), role: v.string(), locationId: v.optional(v.id('locations')) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')
    const business = await ctx.db.query('businesses').withIndex('by_owner', q => q.eq('ownerId', userId)).first()
    if (!business) throw new Error('Business not found')
    const token = crypto.randomUUID().replace(/-/g, '')
    await ctx.db.insert('employeeInvitations', {
      businessId: business._id,
      locationId: args.locationId,
      email: args.email,
      role: args.role,
      token,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })
    return { token }
  },
})

export const removeEmployee = mutation({
  args: { employeeId: v.id('employees') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')
    const emp = await ctx.db.get(args.employeeId)
    if (!emp) throw new Error('Not found')
    const business = await ctx.db.get(emp.businessId)
    if (!business || business.ownerId !== userId) throw new Error('Forbidden')
    await ctx.db.patch(args.employeeId, { isActive: false })
  },
})

export const cancelInvitation = mutation({
  args: { invitationId: v.id('employeeInvitations') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')
    const inv = await ctx.db.get(args.invitationId)
    if (!inv) throw new Error('Not found')
    const business = await ctx.db.get(inv.businessId)
    if (!business || business.ownerId !== userId) throw new Error('Forbidden')
    await ctx.db.delete(args.invitationId)
  },
})
