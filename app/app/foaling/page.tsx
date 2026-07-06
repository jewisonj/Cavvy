import { createClient } from '@/lib/supabase/server'
import FoalingBoard, {
  type FoalingBoardEvent,
  type RecentFoaling,
} from '@/components/foaling/FoalingBoard'

export default async function FoalingPage() {
  const supabase = await createClient()

  // Gestation crosses the year boundary, so pull the last two seasons of
  // breedings; the board filters to pregnancies still in progress.
  const currentYear = new Date().getFullYear()

  const [eventsRes, foalingsRes] = await Promise.all([
    supabase
      .from('breeding_events')
      .select(
        `
        *,
        mare:horses!breeding_events_mare_id_fkey(id, barn_name, registered_name, sex),
        stallion:horses!breeding_events_stallion_id_fkey(id, barn_name, registered_name, sex),
        ultrasound_checks(*),
        foaling_events(*)
      `
      )
      .in('season_year', [currentYear - 1, currentYear])
      .eq('is_historical', false)
      .order('breeding_date', { ascending: true }),
    supabase
      .from('foaling_events')
      .select(
        `
        *,
        mare:horses!foaling_events_mare_id_fkey(id, barn_name, registered_name, sex),
        foal:horses!foaling_events_foal_id_fkey(id, barn_name, registered_name, sex)
      `
      )
      .not('actual_date', 'is', null)
      .gte('actual_date', `${currentYear}-01-01`)
      .order('actual_date', { ascending: false }),
  ])

  const error = eventsRes.error || foalingsRes.error
  if (error) {
    console.error('Error loading foaling data:', error)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Foaling</h1>
        <p className="text-text-secondary">
          Mares expecting, foaling watch, and this year&apos;s foals — recording a foaling
          creates the foal&apos;s record with dam and sire already linked
        </p>
      </div>

      {error ? (
        <div className="panel p-6 text-center">
          <p className="text-red-600">Error loading foaling data. Please try again.</p>
        </div>
      ) : (
        <FoalingBoard
          events={(eventsRes.data as FoalingBoardEvent[]) || []}
          recentFoalings={(foalingsRes.data as RecentFoaling[]) || []}
        />
      )}
    </div>
  )
}
