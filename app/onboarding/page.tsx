'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import { toast } from '@/lib/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AppleWalletPreview, GoogleWalletPreview, type WalletCardData } from '@/components/wallet-preview/wallet-card-preview'
import { Building2, MapPin, Palette, CheckCircle2, ChevronRight, ChevronLeft, Plus, Trash2 } from 'lucide-react'

const BUSINESS_TYPES = [
  { value: 'cafe', label: 'Cafe', emoji: '☕' },
  { value: 'bakery', label: 'Bakery', emoji: '🥐' },
  { value: 'restaurant', label: 'Restaurant', emoji: '🍽️' },
  { value: 'salon', label: 'Salon', emoji: '💇' },
  { value: 'other', label: 'Other', emoji: '🏪' },
]

const FONTS = [
  { value: 'inter', label: 'Inter', style: 'font-sans' },
  { value: 'playfair', label: 'Playfair', style: 'font-serif' },
  { value: 'montserrat', label: 'Montserrat', style: 'font-sans' },
  { value: 'lato', label: 'Lato', style: 'font-sans' },
  { value: 'poppins', label: 'Poppins', style: 'font-sans' },
]

const STEPS = [
  { label: 'Business', icon: Building2 },
  { label: 'Locations', icon: MapPin },
  { label: 'Card Design', icon: Palette },
  { label: 'Done!', icon: CheckCircle2 },
]

interface Location {
  name: string
  address: string
  city: string
  country: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const [passUrl, setPassUrl] = useState('')

  // Step 1: Business info
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('cafe')
  const [isMultiLocation, setIsMultiLocation] = useState(false)

  // Step 2: Locations
  const [locations, setLocations] = useState<Location[]>([
    { name: '', address: '', city: '', country: 'UK' },
  ])

  // Step 3: Card design
  const [logoUrl, setLogoUrl] = useState('')
  const [stripImageUrl, setStripImageUrl] = useState('')
  const [brandColor, setBrandColor] = useState('#6366f1')
  const [secondaryColor, setSecondaryColor] = useState('#ffffff')
  const [foregroundColor, setForegroundColor] = useState('#ffffff')
  const [labelColor, setLabelColor] = useState('#c7d2fe')
  const [fontChoice, setFontChoice] = useState('inter')
  const [stampGoal, setStampGoal] = useState(10)
  const [rewardDescription, setRewardDescription] = useState('1 free item')
  const [logoUploading, setLogoUploading] = useState(false)

  const cardData: WalletCardData = {
    businessName,
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

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `logos/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('business-assets').upload(path, file)
    if (error) {
      toast({ title: 'Upload failed', variant: 'destructive' })
    } else {
      const { data } = supabase.storage.from('business-assets').getPublicUrl(path)
      setLogoUrl(data.publicUrl)
    }
    setLogoUploading(false)
  }

  async function handleStripUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `strips/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('business-assets').upload(path, file)
    if (error) {
      toast({ title: 'Upload failed', variant: 'destructive' })
    } else {
      const { data } = supabase.storage.from('business-assets').getPublicUrl(path)
      setStripImageUrl(data.publicUrl)
    }
  }

  async function handleFinish() {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const slug = slugify(businessName) || `business-${Date.now()}`

      // Create business
      const { data: business, error: bErr } = await supabase
        .from('businesses')
        .insert({
          owner_id: user.id,
          name: businessName,
          slug,
          type: businessType,
          logo_url: logoUrl || null,
          brand_color: brandColor,
          secondary_color: secondaryColor,
          background_image_url: stripImageUrl || null,
          font_choice: fontChoice,
          is_multi_location: isMultiLocation,
          plan: 'free_trial',
        })
        .select()
        .single()

      if (bErr) throw bErr

      // Create locations
      const locData = locations.filter((l) => l.name).map((l) => ({
        business_id: business.id,
        name: l.name,
        address: l.address || null,
        city: l.city || null,
        country: l.country || null,
      }))

      const { error: lErr } = await supabase.from('locations').insert(locData)
      if (lErr) throw lErr

      // Create loyalty card
      const { data: card, error: cErr } = await supabase
        .from('loyalty_cards')
        .insert({
          business_id: business.id,
          stamp_goal: stampGoal,
          reward_description: rewardDescription,
          card_scope: isMultiLocation ? 'all_locations' : 'per_location',
          background_color: brandColor,
          foreground_color: foregroundColor,
          label_color: labelColor,
          strip_image_url: stripImageUrl || null,
          icon_url: logoUrl || null,
        })
        .select()
        .single()

      if (cErr) throw cErr

      // Create owner employee record
      await supabase.from('employees').insert({
        business_id: business.id,
        user_id: user.id,
        email: user.email!,
        name: user.user_metadata?.name || null,
        role: 'owner',
      })

      // Generate a sample pass URL for display on done screen
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      const samplePassUrl = `${appUrl}/pass/new?card=${card.id}`
      setPassUrl(samplePassUrl)

      // Generate QR code via API
      const qrRes = await fetch(`/api/passes/qr?url=${encodeURIComponent(samplePassUrl)}`)
      if (qrRes.ok) {
        const { qrDataUrl } = await qrRes.json()
        setQrUrl(qrDataUrl)
      }

      setStep(3)
    } catch (err: unknown) {
      toast({ title: (err as Error).message || 'Something went wrong', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  function addLocation() {
    setLocations([...locations, { name: '', address: '', city: '', country: 'UK' }])
  }

  function removeLocation(idx: number) {
    setLocations(locations.filter((_, i) => i !== idx))
  }

  function updateLocation(idx: number, field: keyof Location, value: string) {
    const next = [...locations]
    next[idx] = { ...next[idx], [field]: value }
    setLocations(next)
  }

  const canProceedStep0 = businessName.trim().length >= 2
  const canProceedStep1 = locations.some((l) => l.name.trim().length >= 1)
  const canProceedStep2 = rewardDescription.trim().length >= 1 && stampGoal >= 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <span className="text-2xl">🎫</span> StampPass
          </a>
          <span className="text-sm text-gray-500">Setup wizard — {step + 1} of 4</span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex">
            {STEPS.map((s, i) => (
              <div
                key={i}
                className={`flex-1 flex items-center gap-2 py-4 border-b-2 transition-colors ${
                  i === step
                    ? 'border-indigo-600 text-indigo-600'
                    : i < step
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-400'
                }`}
              >
                <s.icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium hidden sm:block">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Step 0: Business Info */}
        {step === 0 && (
          <div className="max-w-xl mx-auto slide-up">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Tell us about your business</h1>
            <p className="text-gray-500 mb-8">This takes about 30 seconds.</p>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
              <div className="space-y-1.5">
                <Label htmlFor="biz-name">Business name</Label>
                <Input
                  id="biz-name"
                  placeholder="e.g. The Daily Grind"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label>Business type</Label>
                <div className="grid grid-cols-5 gap-2">
                  {BUSINESS_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setBusinessType(t.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                        businessType === t.value
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl">{t.emoji}</span>
                      <span className="text-xs font-medium text-gray-600">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>How many locations?</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsMultiLocation(false)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      !isMultiLocation ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-gray-900">Just one</p>
                    <p className="text-xs text-gray-500 mt-1">Single location</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMultiLocation(true)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      isMultiLocation ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-gray-900">Multiple</p>
                    <p className="text-xs text-gray-500 mt-1">Several branches</p>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button
                variant="primary"
                size="lg"
                onClick={() => setStep(1)}
                disabled={!canProceedStep0}
                className="gap-2"
              >
                Next: Locations <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Locations */}
        {step === 1 && (
          <div className="max-w-xl mx-auto slide-up">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Add your location{isMultiLocation ? 's' : ''}</h1>
            <p className="text-gray-500 mb-8">Where do your customers visit you?</p>

            <div className="space-y-4">
              {locations.map((loc, idx) => (
                <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                      {isMultiLocation ? `Location ${idx + 1}` : 'Your location'}
                    </h3>
                    {isMultiLocation && locations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLocation(idx)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1.5">
                      <Label>Location name</Label>
                      <Input
                        placeholder="e.g. Main Street Branch"
                        value={loc.name}
                        onChange={(e) => updateLocation(idx, 'name', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label>Address (optional)</Label>
                      <Input
                        placeholder="123 Main Street"
                        value={loc.address}
                        onChange={(e) => updateLocation(idx, 'address', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>City</Label>
                      <Input
                        placeholder="London"
                        value={loc.city}
                        onChange={(e) => updateLocation(idx, 'city', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Country</Label>
                      <Input
                        placeholder="UK"
                        value={loc.country}
                        onChange={(e) => updateLocation(idx, 'country', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {isMultiLocation && (
                <button
                  type="button"
                  onClick={addLocation}
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add another location
                </button>
              )}
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="outline" size="lg" onClick={() => setStep(0)} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                className="gap-2"
              >
                Next: Design card <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Card Design */}
        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 slide-up">
            {/* Left: controls */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Design your loyalty card</h1>
              <p className="text-gray-500 mb-6">Preview updates live as you type.</p>

              <div className="space-y-5">
                {/* Stamp settings */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                  <h3 className="font-semibold text-gray-900">Stamp settings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="stamp-goal">Stamps needed</Label>
                      <Input
                        id="stamp-goal"
                        type="number"
                        min={1}
                        max={30}
                        value={stampGoal}
                        onChange={(e) => setStampGoal(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="reward">Reward</Label>
                      <Input
                        id="reward"
                        placeholder="1 free coffee"
                        value={rewardDescription}
                        onChange={(e) => setRewardDescription(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Colors */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                  <h3 className="font-semibold text-gray-900">Colors</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Background', value: brandColor, set: setBrandColor },
                      { label: 'Text', value: foregroundColor, set: setForegroundColor },
                      { label: 'Label text', value: labelColor, set: setLabelColor },
                      { label: 'Secondary', value: secondaryColor, set: setSecondaryColor },
                    ].map(({ label, value, set }) => (
                      <div key={label} className="flex items-center gap-3">
                        <input
                          type="color"
                          value={value}
                          onChange={(e) => set(e.target.value)}
                          className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                        />
                        <div>
                          <p className="text-xs text-gray-500">{label}</p>
                          <p className="text-sm font-mono">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Font */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                  <h3 className="font-semibold text-gray-900">Font</h3>
                  <div className="grid grid-cols-5 gap-2">
                    {FONTS.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => setFontChoice(f.value)}
                        className={`py-2 px-1 rounded-xl border-2 text-sm transition-all ${f.style} ${
                          fontChoice === f.value
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Images */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                  <h3 className="font-semibold text-gray-900">Images</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Logo</Label>
                      <label className="flex flex-col items-center justify-center h-20 rounded-xl border-2 border-dashed border-gray-300 cursor-pointer hover:border-indigo-400 transition-colors text-sm text-gray-500 gap-1">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo" className="h-full object-contain rounded-xl" />
                        ) : (
                          <>
                            <span className="text-xl">🖼️</span>
                            <span>{logoUploading ? 'Uploading…' : 'Upload logo'}</span>
                          </>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      </label>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Strip image</Label>
                      <label className="flex flex-col items-center justify-center h-20 rounded-xl border-2 border-dashed border-gray-300 cursor-pointer hover:border-indigo-400 transition-colors text-sm text-gray-500 gap-1">
                        {stripImageUrl ? (
                          <img src={stripImageUrl} alt="Strip" className="h-full w-full object-cover rounded-xl" />
                        ) : (
                          <>
                            <span className="text-xl">🌄</span>
                            <span>Upload strip</span>
                          </>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={handleStripUpload} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <Button variant="outline" size="lg" onClick={() => setStep(1)} className="gap-2">
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleFinish}
                  disabled={!canProceedStep2 || saving}
                  className="gap-2"
                >
                  {saving ? 'Setting up…' : 'Finish setup'} <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Right: live preview */}
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
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div className="max-w-2xl mx-auto text-center slide-up">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">You're live!</h1>
            <p className="text-lg text-gray-500 mb-10">
              Print this QR code and put it at your counter. Customers scan it to add their loyalty card to Apple
              or Google Wallet.
            </p>

            {/* QR Code */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 inline-block mb-8">
              {qrUrl ? (
                <img src={qrUrl} alt="QR Code" className="w-56 h-56" />
              ) : (
                <div className="w-56 h-56 bg-gray-100 rounded-2xl animate-pulse flex items-center justify-center">
                  <span className="text-gray-400 text-sm">Generating QR…</span>
                </div>
              )}
              <p className="text-sm text-gray-500 mt-4">Scan to add loyalty card to Wallet</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {qrUrl && (
                <a
                  href={qrUrl}
                  download="stamppass-qr.png"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
                >
                  Download QR code
                </a>
              )}
              <Button
                variant="primary"
                size="lg"
                onClick={() => router.push('/dashboard')}
                className="gap-2"
              >
                Go to dashboard <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {passUrl && (
              <p className="mt-6 text-sm text-gray-400">
                Pass link:{' '}
                <a href={passUrl} className="text-indigo-600 hover:underline break-all">
                  {passUrl}
                </a>
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
