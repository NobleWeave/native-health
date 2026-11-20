# End-to-end data flows

## Authentication

```mermaid
sequenceDiagram
    participant U as User
    participant S as Auth screen
    participant A as Supabase Auth
    participant C as AuthContext
    participant P as profiles
    U->>S: Enter email and password
    S->>A: signInWithPassword or signUp
    A-->>S: User/session or error
    S->>C: Navigate to app
    C->>A: getSession and onAuthStateChange
    C->>P: Select role for signed-in user
```

Signup can route to patient or provider onboarding based on client metadata.
Email verification, password reset, and route-level guards are incomplete.

## Mission and appointment

```mermaid
flowchart LR
    create[Create mission screen] --> missionSvc[missionEngine.createMission]
    missionSvc --> mission[(care_missions)]
    mission --> taskSvc[tasks / missionEngine]
    taskSvc --> tasks[(care_tasks)]
    find[Find care] --> rank[navigator.findAndRankCare]
    rank --> search[search_providers RPC]
    provider[Provider detail] --> booking[appointmentModel.bookAppointment]
    booking --> appointments[(appointments)]
    appointments --> schedule[Provider schedule]
    schedule --> status[Status update]
    status --> events[(mission_events)]
```

The runtime uses lowercase status values in services. Chat booking writes
`scheduled`, while the normal booking path writes `requested`; provider UI
handling is not fully consistent.

## Care Circle

```mermaid
flowchart LR
    invite[Invite caregiver] --> profile[Lookup caregiver profile]
    profile --> relationship[(caregivers)]
    relationship --> consent[(consents)]
    consent --> shared[Shared mission/task queries]
    shared --> permission[utils/permissions.canAccess]
```

The client contains consent checks, but permission keys and sharing payloads are
not consistent across all paths. Database policy behavior is supplied by the
deployed schema documented in [`DATABASE.md`](../../DATABASE.md).

## Document OCR and task creation

The Documents screen accepts an image, calls OCR.Space, and displays extracted
text. At the user's request it sends the text to Gemini from the Expo client
using `EXPO_PUBLIC_GEMINI_API_KEY`, parses a JSON task array, selects the most
recent active mission (or creates a default prescription mission), and inserts
each task through `missionEngine.addTaskToMission`.

The screen does not persist OCR text through RAG, create a `documents` metadata
row, or store the original image in Supabase Storage.

## RAG ingestion and retrieval

The Daily Log screen calls [`services/rag.ts`](../../services/rag.ts), which
invokes the authenticated Edge Function. The function validates the bearer
session, creates 768-dimensional Gemini embeddings, and calls
`replace_patient_rag_source`. Questions use `match_patient_rag_chunks`, filter
similarity below `0.25`, and send relevant chunks to Gemini for a cited answer.
