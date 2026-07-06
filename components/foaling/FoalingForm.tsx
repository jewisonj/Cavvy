'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { FoalingOutcome } from '@/lib/types/database'
import { getExpectedDueDate } from '@/lib/utils/breeding'

const OUTCOME_OPTIONS: { value: FoalingOutcome; label: string }[] = [
  { value: 'live', label: 'Live foal' },
  { value: 'dystocia_live', label: 'Dystocia — live foal' },
  { value: 'stillborn', label: 'Stillborn' },
  { value: 'aborted', label: 'Aborted' },
  { value: 'dystocia_loss', label: 'Dystocia — loss' },
]

const LIVE_OUTCOMES: FoalingOutcome[] = ['live', 'dystocia_live']

interface FoalingFormProps {
  breedingEventId: string
  mareId: string
  mareName: string
  stallionId?: string | null
  breedingDate: string
  onDone: () => void
}

export default function FoalingForm({
  breedingEventId,
  mareId,
  mareName,
  stallionId,
  breedingDate,
  onDone,
}: FoalingFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    actual_date: new Date().toISOString().slice(0, 10),
    actual_time: '',
    outcome: 'live' as FoalingOutcome,
    foal_sex: 'filly' as 'filly' | 'colt',
    foal_barn_name: '',
    complications: '',
    vet_attended: false,
    placenta_passed: true,
    placenta_intact: true,
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const liveFoal = LIVE_OUTCOMES.includes(formData.outcome)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // A live foal becomes a horse record immediately, with dam and sire
      // wired in from the breeding — this is what links the family together.
      let foalId: string | null = null
      if (liveFoal) {
        const { data: foal, error: foalError } = await supabase
          .from('horses')
          .insert({
            barn_name: formData.foal_barn_name || null,
            sex: formData.foal_sex,
            dob: formData.actual_date,
            aqha_age_year: Number(formData.actual_date.slice(0, 4)),
            dam_id: mareId,
            sire_id: stallionId || null,
            owned: true,
          })
          .select('id')
          .single()
        if (foalError) throw foalError
        foalId = foal.id
      }

      const { error: eventError } = await supabase.from('foaling_events').insert({
        breeding_event_id: breedingEventId,
        mare_id: mareId,
        foal_id: foalId,
        expected_date: getExpectedDueDate(breedingDate).toISOString().slice(0, 10),
        actual_date: formData.actual_date,
        actual_time: formData.actual_time || null,
        outcome: formData.outcome,
        complications: formData.complications || null,
        vet_attended: formData.vet_attended,
        placenta_passed: formData.placenta_passed,
        placenta_intact: formData.placenta_intact,
        notes: formData.notes || null,
      })
      if (eventError) throw eventError

      router.refresh()
      onDone()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record foaling')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">
            Foaling Date <span className="text-red-600">*</span>
          </label>
          <input
            type="date"
            value={formData.actual_date}
            onChange={(e) => setFormData({ ...formData, actual_date: e.target.value })}
            required
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">Time</label>
          <input
            type="time"
            value={formData.actual_time}
            onChange={(e) => setFormData({ ...formData, actual_time: e.target.value })}
            className="form-input"
          />
        </div>
      </div>

      <div>
        <label className="form-label">
          Outcome <span className="text-red-600">*</span>
        </label>
        <select
          value={formData.outcome}
          onChange={(e) => setFormData({ ...formData, outcome: e.target.value as FoalingOutcome })}
          required
          className="form-input"
        >
          {OUTCOME_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {liveFoal && (
        <div className="panel p-4 space-y-4">
          <p className="text-sm font-medium">
            New foal record — automatically linked to {mareName} (dam)
            {stallionId ? ' and the sire' : ''}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Sex <span className="text-red-600">*</span>
              </label>
              <select
                value={formData.foal_sex}
                onChange={(e) =>
                  setFormData({ ...formData, foal_sex: e.target.value as 'filly' | 'colt' })
                }
                required
                className="form-input"
              >
                <option value="filly">Filly</option>
                <option value="colt">Colt</option>
              </select>
            </div>
            <div>
              <label className="form-label">Barn Name</label>
              <input
                type="text"
                value={formData.foal_barn_name}
                onChange={(e) => setFormData({ ...formData, foal_barn_name: e.target.value })}
                className="form-input"
                placeholder={`Blank = "${mareName}'s baby ${formData.foal_sex}"`}
              />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="flex items-center text-sm">
          <input
            type="checkbox"
            checked={formData.vet_attended}
            onChange={(e) => setFormData({ ...formData, vet_attended: e.target.checked })}
            className="w-4 h-4 mr-2"
          />
          Vet attended
        </label>
        <label className="flex items-center text-sm">
          <input
            type="checkbox"
            checked={formData.placenta_passed}
            onChange={(e) => setFormData({ ...formData, placenta_passed: e.target.checked })}
            className="w-4 h-4 mr-2"
          />
          Placenta passed
        </label>
        <label className="flex items-center text-sm">
          <input
            type="checkbox"
            checked={formData.placenta_intact}
            onChange={(e) => setFormData({ ...formData, placenta_intact: e.target.checked })}
            className="w-4 h-4 mr-2"
          />
          Placenta intact
        </label>
      </div>

      <div>
        <label className="form-label">Complications</label>
        <textarea
          value={formData.complications}
          onChange={(e) => setFormData({ ...formData, complications: e.target.value })}
          rows={2}
          className="form-input"
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

      {error && <div className="alert-error">{error}</div>}

      <div className="flex gap-3">
        <button type="button" onClick={onDone} className="btn-secondary flex-1" disabled={loading}>
          Cancel
        </button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? 'Saving...' : 'Record Foaling'}
        </button>
      </div>
    </form>
  )
}
