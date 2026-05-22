'use node'
import { action } from './_generated/server'
import { v } from 'convex/values'
import { api } from './_generated/api'

export const createGoogleWalletPass = action({
  args: {
    passId: v.id('customerPasses'),
    appUrl: v.string(),
  },
  handler: async (ctx, args): Promise<string | null> => {
    const data = await ctx.runQuery(api.passes.getPass, { passId: args.passId })
    if (!data) {
      console.error('[google-wallet] pass not found:', args.passId)
      return null
    }
    const { pass, card, business } = data

    const serviceAccountB64 = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_BASE64
    const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID
    if (!serviceAccountB64 || !issuerId) {
      console.error('[google-wallet] missing env vars (GOOGLE_WALLET_SERVICE_ACCOUNT_BASE64 / GOOGLE_WALLET_ISSUER_ID)')
      return null
    }

    try {
      const { GoogleAuth } = await import('google-auth-library')
      const jwt = await import('jsonwebtoken')

      const credJson = Buffer.from(serviceAccountB64, 'base64').toString('utf8')
      const credentials = JSON.parse(credJson)
      const classId = `${issuerId}.loyalty_${card._id}`
      const objectId = `${issuerId}.pass_${pass._id}`
      const WALLET_API = 'https://walletobjects.googleapis.com/walletobjects/v1'

      const auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
      })
      const client = await auth.getClient()

      // Create class (409 = exists already, OK to continue)
      const classBody = {
        id: classId,
        issuerName: (business as any).name,
        programName: `${(business as any).name} Loyalty`,
        programLogo: (business as any).logoUrl
          ? { sourceUri: { uri: (business as any).logoUrl }, contentDescription: { defaultValue: { language: 'en-US', value: 'Logo' } } }
          : undefined,
        hexBackgroundColor: card.backgroundColor,
        reviewStatus: 'UNDER_REVIEW',
        loyaltyPoints: { label: 'Stamps', balance: { string: `0 / ${card.stampGoal}` } },
        secondaryLoyaltyPoints: { label: 'Reward', balance: { string: card.rewardDescription } },
        barcode: { type: 'QR_CODE', alternateText: '' },
      }

      try {
        await (client as any).request({ url: `${WALLET_API}/loyaltyClass`, method: 'POST', data: classBody })
        console.log('[google-wallet] class created:', classId)
      } catch (e: any) {
        const status = e?.response?.status
        if (status === 409) {
          console.log('[google-wallet] class already exists, continuing:', classId)
        } else {
          console.error('[google-wallet] class create failed:', status, JSON.stringify(e?.response?.data) || e?.message)
          throw e
        }
      }

      // Create object (or patch if it already exists — happens when revisiting the same pass)
      const objectBody = {
        id: objectId,
        classId,
        state: 'ACTIVE',
        loyaltyPoints: { label: 'Stamps', balance: { string: `${pass.stampCount} / ${card.stampGoal}` } },
        secondaryLoyaltyPoints: { label: 'Reward', balance: { string: card.rewardDescription } },
        barcode: { type: 'QR_CODE', value: pass._id, alternateText: pass._id.slice(0, 8) },
        textModulesData: [{ id: 'business', header: 'Business', body: (business as any).name }],
      }

      try {
        await (client as any).request({ url: `${WALLET_API}/loyaltyObject`, method: 'POST', data: objectBody })
        console.log('[google-wallet] object created:', objectId)
      } catch (e: any) {
        const status = e?.response?.status
        if (status === 409) {
          console.log('[google-wallet] object exists, patching:', objectId)
          await (client as any).request({
            url: `${WALLET_API}/loyaltyObject/${objectId}`,
            method: 'PATCH',
            data: {
              loyaltyPoints: objectBody.loyaltyPoints,
              secondaryLoyaltyPoints: objectBody.secondaryLoyaltyPoints,
            },
          })
        } else {
          console.error('[google-wallet] object create failed:', status, JSON.stringify(e?.response?.data) || e?.message)
          throw e
        }
      }

      // Build JWT save link
      const claims = {
        iss: credentials.client_email,
        aud: 'google',
        origins: [args.appUrl],
        typ: 'savetowallet',
        payload: { loyaltyObjects: [{ id: objectId }] },
        iat: Math.floor(Date.now() / 1000),
      }
      const token = (jwt as any).sign(claims, credentials.private_key, { algorithm: 'RS256' })

      // Save googlePassId back to the pass so the regular /pass/[id] route can rebuild the link
      await ctx.runMutation(api.passes.updateGooglePassId, {
        passId: args.passId,
        googlePassId: objectId,
        passUrl: `${args.appUrl}/pass/${pass._id}`,
      })

      const saveUrl = `https://pay.google.com/gp/v/save/${token}`
      console.log('[google-wallet] save URL ready')
      return saveUrl
    } catch (err: any) {
      console.error('[google-wallet] createGoogleWalletPass failed:', err?.message || err)
      console.error('[google-wallet] details:', JSON.stringify(err?.response?.data) || err?.stack || 'no extra detail')
      return null
    }
  },
})

export const updateGoogleWalletPass = action({
  args: { passId: v.id('customerPasses') },
  handler: async (ctx, args): Promise<void> => {
    const data = await ctx.runQuery(api.passes.getPass, { passId: args.passId })
    if (!data?.pass.googlePassId) return

    try {
      const { GoogleAuth } = await import('google-auth-library')
      const credJson = Buffer.from(process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_BASE64!, 'base64').toString('utf8')
      const credentials = JSON.parse(credJson)
      const WALLET_API = 'https://walletobjects.googleapis.com/walletobjects/v1'
      const auth = new GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'] })
      const client = await auth.getClient()

      const { pass, card } = data
      const isRewardReady = pass.stampCount >= card.stampGoal
      await (client as any).request({
        url: `${WALLET_API}/loyaltyObject/${pass.googlePassId}`,
        method: 'PATCH',
        data: {
          loyaltyPoints: { label: 'Stamps', balance: { string: `${pass.stampCount} / ${card.stampGoal}` } },
          secondaryLoyaltyPoints: { label: 'Reward', balance: { string: isRewardReady ? '🎉 Ready!' : card.rewardDescription } },
        },
      })
    } catch {}
  },
})
