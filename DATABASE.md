# Database

## Current implementation status

Supabase is configured for client authentication, but this repository does not contain a deployed schema definition, SQL migration, seed script, or database access layer for care workflows. The sign-up screen creates a Supabase Auth user and explicitly skips profile creation. The repository therefore does not establish that `profiles`, any of the other tables below, their constraints, RLS policies, triggers, or the Storage bucket exist in the connected Supabase project.

`data/mockDb.ts` is a TypeScript in-memory fixture only. It defines sample types and records for profiles, providers, missions, tasks, appointments, documents, caregivers, consents, provider availability, and notifications. Current screens show hard-coded demo content and do not persist these records.

The mock types are not a database contract: their role and status values differ from several proposed schema definitions below. Reconcile the target model before creating migrations. The schema descriptions in this document are a proposed target model, not a record of the live database. Before relying on any table or access rule, add and apply migrations, then verify the schema and policies in the Supabase project.

## 1. Target Database Platform

CareFlow uses Supabase PostgreSQL.

Authentication identities are stored by Supabase Auth in:

```text
auth.users
```

Application-level user information is stored in:

```text
public.profiles
```

## 2. Proposed Entity Overview

```text
auth.users
    |
    v
profiles
    |
    +------------------+
    |                  |
    v                  v
patient_health_profiles  providers
                           |
                           v
                    provider_availability

profiles
    |
    v
care_missions
    |
    +--> care_tasks
    |
    +--> appointments
    |
    +--> documents
    |
    +--> notifications

profiles
    |
    +--> caregivers
    |
    +--> consents

profiles
    |
    v
notifications
```

## 3. Proposed `profiles`

Purpose: application identity and role.

Core fields:

```text
id UUID PK -> auth.users(id)
full_name TEXT
phone TEXT
email TEXT
role ENUM(patient, provider, admin)
language TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Important rule:

> Users must not be able to update their own role.

## 4. Proposed `patient_health_profiles`

Purpose: patient-specific health information.

Recommended fields:

```text
patient_id UUID PK -> profiles(id)
date_of_birth DATE
blood_group TEXT
allergies TEXT
conditions TEXT
medications TEXT
emergency_contact TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

This table should be accessible primarily to the patient and explicitly authorized users.

## 5. Proposed `providers`

Purpose: healthcare provider/service information.

Core fields:

```text
id UUID PK
profile_id UUID UNIQUE -> profiles(id)
name TEXT
provider_type TEXT
speciality TEXT
consultation_fee NUMERIC
latitude NUMERIC
longitude NUMERIC
address TEXT
languages TEXT[]
insurance_schemes TEXT[]
accessibility TEXT[]
phone TEXT
is_active BOOLEAN
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

A provider profile should be associated with an approved provider account where applicable.

## 6. Proposed `provider_availability`

Purpose: provider availability slots.

```text
id UUID PK
provider_id UUID -> providers(id)
start_time TIMESTAMPTZ
end_time TIMESTAMPTZ
is_available BOOLEAN
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Constraint:

```text
end_time > start_time
```

Provider availability should be managed only by the provider or admin.

## 7. Proposed `care_missions`

Purpose: represents a patient's healthcare coordination objective.

```text
id UUID PK
patient_id UUID -> profiles(id)
title TEXT
description TEXT
urgency ENUM(low, normal, high, urgent)
status ENUM(
  created,
  care_identified,
  provider_selected,
  appointment_booked,
  consultation,
  follow_up,
  completed,
  cancelled
)
provider_id UUID -> providers(id)
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
completed_at TIMESTAMPTZ
```

## 8. Proposed `care_tasks`

Purpose: actionable steps within a mission.

```text
id UUID PK
mission_id UUID -> care_missions(id)
title TEXT
description TEXT
status ENUM(pending, in_progress, completed, cancelled)
due_at TIMESTAMPTZ
assigned_to UUID -> profiles(id)
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
completed_at TIMESTAMPTZ
```

## 9. Proposed `appointments`

Purpose: scheduled healthcare interactions.

```text
id UUID PK
mission_id UUID -> care_missions(id)
patient_id UUID -> profiles(id)
provider_id UUID -> providers(id)
scheduled_at TIMESTAMPTZ
status ENUM(
  scheduled,
  confirmed,
  completed,
  cancelled,
  no_show
)
location TEXT
notes TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Important invariant:

```text
appointments.patient_id
must equal
care_missions.patient_id
```

If this invariant is adopted, enforce it with a PostgreSQL trigger or another database-level mechanism; it is not implemented in this repository.

## 10. Proposed `documents`

Purpose: metadata for patient medical documents.

```text
id UUID PK
patient_id UUID -> profiles(id)
mission_id UUID -> care_missions(id)
file_path TEXT
document_type TEXT
original_file_name TEXT
mime_type TEXT
file_size_bytes BIGINT
extracted_text TEXT
structured_data JSONB
processing_status ENUM(
  pending,
  processing,
  completed,
  failed
)
uploaded_by UUID -> profiles(id)
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

In the target design, the actual file belongs in Supabase Storage. No upload flow or bucket configuration is currently implemented.

Suggested path:

```text
medical-documents/{patient_id}/{document_id}/{filename}
```

## 11. Proposed `caregivers`

Purpose: represents a relationship between a patient and caregiver.

```text
id UUID PK
patient_id UUID -> profiles(id)
caregiver_id UUID -> profiles(id)
relationship TEXT
status ENUM(pending, active, revoked)
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Constraint:

```text
patient_id <> caregiver_id
```

Unique relationship:

```text
UNIQUE(patient_id, caregiver_id)
```

## 12. Proposed `consents`

Purpose: explicit permission for caregiver access.

```text
id UUID PK
patient_id UUID -> profiles(id)
caregiver_id UUID -> profiles(id)
mission_id UUID -> care_missions(id)
permissions JSONB
expires_at TIMESTAMPTZ
revoked_at TIMESTAMPTZ
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Example:

```json
{
  "view_documents": true,
  "view_missions": true,
  "view_appointments": false
}
```

Rules:
- Patient grants consent.
- Caregiver cannot grant themselves permissions.
- Consent may be mission-specific.
- Consent may expire.
- Revocation removes access.

## 13. Proposed `notifications`

Purpose: in-app notification records.

```text
id UUID PK
user_id UUID -> profiles(id)
task_id UUID -> care_tasks(id)
appointment_id UUID -> appointments(id)
mission_id UUID -> care_missions(id)
title TEXT
body TEXT
notification_type TEXT
scheduled_at TIMESTAMPTZ
sent_at TIMESTAMPTZ
read_at TIMESTAMPTZ
status ENUM(pending, sent, failed, cancelled)
created_at TIMESTAMPTZ
```

## 14. Target RLS Model (not implemented)

### Patient

Can access their own:
- profile
- health profile
- missions
- tasks
- appointments
- documents
- caregiver relationships
- consents
- notifications

### Provider

Can access only:
- their provider record
- their availability
- missions/appointments they are legitimately assigned to
- documents permitted by mission/consent rules

### Admin

Can perform administrative operations according to policy.

### Caregiver

Access is not based merely on having a caregiver relationship.

It requires:
1. active caregiver relationship
2. active consent
3. required permission
4. optional mission match
5. unexpired consent

The role and access rules below are requirements for a future backend implementation, not active controls in the current app.

## 15. Proposed Helper Functions

Useful security-definer helpers include:

```text
is_admin()
is_provider()
is_mission_patient(mission_uuid)
is_mission_provider(mission_uuid)
has_document_consent(...)
```

Security-definer functions should:
- have a controlled `search_path`
- avoid unsafe dynamic SQL
- perform only the minimum privileged operation needed

## 16. Proposed Triggers (not implemented)

### New User Trigger (planned)

The intended future flow when a Supabase Auth user is created:

```text
auth.users
     |
     v
handle_new_user()
     |
     v
profiles
role = patient
```

### Updated Timestamp (planned)

Tables with `updated_at` could use:

```text
set_updated_at()
```

### Appointment Patient Validation (planned)

The target schema should validate:

```text
appointment.patient_id
=
mission.patient_id
```

because cross-table subqueries are not valid in CHECK constraints.

## 17. Proposed Indexing

Recommended indexes include:

```text
profiles(role)

providers(speciality)
providers(is_active)

care_missions(patient_id)
care_missions(provider_id)
care_missions(status)

care_tasks(mission_id)
care_tasks(assigned_to)
care_tasks(status)

appointments(patient_id)
appointments(provider_id)
appointments(scheduled_at)
appointments(mission_id)

documents(patient_id)
documents(mission_id)

caregivers(patient_id)
caregivers(caregiver_id)

consents(patient_id)
consents(caregiver_id)
consents(mission_id)

notifications(user_id)
notifications(read_at)
notifications(status)
```

## 18. Target Data Integrity

Prefer:
- foreign keys
- unique constraints
- NOT NULL
- CHECK constraints for same-row rules
- triggers for cross-row/cross-table rules
- RLS for authorization

Do not misuse CHECK constraints for cross-table validation.

## 19. Target Storage

Recommended bucket:

```text
medical-documents
```

Suggested object structure:

```text
{patient_id}/{document_id}/{filename}
```

Storage policies must independently enforce the same access model as document metadata.

## 20. Sensitive Data Principles

- Minimize collected health data.
- Do not expose another patient's records.
- Do not place secrets in client code.
- Do not use service-role credentials in React Native.
- Avoid sending unnecessary health information to AI providers.
- Keep auditability in mind for sensitive operations.
