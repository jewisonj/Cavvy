'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { UserRole } from '@/lib/types/database'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole>('staff')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (!authData.user) {
        setError('Failed to create user')
        return
      }

      // Create user profile
      const { error: profileError } = await supabase.from('user_profiles').insert({
        id: authData.user.id,
        email,
        display_name: displayName,
        phone: phone || null,
        role,
      })

      if (profileError) {
        setError('Failed to create user profile: ' + profileError.message)
        return
      }

      // Redirect to app
      router.push('/app')
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Cavvy</h1>
          <p className="text-text-secondary">Farm & Stable Management</p>
        </div>

        <div className="panel p-8">
          <h2 className="text-2xl font-semibold mb-6">Create Account</h2>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium mb-2">
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="form-input"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-2">
                Phone (optional)
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="form-input"
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="form-input"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-text-muted">At least 6 characters</p>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium mb-2">
                Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="form-input"
              >
                <option value="owner">Owner</option>
                <option value="staff">Staff</option>
                <option value="vet">Veterinarian</option>
              </select>
            </div>

            {error && (
              <div className="alert-error p-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-text-secondary">
            Already have an account?{' '}
            <Link href="/login" className="text-accent hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
