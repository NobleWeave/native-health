# Authentication

## Purpose

Provide secure patient/provider/admin authentication using Supabase Auth.

## Current Flow

```text
Signup
  -> Supabase Auth
  -> auth.users
  -> handle_new_user()
  -> profiles(role = patient)
  -> email verification
  -> onboarding
```

## Login

Email/password login uses Supabase Auth.

The application should expose only authentication state through `AuthContext`, while authorization remains in RLS.

## Signup

Normal signup accepts:

```text
name
email
password
```

Role is not user-selectable.

## Email Verification

The app uses a deep-link callback such as:

```text
healthcareapp://auth/callback
```

The callback exchanges the Supabase authorization code for a session.

## Onboarding

After authentication, onboarding collects patient-specific information and stores it in `patient_health_profiles`.

## Security Requirements

- Never trust client-provided roles.
- Never store passwords in application tables.
- Never expose service-role keys.
- Handle expired sessions.
- Handle verification-required states.
- Protect reset-password links.
