'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth/utils'
import type { UserProfile } from '@/lib/types/database'

interface AppNavProps {
  profile: UserProfile
}

export default function AppNav({ profile }: AppNavProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="border-b border-border bg-background-panel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/app" className="text-xl font-bold">
              BreMan
            </Link>

            <div className="hidden md:flex space-x-4">
              <Link
                href="/app"
                className="text-text-secondary hover:text-text-primary transition-colors px-3 py-2"
              >
                Dashboard
              </Link>
              <Link
                href="/app/horses"
                className="text-text-secondary hover:text-text-primary transition-colors px-3 py-2"
              >
                Horses
              </Link>
              <Link
                href="/app/breeding"
                className="text-text-secondary hover:text-text-primary transition-colors px-3 py-2"
              >
                Breeding
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-text-secondary">
              {profile.display_name}
              <span className="ml-2 text-xs text-text-muted">({profile.role})</span>
            </span>
            <button
              onClick={handleSignOut}
              className="btn-secondary text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
