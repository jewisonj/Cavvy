'use client'

import { useState } from 'react'
import Link from 'next/link'
import type {
  BreedingEvent,
  FoalingEvent,
  Horse,
  UltrasoundCheck,
} from '@/lib/types/database'
import {
  getExpectedDueDate,
  getFoalingWatchDate,
  getLatestResult,
  daysSince,
  formatFullDate,
  GESTATION_DAYS,
} from '@/lib/utils/breeding'
import SlidePanel from '@/components/SlidePanel'
import FoalingForm from './FoalingForm'

type HorseRef = Pick<Horse, 'id' | 'barn_name' | 'registered_name' | 'sex'>

export type FoalingBoardEvent = BreedingEvent & {
  mare: HorseRef | null
  stallion: HorseRef | null
  ultrasound_checks: UltrasoundCheck[]
  foaling_events: FoalingEvent[]
}

export type RecentFoaling = FoalingEvent & {
  mare: HorseRef | null
  foal: HorseRef | null
}

const OUTCOME_LABELS: Record<NonNullable<FoalingEvent['outcome']>, string> = {
  live: 'Live foal',
  dystocia_live: 'Dystocia — live',
  stillborn: 'Stillborn',
  aborted: 'Aborted',
  dystocia_loss: 'Dystocia — loss',
}

function horseName(h: HorseRef | null, fallback = 'Unknown'): string {
  return h?.barn_name || h?.registered_name || fallback
}

interface FoalingBoardProps {
  events: FoalingBoardEvent[]
  recentFoalings: RecentFoaling[]
}

export default function FoalingBoard({ events, recentFoalings }: FoalingBoardProps) {
  const [foalingEvent, setFoalingEvent] = useState<FoalingBoardEvent | null>(null)

  // In-progress pregnancies: confirmed (or unchecked) and not yet foaled
  const pregnancies = events
    .filter((e) => {
      const foaled = e.foaling_events.some((f) => f.actual_date)
      if (foaled) return false
      const latest = getLatestResult(e.ultrasound_checks)
      return latest === 'in_foal' || latest === 'twins' || latest === null
    })
    .sort((a, b) => a.breeding_date.localeCompare(b.breeding_date))

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-3">
          Expecting{pregnancies.length > 0 && ` (${pregnancies.length})`}
        </h2>
        {pregnancies.length === 0 ? (
          <div className="panel p-12 text-center">
            <h3 className="text-xl font-semibold mb-2">No mares expecting</h3>
            <p className="text-text-secondary">
              Mares show up here once a breeding is recorded and not yet foaled out.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mare</th>
                  <th>In Foal To</th>
                  <th>Days Along</th>
                  <th>Watch Opens</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pregnancies.map((event) => {
                  const days = daysSince(event.breeding_date)
                  const latest = getLatestResult(event.ultrasound_checks)
                  const unconfirmed = latest === null
                  const overdue = days > 350
                  const watching = days >= 320

                  return (
                    <tr key={event.id} className="!cursor-default">
                      <td className="font-medium">
                        {event.mare ? (
                          <Link
                            href={`/app/horses/${event.mare.id}`}
                            className="text-accent hover:underline"
                          >
                            {horseName(event.mare)}
                          </Link>
                        ) : (
                          'Unknown'
                        )}
                      </td>
                      <td className="text-text-secondary">
                        {horseName(event.stallion, event.stallion_name_freetext || '—')}
                      </td>
                      <td className="text-text-secondary">
                        {days} / {GESTATION_DAYS}
                      </td>
                      <td className="text-text-secondary">
                        {formatFullDate(getFoalingWatchDate(event.breeding_date))}
                      </td>
                      <td className="font-medium">
                        {formatFullDate(getExpectedDueDate(event.breeding_date))}
                      </td>
                      <td>
                        {overdue ? (
                          <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                            Overdue
                          </span>
                        ) : watching ? (
                          <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700">
                            Foaling Watch
                          </span>
                        ) : unconfirmed ? (
                          <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                            Unconfirmed
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                            In Foal
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => setFoalingEvent(event)}
                          className="btn-primary text-xs px-3 py-1.5"
                        >
                          Record Foaling
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Foalings</h2>
        {recentFoalings.length === 0 ? (
          <div className="panel p-6 text-center text-text-secondary text-sm">
            No foalings recorded yet this year.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mare</th>
                  <th>Foal</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {recentFoalings.map((f) => (
                  <tr key={f.id} className="!cursor-default">
                    <td className="text-text-secondary">
                      {f.actual_date
                        ? formatFullDate(new Date(f.actual_date + 'T00:00:00'))
                        : '—'}
                    </td>
                    <td className="font-medium">
                      {f.mare ? (
                        <Link href={`/app/horses/${f.mare.id}`} className="text-accent hover:underline">
                          {horseName(f.mare)}
                        </Link>
                      ) : (
                        'Unknown'
                      )}
                    </td>
                    <td>
                      {f.foal ? (
                        <Link href={`/app/horses/${f.foal.id}`} className="text-accent hover:underline">
                          {horseName(f.foal, `${horseName(f.mare)}'s baby`)}
                        </Link>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td>
                      {f.outcome && (
                        <span
                          className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                            f.outcome === 'live' || f.outcome === 'dystocia_live'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {OUTCOME_LABELS[f.outcome]}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {foalingEvent && (
        <SlidePanel
          title={`Foaling — ${horseName(foalingEvent.mare)}`}
          subtitle={`Bred ${formatFullDate(new Date(foalingEvent.breeding_date + 'T00:00:00'))}, due ${formatFullDate(getExpectedDueDate(foalingEvent.breeding_date))}`}
          onClose={() => setFoalingEvent(null)}
        >
          <FoalingForm
            breedingEventId={foalingEvent.id}
            mareId={foalingEvent.mare_id}
            mareName={horseName(foalingEvent.mare)}
            stallionId={foalingEvent.stallion_id}
            breedingDate={foalingEvent.breeding_date}
            onDone={() => setFoalingEvent(null)}
          />
        </SlidePanel>
      )}
    </div>
  )
}
