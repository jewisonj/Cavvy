// Breeding planning date math.
// Planned dates are COMPUTED from anchor events (breeding date, estrumate shot),
// never stored — same no-drift philosophy as the computed mare status.
import type { UltrasoundCheck, UltrasoundResult } from '@/lib/types/database'

/** Parse a date-only string (YYYY-MM-DD) as a LOCAL date, avoiding the
 *  UTC-midnight shift you get from `new Date('YYYY-MM-DD')`. */
export function parseDateOnly(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date: Date | string, days: number): Date {
  const d = typeof date === 'string' ? parseDateOnly(date) : new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/** Whole days from the given date to today. Positive = in the past. */
export function daysSince(date: Date | string): number {
  const d = typeof date === 'string' ? parseDateOnly(date) : date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.round((today.getTime() - d.getTime()) / 86_400_000)
}

// ============================================================
// Pregnancy check + foaling schedule from a breeding date
// ============================================================

export type MilestoneStatus = 'done' | 'overdue' | 'due_soon' | 'upcoming' | 'not_applicable'

export interface Milestone {
  key: string
  label: string
  /** target days post-breeding */
  daysTarget: number
  /** acceptable window for matching a recorded check to this milestone */
  windowStart: number
  windowEnd: number
  dueDate: Date
  status: MilestoneStatus
  /** the recorded ultrasound check that satisfied this milestone, if any */
  check?: UltrasoundCheck
}

const CHECK_MILESTONES = [
  { key: 'check_14', label: '14-day pregnancy check', daysTarget: 14, windowStart: 12, windowEnd: 20 },
  { key: 'check_30', label: '30-day heartbeat check', daysTarget: 30, windowStart: 25, windowEnd: 37 },
  { key: 'check_45', label: '45-day check', daysTarget: 45, windowStart: 38, windowEnd: 52 },
  { key: 'check_60', label: '60-day check', daysTarget: 60, windowStart: 53, windowEnd: 75 },
] as const

export const GESTATION_DAYS = 340
export const FOALING_WATCH_DAYS = 320

export function getExpectedDueDate(breedingDate: string): Date {
  return addDays(breedingDate, GESTATION_DAYS)
}

export function getFoalingWatchDate(breedingDate: string): Date {
  return addDays(breedingDate, FOALING_WATCH_DAYS)
}

/**
 * The pregnancy-check schedule for one breeding event, with each milestone
 * matched against recorded checks and given a status.
 *
 * Once a check comes back open/lost, later milestones are not_applicable —
 * the plan for that cover is over (rebreed instead).
 */
export function getCheckMilestones(
  breedingDate: string,
  checks: UltrasoundCheck[]
): Milestone[] {
  const sorted = [...checks].sort((a, b) => a.days_post_breeding - b.days_post_breeding)
  const elapsed = daysSince(breedingDate)

  // Days-post-breeding at which the pregnancy ended, if it did
  const endedAt = sorted.find((c) => c.result === 'open' || c.result === 'lost')
    ?.days_post_breeding

  return CHECK_MILESTONES.map((m) => {
    const check = sorted.find(
      (c) => c.days_post_breeding >= m.windowStart && c.days_post_breeding <= m.windowEnd
    )

    let status: MilestoneStatus
    if (check) {
      status = 'done'
    } else if (endedAt !== undefined && m.daysTarget > endedAt) {
      status = 'not_applicable'
    } else if (elapsed > m.windowEnd) {
      status = 'overdue'
    } else if (elapsed >= m.daysTarget - 3) {
      status = 'due_soon'
    } else {
      status = 'upcoming'
    }

    return { ...m, dueDate: addDays(breedingDate, m.daysTarget), status, check }
  })
}

/** The next milestone needing action (due soon or overdue first, else next upcoming). */
export function getNextMilestone(milestones: Milestone[]): Milestone | null {
  return (
    milestones.find((m) => m.status === 'overdue' || m.status === 'due_soon') ??
    milestones.find((m) => m.status === 'upcoming') ??
    null
  )
}

/** Latest recorded result for an event, for the season table. */
export function getLatestResult(checks: UltrasoundCheck[]): UltrasoundResult | null {
  if (checks.length === 0) return null
  const sorted = [...checks].sort((a, b) => b.days_post_breeding - a.days_post_breeding)
  return sorted[0].result
}

// ============================================================
// Estrumate (cloprostenol) short-cycling projection
// ============================================================

export interface EstrumateProjection {
  heatStart: Date // +3 days
  heatEnd: Date // +5 days
  breedStart: Date // +6 days
  breedEnd: Date // +8 days
}

export function getEstrumateProjection(treatmentDate: string): EstrumateProjection {
  return {
    heatStart: addDays(treatmentDate, 3),
    heatEnd: addDays(treatmentDate, 5),
    breedStart: addDays(treatmentDate, 6),
    breedEnd: addDays(treatmentDate, 8),
  }
}

// ============================================================
// Display helpers
// ============================================================

export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
}

export function formatFullDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export const RESULT_LABELS: Record<UltrasoundResult, string> = {
  open: 'Open',
  in_foal: 'In Foal',
  twins: 'Twins',
  lost: 'Lost',
  unclear: 'Unclear',
}

export const RESULT_BADGE_CLASSES: Record<UltrasoundResult, string> = {
  in_foal: 'bg-green-100 text-green-700',
  open: 'bg-gray-100 text-gray-600',
  twins: 'bg-amber-100 text-amber-700',
  lost: 'bg-red-100 text-red-700',
  unclear: 'bg-amber-100 text-amber-700',
}

export const MILESTONE_BADGE_CLASSES: Record<MilestoneStatus, string> = {
  done: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  due_soon: 'bg-amber-100 text-amber-700',
  upcoming: 'bg-blue-100 text-blue-700',
  not_applicable: 'bg-gray-100 text-gray-500',
}
