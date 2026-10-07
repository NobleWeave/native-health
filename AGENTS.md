# AGENTS.md

## Project

CareFlow is a healthcare care-coordination application built as a React Native mobile app with Supabase as the backend. It is designed around coordinated healthcare workflows rather than acting as a generic "AI doctor".

The system combines:
- Patient authentication and onboarding
- Patient health information
- AI-assisted conversational interaction
- Intent-based action execution
- Care missions and task tracking
- Provider discovery/matching
- Appointment coordination
- Medical document management
- Caregiver access through explicit consent
- Notifications
- Role-based patient/provider/admin workflows

## Primary Stack

- React Native
- TypeScript
- Supabase Auth
- Supabase PostgreSQL
- Supabase Row Level Security (RLS)
- Supabase Storage for medical files
- LLM API for conversational/intent capabilities

Do not introduce a different backend, database, or authentication provider unless explicitly requested.

## Engineering Principles

1. Prefer simple, explainable architecture over unnecessary abstraction.
2. Keep authorization in the backend/database, not only in frontend navigation.
3. Never trust role values supplied by the client.
4. Normal signup always creates a `patient`.
5. Provider/admin privileges must be granted through controlled workflows.
6. Healthcare data must follow least-privilege access.
7. Use RLS for database authorization.
8. Store medical file binaries in Supabase Storage and metadata in PostgreSQL.
9. Keep AI responses and deterministic application actions separate.
10. Avoid implementing medical diagnosis or unsafe clinical decision-making as a product promise.
11. Do not hard-code secrets, service-role keys, API keys, or credentials into the mobile app.
12. Prefer typed interfaces and explicit error handling.
13. Preserve existing architecture unless there is a clear reason to change it.
14. Avoid adding libraries when the existing stack can solve the problem cleanly.
15. Do not make speculative changes to unrelated modules.

## Authentication Rules

Supabase Auth is the source of truth for authentication.

Expected flow:

```text
React Native
    |
    v
Supabase Auth
    |
    +--> auth.users
    |
    +--> handle_new_user() trigger
             |
             v
          profiles
             |
             v
       patient by default
```

The client must never allow a user to choose `admin` or `provider` during normal signup.

Session state should be centralized in `AuthContext`.

Use:
- `getSession()` for initial local session restoration
- `onAuthStateChange()` for auth events
- Supabase database queries for profile loading
- `signInWithPassword()` for email/password login
- `signUp()` for registration
- `signOut()` for logout

Avoid long-running asynchronous database work directly inside an `onAuthStateChange` callback.

## Database Rules

PostgreSQL is the source of truth for application data.

Important tables include:

- `profiles`
- `patient_health_profiles`
- `providers`
- `care_missions`
- `care_tasks`
- `appointments`
- `documents`
- `caregivers`
- `consents`
- `provider_availability`
- `notifications`

Do not use subqueries inside PostgreSQL `CHECK` constraints. Cross-row/cross-table invariants should use:
- foreign keys
- triggers
- RPC/functions
- application workflows where appropriate

Example: appointment patient/mission consistency is enforced through a trigger because PostgreSQL does not allow a subquery in a CHECK constraint.

## RLS

RLS is a security boundary, not an optional feature.

Every new table containing user or healthcare data should have:
1. RLS enabled
2. Explicit SELECT policies
3. Explicit INSERT policies
4. Explicit UPDATE policies
5. Explicit DELETE policies where needed
6. Admin/provider/patient access rules defined separately

Never assume frontend route guards provide authorization.

## Healthcare Data

Separate account/profile data from sensitive health data.

Recommended structure:

```text
profiles
  account identity and application role

patient_health_profiles
  patient-specific health information
```

Do not place every healthcare attribute into `profiles` merely because it is convenient.

## AI Architecture

The preferred AI flow is:

```text
User message
     |
     v
Intent Router
     |
     +---- Informational/general question
     |           |
     |           v
     |        LLM response
     |
     +---- Action request
                 |
                 v
             Tool call
                 |
                 v
          Application service
                 |
                 v
          Database/API result
                 |
                 v
          LLM response
```

The LLM should not directly manipulate the database.

Tool calls should be deterministic application operations with validated inputs.

The conversation context should contain:
- relevant user conversation history
- current mission/task context when applicable
- tool-call results
- safe profile context needed for the current interaction

Do not expose unnecessary sensitive patient information to an external model.

## File Handling

Medical files:
- Binary content -> Supabase Storage
- Metadata -> `documents`
- Extracted text/structured data -> controlled database fields
- Access -> RLS plus Storage policies

Use stable storage paths such as:

```text
medical-documents/{patient_id}/{document_id}/{filename}
```

Never expose service-role credentials to the mobile application.

## Coding Style

- TypeScript strictness is preferred.
- Use meaningful names.
- Keep components focused.
- Avoid giant files.
- Prefer reusable services/hooks for repeated backend operations.
- Handle loading, success, empty, and error states.
- Validate external input.
- Keep database queries close to their domain/service layer when practical.
- Do not silently swallow errors.

## Before Modifying Code

1. Inspect the relevant existing files.
2. Understand current data flow.
3. Check whether a feature already exists.
4. Avoid duplicating existing utilities/components.
5. Preserve public interfaces unless a migration is intentional.
6. Update documentation when architecture or behavior changes.

## Before Adding a Database Change

Check:
- foreign keys
- cascade behavior
- indexes
- RLS
- role boundaries
- whether a trigger/function is required
- whether Storage policies must also change

## Testing Expectations

For meaningful changes, test at least:
- happy path
- unauthenticated path
- unauthorized role/path
- invalid input
- loading/error states
- database constraint behavior where applicable

For security-sensitive changes, specifically test that a patient cannot access another patient's data.

## Do Not

- Do not commit secrets.
- Do not use the Supabase service-role key in React Native.
- Do not allow client-selected admin/provider roles.
- Do not bypass RLS merely to make a frontend feature work.
- Do not let the LLM perform arbitrary SQL.
- Do not claim clinical accuracy or diagnosis without appropriate validation.
- Do not rewrite unrelated project files.

