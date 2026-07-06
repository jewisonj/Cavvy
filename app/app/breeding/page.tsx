import { createClient } from '@/lib/supabase/server'
import { getCurrentUserProfile } from '@/lib/auth/utils'
import BreedingSeasonView, {
  type SeasonEvent,
  type SeasonTreatment,
} from '@/components/breeding/BreedingSeasonView'

export default async function BreedingPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const { year } = await searchParams
  const seasonYear = Number(year) || new Date().getFullYear()

  const supabase = await createClient()
  const profile = await getCurrentUserProfile()

  const [eventsRes, treatmentsRes, maresRes, stallionsRes] = await Promise.all([
    supabase
      .from('breeding_events')
      .select(
        `
        *,
        mare:horses!breeding_events_mare_id_fkey(id, barn_name, registered_name),
        stallion:horses!breeding_events_stallion_id_fkey(id, barn_name, registered_name),
        ultrasound_checks(*)
      `
      )
      .eq('season_year', seasonYear)
      .order('breeding_date', { ascending: false }),
    supabase
      .from('hormone_treatments')
      .select(
        `
        *,
        mare:horses!hormone_treatments_mare_id_fkey(id, barn_name, registered_name)
      `
      )
      .gte('treatment_date', `${seasonYear}-01-01`)
      .lte('treatment_date', `${seasonYear}-12-31`)
      .order('treatment_date', { ascending: false }),
    supabase
      .from('horses')
      .select('id, barn_name, registered_name')
      .eq('sex', 'mare')
      .order('barn_name', { ascending: true, nullsFirst: false }),
    supabase
      .from('horses')
      .select('id, barn_name, registered_name')
      .eq('sex', 'stallion')
      .order('barn_name', { ascending: true, nullsFirst: false }),
  ])

  const error = eventsRes.error || treatmentsRes.error || maresRes.error || stallionsRes.error
  if (error) {
    console.error('Error loading breeding season:', error)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Breeding</h1>
        <p className="text-text-secondary">
          Season plan — breedings, check schedule, shots, and due dates
        </p>
      </div>

      {error ? (
        <div className="panel p-6 text-center">
          <p className="text-red-600">Error loading breeding data. Please try again.</p>
        </div>
      ) : (
        <BreedingSeasonView
          seasonYear={seasonYear}
          events={(eventsRes.data as SeasonEvent[]) || []}
          treatments={(treatmentsRes.data as SeasonTreatment[]) || []}
          mares={maresRes.data || []}
          stallions={stallionsRes.data || []}
          performedBy={profile?.display_name || 'Unknown'}
        />
      )}
    </div>
  )
}
