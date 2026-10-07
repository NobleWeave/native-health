# Architecture & Product Decisions

This document records important decisions and their rationale.

## D001 — Supabase is the backend platform

**Decision:** Use Supabase for authentication, PostgreSQL, Storage, and backend data access.

**Reason:**
- Integrated Auth + PostgreSQL + Storage
- Strong RLS support
- Fast development for a semester project
- PostgreSQL is suitable for relational healthcare workflows

**Status:** Accepted

---

## D002 — React Native is the client

**Decision:** Build the mobile application using React Native and TypeScript.

**Reason:**
- Mobile-first healthcare workflow
- Shared TypeScript model
- Existing project direction

**Status:** Accepted

---

## D003 — Normal signup always creates a patient

**Decision:** Users cannot select `admin` or `provider` during signup.

**Reason:**
Allowing role selection from the client would create a privilege-escalation risk.

**Implementation:**
The `handle_new_user()` database trigger creates a `profiles` row with:

```text
role = patient
```

Provider/admin roles require controlled administrative workflows.

**Status:** Accepted

---

## D004 — PostgreSQL RLS is the authorization boundary

**Decision:** Use RLS for database authorization.

**Reason:**
Frontend route protection can be bypassed. Database-level authorization cannot be replaced by UI logic.

**Status:** Accepted

---

## D005 — Separate account profile from health profile

**Decision:** Keep basic identity/application fields in `profiles` and sensitive patient health information in `patient_health_profiles`.

**Reason:**
- Cleaner domain model
- Easier RLS
- Reduced exposure of sensitive data
- Better future extensibility

**Status:** Accepted

---

## D006 — Medical files use Supabase Storage

**Decision:** Store file binaries in Storage and metadata in PostgreSQL.

**Reason:**
PostgreSQL should not be used as a general binary-file store.

**Status:** Accepted

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

**Status:** Accepted

---

## D008 — LLM cannot directly access the database

**Decision:** The LLM can request approved tools, but application/server code executes those tools.

**Reason:**
- Input validation
- Authorization
- Auditing
- Predictable side effects
- Reduced prompt-injection impact

**Status:** Accepted

---

## D009 — Cross-table appointment validation uses a trigger

**Decision:** Validate that `appointments.patient_id` matches the mission's patient using a PostgreSQL trigger.

**Reason:**
PostgreSQL does not permit a subquery inside a CHECK constraint.

**Status:** Accepted

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

**Status:** Accepted

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

**Status:** Accepted

---

## D012 — Do not over-engineer the first implementation

**Decision:** Prefer a working, understandable architecture over unnecessary microservices, complex RAG pipelines, or custom infrastructure.

**Reason:**
The project has a limited implementation window and must remain demonstrable and maintainable.

**Status:** Accepted
