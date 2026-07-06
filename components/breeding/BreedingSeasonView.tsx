'use client'

import { useState } from 'react'
import Link from 'next/link'
import type {
  BreedingEvent,
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
  formatShortDate,
  formatFullDate,
  daysSince,
  RESULT_LABELS,
  RESULT_BADGE_CLASSES,
  MILESTONE_BADGE_CLASSES,
} from '@/lib/utils/breeding'
import SlidePanel from '@/components/SlidePanel'
import MilestoneSchedule from './MilestoneSchedule'
import BreedingEventForm from './BreedingEventForm'
import UltrasoundCheckForm from './UltrasoundCheckForm'
import TreatmentForm from './TreatmentForm'

type HorseRef = Pick<Horse, 'id' | 'barn_name' | 'registered_name'>

export type SeasonEvent = BreedingEvent & {
  mare: HorseRef | null
  stallion: HorseRef | null
  ultrasound_checks: UltrasoundCheck[]
}

export type SeasonTreatment = HormoneTreatment & {
  mare: HorseRef | null
}

const METHOD_LABELS: Record<BreedingEvent['method'], string> = {
  live_cover: 'Live Cover',
  ai_fresh: 'AI Fresh',
  ai_cooled: 'AI Cooled',
  ai_frozen: 'AI Frozen',
  embryo_transfer: 'ET',
}

function horseName(h: HorseRef | null, fallback?: string): string {
  return h?.barn_name || h?.registered_name || fallback || 'Unknown'
}

interface BreedingSeasonViewProps {
  seasonYear: number
  events: SeasonEvent[]
  treatments: SeasonTreatment[]
  mares: HorseRef[]
  stallions: HorseRef[]
  performedBy: string
}

export default function BreedingSeasonView({
  seasonYear,
  events,
  treatments,
  mares,
  stallions,
  performedBy,
}: BreedingSeasonViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<SeasonEvent | null>(null)
  const [showBreedingForm, setShowBreedingForm] = useState(false)
  const [showTreatmentForm, setShowTreatmentForm] = useState(false)
  const [showCheckForm, setShowCheckForm] = useState(false)

  // Keep the slide-out in sync after router.refresh() replaces the events prop
  const currentEvent = selectedEvent
    ? events.find((e) => e.id === selectedEvent.id) ?? null
    : null

  const closeEventPanel = () => {
    setSelectedEvent(null)
    setShowCheckForm(false)
  }

  return (
    <div className="space-y-8">
      {/* Season header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/app/breeding?year=${seasonYear - 1}`}
            className="btn-secondary px-3 py-1"
            aria-label="Previous season"
          >
            ←
          </Link>
          <h2 className="text-2xl font-bold">{seasonYear} Season</h2>
          <Link
            href={`/app/breeding?year=${seasonYear + 1}`}
            className="btn-secondary px-3 py-1"
            aria-label="Next season"
          >
            →
          </Link>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowTreatmentForm(true)} className="btn-secondary">
            Record Shot
          </button>
          <button onClick={() => setShowBreedingForm(true)} className="btn-primary">
            Record Breeding
          </button>
        </div>
      </div>

      {/* Breeding events table */}
      {events.length === 0 ? (
        <div className="panel p-12 text-center">
          <h3 className="text-xl font-semibold mb-2">No breedings recorded for {seasonYear}</h3>
          <p className="text-text-secondary">
            Record a breeding to start the pregnancy-check and due-date plan
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mare</th>
                <th>Stallion</th>
                <th>Method</th>
                <th>Bred</th>
                <th>Next Check</th>
                <th>Latest Result</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const milestones = getCheckMilestones(event.breeding_date, event.ultrasound_checks)
                const next = getNextMilestone(milestones)
                const latest = getLatestResult(event.ultrasound_checks)
                const pregnancyOver = latest === 'open' || latest === 'lost'

                return (
                  <tr key={event.id} onClick={() => setSelectedEvent(event)}>
                    <td className="font-medium">{horseName(event.mare)}</td>
                    <td className="text-text-secondary">
                      {horseName(event.stallion, event.stallion_name_freetext || '—')}
                    </td>
                    <td className="text-text-secondary">{METHOD_LABELS[event.method]}</td>
                    <td className="text-text-secondary">
                      {formatShortDate(new Date(event.breeding_date + 'T00:00:00'))}
                    </td>
                    <td>
                      {next && !pregnancyOver ? (
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${MILESTONE_BADGE_CLASSES[next.status]}`}
                        >
                          {next.label.replace(' pregnancy check', '').replace(' heartbeat check', '').replace(' check', '')}
                          {' · '}
                          {formatShortDate(next.dueDate)}
                        </span>
                      ) : (
                        <span className="text-text-muted text-xs">—</span>
                      )}
                    </td>
                    <td>
                      {latest ? (
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${RESULT_BADGE_CLASSES[latest]}`}
                        >
                          {RESULT_LABELS[latest]}
                        </span>
                      ) : (
                        <span className="text-text-muted text-xs">No checks yet</span>
                      )}
                    </td>
                    <td className="text-text-secondary">
                      {pregnancyOver ? '—' : formatShortDate(getExpectedDueDate(event.breeding_date))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Hormone shots */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Hormone Shots</h3>
        {treatments.length === 0 ? (
          <div className="panel p-6 text-center text-text-secondary text-sm">
            No shots recorded for {seasonYear}. Estrumate shots project the mare&apos;s next
            heat and breeding window automatically.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mare</th>
                  <th>Treatment</th>
                  <th>Given</th>
                  <th>Expect Heat</th>
                  <th>Breeding Window</th>
                </tr>
              </thead>
              <tbody>
                {treatments.map((t) => {
                  const shortCycling = t.treatment_type === 'estrumate' || t.treatment_type === 'lutalyse'
                  const proj = shortCycling ? getEstrumateProjection(t.treatment_date) : null
                  const upcoming = proj && daysSince(t.treatment_date) <= 8

                  return (
                    <tr key={t.id} className="!cursor-default">
                      <td className="font-medium">{horseName(t.mare)}</td>
                      <td className="capitalize text-text-secondary">
                        {t.treatment_type}
                        {t.dose ? ` (${t.dose})` : ''}
                      </td>
                      <td className="text-text-secondary">
                        {formatShortDate(new Date(t.treatment_date + 'T00:00:00'))}
                      </td>
                      <td>
                        {proj ? (
                          <span
                            className={`text-sm ${upcoming ? 'font-medium text-amber-700' : 'text-text-secondary'}`}
                          >
                            {formatShortDate(proj.heatStart)}–{formatShortDate(proj.heatEnd)}
                          </span>
                        ) : (
                          <span className="text-text-muted text-xs">—</span>
                        )}
                      </td>
                      <td>
                        {proj ? (
                          <span
                            className={`text-sm ${upcoming ? 'font-medium text-green-700' : 'text-text-secondary'}`}
                          >
                            {formatShortDate(proj.breedStart)}–{formatShortDate(proj.breedEnd)}
                          </span>
                        ) : (
                          <span className="text-text-muted text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Event detail slide-out */}
      {currentEvent && (
        <SlidePanel
          title={horseName(currentEvent.mare)}
          subtitle={`Bred to ${horseName(currentEvent.stallion, currentEvent.stallion_name_freetext || 'unknown stallion')} — ${formatFullDate(new Date(currentEvent.breeding_date + 'T00:00:00'))} (${METHOD_LABELS[currentEvent.method]})`}
          onClose={closeEventPanel}
        >
          {showCheckForm ? (
            <>
              <h3 className="text-lg font-semibold mb-4">Record Pregnancy Check</h3>
              <UltrasoundCheckForm
                breedingEventId={currentEvent.id}
                mareId={currentEvent.mare_id}
                breedingDate={currentEvent.breeding_date}
                performedBy={performedBy}
                onDone={() => setShowCheckForm(false)}
              />
            </>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Plan</h3>
                <button onClick={() => setShowCheckForm(true)} className="btn-primary text-sm">
                  Record Check
                </button>
              </div>

              <MilestoneSchedule event={currentEvent} checks={currentEvent.ultrasound_checks} />

              {currentEvent.notes && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Notes</h3>
                  <p className="text-text-secondary text-sm">{currentEvent.notes}</p>
                </div>
              )}

              {currentEvent.mare && (
                <div className="pt-4 border-t border-border">
                  <Link
                    href={`/app/horses/${currentEvent.mare.id}`}
                    className="btn-secondary block text-center"
                  >
                    View {horseName(currentEvent.mare)}&apos;s Page
                  </Link>
                </div>
              )}
            </div>
          )}
        </SlidePanel>
      )}

      {/* New breeding slide-out */}
      {showBreedingForm && (
        <SlidePanel
          title="Record Breeding"
          subtitle="Sets the check schedule and expected due date"
          onClose={() => setShowBreedingForm(false)}
        >
          <BreedingEventForm
            mares={mares}
            stallions={stallions}
            onDone={() => setShowBreedingForm(false)}
          />
        </SlidePanel>
      )}

      {/* New treatment slide-out */}
      {showTreatmentForm && (
        <SlidePanel
          title="Record Hormone Shot"
          subtitle="Estrumate/Lutalyse shots project the next heat window"
          onClose={() => setShowTreatmentForm(false)}
        >
          <TreatmentForm
            mares={mares}
            performedBy={performedBy}
            onDone={() => setShowTreatmentForm(false)}
          />
        </SlidePanel>
      )}
    </div>
  )
}
