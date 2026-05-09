'use client'

import { useState, useRef, useEffect } from 'react'
import type { Employee, Business, Location } from '@/lib/supabase/types'
import { toast } from '@/lib/hooks/use-toast'
import { QrCode, Gift, CheckCircle, XCircle, Camera } from 'lucide-react'

interface Props {
  employee: Employee
  business: Business
  locations: Location[]
}

type ScanState = 'idle' | 'scanning' | 'processing' | 'success' | 'error' | 'reward'

interface ScanResult {
  stampCount: number
  stampGoal: number
  isRewardReady: boolean
}

export function ScannerClient({ employee, business, locations }: Props) {
  const [selectedLocationId, setSelectedLocationId] = useState(
    locations.length === 1 ? locations[0].id : employee.location_id || ''
  )
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [mode, setMode] = useState<'stamp' | 'redeem'>('stamp')
  const [manualPassId, setManualPassId] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const isManagerOrOwner = ['owner', 'manager'].includes(employee.role)

  async function startCamera() {
    setScanState('scanning')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      startQRScanning()
    } catch {
      toast({ title: 'Camera access denied', description: 'Enable camera permissions in your browser settings.', variant: 'destructive' })
      setScanState('idle')
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
  }

  function startQRScanning() {
    // Use BarcodeDetector API if available
    if ('BarcodeDetector' in window) {
      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return
        try {
          const codes = await detector.detect(videoRef.current)
          if (codes.length > 0) {
            const passId = codes[0].rawValue
            stopCamera()
            await processPassId(passId)
          }
        } catch {}
      }, 200)
    } else {
      // Fallback: canvas-based scan (simplified — real QR decode requires a library)
      toast({
        title: 'Camera scanning unavailable',
        description: 'Use manual entry below.',
        variant: 'default',
      })
      setScanState('idle')
    }
  }

  async function processPassId(passId: string) {
    if (!selectedLocationId) {
      toast({ title: 'Please select a location first', variant: 'destructive' })
      setScanState('idle')
      return
    }

    setScanState('processing')

    const endpoint = mode === 'stamp' ? '/api/stamps' : '/api/stamps/redeem'
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passId, locationId: selectedLocationId }),
    })

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Unknown error' }))
      setScanState('error')
      toast({ title: error || 'Failed', variant: 'destructive' })
      setTimeout(() => setScanState('idle'), 2000)
      return
    }

    const data = await res.json()
    setScanResult(data)
    setScanState(data.isRewardReady && mode === 'stamp' ? 'reward' : 'success')
    setTimeout(() => {
      setScanState('idle')
      setScanResult(null)
    }, 3000)
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!manualPassId.trim()) return
    await processPassId(manualPassId.trim())
    setManualPassId('')
  }

  useEffect(() => {
    return () => stopCamera()
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="px-5 py-4 flex items-center justify-between border-b border-gray-800">
        <div>
          <h1 className="font-bold text-white">{business.name}</h1>
          <p className="text-xs text-gray-400 capitalize">{employee.role} Scanner</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-400">Live</span>
        </div>
      </header>

      {/* Location selector */}
      {locations.length > 1 && (
        <div className="px-5 py-3 bg-gray-800">
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="w-full bg-gray-700 text-white rounded-xl px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select location…</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Mode tabs */}
      <div className="px-5 py-3 flex gap-2">
        <button
          onClick={() => setMode('stamp')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            mode === 'stamp' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Add Stamp
        </button>
        {isManagerOrOwner && (
          <button
            onClick={() => setMode('redeem')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              mode === 'redeem' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Redeem Reward
          </button>
        )}
      </div>

      {/* Main scanner area */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 gap-6">
        {/* State: idle */}
        {scanState === 'idle' && (
          <div className="text-center w-full max-w-xs">
            <div className="w-32 h-32 rounded-3xl bg-gray-800 flex items-center justify-center mx-auto mb-6 scanner-pulse">
              {mode === 'stamp' ? (
                <QrCode className="w-14 h-14 text-indigo-400" />
              ) : (
                <Gift className="w-14 h-14 text-green-400" />
              )}
            </div>
            <h2 className="text-xl font-bold mb-2">
              {mode === 'stamp' ? 'Scan Customer Card' : 'Redeem Reward'}
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              {mode === 'stamp'
                ? 'Ask the customer to show their Wallet card QR code'
                : 'Ask the customer to show their Wallet card — reward must be ready'}
            </p>
            <button
              onClick={startCamera}
              disabled={!selectedLocationId}
              className="w-full py-4 rounded-2xl font-bold text-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Open Camera
            </button>
            {!selectedLocationId && locations.length > 1 && (
              <p className="text-xs text-yellow-400 mt-2">Select a location first</p>
            )}
          </div>
        )}

        {/* State: scanning */}
        {scanState === 'scanning' && (
          <div className="w-full max-w-xs">
            <div className="relative rounded-3xl overflow-hidden bg-black aspect-square">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-indigo-400 rounded-2xl relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />
                </div>
              </div>
            </div>
            <button
              onClick={() => { stopCamera(); setScanState('idle') }}
              className="w-full mt-4 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* State: processing */}
        {scanState === 'processing' && (
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4 animate-spin">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full" />
            </div>
            <p className="text-gray-400">Processing…</p>
          </div>
        )}

        {/* State: success */}
        {scanState === 'success' && scanResult && (
          <div className="text-center slide-up">
            <div className="w-32 h-32 rounded-full bg-green-900 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-16 h-16 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-green-400 mb-1">
              {mode === 'stamp' ? 'Stamp Added!' : 'Reward Redeemed!'}
            </h2>
            {mode === 'stamp' && (
              <p className="text-gray-400 text-lg tabular-nums">
                {scanResult.stampCount} / {scanResult.stampGoal} stamps
              </p>
            )}
          </div>
        )}

        {/* State: reward ready */}
        {scanState === 'reward' && scanResult && (
          <div className="text-center slide-up">
            <div className="w-32 h-32 rounded-full bg-yellow-900 flex items-center justify-center mx-auto mb-6 stamp-pop">
              <Gift className="w-16 h-16 text-yellow-400" />
            </div>
            <h2 className="text-2xl font-bold text-yellow-400 mb-1">Reward Unlocked!</h2>
            <p className="text-gray-300 text-base">
              {scanResult.stampCount} / {scanResult.stampGoal} stamps
            </p>
            <p className="text-gray-400 text-sm mt-2">Customer has earned their reward</p>
          </div>
        )}

        {/* State: error */}
        {scanState === 'error' && (
          <div className="text-center slide-up">
            <div className="w-32 h-32 rounded-full bg-red-900 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-16 h-16 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-red-400">Failed</h2>
          </div>
        )}
      </div>

      {/* Manual entry fallback */}
      {(scanState === 'idle') && (
        <div className="px-5 pb-8">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualPassId}
              onChange={(e) => setManualPassId(e.target.value)}
              placeholder="Paste pass ID manually…"
              className="flex-1 bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
