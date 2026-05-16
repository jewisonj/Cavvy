import { redirect } from 'next/navigation'
import { getCurrentUserProfile } from '@/lib/auth/utils'
import AppNav from '@/components/AppNav'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen">
      <AppNav profile={profile} />
      <main>{children}</main>
    </div>
  )
}
