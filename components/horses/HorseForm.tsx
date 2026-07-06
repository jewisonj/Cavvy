'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Horse, SexEnum } from '@/lib/types/database'
import { calculateAQHAAgeYear } from '@/lib/utils/horse'

interface HorseFormProps {
  horse?: Horse
  allHorses: Pick<Horse, 'id' | 'barn_name' | 'registered_name' | 'sex'>[]
}

export default function HorseForm({ horse, allHorses }: HorseFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    barn_name: horse?.barn_name || '',
    registered_name: horse?.registered_name || '',
    aqha_number: horse?.aqha_number || '',
    sex: horse?.sex || 'mare' as SexEnum,
    dob: horse?.dob || '',
    color: horse?.color || '',
    markings: horse?.markings || '',
    sire_id: horse?.sire_id || '',
    dam_id: horse?.dam_id || '',
    owned: horse?.owned ?? true,
    acquired_date: horse?.acquired_date || '',
    broodmare_active: horse?.broodmare_active ?? false,
    pedigree_url: horse?.pedigree_url || '',
    drive_folder_url: horse?.drive_folder_url || '',
    photos_album_url: horse?.photos_album_url || '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Calculate AQHA age year from DOB if provided
      const aqhaAgeYear = formData.dob
        ? calculateAQHAAgeYear(formData.dob)
        : null

      const horseData = {
        ...formData,
        aqha_age_year: aqhaAgeYear,
        // Convert empty strings to null for optional fields
        barn_name: formData.barn_name || null,
        registered_name: formData.registered_name || null,
        aqha_number: formData.aqha_number || null,
        dob: formData.dob || null,
        color: formData.color || null,
        markings: formData.markings || null,
        sire_id: formData.sire_id || null,
        dam_id: formData.dam_id || null,
        acquired_date: formData.acquired_date || null,
        pedigree_url: formData.pedigree_url || null,
        drive_folder_url: formData.drive_folder_url || null,
        photos_album_url: formData.photos_album_url || null,
      }

      if (horse) {
        // Update existing horse
        const { error: updateError } = await supabase
          .from('horses')
          .update(horseData)
          .eq('id', horse.id)

        if (updateError) throw updateError
      } else {
        // Insert new horse
        const { error: insertError } = await supabase
          .from('horses')
          .insert(horseData)

        if (insertError) throw insertError
      }

      router.push('/app/horses')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Filter horses for dam/sire selection
  const potentialDams = allHorses.filter(h => h.sex === 'mare' && h.id !== horse?.id)
  const potentialSires = allHorses.filter(h => h.sex === 'stallion' && h.id !== horse?.id)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Barn Name
            </label>
            <input
              type="text"
              value={formData.barn_name}
              onChange={(e) =>
                setFormData({ ...formData, barn_name: e.target.value })
              }
              className="form-input"
              placeholder="What you call her"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Registered Name
            </label>
            <input
              type="text"
              value={formData.registered_name}
              onChange={(e) =>
                setFormData({ ...formData, registered_name: e.target.value })
              }
              className="form-input"
              placeholder="AQHA registered name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              AQHA Number
            </label>
            <input
              type="text"
              value={formData.aqha_number}
              onChange={(e) =>
                setFormData({ ...formData, aqha_number: e.target.value })
              }
              className="form-input"
              placeholder="Registration number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Sex <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.sex}
              onChange={(e) =>
                setFormData({ ...formData, sex: e.target.value as SexEnum })
              }
              required
              className="form-input"
            >
              <option value="mare">Mare</option>
              <option value="stallion">Stallion</option>
              <option value="gelding">Gelding</option>
              <option value="filly">Filly</option>
              <option value="colt">Colt</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Date of Birth
            </label>
            <input
              type="date"
              value={formData.dob}
              onChange={(e) =>
                setFormData({ ...formData, dob: e.target.value })
              }
              className="form-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Color
            </label>
            <input
              type="text"
              value={formData.color}
              onChange={(e) =>
                setFormData({ ...formData, color: e.target.value })
              }
              className="form-input"
              placeholder="Bay, sorrel, etc."
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">
            Markings
          </label>
          <textarea
            value={formData.markings}
            onChange={(e) =>
              setFormData({ ...formData, markings: e.target.value })
            }
            rows={3}
            className="form-input"
            placeholder="Describe any distinctive markings"
          />
        </div>
      </div>

      {/* Lineage */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Lineage</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Dam</label>
            <select
              value={formData.dam_id}
              onChange={(e) =>
                setFormData({ ...formData, dam_id: e.target.value })
              }
              className="form-input"
            >
              <option value="">Not specified</option>
              {potentialDams.map((dam) => (
                <option key={dam.id} value={dam.id}>
                  {dam.barn_name || dam.registered_name || 'Unnamed Mare'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Sire</label>
            <select
              value={formData.sire_id}
              onChange={(e) =>
                setFormData({ ...formData, sire_id: e.target.value })
              }
              className="form-input"
            >
              <option value="">Not specified</option>
              {potentialSires.map((sire) => (
                <option key={sire.id} value={sire.id}>
                  {sire.barn_name || sire.registered_name || 'Unnamed Stallion'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ownership */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Ownership & Status</h2>
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="owned"
              checked={formData.owned}
              onChange={(e) =>
                setFormData({ ...formData, owned: e.target.checked })
              }
              className="w-4 h-4 text-accent bg-background border-border rounded focus:ring-accent"
            />
            <label htmlFor="owned" className="ml-2 text-sm">
              Currently owned
            </label>
          </div>

          {formData.sex === 'mare' && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="broodmare_active"
                checked={formData.broodmare_active}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    broodmare_active: e.target.checked,
                  })
                }
                className="w-4 h-4 text-accent bg-background border-border rounded focus:ring-accent"
              />
              <label htmlFor="broodmare_active" className="ml-2 text-sm">
                Active in broodmare program
              </label>
            </div>
          )}

          {formData.owned && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Acquired Date
              </label>
              <input
                type="date"
                value={formData.acquired_date}
                onChange={(e) =>
                  setFormData({ ...formData, acquired_date: e.target.value })
                }
                className="form-input"
              />
            </div>
          )}
        </div>
      </div>

      {/* Google Integration */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Links & Document Storage</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              All Breed Pedigree URL (override)
            </label>
            <input
              type="url"
              value={formData.pedigree_url}
              onChange={(e) =>
                setFormData({ ...formData, pedigree_url: e.target.value })
              }
              className="form-input"
              placeholder="Auto-derived from registered name — only set if that link is wrong"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Google Drive Folder URL
            </label>
            <input
              type="url"
              value={formData.drive_folder_url}
              onChange={(e) =>
                setFormData({ ...formData, drive_folder_url: e.target.value })
              }
              className="form-input"
              placeholder="https://drive.google.com/drive/folders/..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Google Photos Album URL
            </label>
            <input
              type="url"
              value={formData.photos_album_url}
              onChange={(e) =>
                setFormData({ ...formData, photos_album_url: e.target.value })
              }
              className="form-input"
              placeholder="https://photos.app.goo.gl/..."
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-error">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4 pt-6 border-t border-border">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary flex-1"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary flex-1"
          disabled={loading}
        >
          {loading ? 'Saving...' : horse ? 'Update Horse' : 'Add Horse'}
        </button>
      </div>
    </form>
  )
}
