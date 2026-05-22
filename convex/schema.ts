import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'

export default defineSchema({
  ...authTables,

  businesses: defineTable({
    ownerId: v.string(),
    name: v.string(),
    slug: v.string(),
    type: v.string(),
    logoUrl: v.optional(v.string()),
    brandColor: v.string(),
    secondaryColor: v.string(),
    backgroundImageUrl: v.optional(v.string()),
    fontChoice: v.string(),
    plan: v.string(),
    isMultiLocation: v.boolean(),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
  })
    .index('by_owner', ['ownerId'])
    .index('by_slug', ['slug']),

  locations: defineTable({
    businessId: v.id('businesses'),
    name: v.string(),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    isActive: v.boolean(),
  }).index('by_business', ['businessId']),

  loyaltyCards: defineTable({
    businessId: v.id('businesses'),
    stampGoal: v.number(),
    rewardDescription: v.string(),
    cardScope: v.string(),
    isActive: v.boolean(),
    stripImageUrl: v.optional(v.string()),
    iconUrl: v.optional(v.string()),
    backgroundColor: v.string(),
    foregroundColor: v.string(),
    labelColor: v.string(),
    description: v.optional(v.string()),
  }).index('by_business', ['businessId']),

  employees: defineTable({
    businessId: v.id('businesses'),
    locationId: v.optional(v.id('locations')),
    userId: v.string(),
    role: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index('by_business', ['businessId'])
    .index('by_user', ['userId']),

  customerPasses: defineTable({
    loyaltyCardId: v.id('loyaltyCards'),
    locationId: v.optional(v.id('locations')),
    applePassSerial: v.optional(v.string()),
    googlePassId: v.optional(v.string()),
    applePushToken: v.optional(v.string()),
    stampCount: v.number(),
    passUrl: v.optional(v.string()),
    customerDevice: v.optional(v.string()),
    customerName: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    lastVisitedAt: v.optional(v.number()),
  })
    .index('by_loyalty_card', ['loyaltyCardId'])
    .index('by_apple_serial', ['applePassSerial'])
    .index('by_google_pass_id', ['googlePassId']),

  stampTransactions: defineTable({
    customerPassId: v.id('customerPasses'),
    locationId: v.id('locations'),
    employeeId: v.optional(v.id('employees')),
    type: v.string(),
    note: v.optional(v.string()),
  }).index('by_customer_pass', ['customerPassId']),

  employeeInvitations: defineTable({
    businessId: v.id('businesses'),
    locationId: v.optional(v.id('locations')),
    email: v.string(),
    role: v.string(),
    token: v.string(),
    acceptedAt: v.optional(v.number()),
    expiresAt: v.number(),
  })
    .index('by_business', ['businessId'])
    .index('by_token', ['token']),
})
