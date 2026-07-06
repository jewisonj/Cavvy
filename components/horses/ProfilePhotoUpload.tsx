'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const BUCKET = 'breman-media'

interface ProfilePhotoUploadProps {
  horseId: string
  currentUrl?: string
}

export default function ProfilePhotoUpload({ horseId, currentUrl }: ProfilePhotoUploadProps) {
  const router = useRouter()
  const supabase = createClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const savePhotoUrl = async (url: string | null) => {
    const { error: updateError } = await supabase
      .from('horses')
      .update({ profile_photo_url: url })
      .eq('id', horseId)
    if (updateError) throw updateError
    router.refresh()
  }

  const handleFile = async (file: File) => {
    setError(null)
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `horses/${horseId}/profile-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      await savePhotoUrl(data.publicUrl)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleUrlPaste = async () => {
    const url = window.prompt('Paste a photo URL:', currentUrl || '')
    if (url === null) return
    setError(null)
    try {
      await savePhotoUrl(url || null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save photo URL')
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="btn-primary text-sm"
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : currentUrl ? 'Replace Photo' : 'Upload Photo'}
        </button>
        <button type="button" onClick={handleUrlPaste} className="btn-secondary text-sm">
          Use Photo URL
        </button>
      </div>
      <p className="text-xs text-text-muted">
        Uploads go to the shared project&apos;s <code>{BUCKET}</code> storage bucket.
      </p>
      {error && <div className="alert-error p-3 text-sm">{error}</div>}
    </div>
  )
}
