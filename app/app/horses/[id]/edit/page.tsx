import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HorseForm from '@/components/horses/HorseForm'
import { getHorseDisplayName } from '@/lib/utils/horse'

export default async function EditHorsePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: horse }, { data: allHorses }] = await Promise.all([
    supabase.from('horses').select('*').eq('id', id).single(),
    supabase
      .from('horses')
      .select('id, barn_name, registered_name, sex')
      .order('barn_name', { ascending: true }),
  ])

  if (!horse) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Edit {getHorseDisplayName(horse)}</h1>
        <p className="text-text-secondary">Update this horse&apos;s record</p>
      </div>

      <div className="panel p-6">
        <HorseForm horse={horse} allHorses={allHorses || []} />
      </div>
    </div>
  )
}
