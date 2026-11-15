# Authentication and onboarding

## Implemented flow

`/auth` and `/login` call `AuthContext.signIn`, which calls
`supabase.auth.signInWithPassword`. `/signup` calls `supabase.auth.signUp`.
[`AuthProvider`](../../context/AuthContext.tsx) restores the persisted session
with `getSession`, subscribes to `onAuthStateChange`, loads `profiles.role`,
and exposes `user`, `session`, `role`, `location`, and loading state.

After signup, the UI routes to either patient onboarding
([`onboarding/get-started.tsx`](../../app/onboarding/get-started.tsx)) or
provider setup ([`onboarding/provider-setup.tsx`](../../app/onboarding/provider-setup.tsx)).
Patient onboarding writes `patient_health_profiles`; provider setup writes
`providers`. Logout is implemented from the profile screen.

## Authorization boundary

The tab layout hides patient/provider tabs based on the loaded role. This is
navigation UX only; routes are not guarded and direct navigation is possible.
Database RLS in the deployed schema must enforce access.

## Partial or incomplete

- `/auth` and `/login` duplicate login implementations.
- Email verification callback and password reset are not implemented.
- Provider approval and trusted role assignment are not a complete workflow.
- Signup can pass provider metadata; the client must not be trusted to grant a
  privileged role.
- Location denial/error falls back to fixed coordinates `(23.83, 91.28)`.

Configuration uses `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in
[`services/supabase/client.ts`](../../services/supabase/client.ts).
