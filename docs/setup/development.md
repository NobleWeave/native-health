# Development setup

## Prerequisites

- Node.js compatible with the installed Expo SDK
- npm
- Expo CLI through `npx`
- A Supabase project for authenticated/workflow data

## Install and run

```bash
npm install
npm run start
```

Useful scripts are `npm run android`, `npm run ios`, `npm run web`, and
`npm run lint`. Type checking can be run with `npx tsc --noEmit`.

## Environment

Create a local `.env` with:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
EXPO_PUBLIC_USDA_API_KEY=YOUR_USDA_KEY
EXPO_PUBLIC_OCR_API_KEY=YOUR_OCR_KEY
EXPO_PUBLIC_GEMINI_API_KEY=YOUR_GEMINI_KEY
```

Only the first two are required for the core Supabase client. The other
variables enable their respective client integrations. Never commit values or
use service-role credentials in Expo variables.

## Supabase local source boundary

The only checked-in migration is
[`20261110000000_careflow_rag.sql`](../../supabase/migrations/20261110000000_careflow_rag.sql).
The workflow tables used by client services are expected in the connected
Supabase project and are documented in [`DATABASE.md`](../../DATABASE.md), but
cannot be recreated from this repository alone.
