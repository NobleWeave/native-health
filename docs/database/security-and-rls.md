# Database security and RLS

## Source-of-truth boundary

The repository migration defines RLS and RPCs only for `rag_sources` and
`rag_chunks`. [`DATABASE.md`](../../DATABASE.md) is a supplied live-schema
export that documents 17 application tables, 56 policies, functions, and
triggers, but those objects cannot be recreated from this checkout.

## RAG protections

The migration:

- enables RLS on both RAG tables;
- permits authenticated users to select rows where `user_id = auth.uid()`;
- derives ownership in `replace_patient_rag_source`;
- scopes `match_patient_rag_chunks` to `auth.uid()`;
- grants the two RPCs only to `authenticated`;
- cascades deleted Auth users to RAG rows.

The Edge Function also requires a bearer token and calls `auth.getUser` before
processing a request.

## Workflow authorization

Workflow services query profiles, missions, providers, appointments,
caregivers, consents, documents, and conversations directly. The deployed RLS
policies described in [`DATABASE.md`](../../DATABASE.md) are therefore a
security dependency, not an optional UI feature. The app's role-based tabs and
`canAccess` helper do not replace database authorization.

## Audit findings

- No repository migration recreates the documented workflow RLS policies.
- No Supabase Storage bucket or Storage policy is defined in the repository.
- Main Gemini chat uses a client-bundled `EXPO_PUBLIC_GEMINI_API_KEY`.
- Signup/provider onboarding does not demonstrate a complete trusted approval
  workflow.
- Cross-patient isolation and role-boundary tests are not included.

Do not place private keys or service-role credentials in Expo public variables.
