import { createServiceClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { PassLandingClient } from './pass-landing-client'

export const dynamic = 'force-dynamic'

function isIOS(ua: string): boolean {
  return /iPhone|iPad|iPod/i.test(ua)
}

async function createNewPass(cardId: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const res = await fetch(`${appUrl}/api/passes/create?card=${cardId}`, { method: 'POST' })
  if (!res.ok) return null
  return res.json()
}

interface Props {
  params: Promise<{ passId: string }>
  searchParams: Promise<{ card?: string }>
}

export default async function PassLandingPage({ params, searchParams }: Props) {
  const { passId } = await params
  const { card: cardId } = await searchParams

  const headersList = await headers()
  const ua = headersList.get('user-agent') || ''
  const apple = isIOS(ua)

  const supabase = await createServiceClient()

  // Handle /pass/new?card=<id>
  if (passId === 'new' && cardId) {
    const newPass = await createNewPass(cardId)
    if (!newPass) notFound()

    const { data: pass } = await supabase
      .from('customer_passes')
      .select('*, loyalty_cards(*, businesses(*))')
      .eq('id', newPass.passId)
      .single()

    if (!pass) notFound()

    const loyaltyCard = (pass as any).loyalty_cards
    const business = loyaltyCard.businesses

    return (
      <PassLandingClient
        pass={pass as any}
        loyaltyCard={loyaltyCard}
        business={business}
        isIOS={apple}
        applePassUrl={newPass.applePassUrl}
        googleWalletUrl={newPass.googleWalletUrl}
      />
    )
  }

  // Handle /pass/[uuid]
  const { data: pass, error } = await supabase
    .from('customer_passes')
    .select('*, loyalty_cards(*, businesses(*))')
    .eq('id', passId)
    .single()

  if (error || !pass) notFound()

  const loyaltyCard = (pass as any).loyalty_cards
  const business = loyaltyCard.businesses

  const applePassUrl = `/api/passes/apple/${(pass as any).id}`
  let googleWalletUrl: string | null = null

  if ((pass as any).google_pass_id) {
    try {
      const { buildGoogleWalletJwt } = await import('@/lib/passes/google-wallet')
      const jwt = buildGoogleWalletJwt((pass as any).google_pass_id)
      googleWalletUrl = `https://pay.google.com/gp/v/save/${jwt}`
    } catch {}
  }

  return (
    <PassLandingClient
      pass={pass as any}
      loyaltyCard={loyaltyCard}
      business={business}
      isIOS={apple}
      applePassUrl={applePassUrl}
      googleWalletUrl={googleWalletUrl}
    />
  )
}
