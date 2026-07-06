// Authentication utility functions — SERVER ONLY (uses next/headers via the
// server Supabase client). Client components sign out via lib/supabase/client.
import { createClient as createServerClient } from '@/lib/supabase/server'
import type { UserProfile } from '@/lib/types/database'

export interface AuthState {
  /** Supabase auth user id/email, null when not signed in */
  user: { id: string; email?: string } | null
  /** Cavvy profile — null means no access even if signed in */
  profile: UserProfile | null
  /** Why the profile lookup failed (e.g. schema not exposed), for diagnostics */
  profileError: string | null
}

/**
 * Auth session + Cavvy profile in one call. Signed-in-but-no-profile is a
 * real state here (shared Supabase project: login exists, Cavvy access
 * doesn't) — callers must handle it instead of treating it as logged-out,
 * or the middleware/layout redirects fight each other in a 307 loop.
 */
export async function getAuthState(): Promise<AuthState> {
  const supabase = await createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { user: null, profile: null, profileError: null }
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return {
    user: { id: user.id, email: user.email ?? undefined },
    profile: profile ?? null,
    // PGRST116 = zero rows, i.e. simply no profile — not a config problem
    profileError:
      profileError && profileError.code !== 'PGRST116' ? profileError.message : null,
  }
}

/**
 * Get the current user's profile (server-side)
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const { profile } = await getAuthState()
  return profile
}

/**
 * Check if user has required role (server-side)
 */
export async function userHasRole(role: string): Promise<boolean> {
  const profile = await getCurrentUserProfile()
  return profile?.role === role
}

/**
 * Check if user has any of the required roles (server-side)
 */
export async function userHasAnyRole(roles: string[]): Promise<boolean> {
  const profile = await getCurrentUserProfile()
  return profile ? roles.includes(profile.role) : false
}
