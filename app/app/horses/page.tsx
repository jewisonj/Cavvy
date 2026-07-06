import { createClient } from '@/lib/supabase/server'
import HorsesList from '@/components/horses/HorsesList'
import Link from 'next/link'

export default async function HorsesPage() {
  const supabase = await createClient()

  // Fetch all horses with their dam and sire info
  const { data: horses, error } = await supabase
    .from('horses')
    .select(`
      *,
      dam:horses!horses_dam_id_fkey(id, barn_name, registered_name),
      sire:horses!horses_sire_id_fkey(id, barn_name, registered_name)
    `)
    .order('barn_name', { ascending: true, nullsFirst: false })
    .order('registered_name', { ascending: true })

  if (error) {
    console.error('Error fetching horses:', error)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Horses</h1>
          <p className="text-text-secondary">
            Manage your broodmares, foals, and stallions
          </p>
        </div>
        <Link href="/app/horses/new" className="btn-primary">
          Add Horse
        </Link>
      </div>

      {error ? (
        <div className="panel p-6 text-center">
          <p className="text-red-600">Error loading horses. Please try again.</p>
        </div>
      ) : (
        <HorsesList horses={horses || []} />
      )}
    </div>
  )
}
