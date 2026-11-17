# Troubleshooting

## Authentication

- If the app returns to login, inspect the Supabase session and
  `EXPO_PUBLIC_SUPABASE_URL`.
- If role-based tabs are wrong, verify the connected user's `profiles.role`.
- Email confirmation and password reset flows are not implemented in the app.

## RAG

- `401`: sign in again and confirm the function is deployed with JWT
  verification.
- `GEMINI_API_KEY is not configured`: set the Edge Function secret, not an
  Expo public variable.
- Migration/RPC errors: apply the checked-in RAG migration to the same project
  used by the app.
- No matching records: verify the source belongs to the signed-in user and the
  question has relevant indexed text.
- OCR errors: check the OCR key, image type, provider response, and quota.
- Mission-task generation errors: verify `EXPO_PUBLIC_GEMINI_API_KEY`, check
  that Gemini returned a JSON array of strings, and confirm the connected
  Supabase project permits mission/task inserts and mission-event writes.

## Workflow

- Provider/mission/appointment errors often indicate that the connected
  project's schema or RLS differs from [`DATABASE.md`](../../DATABASE.md).
- Provider availability score is currently not a database-backed ranking input.
- The main assistant can show a generic connection message when the Gemini
  request or a downstream Supabase operation fails.
