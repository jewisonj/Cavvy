'use client'

import type { BreedingEvent, UltrasoundCheck } from '@/lib/types/database'
import {
  getCheckMilestones,
  getExpectedDueDate,
  getFoalingWatchDate,
  formatFullDate,
  MILESTONE_BADGE_CLASSES,
  RESULT_LABELS,
  RESULT_BADGE_CLASSES,
  getLatestResult,
} from '@/lib/utils/breeding'

const STATUS_LABELS = {
  done: 'Done',
  overdue: 'Overdue',
  due_soon: 'Due Soon',
  upcoming: 'Upcoming',
  not_applicable: '—',
} as const

interface MilestoneScheduleProps {
  event: BreedingEvent
  checks: UltrasoundCheck[]
}

/** The computed plan for one breeding: check milestones + foaling dates. */
export default function MilestoneSchedule({ event, checks }: MilestoneScheduleProps) {
  const milestones = getCheckMilestones(event.breeding_date, checks)
  const latestResult = getLatestResult(checks)
  const pregnancyActive = latestResult === 'in_foal' || latestResult === 'twins' || latestResult === null

  return (
    <div className="space-y-2">
      {milestones.map((m) => (
        <div key={m.key} className="flex items-center justify-between panel px-4 py-3">
          <div>
            <p className="font-medium text-sm">{m.label}</p>
            <p className="text-xs text-text-muted">
              {formatFullDate(m.dueDate)}
              {m.check && (
                <>
                  {' '}
                  — checked day {m.check.days_post_breeding}:{' '}
                  <span className={`px-1.5 py-0.5 rounded ${RESULT_BADGE_CLASSES[m.check.result]}`}>
                    {RESULT_LABELS[m.check.result]}
                  </span>
                </>
              )}
            </p>
          </div>
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${MILESTONE_BADGE_CLASSES[m.status]}`}
          >
            {STATUS_LABELS[m.status]}
          </span>
        </div>
      ))}

      {pregnancyActive && (
        <>
          <div className="flex items-center justify-between panel px-4 py-3">
            <div>
              <p className="font-medium text-sm">Foaling watch opens</p>
              <p className="text-xs text-text-muted">320 days post-breeding</p>
            </div>
            <span className="text-sm font-medium">
              {formatFullDate(getFoalingWatchDate(event.breeding_date))}
            </span>
          </div>
          <div className="flex items-center justify-between panel px-4 py-3 border-accent">
            <div>
              <p className="font-medium text-sm">Expected due date</p>
              <p className="text-xs text-text-muted">340 days post-breeding</p>
            </div>
            <span className="text-sm font-bold text-accent">
              {formatFullDate(getExpectedDueDate(event.breeding_date))}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
