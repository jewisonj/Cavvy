'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface NoAccessProps {
  email?: string
  /** Non-empty when the profile lookup itself errored (config problem) */
  profileError: string | null
}

/**
 * Shown to a user who IS signed in (shared Supabase login) but has no Cavvy
 * profile — either setup isn't finished or this login was never granted
 * access. Rendering this instead of redirecting to /login is what prevents
 * the middleware/layout 307 redirect loop.
 */
export default function NoAccess({ email, profileError }: NoAccessProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xl panel p-8">
        <h1 className="text-2xl font-bold mb-2">Signed in, but no Cavvy access</h1>
        <p className="text-text-secondary mb-6">
          {email ? (
            <>
              <span className="font-medium text-text-primary">{email}</span> is a valid
              login for the shared account
            </>
          ) : (
            'Your login is valid'
          )}
          , but it has no profile in Cavvy yet, so nothing can be shown.
        </p>

        {profileError ? (
          <div className="alert-error mb-6 text-sm">
            <p className="font-medium mb-1">The profile lookup failed with:</p>
            <code className="block">{profileError}</code>
            <p className="mt-2">
              If this mentions schemas, add <code>cavvy</code> under Project Settings → API
              → Exposed schemas in the Supabase dashboard.
            </p>
          </div>
        ) : (
          <div className="panel p-4 mb-6 text-sm">
            <p className="mb-2">
              To grant this login access, run this in the Supabase SQL Editor:
            </p>
            <pre className="overflow-x-auto text-xs bg-background-hover p-3 rounded">
              {`INSERT INTO cavvy.user_profiles (id, display_name, role, email)
SELECT id, 'Your Name', 'owner', email
FROM auth.users WHERE email = '${email ?? 'you@example.com'}';`}
            </pre>
            <p className="mt-2 text-text-muted">
              Then reload this page. Roles: owner, staff, or vet.
            </p>
          </div>
        )}

        <button onClick={handleSignOut} className="btn-secondary">
          Sign out and use a different account
        </button>
      </div>
    </div>
  )
}
