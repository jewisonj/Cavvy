// Authentication utility functions
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/lib/types/database'

/**
 * Get the current user's profile (server-side)
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = await createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return null
  }

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

/**
 * Sign out user
 */
export async function signOut() {
  const supabase = createBrowserClient()
  await supabase.auth.signOut()
}
