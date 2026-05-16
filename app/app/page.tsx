import { getCurrentUserProfile } from '@/lib/auth/utils'
import Link from 'next/link'

export default async function AppHomePage() {
  const profile = await getCurrentUserProfile()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome, {profile?.display_name}</h1>
        <p className="text-text-secondary">
          Manage your breeding operation from here
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/app/horses" className="panel p-6 panel-hover">
          <h2 className="text-xl font-semibold mb-2">Horses</h2>
          <p className="text-text-secondary text-sm">
            View and manage your broodmares, foals, and stallions
          </p>
        </Link>

        <Link href="/app/breeding" className="panel p-6 panel-hover">
          <h2 className="text-xl font-semibold mb-2">Breeding</h2>
          <p className="text-text-secondary text-sm">
            Track breeding events, heat cycles, and pregnancy checks
          </p>
        </Link>

        <Link href="/app/foaling" className="panel p-6 panel-hover">
          <h2 className="text-xl font-semibold mb-2">Foaling</h2>
          <p className="text-text-secondary text-sm">
            Monitor upcoming foalings and record births
          </p>
        </Link>

        <div className="panel p-6 opacity-50">
          <h2 className="text-xl font-semibold mb-2">Reports</h2>
          <p className="text-text-secondary text-sm">
            View breeding statistics and analytics (Coming Soon)
          </p>
        </div>

        <div className="panel p-6 opacity-50">
          <h2 className="text-xl font-semibold mb-2">Dictation</h2>
          <p className="text-text-secondary text-sm">
            Voice-powered data entry (Coming Soon)
          </p>
        </div>

        <div className="panel p-6 opacity-50">
          <h2 className="text-xl font-semibold mb-2">Alerts</h2>
          <p className="text-text-secondary text-sm">
            View upcoming tasks and reminders (Coming Soon)
          </p>
        </div>
      </div>

      <div className="mt-12 panel p-6">
        <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
        <ol className="list-decimal list-inside space-y-2 text-text-secondary">
          <li>Set up your Supabase project and run the database migrations</li>
          <li>Add your initial horses to the system</li>
          <li>Start tracking breeding events and heat cycles</li>
          <li>Monitor pregnancy checks and upcoming foalings</li>
        </ol>
      </div>
    </div>
  )
}
