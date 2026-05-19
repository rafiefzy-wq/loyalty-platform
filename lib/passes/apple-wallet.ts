import { PKPass } from 'passkit-generator'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import type { LoyaltyCard, Business, CustomerPass } from '@/lib/types'

interface PassData {
  customerPass: CustomerPass
  loyaltyCard: LoyaltyCard
  business: Business
}

export async function generateApplePass(data: PassData): Promise<Buffer> {
  const { customerPass, loyaltyCard, business } = data

  const stampDisplay = `${customerPass.stamp_count} / ${loyaltyCard.stamp_goal}`
  const isRewardReady = customerPass.stamp_count >= loyaltyCard.stamp_goal

  const signerCert = Buffer.from(process.env.APPLE_PASS_CERTIFICATE!, 'base64')
  const wwdr = Buffer.from(process.env.APPLE_WWDR_CERTIFICATE!, 'base64')
  const signerKey = signerCert

  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: process.env.APPLE_PASS_TYPE_IDENTIFIER!,
    serialNumber: customerPass.apple_pass_serial || customerPass.id,
    teamIdentifier: process.env.APPLE_TEAM_IDENTIFIER!,
    organizationName: business.name,
    description: `${business.name} Loyalty Card`,
    foregroundColor: loyaltyCard.foreground_color,
    backgroundColor: loyaltyCard.background_color,
    labelColor: loyaltyCard.label_color,
    logoText: business.name,
    webServiceURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/passes/apple`,
    authenticationToken: customerPass.id,
    storeCard: {
      primaryFields: [
        { key: 'stamps', label: 'STAMPS', value: stampDisplay, textAlignment: 'PKTextAlignmentRight' },
      ],
      secondaryFields: [
        { key: 'reward', label: 'REWARD', value: isRewardReady ? '🎉 Reward Ready!' : loyaltyCard.reward_description },
      ],
      auxiliaryFields: [
        { key: 'business', label: 'LOYALTY CARD', value: business.name },
      ],
      backFields: [
        { key: 'instructions', label: 'How it works', value: `Show this card to earn stamps. Collect ${loyaltyCard.stamp_goal} stamps to earn: ${loyaltyCard.reward_description}` },
        { key: 'terms', label: 'Terms', value: 'One stamp per visit. Non-transferable.' },
      ],
    },
    barcode: { message: customerPass.id, format: 'PKBarcodeFormatQR', messageEncoding: 'iso-8859-1' },
  }

  // Write model bundle to a temp directory
  const tmpDir = path.join(os.tmpdir(), `pass-${customerPass.id}`)
  await fs.mkdir(tmpDir, { recursive: true })
  await fs.writeFile(path.join(tmpDir, 'pass.json'), JSON.stringify(passJson))

  // Add 1x1 transparent icon as fallback (required by Apple)
  const transparentPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
  )
  await fs.writeFile(path.join(tmpDir, 'icon.png'), transparentPng)
  await fs.writeFile(path.join(tmpDir, 'icon@2x.png'), transparentPng)

  // Add strip/logo images if available
  if (loyaltyCard.strip_image_url) {
    try {
      const imgRes = await fetch(loyaltyCard.strip_image_url)
      if (imgRes.ok) await fs.writeFile(path.join(tmpDir, 'strip.png'), Buffer.from(await imgRes.arrayBuffer()))
    } catch {}
  }

  if (loyaltyCard.icon_url) {
    try {
      const logoRes = await fetch(loyaltyCard.icon_url)
      if (logoRes.ok) {
        const logoBuffer = Buffer.from(await logoRes.arrayBuffer())
        await fs.writeFile(path.join(tmpDir, 'logo.png'), logoBuffer)
        await fs.writeFile(path.join(tmpDir, 'icon.png'), logoBuffer)
      }
    } catch {}
  }

  const pass = await PKPass.from(
    {
      model: tmpDir,
      certificates: {
        wwdr,
        signerCert,
        signerKey,
        signerKeyPassphrase: process.env.APPLE_PASS_CERTIFICATE_PASSWORD,
      },
    },
    { serialNumber: customerPass.apple_pass_serial || customerPass.id }
  )

  const buffer = pass.getAsBuffer()

  // Cleanup temp files
  fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})

  return buffer
}

export async function sendApplePushNotification(pushToken: string): Promise<void> {
  if (!process.env.APPLE_APN_KEY || !pushToken) return

  const apnKeyBuffer = Buffer.from(process.env.APPLE_APN_KEY, 'base64')
  const keyId = process.env.APPLE_APN_KEY_ID!
  const teamId = process.env.APPLE_TEAM_IDENTIFIER!
  const passTypeId = process.env.APPLE_PASS_TYPE_IDENTIFIER!

  const jwt = await buildApnsJwt(apnKeyBuffer, keyId, teamId)

  await fetch(`https://api.push.apple.com/3/device/${pushToken}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${jwt}`,
      'apns-push-type': 'background',
      'apns-topic': passTypeId,
      'content-type': 'application/json',
    },
    body: JSON.stringify({}),
  })
}

async function buildApnsJwt(key: Buffer, keyId: string, teamId: string): Promise<string> {
  const { SignJWT, importPKCS8 } = await import('jose')
  const privateKey = await importPKCS8(key.toString('utf8'), 'ES256')
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .sign(privateKey)
}
