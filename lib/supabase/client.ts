import { createBrowserClient } from '@supabase/ssr'

// Shared Supabase project (same as mwes-invoice / spa-scheduler).
// All Cavvy tables live in the `cavvy` schema, which must be listed
// under Project Settings -> API -> Exposed schemas.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'cavvy' },
    }
  )
}
