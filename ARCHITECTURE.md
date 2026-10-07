# Architecture

## 1. System Overview

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
                    │  ┌────────┐  ┌───────────┐ │
                    │  │ Auth   │  │ PostgreSQL │ │
                    │  └────────┘  └───────────┘ │
                    │                   │          │
                    │              RLS / Triggers │
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

## 2. Client Architecture

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

## 3. Authentication Architecture

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

The client maintains:
- `user`
- `session`
- `profile`
- `loading`

The `profile.role` controls the application's role-aware experience, but database RLS remains authoritative.

## 4. Care Mission Architecture

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

## 5. AI Architecture

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

## 6. Tool Calling

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

## 7. Context Management

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

## 8. Document Architecture

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

## 9. Caregiver Architecture

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

## 10. Notifications

Notifications are persisted in PostgreSQL.

Examples:
- appointment reminder
- mission update
- task reminder
- consent request
- document processing complete

A future push notification service can consume pending notification records.

## 11. Security Boundaries

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

## 12. Scalability Direction

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
