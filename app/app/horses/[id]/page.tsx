import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserProfile } from '@/lib/auth/utils'
import HorseDetail from '@/components/horses/HorseDetail'

export default async function HorseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getCurrentUserProfile()

  const { data: horse } = await supabase
    .from('horses')
    .select(
      `
      *,
      dam:horses!horses_dam_id_fkey(id, barn_name, registered_name, sex, profile_photo_url),
      sire:horses!horses_sire_id_fkey(id, barn_name, registered_name, sex, profile_photo_url)
    `
    )
    .eq('id', id)
    .single()

  if (!horse) {
    notFound()
  }

  const [offspringRes, eventsRes, treatmentsRes, documentsRes, herdRes] = await Promise.all([
    // Family: every horse this one produced, as dam or sire
    supabase
      .from('horses')
      .select('id, barn_name, registered_name, sex, dob, aqha_age_year, profile_photo_url, dam_id, sire_id')
      .or(`dam_id.eq.${id},sire_id.eq.${id}`)
      .order('dob', { ascending: false, nullsFirst: false }),
    // Breeding history: as mare or as stallion
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
      .or(`mare_id.eq.${id},stallion_id.eq.${id}`)
      .order('breeding_date', { ascending: false }),
    supabase
      .from('hormone_treatments')
      .select('*')
      .eq('mare_id', id)
      .order('treatment_date', { ascending: false })
      .limit(20),
    supabase
      .from('documents')
      .select('*')
      .eq('horse_id', id)
      .order('uploaded_at', { ascending: false }),
    // Full roster for the in-system pedigree tree (herd is small)
    supabase
      .from('horses')
      .select('id, registered_name, barn_name, sex, sire_id, dam_id, pedigree_url'),
  ])

  return (
    <HorseDetail
      horse={horse}
      offspring={offspringRes.data || []}
      events={eventsRes.data || []}
      treatments={treatmentsRes.data || []}
      documents={documentsRes.data || []}
      herd={herdRes.data || []}
      canEdit={profile?.role === 'owner' || profile?.role === 'staff'}
    />
  )
}
