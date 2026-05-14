import { fetchQuery, fetchMutation } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { PassLandingClient } from './pass-landing-client'
import type { Id } from '@/convex/_generated/dataModel'

export const dynamic = 'force-dynamic'

function isIOS(ua: string): boolean {
  return /iPhone|iPad|iPod/i.test(ua)
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

  // Handle /pass/new?card=<id>
  if (passId === 'new' && cardId) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const res = await fetch(`${appUrl}/api/passes/create?card=${cardId}`, { method: 'POST' })
    if (!res.ok) notFound()
    const newPass = await res.json()

    const data = await fetchQuery(api.passes.getPass, { passId: newPass.passId as Id<'customerPasses'> })
    if (!data) notFound()

    return (
      <PassLandingClient
        pass={{ ...data.pass, id: data.pass._id } as any}
        loyaltyCard={{ ...data.card, id: data.card._id, stamp_goal: data.card.stampGoal, reward_description: data.card.rewardDescription, background_color: data.card.backgroundColor, foreground_color: data.card.foregroundColor, label_color: data.card.labelColor, strip_image_url: data.card.stripImageUrl ?? null, icon_url: data.card.iconUrl ?? null } as any}
        business={{ ...data.business, id: (data.business as any)._id, logo_url: (data.business as any).logoUrl ?? null, brand_color: (data.business as any).brandColor, font_choice: (data.business as any).fontChoice } as any}
        isIOS={apple}
        applePassUrl={newPass.applePassUrl}
        googleWalletUrl={newPass.googleWalletUrl}
      />
    )
  }

  // Handle /pass/[uuid]
  const data = await fetchQuery(api.passes.getPass, { passId: passId as Id<'customerPasses'> })
  if (!data) notFound()

  const { pass, card, business } = data

  let googleWalletUrl: string | null = null
  if (pass.googlePassId) {
    try {
      const { buildGoogleWalletJwt } = await import('@/lib/passes/google-wallet')
      const jwt = buildGoogleWalletJwt(pass.googlePassId)
      googleWalletUrl = `https://pay.google.com/gp/v/save/${jwt}`
    } catch {}
  }

  return (
    <PassLandingClient
      pass={{ ...pass, id: pass._id, stamp_count: pass.stampCount } as any}
      loyaltyCard={{ ...card, id: card._id, stamp_goal: card.stampGoal, reward_description: card.rewardDescription, background_color: card.backgroundColor, foreground_color: card.foregroundColor, label_color: card.labelColor, strip_image_url: card.stripImageUrl ?? null, icon_url: card.iconUrl ?? null } as any}
      business={{ ...(business as any), id: (business as any)._id, logo_url: (business as any).logoUrl ?? null, brand_color: (business as any).brandColor, font_choice: (business as any).fontChoice } as any}
      isIOS={apple}
      applePassUrl={`/api/passes/apple/${pass._id}`}
      googleWalletUrl={googleWalletUrl}
    />
  )
}
