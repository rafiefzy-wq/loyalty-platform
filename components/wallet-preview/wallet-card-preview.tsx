'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export interface WalletCardData {
  businessName: string
  logoUrl?: string | null
  stripImageUrl?: string | null
  backgroundColor: string
  foregroundColor: string
  labelColor: string
  stampCount: number
  stampGoal: number
  rewardDescription: string
  fontChoice: string
}

const fontMap: Record<string, string> = {
  inter: 'font-sans',
  playfair: 'font-serif',
  montserrat: 'font-sans',
  lato: 'font-sans',
  poppins: 'font-sans',
}

function StampDot({ filled, color }: { filled: boolean; color: string }) {
  return (
    <div
      className={cn('w-7 h-7 rounded-full border-2 transition-all duration-300', filled ? 'stamp-pop' : '')}
      style={{
        backgroundColor: filled ? color : 'transparent',
        borderColor: color,
        opacity: filled ? 1 : 0.4,
      }}
    />
  )
}

export function AppleWalletPreview({ data }: { data: WalletCardData }) {
  const stamps = Array.from({ length: data.stampGoal }, (_, i) => i < data.stampCount)
  const fontClass = fontMap[data.fontChoice] || 'font-sans'

  return (
    <div
      className={cn('relative w-full rounded-2xl overflow-hidden shadow-2xl', fontClass)}
      style={{ backgroundColor: data.backgroundColor, color: data.foregroundColor, minHeight: 220 }}
    >
      {/* Strip image */}
      {data.stripImageUrl && (
        <div className="w-full h-24 overflow-hidden">
          <img src={data.stripImageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Card body */}
      <div className="px-5 py-4">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: data.labelColor }}>
              Loyalty Card
            </p>
            <p className="text-lg font-bold leading-tight mt-0.5">{data.businessName || 'Your Business'}</p>
          </div>
          {data.logoUrl && (
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
              <img src={data.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
            </div>
          )}
        </div>

        {/* Stamp grid */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {stamps.map((filled, i) => (
            <StampDot key={i} filled={filled} color={data.foregroundColor} />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest" style={{ color: data.labelColor }}>
              Reward
            </p>
            <p className="text-sm font-semibold">{data.rewardDescription || '1 free item'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest" style={{ color: data.labelColor }}>
              Stamps
            </p>
            <p className="text-2xl font-bold tabular-nums">
              {data.stampCount} <span className="text-sm font-normal opacity-60">/ {data.stampGoal}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Apple Wallet badge */}
      <div className="absolute top-2 right-2 bg-black/60 rounded-full px-2 py-0.5 flex items-center gap-1">
        <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
        <span className="text-white text-[10px] font-medium">Wallet</span>
      </div>
    </div>
  )
}

export function GoogleWalletPreview({ data }: { data: WalletCardData }) {
  const stamps = Array.from({ length: data.stampGoal }, (_, i) => i < data.stampCount)
  const fontClass = fontMap[data.fontChoice] || 'font-sans'

  return (
    <div
      className={cn('relative w-full rounded-2xl overflow-hidden shadow-2xl', fontClass)}
      style={{ backgroundColor: data.backgroundColor, color: data.foregroundColor, minHeight: 220 }}
    >
      {/* Hero image strip */}
      {data.stripImageUrl ? (
        <div className="w-full h-28 overflow-hidden">
          <img src={data.stripImageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full h-16" style={{ backgroundColor: data.backgroundColor }} />
      )}

      {/* Logo overlapping */}
      <div className="px-5 -mt-6 flex items-end justify-between">
        <div
          className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg border-2"
          style={{ borderColor: data.backgroundColor, backgroundColor: 'white' }}
        >
          {data.logoUrl ? (
            <img src={data.logoUrl} alt="Logo" className="w-full h-full object-contain p-1.5" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">🎫</div>
          )}
        </div>
        <div className="bg-black/60 rounded-full px-2 py-0.5 flex items-center gap-1 mb-1">
          <svg viewBox="0 0 24 24" className="w-3 h-3" xmlns="http://www.w3.org/2000/svg">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="text-white text-[10px] font-medium">Wallet</span>
        </div>
      </div>

      <div className="px-5 py-3">
        <p className="text-lg font-bold">{data.businessName || 'Your Business'}</p>
        <p className="text-xs mt-0.5" style={{ color: data.labelColor }}>Loyalty Card</p>

        {/* Stamp row */}
        <div className="flex flex-wrap gap-1.5 my-3">
          {stamps.map((filled, i) => (
            <StampDot key={i} filled={filled} color={data.foregroundColor} />
          ))}
        </div>

        <div className="flex justify-between text-sm">
          <div>
            <p style={{ color: data.labelColor }} className="text-xs uppercase tracking-widest">Reward</p>
            <p className="font-semibold">{data.rewardDescription || '1 free item'}</p>
          </div>
          <div className="text-right">
            <p style={{ color: data.labelColor }} className="text-xs uppercase tracking-widest">Stamps</p>
            <p className="text-2xl font-bold tabular-nums">
              {data.stampCount}<span className="text-sm font-normal opacity-60"> / {data.stampGoal}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
