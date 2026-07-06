# Development Setup Guide

## Initial Setup

### 1. Supabase Project Setup

1. Go to [https://supabase.com](https://supabase.com) and create a new project
   - Project name: `cavvy`
   - Database password: (save this securely)
   - Region: Choose closest to Wisconsin (likely `us-east-1`)

2. Once the project is created, get your credentials:
   - Go to Project Settings → API
   - Copy `Project URL` → This is your `NEXT_PUBLIC_SUPABASE_URL`
   - Copy `anon public` key → This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy `service_role` key → This is your `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

3. Run the database migration:
   - Go to SQL Editor in Supabase dashboard
   - Copy contents of `supabase/migrations/20260515_initial_schema.sql`
   - Paste and run
   - Verify tables were created in Table Editor

### 2. Anthropic API Setup

1. Go to [https://console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. Copy the key → This is your `ANTHROPIC_API_KEY`

### 3. Environment Configuration

Create `.env.local` file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-api...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Development Server

```bash
npm run dev
```

Navigate to [http://localhost:3000](http://localhost:3000)

## Database Management

### Running Migrations

Using Supabase CLI (recommended):

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
npx supabase link --project-ref your-project-ref

# Push migrations
npx supabase db push
```

### Seeding Initial Data

After the schema is created, you'll want to add:

1. **User profile** for yourself:
   - Sign up through the app (once auth is built)
   - Or manually insert into `user_profiles` table

2. **Initial horses**:
   - Add your current broodmare roster
   - Add known stallions (both owned and outside studs)

## Google Integration (Optional - Post-MVP)

### Google Drive API

1. Go to Google Cloud Console
2. Create a new project or select existing
3. Enable Google Drive API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-domain.fly.dev/api/auth/callback/google` (production)

### Google Photos API

Similar process to Drive API - verify current API status as it has restrictions.

## Fly.io Deployment (Post-MVP)

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Create app: `fly launch`
   - App name: `cavvy`
   - Region: `ord` (Chicago, closest to Wisconsin)
4. Set secrets:
   ```bash
   fly secrets set NEXT_PUBLIC_SUPABASE_URL=...
   fly secrets set NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   fly secrets set SUPABASE_SERVICE_ROLE_KEY=...
   fly secrets set ANTHROPIC_API_KEY=...
   ```
5. Deploy: `fly deploy`

## Troubleshooting

### Can't connect to Supabase

- Verify environment variables are set correctly
- Check that Supabase project is not paused (free tier auto-pauses)
- Ensure RLS policies are configured correctly

### Build errors

- Delete `.next` folder and `node_modules`
- Run `npm install` again
- Clear npm cache: `npm cache clean --force`

### Type errors

- Ensure TypeScript version is compatible
- Run `npm run build` to see all type errors
- Check that all environment variables are properly typed

## Next Steps

1. Complete RLS policies in Supabase
2. Build authentication UI
3. Create horse list and detail pages
4. Implement CRUD operations
5. Build AI dictation component
6. Add Google integrations
