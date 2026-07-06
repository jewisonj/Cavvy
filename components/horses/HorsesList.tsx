'use client'

import { useState } from 'react'
import type { Horse } from '@/lib/types/database'
import { getHorseDisplayName, getSexLabel, formatDate } from '@/lib/utils/horse'
import Link from 'next/link'

interface HorsesListProps {
  horses: (Horse & {
    dam?: { id: string; barn_name?: string; registered_name?: string } | null
    sire?: { id: string; barn_name?: string; registered_name?: string } | null
  })[]
}

export default function HorsesList({ horses }: HorsesListProps) {
  const [selectedHorse, setSelectedHorse] = useState<typeof horses[0] | null>(null)

  if (horses.length === 0) {
    return (
      <div className="panel p-12 text-center">
        <h3 className="text-xl font-semibold mb-2">No horses yet</h3>
        <p className="text-text-secondary mb-6">
          Get started by adding your first horse to the system
        </p>
        <Link href="/app/horses/new" className="btn-primary">
          Add Your First Horse
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Registered Name</th>
              <th>Sex</th>
              <th>AQHA #</th>
              <th>DOB</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {horses.map((horse) => (
              <tr
                key={horse.id}
                onClick={() => setSelectedHorse(horse)}
              >
                <td className="font-medium">
                  {getHorseDisplayName(horse, horse.dam)}
                </td>
                <td className="text-text-secondary">
                  {horse.registered_name || '—'}
                </td>
                <td className="capitalize">{getSexLabel(horse.sex)}</td>
                <td className="text-text-secondary">
                  {horse.aqha_number || '—'}
                </td>
                <td className="text-text-secondary">
                  {formatDate(horse.dob)}
                </td>
                <td>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      horse.owned
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {horse.owned ? 'Owned' : 'Outside'}
                  </span>
                  {horse.broodmare_active && horse.sex === 'mare' && (
                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                      Broodmare
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Slide-out panel */}
      {selectedHorse && (
        <>
          {/* Backdrop */}
          <div
            className="slide-panel-backdrop"
            onClick={() => setSelectedHorse(null)}
          />

          {/* Panel */}
          <div className="slide-panel">
            <div className="p-6 h-full overflow-y-auto">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">
                    {getHorseDisplayName(selectedHorse, selectedHorse.dam)}
                  </h2>
                  {selectedHorse.registered_name && (
                    <p className="text-text-secondary">
                      {selectedHorse.registered_name}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedHorse(null)}
                  className="text-text-secondary hover:text-text-primary"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Quick Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-text-muted mb-1">Sex</p>
                  <p className="font-medium capitalize">
                    {getSexLabel(selectedHorse.sex)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-muted mb-1">AQHA Number</p>
                  <p className="font-medium">
                    {selectedHorse.aqha_number || 'Not registered'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-muted mb-1">Date of Birth</p>
                  <p className="font-medium">{formatDate(selectedHorse.dob)}</p>
                </div>
                <div>
                  <p className="text-sm text-text-muted mb-1">Color</p>
                  <p className="font-medium">
                    {selectedHorse.color || 'Not specified'}
                  </p>
                </div>
              </div>

              {/* Lineage */}
              {(selectedHorse.dam || selectedHorse.sire) && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Lineage</h3>
                  <div className="space-y-2">
                    {selectedHorse.dam && (
                      <div>
                        <span className="text-text-muted text-sm">Dam: </span>
                        <span className="font-medium">
                          {selectedHorse.dam.barn_name ||
                            selectedHorse.dam.registered_name ||
                            'Unknown'}
                        </span>
                      </div>
                    )}
                    {selectedHorse.sire && (
                      <div>
                        <span className="text-text-muted text-sm">Sire: </span>
                        <span className="font-medium">
                          {selectedHorse.sire.barn_name ||
                            selectedHorse.sire.registered_name ||
                            'Unknown'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Markings */}
              {selectedHorse.markings && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Markings</h3>
                  <p className="text-text-secondary">{selectedHorse.markings}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-6 border-t border-border">
                <Link
                  href={`/app/horses/${selectedHorse.id}`}
                  className="btn-primary flex-1 text-center"
                >
                  View Full Details
                </Link>
                <Link
                  href={`/app/horses/${selectedHorse.id}/edit`}
                  className="btn-secondary flex-1 text-center"
                >
                  Edit
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
