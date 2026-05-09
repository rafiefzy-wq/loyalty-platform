import { GoogleAuth } from 'google-auth-library'
import type { LoyaltyCard, Business, CustomerPass } from '@/lib/supabase/types'

const WALLET_API = 'https://walletobjects.googleapis.com/walletobjects/v1'

interface PassData {
  customerPass: CustomerPass
  loyaltyCard: LoyaltyCard
  business: Business
}

function getAuth() {
  const credJson = Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON!, 'base64').toString('utf8')
  const credentials = JSON.parse(credJson)
  return new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
  })
}

export async function createGoogleWalletClass(business: Business, loyaltyCard: LoyaltyCard): Promise<string> {
  const auth = getAuth()
  const client = await auth.getClient()
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID!
  const classId = `${issuerId}.loyalty_${loyaltyCard.id}`

  const classBody = {
    id: classId,
    issuerName: business.name,
    programName: `${business.name} Loyalty`,
    programLogo: business.logo_url
      ? { sourceUri: { uri: business.logo_url }, contentDescription: { defaultValue: { language: 'en-US', value: 'Logo' } } }
      : undefined,
    heroImage: loyaltyCard.strip_image_url
      ? { sourceUri: { uri: loyaltyCard.strip_image_url }, contentDescription: { defaultValue: { language: 'en-US', value: 'Card image' } } }
      : undefined,
    hexBackgroundColor: loyaltyCard.background_color,
    reviewStatus: 'UNDER_REVIEW',
    loyaltyPoints: {
      label: 'Stamps',
      balance: {
        string: `0 / ${loyaltyCard.stamp_goal}`,
      },
    },
    secondaryLoyaltyPoints: {
      label: 'Reward',
      balance: { string: loyaltyCard.reward_description },
    },
    barcode: {
      type: 'QR_CODE',
      alternateText: '',
    },
  }

  try {
    const res = await (client as any).request({
      url: `${WALLET_API}/loyaltyClass`,
      method: 'POST',
      data: classBody,
    })
    return (res.data as any).id
  } catch (err: any) {
    // Class already exists
    if (err?.response?.status === 409) return classId
    throw err
  }
}

export async function createGoogleWalletObject(data: PassData): Promise<string> {
  const { customerPass, loyaltyCard, business } = data
  const auth = getAuth()
  const client = await auth.getClient()
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID!
  const classId = `${issuerId}.loyalty_${loyaltyCard.id}`
  const objectId = `${issuerId}.pass_${customerPass.id}`

  const isRewardReady = customerPass.stamp_count >= loyaltyCard.stamp_goal

  const objectBody = {
    id: objectId,
    classId,
    state: 'ACTIVE',
    loyaltyPoints: {
      label: 'Stamps',
      balance: {
        string: `${customerPass.stamp_count} / ${loyaltyCard.stamp_goal}`,
      },
    },
    secondaryLoyaltyPoints: {
      label: 'Reward',
      balance: { string: isRewardReady ? '🎉 Ready!' : loyaltyCard.reward_description },
    },
    barcode: {
      type: 'QR_CODE',
      value: customerPass.id,
      alternateText: customerPass.id.slice(0, 8),
    },
    textModulesData: [
      {
        id: 'business',
        header: 'Business',
        body: business.name,
      },
    ],
  }

  const res = await (client as any).request({
    url: `${WALLET_API}/loyaltyObject`,
    method: 'POST',
    data: objectBody,
  })

  return (res.data as any).id
}

export async function updateGoogleWalletObject(customerPass: CustomerPass, loyaltyCard: LoyaltyCard): Promise<void> {
  const auth = getAuth()
  const client = await auth.getClient()
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID!
  const objectId = `${issuerId}.pass_${customerPass.id}`
  const isRewardReady = customerPass.stamp_count >= loyaltyCard.stamp_goal

  await (client as any).request({
    url: `${WALLET_API}/loyaltyObject/${objectId}`,
    method: 'PATCH',
    data: {
      loyaltyPoints: {
        label: 'Stamps',
        balance: { string: `${customerPass.stamp_count} / ${loyaltyCard.stamp_goal}` },
      },
      secondaryLoyaltyPoints: {
        label: 'Reward',
        balance: { string: isRewardReady ? '🎉 Ready!' : loyaltyCard.reward_description },
      },
    },
  })
}

export function buildGoogleWalletJwt(objectId: string): string {
  const credJson = Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON!, 'base64').toString('utf8')
  const credentials = JSON.parse(credJson)
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID!

  const claims = {
    iss: credentials.client_email,
    aud: 'google',
    origins: [process.env.NEXT_PUBLIC_APP_URL!],
    typ: 'savetowallet',
    payload: {
      loyaltyObjects: [{ id: objectId }],
    },
    iat: Math.floor(Date.now() / 1000),
  }

  // Simple JWT sign using jsonwebtoken
  const jwt = require('jsonwebtoken')
  return jwt.sign(claims, credentials.private_key, { algorithm: 'RS256' })
}
