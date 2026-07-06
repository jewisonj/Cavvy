'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { UltrasoundResult } from '@/lib/types/database'
import { parseDateOnly, RESULT_LABELS } from '@/lib/utils/breeding'

interface UltrasoundCheckFormProps {
  breedingEventId: string
  mareId: string
  breedingDate: string
  performedBy: string
  onDone: () => void
}

export default function UltrasoundCheckForm({
  breedingEventId,
  mareId,
  breedingDate,
  performedBy,
  onDone,
}: UltrasoundCheckFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    check_date: new Date().toISOString().slice(0, 10),
    result: 'in_foal' as UltrasoundResult,
    vet_present: true,
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const daysPostBreeding = formData.check_date
    ? Math.round(
        (parseDateOnly(formData.check_date).getTime() -
          parseDateOnly(breedingDate).getTime()) /
          86_400_000
      )
    : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (daysPostBreeding < 0) {
      setError('Check date is before the breeding date')
      return
    }
    setLoading(true)

    const { error: insertError } = await supabase.from('ultrasound_checks').insert({
      breeding_event_id: breedingEventId,
      mare_id: mareId,
      check_date: formData.check_date,
      days_post_breeding: daysPostBreeding,
      result: formData.result,
      performed_by: performedBy,
      vet_present: formData.vet_present,
      notes: formData.notes || null,
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">
            Check Date <span className="text-red-600">*</span>
          </label>
          <input
            type="date"
            value={formData.check_date}
            onChange={(e) => setFormData({ ...formData, check_date: e.target.value })}
            required
            className="form-input"
          />
          <p className="mt-1 text-xs text-text-muted">
            Day {daysPostBreeding} post-breeding
          </p>
        </div>

        <div>
          <label className="form-label">
            Result <span className="text-red-600">*</span>
          </label>
          <select
            value={formData.result}
            onChange={(e) =>
              setFormData({ ...formData, result: e.target.value as UltrasoundResult })
            }
            required
            className="form-input"
          >
            {(Object.keys(RESULT_LABELS) as UltrasoundResult[]).map((r) => (
              <option key={r} value={r}>
                {RESULT_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="vet_present"
          checked={formData.vet_present}
          onChange={(e) => setFormData({ ...formData, vet_present: e.target.checked })}
          className="w-4 h-4"
        />
        <label htmlFor="vet_present" className="ml-2 text-sm">
          Vet performed this check
        </label>
      </div>

      <div>
        <label className="form-label">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
          className="form-input"
        />
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="flex gap-3">
        <button type="button" onClick={onDone} className="btn-secondary flex-1" disabled={loading}>
          Cancel
        </button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? 'Saving...' : 'Record Check'}
        </button>
      </div>
    </form>
  )
}
