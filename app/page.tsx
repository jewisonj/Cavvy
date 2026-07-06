import { redirect } from 'next/navigation'
import { getCurrentUserProfile } from '@/lib/auth/utils'
import Link from 'next/link'

export default async function Home() {
  const profile = await getCurrentUserProfile()

  // If logged in, redirect to app
  if (profile) {
    redirect('/app')
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-6xl font-bold mb-4">Cavvy</h1>
        <p className="text-text-secondary text-xl mb-8">
          Farm & Stable Management
        </p>

        <div className="panel p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Track Your Breeding Operation
          </h2>
          <p className="text-text-secondary mb-6">
            Comprehensive management for AQHA broodmares, breeding events,
            foaling records, and multi-generational lineage tracking.
          </p>

          <div className="flex gap-4 justify-center">
            <Link href="/login" className="btn-primary">
              Sign In
            </Link>
            <Link href="/signup" className="btn-secondary">
              Create Account
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="panel p-6">
            <h3 className="font-semibold mb-2">Horse Management</h3>
            <p className="text-sm text-text-secondary">
              Track all horses with detailed profiles, lineage, and documents
            </p>
          </div>
          <div className="panel p-6">
            <h3 className="font-semibold mb-2">Breeding Tracking</h3>
            <p className="text-sm text-text-secondary">
              Monitor heat cycles, breeding events, and pregnancy checks
            </p>
          </div>
          <div className="panel p-6">
            <h3 className="font-semibold mb-2">AI-Powered Entry</h3>
            <p className="text-sm text-text-secondary">
              Voice dictation for quick data entry from the barn
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
