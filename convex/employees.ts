import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

// Returns the role for the authenticated user — used by client UI gating.
// 'owner' if they own any business, otherwise their employee role, else null.
export const getMyRole = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    const owned = await ctx.db.query('businesses').withIndex('by_owner', q => q.eq('ownerId', userId)).first()
    if (owned) return 'owner' as const
    const employee = await ctx.db.query('employees').withIndex('by_user', q => q.eq('userId', userId)).first()
    if (employee && employee.isActive) return employee.role as 'manager' | 'staff'
    return null
  },
})

export const getMyEmployee = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    const employee = await ctx.db.query('employees').withIndex('by_user', q => q.eq('userId', userId)).filter(q => q.eq(q.field('isActive'), true)).first()
    if (!employee) return null
    const business = await ctx.db.get(employee.businessId)
    const allLocations = await ctx.db.query('locations').withIndex('by_business', q => q.eq('businessId', employee.businessId)).filter(q => q.eq(q.field('isActive'), true)).collect()
    const locations = employee.locationId ? allLocations.filter(l => l._id === employee.locationId) : allLocations
    return { employee, business, locations }
  },
})

export const getInvitationByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const invitation = await ctx.db.query('employeeInvitations').withIndex('by_token', q => q.eq('token', token)).first()
    if (!invitation || invitation.acceptedAt || invitation.expiresAt < Date.now()) return null
    const business = await ctx.db.get(invitation.businessId)
    return { ...invitation, businessName: business?.name }
  },
})

export const acceptInvitation = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Must be logged in')
    const invitation = await ctx.db.query('employeeInvitations').withIndex('by_token', q => q.eq('token', token)).first()
    if (!invitation || invitation.acceptedAt) throw new Error('Invalid or expired invitation')
    if (invitation.expiresAt < Date.now()) throw new Error('Invitation expired')
    const user = await ctx.db.get(userId as any)
    await ctx.db.insert('employees', {
      businessId: invitation.businessId,
      locationId: invitation.locationId,
      userId,
      email: invitation.email,
      name: (user as any)?.name ?? undefined,
      role: invitation.role,
      isActive: true,
    })
    await ctx.db.patch(invitation._id, { acceptedAt: Date.now() })
  },
})

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
