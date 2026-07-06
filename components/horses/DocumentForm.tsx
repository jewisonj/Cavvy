'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { DocType } from '@/lib/types/database'

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  registration: 'Registration Papers',
  contract: 'Breeding Contract',
  coggins: 'Coggins',
  health_cert: 'Health Certificate',
  vet_record: 'Vet Record',
  other: 'Other',
}

interface DocumentFormProps {
  horseId: string
  onDone: () => void
}

export default function DocumentForm({ horseId, onDone }: DocumentFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    title: '',
    doc_type: 'registration' as DocType,
    drive_url: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: insertError } = await supabase.from('documents').insert({
      horse_id: horseId,
      doc_type: formData.doc_type,
      drive_url: formData.drive_url,
      title: formData.title,
    })

    setLoading(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    router.refresh()
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="panel p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">
            Title <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="form-input"
            placeholder="e.g. AQHA Registration Certificate"
          />
        </div>

        <div>
          <label className="form-label">
            Type <span className="text-red-600">*</span>
          </label>
          <select
            value={formData.doc_type}
            onChange={(e) => setFormData({ ...formData, doc_type: e.target.value as DocType })}
            required
            className="form-input"
          >
            {(Object.keys(DOC_TYPE_LABELS) as DocType[]).map((t) => (
              <option key={t} value={t}>
                {DOC_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="form-label">
          Link (Google Drive or other URL) <span className="text-red-600">*</span>
        </label>
        <input
          type="url"
          value={formData.drive_url}
          onChange={(e) => setFormData({ ...formData, drive_url: e.target.value })}
          required
          className="form-input"
          placeholder="https://drive.google.com/file/d/..."
        />
      </div>

      {error && <div className="alert-error p-3 text-sm">{error}</div>}

      <div className="flex gap-3">
        <button type="button" onClick={onDone} className="btn-secondary flex-1" disabled={loading}>
          Cancel
        </button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? 'Saving...' : 'Add Document'}
        </button>
      </div>
    </form>
  )
}
