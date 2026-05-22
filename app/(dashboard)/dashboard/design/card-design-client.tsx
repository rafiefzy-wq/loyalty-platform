'use client'

import { useState } from 'react'
import Image from 'next/image'
import QRCode from 'qrcode'
import type { Business, LoyaltyCard } from '@/lib/types'
import { toast } from '@/lib/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AppleWalletPreview, GoogleWalletPreview } from '@/components/wallet-preview/wallet-card-preview'
import { ImageUpload } from '@/components/image-upload'
import { Download, X, Smartphone, Copy, Check } from 'lucide-react'

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

  // QR modal state
  const [qrOpen, setQrOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [passUrl, setPassUrl] = useState('')
  const [copied, setCopied] = useState(false)

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
    try {
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
      if (!res.ok) {
        toast({ title: 'Save failed', variant: 'destructive' })
        return
      }
      toast({ title: 'Card design saved!', variant: 'success' })

      if (!loyaltyCard?.id) {
        toast({ title: 'No active loyalty card — please complete onboarding first', variant: 'destructive' })
        return
      }

      // Generate QR pointing at the pass-creation URL
      const url = `${window.location.origin}/pass/new?card=${loyaltyCard.id}`
      const dataUrl = await QRCode.toDataURL(url, {
        width: 320,
        margin: 1,
        color: { dark: brandColor || '#1e1b4b', light: '#ffffff' },
      })
      setPassUrl(url)
      setQrDataUrl(dataUrl)
      setQrOpen(true)
    } catch (err) {
      toast({ title: (err as Error).message || 'Something went wrong', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  function downloadQR() {
    const link = document.createElement('a')
    link.href = qrDataUrl
    link.download = `${business.slug || 'loyalty-card'}-qr.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(passUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      toast({ title: 'Copy failed — please copy manually', variant: 'destructive' })
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Controls */}
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Card Design</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Changes update the preview live</p>
          </div>

          <div className="bg-white dark:bg-[#16161e] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Branding images</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">Logo shows as the card icon. Strip image is the banner at the top of Apple Wallet cards.</p>
            <div className="flex flex-wrap gap-6">
              <ImageUpload
                label="Logo"
                target="logo"
                aspect="square"
                currentUrl={logoUrl || null}
                onUploaded={(url) => setLogoUrl(url)}
                helpText="Square, PNG/JPG, max 4 MB"
              />
              <ImageUpload
                label="Strip image (Apple)"
                target="strip"
                aspect="banner"
                currentUrl={stripImageUrl || null}
                onUploaded={(url) => setStripImageUrl(url)}
                helpText="Wide banner, max 4 MB"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-[#16161e] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Stamp settings</h3>
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

          <div className="bg-white dark:bg-[#16161e] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Colors</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Background', value: brandColor, set: setBrandColor },
                { label: 'Text', value: foregroundColor, set: setForegroundColor },
                { label: 'Label text', value: labelColor, set: setLabelColor },
              ].map(({ label, value, set }) => (
                <div key={label} className="flex items-center gap-3">
                  <input type="color" value={value} onChange={(e) => set(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-800 cursor-pointer p-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                    <p className="text-sm font-mono">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-[#16161e] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Font</h3>
            <div className="grid grid-cols-5 gap-2">
              {FONTS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFontChoice(f.value)}
                  className={`py-2 px-1 rounded-xl border-2 text-sm transition-all ${fontChoice === f.value ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'}`}
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
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Apple Wallet</p>
            <AppleWalletPreview data={cardData} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Google Wallet</p>
            <GoogleWalletPreview data={cardData} />
          </div>
        </div>
      </div>

      {/* QR Modal — appears after save succeeds */}
      {qrOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setQrOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-modal-title"
        >
          <div
            className="bg-white dark:bg-[#16161e] rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setQrOpen(false)}
              aria-label="Close"
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <h2 id="qr-modal-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">Your loyalty card QR</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-center gap-1.5">
                <Smartphone className="w-4 h-4" />
                Customers scan to add it to Apple or Google Wallet
              </p>
            </div>

            {qrDataUrl && (
              <div className="flex justify-center mb-5">
                <div className="bg-white dark:bg-[#16161e] border-2 border-gray-100 dark:border-gray-800 rounded-2xl p-4">
                  <Image src={qrDataUrl} alt="Loyalty card QR code" width={240} height={240} unoptimized />
                </div>
              </div>
            )}

            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3 mb-5">
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Pass link</p>
              <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all leading-relaxed">{passUrl}</p>
            </div>

            <div className="flex gap-2">
              <Button variant="primary" onClick={downloadQR} className="flex-1">
                <Download className="w-4 h-4 mr-1.5" />
                Download QR
              </Button>
              <Button variant="outline" onClick={copyLink} className="flex-1">
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-1.5 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1.5" />
                    Copy link
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4">
              Print or display the QR at your counter — every scan creates a fresh wallet pass.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
