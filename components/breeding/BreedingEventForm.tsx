'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Horse, BreedingMethod } from '@/lib/types/database'
import {
  getCheckMilestones,
  getExpectedDueDate,
  formatFullDate,
} from '@/lib/utils/breeding'

const METHOD_OPTIONS: { value: BreedingMethod; label: string }[] = [
  { value: 'live_cover', label: 'Live Cover' },
  { value: 'ai_fresh', label: 'AI — Fresh' },
  { value: 'ai_cooled', label: 'AI — Cooled' },
  { value: 'ai_frozen', label: 'AI — Frozen' },
  { value: 'embryo_transfer', label: 'Embryo Transfer' },
]

interface BreedingEventFormProps {
  mares: Pick<Horse, 'id' | 'barn_name' | 'registered_name'>[]
  stallions: Pick<Horse, 'id' | 'barn_name' | 'registered_name'>[]
  defaultMareId?: string
  onDone: () => void
}

export default function BreedingEventForm({
  mares,
  stallions,
  defaultMareId,
  onDone,
}: BreedingEventFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    mare_id: defaultMareId || '',
    stallion_id: '',
    stallion_name_freetext: '',
    method: 'ai_cooled' as BreedingMethod,
    breeding_date: new Date().toISOString().slice(0, 10),
    stallion_station: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Live preview of the plan this breeding creates
  const milestones = formData.breeding_date
    ? getCheckMilestones(formData.breeding_date, [])
    : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.mare_id) {
      setError('Select a mare')
      return
    }
    setLoading(true)

    const { error: insertError } = await supabase.from('breeding_events').insert({
      mare_id: formData.mare_id,
      stallion_id: formData.stallion_id || null,
      stallion_name_freetext: formData.stallion_name_freetext || null,
      method: formData.method,
      breeding_date: formData.breeding_date,
      stallion_station: formData.stallion_station || null,
      notes: formData.notes || null,
      season_year: Number(formData.breeding_date.slice(0, 4)),
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
      <div>
        <label className="form-label">
          Mare <span className="text-red-600">*</span>
        </label>
        <select
          value={formData.mare_id}
          onChange={(e) => setFormData({ ...formData, mare_id: e.target.value })}
          required
          className="form-input"
        >
          <option value="">Select mare...</option>
          {mares.map((m) => (
            <option key={m.id} value={m.id}>
              {m.barn_name || m.registered_name || 'Unnamed Mare'}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Stallion</label>
          <select
            value={formData.stallion_id}
            onChange={(e) => setFormData({ ...formData, stallion_id: e.target.value })}
            className="form-input"
          >
            <option value="">Not in system</option>
            {stallions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.barn_name || s.registered_name || 'Unnamed Stallion'}
              </option>
            ))}
          </select>
        </div>

        {!formData.stallion_id && (
          <div>
            <label className="form-label">Stallion Name (free text)</label>
            <input
              type="text"
              value={formData.stallion_name_freetext}
              onChange={(e) =>
                setFormData({ ...formData, stallion_name_freetext: e.target.value })
              }
              className="form-input"
              placeholder="If not in the system"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">
            Method <span className="text-red-600">*</span>
          </label>
          <select
            value={formData.method}
            onChange={(e) =>
              setFormData({ ...formData, method: e.target.value as BreedingMethod })
            }
            required
            className="form-input"
          >
            {METHOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">
            Breeding Date <span className="text-red-600">*</span>
          </label>
          <input
            type="date"
            value={formData.breeding_date}
            onChange={(e) => setFormData({ ...formData, breeding_date: e.target.value })}
            required
            className="form-input"
          />
        </div>
      </div>

      <div>
        <label className="form-label">Stallion Station</label>
        <input
          type="text"
          value={formData.stallion_station}
          onChange={(e) => setFormData({ ...formData, stallion_station: e.target.value })}
          className="form-input"
          placeholder="Location / facility"
        />
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

      {/* Computed plan preview */}
      {formData.breeding_date && (
        <div className="panel p-4">
          <p className="text-sm font-medium mb-2">This breeding sets the plan:</p>
          <ul className="text-sm text-text-secondary space-y-1">
            {milestones.map((m) => (
              <li key={m.key}>
                {m.label} — {formatFullDate(m.dueDate)}
              </li>
            ))}
            <li className="font-medium text-text-primary">
              Expected due date — {formatFullDate(getExpectedDueDate(formData.breeding_date))}
            </li>
          </ul>
        </div>
      )}

      {error && <div className="alert-error">{error}</div>}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onDone} className="btn-secondary flex-1" disabled={loading}>
          Cancel
        </button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? 'Saving...' : 'Record Breeding'}
        </button>
      </div>
    </form>
  )
}
