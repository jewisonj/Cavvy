# Supabase Setup — Shared Project

BreMan runs inside the **same Supabase project as mwes-invoice and spa-scheduler**.
No new project is created. All BreMan tables live in a dedicated `breman` Postgres
schema so nothing collides with the other apps' tables in `public`. Auth is shared —
one login works across the app family — but BreMan access requires a row in
`breman.user_profiles`.

## Step 1: Run the BreMan schema migration

1. Open the **shared project** in the Supabase dashboard
2. Go to **SQL Editor** → **New Query**
3. Paste the contents of `supabase/migrations/20260706000000_breman_schema.sql`
4. Click **Run** — you should see "Success. No rows returned"

This creates the `breman` schema with all tables, enums, indexes, and RLS policies.
It does not touch anything belonging to mwes-invoice or spa-scheduler.

To verify: **Table Editor** → schema dropdown (top left) → select `breman` — you
should see `horses`, `breeding_events`, `heat_observations`, `ultrasound_checks`,
`hormone_treatments`, `foaling_events`, `documents`, and the rest.

## Step 2: Expose the `breman` schema to the API

PostgREST only serves schemas you explicitly list:

1. Go to **Project Settings** → **API**
2. Find **Exposed schemas** (defaults to `public, graphql_public`)
3. Add `breman` to the list and save

Without this step, every BreMan query fails with "The schema must be one of the
following...". The JS clients already select the schema via
`createClient(..., { db: { schema: 'breman' } })`.

## Step 3: Create the storage bucket

Storage buckets are project-global, so BreMan's is name-prefixed:

1. Go to **Storage** → **New bucket**
2. Name: `breman-media`, **Public bucket ON** — horse photos are served by public
   URL in the app. Keep sensitive documents in Drive, not this bucket.
3. Add an upload policy (Storage → Policies → `breman-media`) so authenticated
   users can upload:

```sql
CREATE POLICY "breman users upload media" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'breman-media' AND auth.role() = 'authenticated');

CREATE POLICY "breman users update media" ON storage.objects
    FOR UPDATE USING (bucket_id = 'breman-media' AND auth.role() = 'authenticated');
```

Horse profile photos upload to `breman-media/horses/{horse_id}/...`.

## Step 4: Environment variables

Create `.env.local` using the **shared project's** URL and keys — the same values
mwes-invoice and spa-scheduler use:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-shared-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=shared-project-anon-key
SUPABASE_SERVICE_ROLE_KEY=shared-project-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Never commit `.env.local` (already gitignored).

## Step 5: Create your BreMan user profile

Sign up through the app (or use your existing shared-project login), then grant it
BreMan access. In SQL Editor:

```sql
INSERT INTO breman.user_profiles (id, display_name, role, email)
SELECT id, 'Jack', 'owner', email FROM auth.users WHERE email = 'you@example.com';
```

A shared-project user with no `breman.user_profiles` row has **no** BreMan access —
RLS denies every table. That's the isolation boundary between the apps' users.

## Step 6: Test

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), log in, and you should land on
the dashboard. Add a horse to confirm writes work.

## Troubleshooting

### "The schema must be one of the following: public, graphql_public"
- Step 2 was skipped — expose `breman` under Project Settings → API

### "Failed to create user profile" / everything reads as empty
- Your login has no `breman.user_profiles` row (Step 5) — RLS is denying access

### "Cannot connect to Supabase"
- Verify `.env.local` has the shared project's full URL and keys
- Restart the dev server after editing `.env.local`

## Notes

- The old standalone-project migrations are archived in
  `supabase/migrations/archive/` and were never deployed anywhere.
- To regenerate TypeScript types once the Supabase CLI is wired up:
  `npx supabase gen types typescript --schema breman > lib/types/supabase.ts`
