# Cavvy - Farm & Stable Management

A farm and stable management system for AQHA breeding operations — horses, breeding events, foaling records, and multi-generational lineage. (Formerly "BreMan".)

## Tech Stack

- **Frontend**: Next.js 15+ (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: Anthropic Claude API for voice dictation parsing
- **Hosting**: Fly.io
- **Integration**: Google Drive, Google Photos

## Project Structure

```
Cavvy/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── lib/                   # Shared utilities
│   └── supabase/         # Supabase client utilities
│       ├── client.ts     # Browser client
│       └── server.ts     # Server client
├── components/           # React components (to be built)
├── supabase/            # Supabase configuration
│   └── migrations/      # Database migrations
└── BREMAN_PLAN.md      # Full project specification
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Anthropic API key
- (Optional) Google Cloud project for Drive/Photos integration

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment template:
   ```bash
   cp .env.local.example .env.local
   ```

4. Fill in your environment variables in `.env.local`

5. Set up Supabase — Cavvy lives in the **shared project** (same one as
   mwes-invoice and spa-scheduler), inside a dedicated `cavvy` schema.
   Follow `docs/SUPABASE_SETUP.md`: run
   `supabase/migrations/20260706000000_cavvy_schema.sql`, expose the
   `cavvy` schema in the API settings, and create the `cavvy-media` bucket.

6. Run the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000)

## Development

### Running Locally

```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm start
```

## Database Schema

See `supabase/migrations/20260706000000_cavvy_schema.sql` for the complete database schema (all in the `cavvy` Postgres schema) including:

- **Core Tables**: horses, breeding_events, heat_observations, ultrasound_checks, foaling_events, hormone_treatments
- **Supporting Tables**: attachments, documents, semen_shipments, foaling_prep_observations
- **Post-MVP**: costs, breeding_contracts, stallion_details, health_events, alerts

## Key Features (Planned)

### MVP Scope
- Horse management with detailed profiles
- Breeding event tracking
- Heat cycle observations with ultrasound data
- Pregnancy checks and results
- Foaling records
- AI-powered voice dictation for data entry
- Google Drive/Photos integration
- Multi-generational lineage tracking

### Post-MVP
- Automated alerts and notifications
- Semen shipment tracking
- Foaling watch mode
- Contract parsing with AI
- Financial tracking
- Reports and analytics

## Design Philosophy

- **Mobile-first**: Primary data entry happens at the barn via phone
- **Light theme**: Clean, high-contrast surfaces that read well on phones outdoors
- **Table-forward**: Dense, scannable list views
- **Slide-out panels**: Quick detail views without losing context
- **Voice-driven**: Walkie-talkie style push-to-talk for hands-free entry

## Documentation

- **Full Specification**: See `BREMAN_PLAN.md` for complete project plan and requirements
- **Database Schema**: See `supabase/migrations/` for schema details

## License

Private project for Jack Jewison

## Notes

This project follows patterns established in VetBox-Pro and PDM-web for consistency across Jack's development environment.
