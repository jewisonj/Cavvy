// Horse utility functions
import type { Horse, SexEnum } from '@/lib/types/database'

/**
 * Get display name for a horse with fallback logic:
 * 1. registered_name (if set)
 * 2. barn_name (if set)
 * 3. Placeholder based on dam's barn_name + sex
 */
export function getHorseDisplayName(
  horse: Pick<Horse, 'registered_name' | 'barn_name' | 'sex'>,
  dam?: Pick<Horse, 'barn_name' | 'registered_name'> | null
): string {
  if (horse.registered_name) {
    return horse.registered_name
  }

  if (horse.barn_name) {
    return horse.barn_name
  }

  // Generate placeholder
  const sexLabel = getSexLabel(horse.sex)
  const damName = dam?.barn_name || dam?.registered_name || 'Unknown'

  return `${damName}'s ${sexLabel}`
}

/**
 * Get human-readable sex label
 */
export function getSexLabel(sex: SexEnum): string {
  const labels: Record<SexEnum, string> = {
    mare: 'mare',
    stallion: 'stallion',
    gelding: 'gelding',
    filly: 'baby filly',
    colt: 'baby colt',
  }
  return labels[sex]
}

/**
 * Calculate AQHA age year from date of birth
 * AQHA uses January 1 as universal birthday
 */
export function calculateAQHAAgeYear(dob: Date | string): number {
  const birthDate = typeof dob === 'string' ? new Date(dob) : dob
  return birthDate.getFullYear()
}

/**
 * Calculate current age in years
 */
export function calculateAge(dob: Date | string): number {
  const birthDate = typeof dob === 'string' ? new Date(dob) : dob
  const today = new Date()
  const ageYear = today.getFullYear() - birthDate.getFullYear()

  // Adjust if birthday hasn't occurred this year
  const hasHadBirthday =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate())

  return hasHadBirthday ? ageYear : ageYear - 1
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A'

  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(d)
}

/**
 * Check if a horse is a broodmare (active or potential)
 */
export function isBroodmare(horse: Horse): boolean {
  return horse.sex === 'mare' && (horse.broodmare_active || hasBreedingHistory(horse))
}

/**
 * Placeholder - will be implemented with actual data
 */
function hasBreedingHistory(horse: Horse): boolean {
  // TODO: Check if horse has breeding_events when querying
  return false
}

/**
 * Get current season year
 */
export function getCurrentSeasonYear(): number {
  return new Date().getFullYear()
}
