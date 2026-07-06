// Pedigree helpers.
//
// AQHA's registry is a closed system (no public API — records live behind the
// member portal), so registry integration is link-out only. All Breed Pedigree
// hosts community pedigree data at predictable URLs derived from the
// registered name, e.g. "Metallic Cat" -> allbreedpedigree.com/metallic+cat.
// A horses.pedigree_url override exists for name collisions/misspellings.
import type { Horse } from '@/lib/types/database'

type PedigreeHorse = Pick<Horse, 'registered_name' | 'pedigree_url'>

/**
 * The All Breed Pedigree URL for a horse: explicit override first, otherwise
 * derived from the registered name. Null when neither exists (unregistered
 * foals, barn-name-only records).
 */
export function getAllBreedPedigreeUrl(horse: PedigreeHorse): string | null {
  if (horse.pedigree_url) return horse.pedigree_url
  if (!horse.registered_name) return null

  const slug = horse.registered_name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '+')
  if (!slug) return null

  return `https://www.allbreedpedigree.com/${slug}`
}

// ============================================================
// In-system pedigree tree (built from our own dam_id/sire_id links)
// ============================================================

export interface PedigreeNode {
  horse: PedigreeRef | null
  sire: PedigreeNode | null
  dam: PedigreeNode | null
}

export type PedigreeRef = Pick<
  Horse,
  'id' | 'registered_name' | 'barn_name' | 'sex' | 'sire_id' | 'dam_id' | 'pedigree_url'
>

/**
 * Build an ancestor tree for a horse from the in-system herd, up to
 * `generations` deep (2 = parents + grandparents). The herd is small
 * (~15-30 head), so callers pass the full roster and we look up in memory.
 */
export function buildPedigreeTree(
  horseId: string | null | undefined,
  herd: Map<string, PedigreeRef>,
  generations: number
): PedigreeNode | null {
  if (!horseId) return null
  const horse = herd.get(horseId)
  if (!horse) return null

  if (generations <= 0) {
    return { horse, sire: null, dam: null }
  }
  return {
    horse,
    sire: buildPedigreeTree(horse.sire_id, herd, generations - 1),
    dam: buildPedigreeTree(horse.dam_id, herd, generations - 1),
  }
}
