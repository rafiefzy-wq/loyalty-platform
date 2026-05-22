'use node'

import { internalAction } from './_generated/server'
import { v } from 'convex/values'
import { Resend } from 'resend'

// Sends an email to the business owner whenever a reward is redeemed.
// Triggered via ctx.scheduler from the redeemReward mutation.
export const sendRedemptionEmail = internalAction({
  args: {
    ownerEmail: v.string(),
    businessName: v.string(),
    customerName: v.optional(v.string()),
    rewardDescription: v.string(),
    locationName: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.log('[notifications] RESEND_API_KEY not set — skipping email')
      return { skipped: true as const }
    }

    const resend = new Resend(apiKey)
    const customer = args.customerName || 'A customer'
    const location = args.locationName ? ` at ${args.locationName}` : ''
    const subject = `🎉 Reward redeemed: ${args.rewardDescription}`
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <div style="text-align: center; padding: 24px 0;">
          <div style="font-size: 48px;">🎉</div>
          <h1 style="font-size: 22px; color: #111827; margin: 12px 0 4px;">Reward redeemed!</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">At ${args.businessName}</p>
        </div>
        <div style="background: #fef3c7; border-radius: 12px; padding: 20px; text-align: center; margin: 16px 0;">
          <p style="color: #92400e; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px;">Customer claimed</p>
          <p style="color: #78350f; font-size: 18px; font-weight: 600; margin: 0;">${args.rewardDescription}</p>
        </div>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; text-align: center;">
          <strong>${customer}</strong> just redeemed their reward${location}.
        </p>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px;">
          You're receiving this because you own ${args.businessName} on StampPass.
        </p>
      </div>
    `

    try {
      await resend.emails.send({
        from: 'StampPass <noreply@stamppass.app>',
        to: args.ownerEmail,
        subject,
        html,
      })
      return { sent: true as const }
    } catch (err) {
      console.error('[notifications] Resend error', err)
      return { error: (err as Error).message }
    }
  },
})
