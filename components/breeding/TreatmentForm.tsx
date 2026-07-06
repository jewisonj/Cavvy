'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Horse, HormoneTreatmentType } from '@/lib/types/database'
import { getEstrumateProjection, formatFullDate } from '@/lib/utils/breeding'

const TREATMENT_OPTIONS: { value: HormoneTreatmentType; label: string }[] = [
  { value: 'estrumate', label: 'Estrumate (cloprostenol)' },
  { value: 'lutalyse', label: 'Lutalyse (dinoprost)' },
  { value: 'regumate', label: 'Regumate (altrenogest)' },
  { value: 'deslorelin', label: 'Deslorelin (SucroMate)' },
  { value: 'hcg', label: 'hCG' },
  { value: 'oxytocin', label: 'Oxytocin' },
  { value: 'other', label: 'Other' },
]

// Prostaglandins short-cycle the mare, so the shot projects a heat window
const SHORT_CYCLING: HormoneTreatmentType[] = ['estrumate', 'lutalyse']

interface TreatmentFormProps {
  mares: Pick<Horse, 'id' | 'barn_name' | 'registered_name'>[]
  performedBy: string
  defaultMareId?: string
  onDone: () => void
}

export default function TreatmentForm({
  mares,
  performedBy,
  defaultMareId,
  onDone,
}: TreatmentFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    mare_id: defaultMareId || '',
    treatment_date: new Date().toISOString().slice(0, 10),
    treatment_type: 'estrumate' as HormoneTreatmentType,
    dose: '',
    vet_present: false,
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const projection =
    SHORT_CYCLING.includes(formData.treatment_type) && formData.treatment_date
      ? getEstrumateProjection(formData.treatment_date)
      : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.mare_id) {
      setError('Select a mare')
      return
    }
    setLoading(true)

    const { error: insertError } = await supabase.from('hormone_treatments').insert({
      mare_id: formData.mare_id,
      treatment_date: formData.treatment_date,
      treatment_type: formData.treatment_type,
      dose: formData.dose || null,
      administered_by: performedBy,
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
          <label className="form-label">
            Treatment <span className="text-red-600">*</span>
          </label>
          <select
            value={formData.treatment_type}
            onChange={(e) =>
              setFormData({
                ...formData,
                treatment_type: e.target.value as HormoneTreatmentType,
              })
            }
            required
            className="form-input"
          >
            {TREATMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">
            Date Given <span className="text-red-600">*</span>
          </label>
          <input
            type="date"
            value={formData.treatment_date}
            onChange={(e) => setFormData({ ...formData, treatment_date: e.target.value })}
            required
            className="form-input"
          />
        </div>
      </div>

      <div>
        <label className="form-label">Dose</label>
        <input
          type="text"
          value={formData.dose}
          onChange={(e) => setFormData({ ...formData, dose: e.target.value })}
          className="form-input"
          placeholder="e.g. 2 mL IM"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="treatment_vet_present"
          checked={formData.vet_present}
          onChange={(e) => setFormData({ ...formData, vet_present: e.target.checked })}
          className="w-4 h-4"
        />
        <label htmlFor="treatment_vet_present" className="ml-2 text-sm">
          Vet administered
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

      {/* Computed short-cycle projection */}
      {projection && (
        <div className="panel p-4">
          <p className="text-sm font-medium mb-2">Projected from this shot:</p>
          <ul className="text-sm text-text-secondary space-y-1">
            <li>
              Expect heat — {formatFullDate(projection.heatStart)} to{' '}
              {formatFullDate(projection.heatEnd)}
            </li>
            <li>
              Breeding window — {formatFullDate(projection.breedStart)} to{' '}
              {formatFullDate(projection.breedEnd)}
            </li>
          </ul>
        </div>
      )}

      {error && <div className="alert-error">{error}</div>}

      <div className="flex gap-3">
        <button type="button" onClick={onDone} className="btn-secondary flex-1" disabled={loading}>
          Cancel
        </button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? 'Saving...' : 'Record Shot'}
        </button>
      </div>
    </form>
  )
}
