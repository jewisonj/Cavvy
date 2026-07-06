import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserProfile } from '@/lib/auth/utils'
import type {
  BreedingEvent,
  FoalingEvent,
  Horse,
  HormoneTreatment,
  UltrasoundCheck,
} from '@/lib/types/database'
import {
  getCheckMilestones,
  getNextMilestone,
  getLatestResult,
  getExpectedDueDate,
  getEstrumateProjection,
  daysSince,
  formatFullDate,
} from '@/lib/utils/breeding'

type DashboardEvent = BreedingEvent & {
  mare: Pick<Horse, 'id' | 'barn_name' | 'registered_name'> | null
  ultrasound_checks: UltrasoundCheck[]
  foaling_events: FoalingEvent[]
}

type DashboardTreatment = HormoneTreatment & {
  mare: Pick<Horse, 'id' | 'barn_name' | 'registered_name'> | null
}

interface ActionItem {
  severity: 'overdue' | 'due_soon' | 'info'
  text: string
  href: string
}

const SEVERITY_CLASSES = {
  overdue: 'bg-red-100 text-red-700',
  due_soon: 'bg-amber-100 text-amber-700',
  info: 'bg-blue-100 text-blue-700',
} as const

const SEVERITY_LABELS = {
  overdue: 'Overdue',
  due_soon: 'Due Soon',
  info: 'Heads Up',
} as const

function mareName(e: { mare: { barn_name?: string; registered_name?: string } | null }): string {
  return e.mare?.barn_name || e.mare?.registered_name || 'Unknown mare'
}

export default async function AppHomePage() {
  const profile = await getCurrentUserProfile()
  const supabase = await createClient()
  const currentYear = new Date().getFullYear()

  const [horsesRes, eventsRes, treatmentsRes] = await Promise.all([
    supabase.from('horses').select('id, sex, owned, broodmare_active, aqha_age_year'),
    supabase
      .from('breeding_events')
      .select(
        `
        *,
        mare:horses!breeding_events_mare_id_fkey(id, barn_name, registered_name),
        ultrasound_checks(*),
        foaling_events(*)
      `
      )
      .in('season_year', [currentYear - 1, currentYear])
      .eq('is_historical', false),
    supabase
      .from('hormone_treatments')
      .select(
        `*, mare:horses!hormone_treatments_mare_id_fkey(id, barn_name, registered_name)`
      )
      .gte('treatment_date', new Date(Date.now() - 9 * 86_400_000).toISOString().slice(0, 10)),
  ])

  const horses: Pick<Horse, 'id' | 'sex' | 'owned' | 'broodmare_active' | 'aqha_age_year'>[] =
    horsesRes.data || []
  const events = (eventsRes.data as DashboardEvent[]) || []
  const treatments = (treatmentsRes.data as DashboardTreatment[]) || []

  // Active pregnancies = bred, not open/lost, not yet foaled
  const active = events.filter((e) => {
    const latest = getLatestResult(e.ultrasound_checks)
    const foaled = e.foaling_events.some((f) => f.actual_date)
    return !foaled && latest !== 'open' && latest !== 'lost'
  })

  // Stats
  const broodmares = horses.filter((h) => h.sex === 'mare' && h.owned && h.broodmare_active).length
  const confirmedInFoal = active.filter((e) => {
    const latest = getLatestResult(e.ultrasound_checks)
    return latest === 'in_foal' || latest === 'twins'
  }).length
  const foalsThisYear = horses.filter(
    (h) => (h.sex === 'filly' || h.sex === 'colt') && h.aqha_age_year === currentYear
  ).length
  const dueSoon = active.filter((e) => daysSince(e.breeding_date) >= 320).length

  // Action items
  const actions: ActionItem[] = []
  for (const e of active) {
    const days = daysSince(e.breeding_date)

    if (days > 350) {
      actions.push({
        severity: 'overdue',
        text: `${mareName(e)} is ${days} days along — past due, check on her`,
        href: '/app/foaling',
      })
      continue
    }
    if (days >= 320) {
      actions.push({
        severity: 'due_soon',
        text: `${mareName(e)} on foaling watch — due ${formatFullDate(getExpectedDueDate(e.breeding_date))}`,
        href: '/app/foaling',
      })
      continue
    }

    const next = getNextMilestone(getCheckMilestones(e.breeding_date, e.ultrasound_checks))
    if (next?.status === 'overdue') {
      actions.push({
        severity: 'overdue',
        text: `${mareName(e)} — ${next.label} was due ${formatFullDate(next.dueDate)}`,
        href: `/app/breeding?year=${e.season_year}`,
      })
    } else if (next?.status === 'due_soon') {
      actions.push({
        severity: 'due_soon',
        text: `${mareName(e)} — ${next.label} due ${formatFullDate(next.dueDate)}`,
        href: `/app/breeding?year=${e.season_year}`,
      })
    }
  }
  for (const t of treatments) {
    if (t.treatment_type !== 'estrumate' && t.treatment_type !== 'lutalyse') continue
    const proj = getEstrumateProjection(t.treatment_date)
    const days = daysSince(t.treatment_date)
    if (days >= 2 && days <= 8) {
      const name = t.mare?.barn_name || t.mare?.registered_name || 'Unknown mare'
      actions.push({
        severity: 'info',
        text: `${name} short-cycled ${formatFullDate(new Date(t.treatment_date + 'T00:00:00'))} — watch for heat, breed ${formatFullDate(proj.breedStart)}–${formatFullDate(proj.breedEnd)}`,
        href: `/app/breeding?year=${currentYear}`,
      })
    }
  }
  const severityOrder = { overdue: 0, due_soon: 1, info: 2 }
  actions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  const stats = [
    { label: 'Active Broodmares', value: broodmares, href: '/app/horses' },
    { label: 'Confirmed In Foal', value: confirmedInFoal, href: `/app/breeding?year=${currentYear}` },
    { label: 'On Foaling Watch', value: dueSoon, href: '/app/foaling' },
    { label: `${currentYear} Foals`, value: foalsThisYear, href: '/app/horses' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome, {profile?.display_name}</h1>
        <p className="text-text-secondary">
          {currentYear} season at a glance
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="panel panel-hover p-5">
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-sm text-text-secondary mt-1">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Action items */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Needs Attention</h2>
        {actions.length === 0 ? (
          <div className="panel p-6 text-center text-text-secondary text-sm">
            All caught up — no checks due, no mares on watch, no active heat windows.
          </div>
        ) : (
          <div className="space-y-2">
            {actions.map((a, i) => (
              <Link
                key={i}
                href={a.href}
                className="panel panel-hover px-4 py-3 flex items-center gap-3"
              >
                <span
                  className={`shrink-0 inline-flex px-2 py-1 rounded text-xs font-medium ${SEVERITY_CLASSES[a.severity]}`}
                >
                  {SEVERITY_LABELS[a.severity]}
                </span>
                <span className="text-sm">{a.text}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Navigation cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/app/horses" className="panel p-6 panel-hover">
          <h2 className="text-xl font-semibold mb-2">Horses</h2>
          <p className="text-text-secondary text-sm">
            The herd — profiles, family, pedigree, papers
          </p>
        </Link>

        <Link href="/app/breeding" className="panel p-6 panel-hover">
          <h2 className="text-xl font-semibold mb-2">Breeding</h2>
          <p className="text-text-secondary text-sm">
            Season plan — breedings, checks, shots, due dates
          </p>
        </Link>

        <Link href="/app/foaling" className="panel p-6 panel-hover">
          <h2 className="text-xl font-semibold mb-2">Foaling</h2>
          <p className="text-text-secondary text-sm">
            Mares expecting, foaling watch, new foals
          </p>
        </Link>

        <div className="panel p-6 opacity-50">
          <h2 className="text-xl font-semibold mb-2">Dictation</h2>
          <p className="text-text-secondary text-sm">
            Voice-powered data entry (Coming Soon)
          </p>
        </div>
      </div>
    </div>
  )
}
