# Deployment

## Mobile client

Configure the Expo public Supabase URL and publishable key for the target
project, then build with the normal Expo workflow. Public variables are
embedded in the app; do not put service-role, database, or private provider
credentials there.

## RAG backend

From the repository root, after linking the intended Supabase project:

```bash
supabase db push
supabase secrets set GEMINI_API_KEY=YOUR_KEY GEMINI_GENERATION_MODEL=gemini-3.1-flash-lite
supabase functions deploy careflow-rag
```

`supabase/config.toml` enables JWT verification for the function. Apply the
RAG migration before deploying the function. The broader workflow schema,
policies, and triggers documented in [`DATABASE.md`](../../DATABASE.md) must
also exist in the target project; no checked-in migration currently provisions
them.

## Production blockers

Before handling real health data, move main-chat and document-task Gemini calls
behind a trusted server boundary, provision and audit Storage/RLS policies, add
route and role guards, verify provider approval, add cross-patient
authorization tests, and review the OCR/Gemini provider terms and healthcare
privacy requirements.
