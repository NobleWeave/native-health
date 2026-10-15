# Architecture

## As-built status

This document distinguishes the running prototype from the intended architecture below. As of 2026-10-15:

- The app is an Expo/React Native TypeScript project using Expo Router file-based routes.
- The root route redirects to `/auth`; the tab navigator contains Home, Assistant, Care, and Profile. Authentication route guards are not implemented.
- `AuthProvider` in `context/AuthContext.tsx` restores the Supabase session with `getSession`, listens for auth changes, and exposes sign-in, sign-up, and sign-out. It stores `user`, `session`, and `loading`; it does not load an application profile. Sign-in uses the context, while the sign-up screen calls the Supabase client directly.
- `services/supabase/client.ts` configures Supabase Auth with AsyncStorage persistence. The sign-up screen creates an Auth user but explicitly skips profile creation. No database migrations or schema files are present in the repository.
- The care, provider, mission, appointment, and document screens display hard-coded demo content. `data/mockDb.ts` contains typed in-memory sample data and helper functions, but the screens do not use it as a live database.
- The assistant screen is static UI; there is no intent router, LLM integration, or tool execution flow.
- The USDA FoodData Central and CDC services, plus the Open Food Facts lookup, are external API integrations. They are separate from the care-workflow backend.
- There are no implemented RLS policies, Storage policies, database triggers, caregiver-consent enforcement, or persisted care-workflow records in this repository. The sections below describing these are target design, not existing protections or behavior.

Environment variables used by the client are `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `EXPO_PUBLIC_USDA_API_KEY`. Expo public variables are bundled into the client; they must not contain server secrets.

## 1. System Overview

The following diagram describes the target system, not the current prototype:

```text
                         ┌──────────────────────┐
                         │    React Native App  │
                         │      TypeScript      │
                         └──────────┬───────────┘
                                    │
                         Auth / Data / API calls
                                    │
                                    v
                    ┌──────────────────────────────┐
                    │           Supabase           │
                    │                              │
                    │  ┌────────┐  ┌───────────┐   │
                    │  │ Auth   │  │ PostgreSQL│   │
                    │  └────────┘  └───────────┘   │
                    │                   │          │
                    │              RLS / Triggers  │
                    │                   │          │
                    │             ┌───────────┐    │
                    │             │  Storage  │    │
                    │             └───────────┘    │
                    └──────────────────────────────┘

                              AI Layer
                                  │
                                  v
                       ┌─────────────────────┐
                       │    Intent Router    │
                       └──────────┬──────────┘
                                  │
                   ┌──────────────┴──────────────┐
                   │                             │
                   v                             v
          Informational intent             Action intent
                   │                             │
                   v                             v
              LLM response                 Tool selection
                                                 │
                                                 v
                                          Application service
                                                 │
                                                 v
                                          Supabase / APIs
```

## 2. Target Client Architecture

Recommended conceptual layers:

```text
screens/
components/
hooks/
context/
services/
lib/
types/
```

### Screens

UI and user interaction.

### Components

Reusable UI elements.

### Context

Global state such as authentication.

### Services

Domain operations such as:
- missions
- appointments
- providers
- documents
- consent

### Lib

Infrastructure configuration such as Supabase client.

### Types

Shared TypeScript models.

## 3. Target Authentication Architecture

```text
Signup
  |
  v
Supabase Auth
  |
  v
auth.users
  |
  v
DB trigger
  |
  v
profiles
```

The current client maintains:
- `user`
- `session`
- `loading`

Profile loading, role-aware navigation, and database authorization have not been implemented. The target architecture requires backend authorization (including RLS); client navigation alone must not be treated as an authorization boundary.

## 4. Target Care Mission Architecture

```text
Patient need
     |
     v
Care Mission
     |
     +--> Care Tasks
     |
     +--> Provider
     |
     +--> Appointment(s)
     |
     +--> Documents
     |
     +--> Notifications
```

Mission lifecycle:

```text
CREATED
   |
   v
CARE_IDENTIFIED
   |
   v
PROVIDER_SELECTED
   |
   v
APPOINTMENT_BOOKED
   |
   v
CONSULTATION
   |
   v
FOLLOW_UP
   |
   v
COMPLETED
```

Cancellation can occur from applicable active states.

## 5. Target AI Architecture (not implemented)

### Intent Router

The router classifies a user message into an application-supported intent.

Example:

```json
{
  "intent": "FIND_PROVIDER",
  "confidence": 0.94,
  "entities": {
    "speciality": "cardiology"
  }
}
```

The exact schema should remain small and deterministic.

### Informational Intent

Example:

> "What is an ECG?"

Flow:

```text
User
 -> Intent Router
 -> INFORMATION
 -> LLM
 -> Response
```

### Action Intent

Example:

> "Find me a cardiologist nearby."

Flow:

```text
User
 -> Intent Router
 -> FIND_PROVIDER
 -> Tool
 -> Provider service
 -> Database query
 -> Results
 -> LLM response
```

The LLM should not execute SQL.

## 6. Target Tool Calling (not implemented)

A tool should define:
- name
- description
- validated input schema
- authorization requirements
- application implementation
- output schema

Example:

```text
find_providers
create_care_mission
get_care_missions
create_appointment
get_appointments
get_documents
create_consent
```

Sensitive operations must verify the authenticated user before execution.

## 7. Target Context Management

Conversation context should not indiscriminately include the entire patient record.

Use the minimum context required for the current task.

Possible context:

```text
Conversation history
      +
Current mission
      +
Relevant task state
      +
Relevant profile fields
      +
Tool results
```

Do not send unnecessary medical documents or sensitive information to an external model.

## 8. Target Document Architecture (not implemented)

```text
Mobile
  |
  | upload
  v
Supabase Storage
  |
  | metadata
  v
documents table
  |
  +--> processing status
  |
  +--> extracted text
  |
  +--> structured data
```

Access must be controlled by both database authorization and Storage policies.

## 9. Target Caregiver Architecture (not implemented)

```text
Patient
  |
  v
Caregiver relationship
  |
  v
Consent
  |
  +--> permission(s)
  +--> optional mission
  +--> optional expiry
  |
  v
Authorized access
```

Revocation must immediately remove access.

## 10. Target Notifications (not implemented)

Notifications are persisted in PostgreSQL.

Examples:
- appointment reminder
- mission update
- task reminder
- consent request
- document processing complete

A future push notification service can consume pending notification records.

## 11. Target Security Boundaries

```text
Mobile client
   |
   | publishable/anon key
   v
Supabase
   |
   +--> Auth
   |
   +--> RLS
   |
   +--> Storage policies
   |
   +--> Database constraints/triggers
```

Service-role credentials belong only in trusted server-side environments.

## 12. Future Scalability Direction

The initial project should remain modular rather than distributed.

If scale requires it later:

```text
React Native
     |
     v
API / Edge Functions
     |
     +--> Auth
     +--> Mission service
     +--> Provider service
     +--> AI service
     +--> Notification worker
     |
     v
Supabase
```

Do not introduce this complexity until the simpler architecture is insufficient.
