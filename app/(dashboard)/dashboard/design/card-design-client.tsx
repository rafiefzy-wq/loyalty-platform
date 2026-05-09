'use client'

import { useState } from 'react'
import type { Business, LoyaltyCard } from '@/lib/supabase/types'
import { toast } from '@/lib/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AppleWalletPreview, GoogleWalletPreview } from '@/components/wallet-preview/wallet-card-preview'

const FONTS = [
  { value: 'inter', label: 'Inter' },
  { value: 'playfair', label: 'Playfair' },
  { value: 'montserrat', label: 'Montserrat' },
  { value: 'lato', label: 'Lato' },
  { value: 'poppins', label: 'Poppins' },
]

interface Props {
  business: Business
  loyaltyCard: LoyaltyCard | null
}

export function CardDesignClient({ business, loyaltyCard }: Props) {
  const [name, setName] = useState(business.name)
  const [brandColor, setBrandColor] = useState(loyaltyCard?.background_color || business.brand_color)
  const [foregroundColor, setForegroundColor] = useState(loyaltyCard?.foreground_color || '#ffffff')
  const [labelColor, setLabelColor] = useState(loyaltyCard?.label_color || '#c7d2fe')
  const [fontChoice, setFontChoice] = useState(business.font_choice)
  const [stampGoal, setStampGoal] = useState(loyaltyCard?.stamp_goal || 10)
  const [rewardDescription, setRewardDescription] = useState(loyaltyCard?.reward_description || '1 free item')
  const [logoUrl, setLogoUrl] = useState(business.logo_url || '')
  const [stripImageUrl, setStripImageUrl] = useState(loyaltyCard?.strip_image_url || '')
  const [saving, setSaving] = useState(false)

  const cardData = {
    businessName: name,
    logoUrl,
    stripImageUrl,
    backgroundColor: brandColor,
    foregroundColor,
    labelColor,
    stampCount: 4,
    stampGoal,
    rewardDescription,
    fontChoice,
  }

  async function handleSave() {
    setSaving(true)
    const res = await fetch('/api/businesses/design', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: name,
        brandColor,
        foregroundColor,
        labelColor,
        fontChoice,
        stampGoal,
        rewardDescription,
        logoUrl,
        stripImageUrl,
      }),
    })
    if (res.ok) {
      toast({ title: 'Card design saved!', variant: 'success' })
    } else {
      toast({ title: 'Save failed', variant: 'destructive' })
    }
    setSaving(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      {/* Controls */}
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Card Design</h1>
          <p className="text-gray-500 text-sm mt-1">Changes update the preview live</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">Stamp settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Stamps needed</Label>
              <Input type="number" min={1} max={30} value={stampGoal} onChange={(e) => setStampGoal(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Reward</Label>
              <Input value={rewardDescription} onChange={(e) => setRewardDescription(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">Colors</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Background', value: brandColor, set: setBrandColor },
              { label: 'Text', value: foregroundColor, set: setForegroundColor },
              { label: 'Label text', value: labelColor, set: setLabelColor },
            ].map(({ label, value, set }) => (
              <div key={label} className="flex items-center gap-3">
                <input type="color" value={value} onChange={(e) => set(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                <div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-sm font-mono">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <h3 className="font-semibold text-gray-900">Font</h3>
          <div className="grid grid-cols-5 gap-2">
            {FONTS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFontChoice(f.value)}
                className={`py-2 px-1 rounded-xl border-2 text-sm transition-all ${fontChoice === f.value ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-gray-300'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <Button variant="primary" size="lg" onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>

      {/* Live preview */}
      <div className="lg:sticky lg:top-8 self-start space-y-6">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Apple Wallet</p>
          <AppleWalletPreview data={cardData} />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Google Wallet</p>
          <GoogleWalletPreview data={cardData} />
        </div>
      </div>
    </div>
  )
}
