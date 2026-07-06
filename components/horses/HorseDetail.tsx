'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type {
  BreedingEvent,
  Document as DocRecord,
  Horse,
  HormoneTreatment,
  UltrasoundCheck,
} from '@/lib/types/database'
import { getHorseDisplayName, getSexLabel, formatDate } from '@/lib/utils/horse'
import {
  getEstrumateProjection,
  formatShortDate,
  formatFullDate,
} from '@/lib/utils/breeding'
import MilestoneSchedule from '@/components/breeding/MilestoneSchedule'
import DocumentForm, { DOC_TYPE_LABELS } from './DocumentForm'
import ProfilePhotoUpload from './ProfilePhotoUpload'

type HorseRef = Pick<Horse, 'id' | 'barn_name' | 'registered_name' | 'sex'> & {
  profile_photo_url?: string
}

type OffspringHorse = HorseRef &
  Pick<Horse, 'dob' | 'aqha_age_year' | 'dam_id' | 'sire_id'>

type DetailEvent = BreedingEvent & {
  mare: HorseRef | null
  stallion: HorseRef | null
  ultrasound_checks: UltrasoundCheck[]
}

const TABS = ['Overview', 'Family', 'Breeding', 'Documents & Photos'] as const
type Tab = (typeof TABS)[number]

function refName(h: HorseRef | null | undefined): string {
  return h?.barn_name || h?.registered_name || 'Unknown'
}

function HorseAvatar({ horse, size }: { horse: HorseRef; size: 'sm' | 'lg' }) {
  const classes =
    size === 'lg' ? 'w-24 h-24 md:w-32 md:h-32 text-4xl' : 'w-12 h-12 text-lg'
  if (horse.profile_photo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={horse.profile_photo_url}
        alt={refName(horse)}
        className={`${classes} rounded-lg object-cover border border-border`}
      />
    )
  }
  return (
    <div
      className={`${classes} rounded-lg bg-background-hover border border-border flex items-center justify-center font-bold text-text-muted`}
    >
      {refName(horse).charAt(0).toUpperCase()}
    </div>
  )
}

function FamilyCard({
  horse,
  label,
}: {
  horse: OffspringHorse | HorseRef
  label?: string
}) {
  return (
    <Link
      href={`/app/horses/${horse.id}`}
      className="panel panel-hover p-4 flex items-center gap-4"
    >
      <HorseAvatar horse={horse} size="sm" />
      <div className="min-w-0">
        {label && <p className="text-xs text-text-muted uppercase tracking-wide">{label}</p>}
        <p className="font-medium truncate">{refName(horse)}</p>
        <p className="text-sm text-text-secondary capitalize">
          {getSexLabel(horse.sex)}
          {'aqha_age_year' in horse && horse.aqha_age_year ? ` · ${horse.aqha_age_year}` : ''}
        </p>
      </div>
    </Link>
  )
}

interface HorseDetailProps {
  horse: Horse & { dam: HorseRef | null; sire: HorseRef | null }
  offspring: OffspringHorse[]
  events: DetailEvent[]
  treatments: HormoneTreatment[]
  documents: DocRecord[]
  canEdit: boolean
}

export default function HorseDetail({
  horse,
  offspring,
  events,
  treatments,
  documents,
  canEdit,
}: HorseDetailProps) {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('Overview')
  const [showDocForm, setShowDocForm] = useState(false)

  const displayName = getHorseDisplayName(horse, horse.dam)
  const registrationDoc = documents.find((d) => d.doc_type === 'registration')
  const mareEvents = events.filter((e) => e.mare_id === horse.id)
  const stallionEvents = events.filter((e) => e.stallion_id === horse.id)

  const deleteDocument = async (doc: DocRecord) => {
    if (!window.confirm(`Remove "${doc.title}"? The file itself is not deleted.`)) return
    const { error } = await supabase.from('documents').delete().eq('id', doc.id)
    if (error) {
      window.alert('Failed to remove document: ' + error.message)
      return
    }
    router.refresh()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start gap-6 mb-8">
        <HorseAvatar horse={horse} size="lg" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold">{displayName}</h1>
            <span
              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                horse.owned ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {horse.owned ? 'Owned' : 'Outside'}
            </span>
            {horse.broodmare_active && horse.sex === 'mare' && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                Broodmare
              </span>
            )}
          </div>
          {horse.registered_name && horse.registered_name !== displayName && (
            <p className="text-text-secondary">{horse.registered_name}</p>
          )}
          <p className="text-text-secondary text-sm mt-1 capitalize">
            {getSexLabel(horse.sex)}
            {horse.color ? ` · ${horse.color}` : ''}
            {horse.aqha_age_year ? ` · ${horse.aqha_age_year}` : ''}
            {horse.aqha_number ? ` · AQHA #${horse.aqha_number}` : ''}
          </p>
        </div>
        {canEdit && (
          <Link href={`/app/horses/${horse.id}/edit`} className="btn-secondary self-start">
            Edit
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                tab === t
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview */}
      {tab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 panel p-6">
            <h2 className="text-lg font-semibold mb-4">Vitals</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-text-muted mb-1">Date of Birth</p>
                <p className="font-medium">{formatDate(horse.dob)}</p>
              </div>
              <div>
                <p className="text-sm text-text-muted mb-1">AQHA Number</p>
                <p className="font-medium">
                  {horse.aqha_number || 'Not registered'}
                  {registrationDoc && (
                    <a
                      href={registrationDoc.drive_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-sm text-accent hover:underline"
                    >
                      View Papers
                    </a>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-muted mb-1">Color</p>
                <p className="font-medium">{horse.color || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-text-muted mb-1">Acquired</p>
                <p className="font-medium">{formatDate(horse.acquired_date)}</p>
              </div>
              {horse.markings && (
                <div className="col-span-2">
                  <p className="text-sm text-text-muted mb-1">Markings</p>
                  <p className="font-medium">{horse.markings}</p>
                </div>
              )}
              {horse.disposition_date && (
                <div className="col-span-2">
                  <p className="text-sm text-text-muted mb-1">Disposition</p>
                  <p className="font-medium">
                    {formatDate(horse.disposition_date)}
                    {horse.disposition_notes ? ` — ${horse.disposition_notes}` : ''}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="panel p-6">
            <h2 className="text-lg font-semibold mb-4">Lineage</h2>
            <div className="space-y-3">
              {horse.dam ? (
                <FamilyCard horse={horse.dam} label="Dam" />
              ) : (
                <p className="text-sm text-text-muted">Dam not recorded</p>
              )}
              {horse.sire ? (
                <FamilyCard horse={horse.sire} label="Sire" />
              ) : (
                <p className="text-sm text-text-muted">Sire not recorded</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Family */}
      {tab === 'Family' && (
        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-semibold mb-3">Parents</h2>
            {horse.dam || horse.sire ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {horse.dam && <FamilyCard horse={horse.dam} label="Dam" />}
                {horse.sire && <FamilyCard horse={horse.sire} label="Sire" />}
              </div>
            ) : (
              <div className="panel p-6 text-center text-text-secondary text-sm">
                No dam or sire recorded — set them on the Edit page to build the family tree.
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3">
              Offspring{offspring.length > 0 && ` (${offspring.length})`}
            </h2>
            {offspring.length === 0 ? (
              <div className="panel p-6 text-center text-text-secondary text-sm">
                No offspring recorded yet. Foals link back here automatically when their{' '}
                {horse.sex === 'stallion' ? 'sire' : 'dam'} is set to {displayName}.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {offspring.map((foal) => (
                  <FamilyCard
                    key={foal.id}
                    horse={foal}
                    label={foal.dam_id === horse.id ? 'Out of this mare' : 'By this stallion'}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Breeding */}
      {tab === 'Breeding' && (
        <div className="space-y-8">
          {horse.sex === 'mare' && (
            <div className="flex justify-end">
              <Link href="/app/breeding" className="btn-primary text-sm">
                Go to Breeding Season
              </Link>
            </div>
          )}

          {mareEvents.length === 0 && stallionEvents.length === 0 && (
            <div className="panel p-12 text-center">
              <h3 className="text-xl font-semibold mb-2">No breeding history</h3>
              <p className="text-text-secondary">
                Breedings recorded on the Breeding page will show up here with their full
                check schedule and due dates.
              </p>
            </div>
          )}

          {mareEvents.map((event) => (
            <div key={event.id} className="panel p-6">
              <div className="flex flex-wrap justify-between items-baseline gap-2 mb-4">
                <h3 className="text-lg font-semibold">
                  {event.season_year} — bred to{' '}
                  {refName(event.stallion) !== 'Unknown'
                    ? refName(event.stallion)
                    : event.stallion_name_freetext || 'unknown stallion'}
                </h3>
                <p className="text-sm text-text-secondary">
                  {formatFullDate(new Date(event.breeding_date + 'T00:00:00'))}
                </p>
              </div>
              <MilestoneSchedule event={event} checks={event.ultrasound_checks} />
            </div>
          ))}

          {stallionEvents.length > 0 && (
            <div className="panel p-6">
              <h3 className="text-lg font-semibold mb-4">Mares Bred</h3>
              <div className="space-y-2">
                {stallionEvents.map((event) => (
                  <div key={event.id} className="flex justify-between items-center text-sm">
                    <span className="font-medium">{refName(event.mare)}</span>
                    <span className="text-text-secondary">
                      {formatFullDate(new Date(event.breeding_date + 'T00:00:00'))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {treatments.length > 0 && (
            <div className="panel p-6">
              <h3 className="text-lg font-semibold mb-4">Hormone Shots</h3>
              <div className="space-y-2">
                {treatments.map((t) => {
                  const shortCycling =
                    t.treatment_type === 'estrumate' || t.treatment_type === 'lutalyse'
                  const proj = shortCycling ? getEstrumateProjection(t.treatment_date) : null
                  return (
                    <div key={t.id} className="flex flex-wrap justify-between gap-2 text-sm">
                      <span>
                        <span className="font-medium capitalize">{t.treatment_type}</span>
                        {t.dose ? ` (${t.dose})` : ''} —{' '}
                        {formatFullDate(new Date(t.treatment_date + 'T00:00:00'))}
                      </span>
                      {proj && (
                        <span className="text-text-secondary">
                          heat {formatShortDate(proj.heatStart)}–{formatShortDate(proj.heatEnd)},
                          breed {formatShortDate(proj.breedStart)}–{formatShortDate(proj.breedEnd)}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Documents & Photos */}
      {tab === 'Documents & Photos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Documents</h2>
              {canEdit && !showDocForm && (
                <button onClick={() => setShowDocForm(true)} className="btn-primary text-sm">
                  Add Document
                </button>
              )}
            </div>

            {showDocForm && (
              <DocumentForm horseId={horse.id} onDone={() => setShowDocForm(false)} />
            )}

            {documents.length === 0 && !showDocForm ? (
              <div className="panel p-6 text-center text-text-secondary text-sm">
                No documents linked yet. Add registration papers, coggins, or contracts as
                Drive links.
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="panel px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <a
                        href={doc.drive_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-accent hover:underline truncate block"
                      >
                        {doc.title}
                      </a>
                      <p className="text-xs text-text-muted">
                        {DOC_TYPE_LABELS[doc.doc_type]} · added {formatDate(doc.uploaded_at)}
                      </p>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => deleteDocument(doc)}
                        className="text-text-muted hover:text-red-600 text-sm shrink-0"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="panel p-6">
              <h2 className="text-lg font-semibold mb-4">Profile Photo</h2>
              {horse.profile_photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={horse.profile_photo_url}
                  alt={displayName}
                  className="w-full rounded-lg object-cover border border-border mb-4"
                />
              )}
              {canEdit && (
                <ProfilePhotoUpload horseId={horse.id} currentUrl={horse.profile_photo_url} />
              )}
            </div>

            <div className="panel p-6 space-y-3">
              <h2 className="text-lg font-semibold">External Links</h2>
              {horse.photos_album_url ? (
                <a
                  href={horse.photos_album_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary block text-center text-sm"
                >
                  Google Photos Album
                </a>
              ) : (
                <p className="text-sm text-text-muted">No photos album linked</p>
              )}
              {horse.drive_folder_url ? (
                <a
                  href={horse.drive_folder_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary block text-center text-sm"
                >
                  Google Drive Folder
                </a>
              ) : (
                <p className="text-sm text-text-muted">No Drive folder linked</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
