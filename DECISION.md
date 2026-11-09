# Architecture & Product Decisions

This document records important decisions and their rationale.

**Decision status is not implementation status.** These decisions describe the intended product unless the implementation notes explicitly say otherwise. The current repository is an Expo prototype with Supabase Auth configured, but without a persisted care-workflow schema or backend authorization policies.

## D001 — Supabase is the backend platform

**Decision:** Use Supabase for authentication, PostgreSQL, Storage, and backend data access.

**Reason:**
- Integrated Auth + PostgreSQL + Storage
- Strong RLS support
- Fast development for a semester project
- PostgreSQL is suitable for relational healthcare workflows

**Implementation status:** Supabase Auth client is configured. No care-workflow schema, Storage bucket, or database policy is defined in this repository.

**Decision status:** Accepted

---

## D002 — React Native is the client

**Decision:** Build the mobile application using Expo, React Native, and TypeScript, with Expo Router for file-based navigation.

**Reason:**
- Mobile-first healthcare workflow
- Shared TypeScript model
- Existing project direction

**Implementation status:** Implemented as the current client foundation.

**Decision status:** Accepted

---

## D003 — Normal signup always creates a patient

**Decision:** Users cannot select `admin` or `provider` during signup.

**Reason:**
Allowing role selection from the client would create a privilege-escalation risk.

**Implementation status:**
The signup screen currently creates a Supabase Auth user and skips profile creation. No `handle_new_user()` trigger or profile schema is defined in this repository. The target flow is for trusted backend code to assign the patient role; the client must not choose a privileged role.

Provider/admin roles require controlled administrative workflows before those roles are introduced.

**Decision status:** Accepted

---

## D004 — PostgreSQL RLS is the authorization boundary

**Decision:** Use RLS for database authorization.

**Reason:**
Frontend route protection can be bypassed. Database-level authorization cannot be replaced by UI logic.

**Implementation status:** No application tables or RLS policies are defined in this repository.

**Decision status:** Accepted

---

## D005 — Separate account profile from health profile

**Decision:** Keep basic identity/application fields in `profiles` and sensitive patient health information in `patient_health_profiles`.

**Reason:**
- Cleaner domain model
- Easier RLS
- Reduced exposure of sensitive data
- Better future extensibility

**Implementation status:** No persisted health-profile table is defined in this repository.

**Decision status:** Accepted

---

## D006 — Medical files use Supabase Storage

**Decision:** Store file binaries in Storage and metadata in PostgreSQL.

**Reason:**
PostgreSQL should not be used as a general binary-file store.

**Implementation status:** No document upload flow, Storage bucket, or metadata table is defined in this repository.

**Decision status:** Accepted

---

## D007 — AI uses intent routing instead of a fully autonomous agent

**Decision:** Use an intent router followed by either an informational LLM response or a controlled application tool.

**Reason:**
A fully autonomous agent introduces unnecessary complexity and security risk for the project's scope.

Preferred flow:

```text
Message
  |
  v
Intent Router
  |
  +--> Information --> LLM
  |
  +--> Action ------> Tool --> Application --> Database
```

**Implementation status:** The assistant is currently static UI; intent routing and LLM responses are not implemented.

**Decision status:** Accepted

---

## D008 — LLM cannot directly access the database

**Decision:** The LLM can request approved tools, but application/server code executes those tools.

**Reason:**
- Input validation
- Authorization
- Auditing
- Predictable side effects
- Reduced prompt-injection impact

**Implementation status:** No LLM or tool-calling integration is implemented.

**Decision status:** Accepted

---

## D009 — Cross-table appointment validation uses a trigger

**Decision:** If appointments are persisted, validate that `appointments.patient_id` matches the mission's patient using a database-level mechanism such as a PostgreSQL trigger.

**Reason:**
PostgreSQL does not permit a subquery inside a CHECK constraint.

**Implementation status:** No appointments table or validation trigger is defined in this repository.

**Decision status:** Accepted

---

## D010 — Caregiver access requires explicit consent

**Decision:** Caregivers do not automatically receive access to a patient's information.

**Reason:**
Healthcare data should use explicit least-privilege access.

Consent may be:
- active/revoked
- expiring
- patient-wide
- mission-specific
- permission-specific

**Implementation status:** Caregiver and consent examples exist only in the in-memory mock data; consent is not enforced.

**Decision status:** Accepted

---

## D011 — Provider matching is multi-factor

**Decision:** Provider discovery should consider multiple criteria instead of only specialty.

Potential criteria:
- specialty
- distance
- consultation fee
- insurance scheme
- language
- availability
- accessibility

**Implementation status:** The provider screen currently displays static sample cards; there is no implemented matching or filtering.

**Decision status:** Accepted

---

## D012 — Do not over-engineer the first implementation

**Decision:** Prefer a working, understandable architecture over unnecessary microservices, complex RAG pipelines, or custom infrastructure.

**Reason:**
The project has a limited implementation window and must remain demonstrable and maintainable.

**Decision status:** Accepted
