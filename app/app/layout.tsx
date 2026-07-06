import { redirect } from 'next/navigation'
import { getAuthState } from '@/lib/auth/utils'
import AppNav from '@/components/AppNav'
import NoAccess from '@/components/NoAccess'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, profileError } = await getAuthState()

  if (!user) {
    redirect('/login')
  }

  // Signed in but no Cavvy profile: render an explanation instead of
  // redirecting — the middleware would bounce /login straight back here,
  // producing an infinite 307 loop.
  if (!profile) {
    return <NoAccess email={user.email} profileError={profileError} />
  }

  return (
    <div className="min-h-screen">
      <AppNav profile={profile} />
      <main>{children}</main>
    </div>
  )
}
