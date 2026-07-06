'use client'

import Link from 'next/link'
import {
  buildPedigreeTree,
  getAllBreedPedigreeUrl,
  type PedigreeNode,
  type PedigreeRef,
} from '@/lib/utils/pedigree'

function ExternalLinkIcon() {
  return (
    <svg className="w-3.5 h-3.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  )
}

function PedigreeCell({
  node,
  role,
  currentHorseId,
}: {
  node: PedigreeNode | null
  role: 'sire' | 'dam'
  currentHorseId: string
}) {
  const accent = role === 'sire' ? 'border-l-blue-300' : 'border-l-rose-300'

  if (!node?.horse) {
    return (
      <div className={`panel border-l-4 ${accent} px-3 py-2 flex-1 flex items-center`}>
        <span className="text-xs text-text-muted">Unknown {role}</span>
      </div>
    )
  }

  const h = node.horse
  const name = h.registered_name || h.barn_name || 'Unnamed'
  const abpUrl = getAllBreedPedigreeUrl(h)

  return (
    <div className={`panel border-l-4 ${accent} px-3 py-2 flex-1 flex flex-col justify-center min-w-0`}>
      {h.id === currentHorseId ? (
        <span className="text-sm font-medium truncate">{name}</span>
      ) : (
        <Link
          href={`/app/horses/${h.id}`}
          className="text-sm font-medium text-accent hover:underline truncate"
        >
          {name}
        </Link>
      )}
      <span className="text-xs text-text-muted flex items-center gap-2">
        <span className="capitalize">{role}</span>
        {abpUrl && (
          <a
            href={abpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent"
            title="View on All Breed Pedigree"
          >
            <ExternalLinkIcon />
          </a>
        )}
      </span>
    </div>
  )
}

/** One pedigree column: all sire/dam pairs at a given depth, evenly stretched. */
function column(nodes: (PedigreeNode | null)[], currentHorseId: string, depth: number) {
  return (
    <div key={depth} className="flex flex-col gap-2 flex-1 min-w-36">
      {nodes.map((n, i) => (
        <PedigreeCell
          key={i}
          node={n}
          role={i % 2 === 0 ? 'sire' : 'dam'}
          currentHorseId={currentHorseId}
        />
      ))}
    </div>
  )
}

interface PedigreeChartProps {
  horseId: string
  herd: PedigreeRef[]
  /** number of ancestor generations to show (default 3 = through great-grandparents) */
  generations?: number
}

export default function PedigreeChart({ horseId, herd, generations = 3 }: PedigreeChartProps) {
  const herdMap = new Map(herd.map((h) => [h.id, h]))
  const tree = buildPedigreeTree(horseId, herdMap, generations)

  if (!tree) return null

  // Walk the tree breadth-first into columns: [parents], [grandparents], ...
  const columns: (PedigreeNode | null)[][] = []
  let level: (PedigreeNode | null)[] = [tree]
  for (let g = 0; g < generations; g++) {
    const next = level.flatMap((n) => [n?.sire ?? null, n?.dam ?? null])
    columns.push(next)
    level = next
  }

  const hasAnyAncestor = columns[0].some((n) => n?.horse)

  if (!hasAnyAncestor) {
    return (
      <div className="panel p-6 text-center text-text-secondary text-sm">
        No pedigree recorded in the system yet — set the dam and sire on the Edit page.
        Outside ancestors can be added as horses with &quot;Currently owned&quot; unchecked.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-3 items-stretch min-w-max md:min-w-0">
        {columns.map((nodes, depth) => column(nodes, horseId, depth))}
      </div>
    </div>
  )
}
