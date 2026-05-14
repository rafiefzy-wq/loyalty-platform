'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthActions } from '@convex-dev/auth/react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { toast } from '@/lib/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AppleWalletPreview, GoogleWalletPreview, type WalletCardData } from '@/components/wallet-preview/wallet-card-preview'
import { Building2, MapPin, Palette, CheckCircle2, ChevronRight, ChevronLeft, Plus, Trash2, Rocket } from 'lucide-react'

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
  { label: 'Go live!', icon: Rocket },
]

interface Location {
  name: string
  address: string
  city: string
  country: string
}

interface WizardData {
  businessName: string
  businessType: string
  isMultiLocation: boolean
  locations: Location[]
  logoUrl: string
  stripImageUrl: string
  brandColor: string
  secondaryColor: string
  foregroundColor: string
  labelColor: string
  fontChoice: string
  stampGoal: number
  rewardDescription: string
}

const STORAGE_KEY = 'pending_onboarding'


function OnboardingInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const resume = searchParams.get('resume')
  const { signIn } = useAuthActions()
  const completeOnboarding = useMutation(api.businesses.completeOnboarding)

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const [passUrl, setPassUrl] = useState('')
  const [showDone, setShowDone] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  // Step 0: Business info
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('cafe')
  const [isMultiLocation, setIsMultiLocation] = useState(false)

  // Step 1: Locations
  const [locations, setLocations] = useState<Location[]>([
    { name: '', address: '', city: '', country: 'UK' },
  ])

  // Step 2: Card design
  const [logoUrl, setLogoUrl] = useState('')
  const [stripImageUrl, setStripImageUrl] = useState('')
  const [brandColor, setBrandColor] = useState('#6366f1')
  const [secondaryColor, setSecondaryColor] = useState('#ffffff')
  const [foregroundColor, setForegroundColor] = useState('#ffffff')
  const [labelColor, setLabelColor] = useState('#c7d2fe')
  const [fontChoice, setFontChoice] = useState('inter')
  const [stampGoal, setStampGoal] = useState(10)
  const [rewardDescription, setRewardDescription] = useState('1 free item')

  // Step 3: Sign-up
  const [signUpName, setSignUpName] = useState('')
  const [signUpEmail, setSignUpEmail] = useState('')
  const [signUpPassword, setSignUpPassword] = useState('')

  const wizardData = (): WizardData => ({
    businessName, businessType, isMultiLocation, locations,
    logoUrl, stripImageUrl, brandColor, secondaryColor,
    foregroundColor, labelColor, fontChoice, stampGoal, rewardDescription,
  })

  useEffect(() => {
    // no-op: email confirmation flow removed; Convex Auth signs up immediately
  }, [resume])

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
    toast({ title: 'Image uploads coming soon — you can add images from the dashboard after sign-up', variant: 'destructive' })
    e.target.value = ''
  }

  async function handleStripUpload(e: React.ChangeEvent<HTMLInputElement>) {
    toast({ title: 'Image uploads coming soon — you can add images from the dashboard after sign-up', variant: 'destructive' })
    e.target.value = ''
  }

  async function handleSignUpAndSave() {
    if (signUpPassword.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      // Sign up with Convex Auth (no email confirmation required)
      await signIn('password', {
        email: signUpEmail,
        password: signUpPassword,
        name: signUpName,
        flow: 'signUp',
      })

      // Save business data via Convex mutation (user is now authenticated)
      const data = wizardData()
      const cardId = await completeOnboarding({
        businessName: data.businessName,
        businessType: data.businessType,
        isMultiLocation: data.isMultiLocation,
        locations: data.locations,
        logoUrl: data.logoUrl || undefined,
        stripImageUrl: data.stripImageUrl || undefined,
        brandColor: data.brandColor,
        secondaryColor: data.secondaryColor,
        foregroundColor: data.foregroundColor,
        labelColor: data.labelColor,
        fontChoice: data.fontChoice,
        stampGoal: data.stampGoal,
        rewardDescription: data.rewardDescription,
      })

      const appUrl = window.location.origin
      const samplePassUrl = `${appUrl}/pass/new?card=${cardId}`
      setPassUrl(samplePassUrl)
      const qrRes = await fetch(`/api/passes/qr?url=${encodeURIComponent(samplePassUrl)}`)
      if (qrRes.ok) {
        const { qrDataUrl } = await qrRes.json()
        setQrUrl(qrDataUrl)
      }
      setShowDone(true)
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
  const canProceedStep3 = signUpName.trim().length >= 1 && signUpEmail.includes('@') && signUpPassword.length >= 8

  // Done screen
  if (showDone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full text-center slide-up">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">You're live!</h1>
          <p className="text-lg text-gray-500 mb-10">
            Print this QR code and put it at your counter. Customers scan it to add their loyalty card to Apple or Google Wallet.
          </p>
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
            <Button variant="primary" size="lg" onClick={() => router.push('/dashboard')} className="gap-2">
              Go to dashboard <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          {passUrl && (
            <p className="mt-6 text-sm text-gray-400">
              Pass link:{' '}
              <a href={passUrl} className="text-indigo-600 hover:underline break-all">{passUrl}</a>
            </p>
          )}
        </div>
      </div>
    )
  }

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
            <p className="text-gray-500 mb-8">This takes about 30 seconds. No account needed yet.</p>

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
              <Button variant="primary" size="lg" onClick={() => setStep(1)} disabled={!canProceedStep0} className="gap-2">
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
                      <button type="button" onClick={() => removeLocation(idx)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1.5">
                      <Label>Location name</Label>
                      <Input placeholder="e.g. Main Street Branch" value={loc.name} onChange={(e) => updateLocation(idx, 'name', e.target.value)} />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label>Address (optional)</Label>
                      <Input placeholder="123 Main Street" value={loc.address} onChange={(e) => updateLocation(idx, 'address', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>City</Label>
                      <Input placeholder="London" value={loc.city} onChange={(e) => updateLocation(idx, 'city', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Country</Label>
                      <Input placeholder="UK" value={loc.country} onChange={(e) => updateLocation(idx, 'country', e.target.value)} />
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
              <Button variant="primary" size="lg" onClick={() => setStep(2)} disabled={!canProceedStep1} className="gap-2">
                Next: Design card <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Card Design */}
        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 slide-up">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Design your loyalty card</h1>
              <p className="text-gray-500 mb-6">Preview updates live as you type.</p>

              <div className="space-y-5">
                <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                  <h3 className="font-semibold text-gray-900">Stamp settings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="stamp-goal">Stamps needed</Label>
                      <Input id="stamp-goal" type="number" min={1} max={30} value={stampGoal} onChange={(e) => setStampGoal(Number(e.target.value))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="reward">Reward</Label>
                      <Input id="reward" placeholder="1 free coffee" value={rewardDescription} onChange={(e) => setRewardDescription(e.target.value)} />
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
                      { label: 'Secondary', value: secondaryColor, set: setSecondaryColor },
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
                        className={`py-2 px-1 rounded-xl border-2 text-sm transition-all ${f.style} ${
                          fontChoice === f.value ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                  <h3 className="font-semibold text-gray-900">Images <span className="text-xs font-normal text-gray-400">(available after sign-up)</span></h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Logo</Label>
                      <label className="flex flex-col items-center justify-center h-20 rounded-xl border-2 border-dashed border-gray-300 cursor-pointer hover:border-indigo-400 transition-colors text-sm text-gray-500 gap-1">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo" className="h-full object-contain rounded-xl" />
                        ) : (
                          <><span className="text-xl">🖼️</span><span>Upload logo</span></>
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
                          <><span className="text-xl">🌄</span><span>Upload strip</span></>
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
                <Button variant="primary" size="lg" onClick={() => setStep(3)} disabled={!canProceedStep2} className="gap-2">
                  Looks good! <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

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

        {/* Step 3: Create account */}
        {step === 3 && !checkEmail && (
          <div className="max-w-md mx-auto slide-up">
            <div className="text-center mb-8">
              <div className="text-5xl mb-3">🚀</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Your card is ready!</h1>
              <p className="text-gray-500">Create a free account to go live. Takes 10 seconds.</p>
            </div>

            {/* Card preview summary */}
            <div className="bg-indigo-50 rounded-2xl p-4 mb-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ backgroundColor: brandColor }} />
              <div>
                <p className="font-semibold text-gray-900">{businessName}</p>
                <p className="text-sm text-gray-500">{stampGoal} stamps → {rewardDescription}</p>
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="ml-auto text-xs text-indigo-600 hover:underline"
              >
                Edit
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="su-name">Your name</Label>
                <Input id="su-name" placeholder="Jane Smith" value={signUpName} onChange={(e) => setSignUpName(e.target.value)} autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-email">Email address</Label>
                <Input id="su-email" type="email" placeholder="jane@example.com" value={signUpEmail} onChange={(e) => setSignUpEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-password">Password</Label>
                <Input id="su-password" type="password" placeholder="At least 8 characters" value={signUpPassword} onChange={(e) => setSignUpPassword(e.target.value)} />
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full gap-2 mt-2"
                disabled={!canProceedStep3 || saving}
                onClick={handleSignUpAndSave}
              >
                {saving ? 'Setting up…' : 'Create account & go live'} <Rocket className="w-4 h-4" />
              </Button>

              <p className="text-center text-xs text-gray-400">
                Already have an account?{' '}
                <a href="/login" className="text-indigo-600 hover:underline">Sign in</a>
              </p>
            </div>

            <div className="flex justify-start mt-4">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="gap-1 text-gray-400">
                <ChevronLeft className="w-3 h-3" /> Back to design
              </Button>
            </div>
          </div>
        )}

        {/* Check email state */}
        {step === 3 && checkEmail && (
          <div className="max-w-md mx-auto text-center slide-up">
            <div className="text-5xl mb-4">📬</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Check your email</h1>
            <p className="text-gray-500 mb-4">
              We sent a confirmation link to <strong>{signUpEmail}</strong>. Click it to activate your account and your loyalty card will go live automatically.
            </p>
            <p className="text-sm text-gray-400">You can close this tab — we'll pick up where you left off after you confirm.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>}>
      <OnboardingInner />
    </Suspense>
  )
}
