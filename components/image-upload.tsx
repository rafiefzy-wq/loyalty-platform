'use client'

import { useState, useRef } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Upload, X, Loader2, ImageIcon } from 'lucide-react'
import { toast } from '@/lib/hooks/use-toast'

type Target = 'logo' | 'strip'

interface Props {
  label: string
  helpText?: string
  target: Target
  currentUrl?: string | null
  onUploaded?: (url: string) => void
  // aspect: 'square' for logos, 'banner' for strip images
  aspect?: 'square' | 'banner'
}

const MAX_BYTES = 4 * 1024 * 1024 // 4 MB

export function ImageUpload({ label, helpText, target, currentUrl, onUploaded, aspect = 'square' }: Props) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateUploadUrl = useMutation(api.storage.generateUploadUrl)
  const setBusinessLogo = useMutation(api.storage.setBusinessLogo)
  const setCardStripImage = useMutation(api.storage.setCardStripImage)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please choose an image file', variant: 'destructive' })
      return
    }
    if (file.size > MAX_BYTES) {
      toast({ title: 'Image must be under 4 MB', variant: 'destructive' })
      return
    }

    // Optimistic preview using a local object URL
    const localPreview = URL.createObjectURL(file)
    setPreview(localPreview)
    setUploading(true)

    try {
      // 1. Ask Convex for a presigned upload URL
      const uploadUrl = await generateUploadUrl()

      // 2. POST the file directly to Convex storage
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      const { storageId } = (await res.json()) as { storageId: Id<'_storage'> }

      // 3. Save the storage id to the appropriate spot
      const persistedUrl =
        target === 'logo'
          ? await setBusinessLogo({ storageId })
          : await setCardStripImage({ storageId })

      // Swap optimistic preview for the persisted URL (and release the object URL)
      URL.revokeObjectURL(localPreview)
      setPreview(persistedUrl)
      onUploaded?.(persistedUrl)
      toast({ title: 'Image uploaded', variant: 'success' })
    } catch (err) {
      URL.revokeObjectURL(localPreview)
      setPreview(currentUrl ?? null)
      toast({ title: (err as Error).message || 'Upload failed', variant: 'destructive' })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function clearImage() {
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    onUploaded?.('')
  }

  const aspectClass = aspect === 'banner' ? 'aspect-[5/2]' : 'aspect-square'
  const sizeClass = aspect === 'banner' ? 'max-w-sm' : 'w-32'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        {preview && !uploading && (
          <button
            type="button"
            onClick={clearImage}
            className="text-xs text-red-600 hover:text-red-700 inline-flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Remove
          </button>
        )}
      </div>

      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`relative ${sizeClass} ${aspectClass} rounded-xl border-2 border-dashed cursor-pointer transition-colors overflow-hidden
          ${uploading
            ? 'border-indigo-300 bg-indigo-50/50 dark:bg-indigo-900/10'
            : preview
              ? 'border-gray-200 dark:border-gray-700'
              : 'border-gray-300 hover:border-indigo-400 bg-gray-50 dark:bg-gray-800/40 dark:border-gray-700 dark:hover:border-indigo-500'
          }`}
      >
        {preview ? (
          <>
            <img src={preview} alt={label} className="w-full h-full object-contain" />
            {uploading && (
              <div className="absolute inset-0 bg-white/70 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-3 text-center">
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <ImageIcon className="w-6 h-6 mb-1" />
                <p className="text-xs font-medium flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  Click to upload
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {helpText && <p className="text-xs text-gray-400 dark:text-gray-500">{helpText}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />
    </div>
  )
}
