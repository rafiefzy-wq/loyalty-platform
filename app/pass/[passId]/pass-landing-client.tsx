'use client'

import { useState } from 'react'
import type { CustomerPass, LoyaltyCard, Business } from '@/lib/types'
import { AppleWalletPreview, GoogleWalletPreview } from '@/components/wallet-preview/wallet-card-preview'

interface Props {
  pass: CustomerPass
  loyaltyCard: LoyaltyCard
  business: Business
  isIOS: boolean
  applePassUrl: string
  googleWalletUrl: string | null
}

export function PassLandingClient({ pass, loyaltyCard, business, isIOS, applePassUrl, googleWalletUrl }: Props) {
  const isRewardReady = pass.stamp_count >= loyaltyCard.stamp_goal
  const [retryAttempted, setRetryAttempted] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [retriedGoogleUrl, setRetriedGoogleUrl] = useState<string | null>(null)
  const effectiveGoogleUrl = retriedGoogleUrl ?? googleWalletUrl

  const cardData = {
    businessName: business.name,
    logoUrl: business.logo_url,
    stripImageUrl: loyaltyCard.strip_image_url,
    backgroundColor: loyaltyCard.background_color,
    foregroundColor: loyaltyCard.foreground_color,
    labelColor: loyaltyCard.label_color,
    stampCount: pass.stamp_count,
    stampGoal: loyaltyCard.stamp_goal,
    rewardDescription: loyaltyCard.reward_description,
    fontChoice: business.font_choice,
  }

  async function retryGoogleWallet() {
    setRetrying(true)
    setRetryAttempted(true)
    try {
      // Re-trigger Google Wallet creation for this existing pass via the create endpoint —
      // the API route is idempotent on existing googlePassId.
      const res = await fetch(`/api/passes/google-retry?pass=${pass.id}`, { method: 'POST' })
      if (res.ok) {
        const { googleWalletUrl: url } = await res.json()
        if (url) setRetriedGoogleUrl(url)
      }
    } catch {}
    setRetrying(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-10">
      {/* Business header */}
      <div className="text-center mb-8">
        {business.logo_url && (
          <img
            src={business.logo_url}
            alt={business.name}
            className="w-16 h-16 rounded-2xl mx-auto mb-3 shadow-sm object-contain bg-white p-1"
          />
        )}
        <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
        <p className="text-gray-500 text-sm mt-1">Loyalty Card</p>
      </div>

      {/* Card preview */}
      <div className="w-full max-w-sm mb-8">
        {isIOS ? (
          <AppleWalletPreview data={cardData} />
        ) : (
          <GoogleWalletPreview data={cardData} />
        )}
      </div>

      {/* Stamp progress */}
      <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
        {isRewardReady ? (
          <div className="text-center">
            <p className="text-3xl mb-2">🎉</p>
            <p className="text-lg font-bold text-green-700">Reward Ready!</p>
            <p className="text-gray-600 mt-1">{loyaltyCard.reward_description}</p>
            <p className="text-sm text-gray-400 mt-2">Show this card to your server</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">Your stamps</span>
              <span className="text-lg font-bold tabular-nums">
                {pass.stamp_count} / {loyaltyCard.stamp_goal}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${(pass.stamp_count / loyaltyCard.stamp_goal) * 100}%`,
                  backgroundColor: loyaltyCard.foreground_color,
                }}
              />
            </div>
            <p className="text-xs text-gray-500 text-center">
              {loyaltyCard.stamp_goal - pass.stamp_count} more{' '}
              {loyaltyCard.stamp_goal - pass.stamp_count === 1 ? 'stamp' : 'stamps'} until:{' '}
              <strong>{loyaltyCard.reward_description}</strong>
            </p>
          </div>
        )}
      </div>

      {/* Add to Wallet buttons — show both, regardless of device */}
      <div className="w-full max-w-sm space-y-3">
        {/* Apple Wallet */}
        <a
          href={applePassUrl}
          className="flex items-center justify-center gap-3 w-full py-4 bg-black text-white rounded-2xl text-base font-semibold hover:bg-gray-900 transition-colors shadow-lg"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          Add to Apple Wallet
        </a>

        {/* Google Wallet — always renders, with retry if not yet generated */}
        {effectiveGoogleUrl ? (
          <a
            href={effectiveGoogleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-4 bg-white border-2 border-gray-200 text-gray-900 rounded-2xl text-base font-semibold hover:bg-gray-50 transition-colors shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Add to Google Wallet
          </a>
        ) : (
          <button
            type="button"
            onClick={retryGoogleWallet}
            disabled={retrying}
            className="flex items-center justify-center gap-3 w-full py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-2xl text-base font-semibold hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {retrying ? 'Generating Google Wallet…' : retryAttempted ? 'Retry Google Wallet' : 'Add to Google Wallet'}
          </button>
        )}

        {retryAttempted && !effectiveGoogleUrl && !retrying && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-center">
            Google Wallet integration is still being configured. Try again in a moment — Apple Wallet works right now.
          </p>
        )}
      </div>

      <p className="mt-8 text-xs text-gray-400 text-center max-w-xs">
        Your card is saved to your phone's Wallet app. Show it on your next visit to earn stamps.
      </p>

      <div className="mt-8 text-center">
        <a href="/" className="text-xs text-gray-400 hover:text-gray-600">
          Powered by <span className="font-semibold">StampPass</span>
        </a>
      </div>
    </div>
  )
}
