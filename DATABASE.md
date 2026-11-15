# CareFlow Database

> \*\*Live schema reference.\*\* This document is generated from the supplied Supabase schema export. It describes the objects visible in the `public` schema at the time of export; it is not a migration or a substitute for the SQL definitions in source control.

## 1\. Overview

- **Database platform:** Supabase PostgreSQL
- **Application tables in `public`:** 17
- **PostGIS system table included in export:** `public.spatial\_ref\_sys`
- **RLS policies exported:** 56
- **Indexes exported:** 59
- **Application functions documented below:** 11
- **Vector search:** `pgvector`, using a `vector` column and an HNSW cosine index.
- **Geospatial search:** PostGIS, used by `search\_providers`.

The live schema differs from the earlier proposed model: `patient\_health\_profiles`, conversation tables, RAG tables, mission events, and additional appointment statuses are present. `documents.processing\_status`, `notifications.status`, and caregiver statuses are text columns, not enums.

## 2\. Entity relationships

The following relationships are confirmed by the exported foreign-key constraints:

```mermaid
erDiagram
    care\_missions ||--o{ appointments : "mission\_id -> id"
    profiles ||--o{ appointments : "patient\_id -> id"
    providers ||--o{ appointments : "provider\_id -> id"
    profiles ||--o{ care\_missions : "patient\_id -> id"
    providers ||--o{ care\_missions : "provider\_id -> id"
    care\_missions ||--o{ care\_tasks : "mission\_id -> id"
    profiles ||--o{ care\_tasks : "assigned\_to -> id"
    profiles ||--o{ caregivers : "caregiver\_id -> id"
    profiles ||--o{ caregivers : "patient\_id -> id"
    care\_missions ||--o{ consents : "mission\_id -> id"
    profiles ||--o{ consents : "caregiver\_id -> id"
    profiles ||--o{ consents : "patient\_id -> id"
    care\_missions ||--o{ conversation\_states : "active\_mission\_id -> id"
    conversations ||--o{ conversation\_states : "conversation\_id -> id"
    providers ||--o{ conversation\_states : "selected\_provider\_id -> id"
    profiles ||--o{ conversations : "patient\_id -> id"
    care\_missions ||--o{ documents : "mission\_id -> id"
    profiles ||--o{ documents : "patient\_id -> id"
    profiles ||--o{ documents : "uploaded\_by -> id"
    conversations ||--o{ messages : "conversation\_id -> id"
    care\_missions ||--o{ mission\_events : "mission\_id -> id"
    profiles ||--o{ mission\_events : "actor\_id -> id"
    appointments ||--o{ notifications : "appointment\_id -> id"
    care\_missions ||--o{ notifications : "mission\_id -> id"
    care\_tasks ||--o{ notifications : "task\_id -> id"
    profiles ||--o{ notifications : "user\_id -> id"
    profiles ||--o{ patient\_health\_profiles : "patient\_id -> id"
    providers ||--o{ provider\_availability : "provider\_id -> id"
    profiles ||--o{ providers : "profile\_id -> id"
    rag\_sources ||--o{ rag\_chunks : "source\_id -> id"
```

> Relationships to `auth.users` are not fully represented in this diagram because the export only includes `public` tables and does not include the referenced Auth schema definitions.

## 3\. Tables and columns

`NULL` means the column is nullable. Defaults are shown as exported by PostgreSQL.

### `public.rag\_sources`

- **Row-level security:** Enabled
- **Primary key:** id
- **Foreign keys:** `user\_id` → referenced object outside the exported `public` schema
- **Check constraints:** `rag\_sources\_source\_type\_check`

| Column             | Type                     | Nullable | Default       |
| ------------------ | ------------------------ | -------: | ------------- |
| `id`               | uuid                     |       No | —             |
| `user\_id`         | uuid                     |       No | —             |
| `source\_type`     | text                     |       No | —             |
| `title`            | text                     |       No | —             |
| `source\_date`     | date                     |      Yes | —             |
| `content`          | text                     |       No | —             |
| `structured\_data` | jsonb                    |      Yes | —             |
| `metadata`         | jsonb                    |       No | `'{}'::jsonb` |
| `created\_at`      | timestamp with time zone |       No | `now()`       |
| `updated\_at`      | timestamp with time zone |       No | `now()`       |

### `public.rag\_chunks`

- **Row-level security:** Enabled
- **Primary key:** id
- **Foreign keys:** `source\_id` → `rag\_sources(id)`; `user\_id` → referenced object outside the exported `public` schema
- **Unique constraints:** `rag\_chunks\_source\_id\_chunk\_index\_key` (source_id, chunk_index); `rag\_chunks\_source\_id\_chunk\_index\_key` (source_id, chunk_index)

| Column         | Type                     | Nullable | Default               |
| -------------- | ------------------------ | -------: | --------------------- |
| `id`           | uuid                     |       No | `gen\_random\_uuid()` |
| `source\_id`   | uuid                     |       No | —                     |
| `user\_id`     | uuid                     |       No | —                     |
| `chunk\_index` | integer                  |       No | —                     |
| `content`      | text                     |       No | —                     |
| `embedding`    | vector                   |       No | —                     |
| `metadata`     | jsonb                    |       No | `'{}'::jsonb`         |
| `created\_at`  | timestamp with time zone |       No | `now()`               |

### `public.profiles`

- **Row-level security:** Enabled
- **Primary key:** id
- **Foreign keys:** `id` → referenced object outside the exported `public` schema
- **Check constraints:** `profiles\_full\_name\_check`, `profiles\_language\_check`

| Column        | Type                     | Nullable | Default                 |
| ------------- | ------------------------ | -------: | ----------------------- |
| `id`          | uuid                     |       No | —                       |
| `full\_name`  | text                     |       No | —                       |
| `phone`       | text                     |      Yes | —                       |
| `email`       | text                     |      Yes | —                       |
| `role`        | user_role                |       No | `'patient'::user\_role` |
| `language`    | text                     |       No | `'en'::text`            |
| `created\_at` | timestamp with time zone |       No | `now()`                 |
| `updated\_at` | timestamp with time zone |       No | `now()`                 |

### `public.providers`

- **Row-level security:** Enabled
- **Primary key:** id
- **Foreign keys:** `profile\_id` → `profiles(id)`
- **Unique constraints:** `providers\_profile\_id\_key` (profile_id)
- **Check constraints:** `providers\_consultation\_fee\_check`, `providers\_latitude\_check`, `providers\_longitude\_check`, `providers\_name\_check`, `providers\_provider\_type\_check`

| Column               | Type                     | Nullable | Default               |
| -------------------- | ------------------------ | -------: | --------------------- |
| `id`                 | uuid                     |       No | `gen\_random\_uuid()` |
| `profile\_id`        | uuid                     |      Yes | —                     |
| `name`               | text                     |       No | —                     |
| `provider\_type`     | text                     |      Yes | —                     |
| `speciality`         | text                     |      Yes | —                     |
| `consultation\_fee`  | numeric                  |      Yes | —                     |
| `latitude`           | double precision         |      Yes | —                     |
| `longitude`          | double precision         |      Yes | —                     |
| `address`            | text                     |      Yes | —                     |
| `languages`          | text\[]                  |       No | `'{}'::text\[]`       |
| `insurance\_schemes` | text\[]                  |       No | `'{}'::text\[]`       |
| `accessibility`      | text\[]                  |       No | `'{}'::text\[]`       |
| `phone`              | text                     |      Yes | —                     |
| `is\_active`         | boolean                  |       No | `true`                |
| `created\_at`        | timestamp with time zone |       No | `now()`               |
| `updated\_at`        | timestamp with time zone |       No | `now()`               |

### `public.care\_missions`

- **Row-level security:** Enabled
- **Primary key:** id
- **Foreign keys:** `patient\_id` → `profiles(id)`; `provider\_id` → `providers(id)`
- **Check constraints:** `care\_missions\_completed\_at\_check`, `care\_missions\_completed\_at\_check`, `care\_missions\_title\_check`

| Column          | Type                     | Nullable | Default                      |
| --------------- | ------------------------ | -------: | ---------------------------- |
| `id`            | uuid                     |       No | `gen\_random\_uuid()`        |
| `patient\_id`   | uuid                     |       No | —                            |
| `title`         | text                     |       No | —                            |
| `description`   | text                     |      Yes | —                            |
| `urgency`       | mission_urgency          |       No | `'normal'::mission\_urgency` |
| `status`        | mission_status           |       No | `'created'::mission\_status` |
| `provider\_id`  | uuid                     |      Yes | —                            |
| `created\_at`   | timestamp with time zone |       No | `now()`                      |
| `updated\_at`   | timestamp with time zone |       No | `now()`                      |
| `completed\_at` | timestamp with time zone |      Yes | —                            |

### `public.care\_tasks`

- **Row-level security:** Enabled
- **Primary key:** id
- **Foreign keys:** `assigned\_to` → `profiles(id)`; `mission\_id` → `care\_missions(id)`
- **Check constraints:** `care\_tasks\_completed\_at\_check`, `care\_tasks\_completed\_at\_check`, `care\_tasks\_title\_check`

| Column          | Type                     | Nullable | Default                   |
| --------------- | ------------------------ | -------: | ------------------------- |
| `id`            | uuid                     |       No | `gen\_random\_uuid()`     |
| `mission\_id`   | uuid                     |       No | —                         |
| `title`         | text                     |       No | —                         |
| `description`   | text                     |      Yes | —                         |
| `status`        | task_status              |       No | `'pending'::task\_status` |
| `due\_at`       | timestamp with time zone |      Yes | —                         |
| `assigned\_to`  | uuid                     |      Yes | —                         |
| `created\_at`   | timestamp with time zone |       No | `now()`                   |
| `updated\_at`   | timestamp with time zone |       No | `now()`                   |
| `completed\_at` | timestamp with time zone |      Yes | —                         |

### `public.appointments`

- **Row-level security:** Enabled
- **Primary key:** id
- **Foreign keys:** `mission\_id` → `care\_missions(id)`; `patient\_id` → `profiles(id)`; `provider\_id` → `providers(id)`

| Column          | Type                     | Nullable | Default                            |
| --------------- | ------------------------ | -------: | ---------------------------------- |
| `id`            | uuid                     |       No | `gen\_random\_uuid()`              |
| `mission\_id`   | uuid                     |       No | —                                  |
| `patient\_id`   | uuid                     |       No | —                                  |
| `provider\_id`  | uuid                     |       No | —                                  |
| `scheduled\_at` | timestamp with time zone |       No | —                                  |
| `status`        | appointment_status       |       No | `'scheduled'::appointment\_status` |
| `location`      | text                     |      Yes | —                                  |
| `notes`         | text                     |      Yes | —                                  |
| `created\_at`   | timestamp with time zone |       No | `now()`                            |
| `updated\_at`   | timestamp with time zone |       No | `now()`                            |

### `public.provider\_availability`

- **Row-level security:** Enabled
- **Primary key:** id
- **Foreign keys:** `provider\_id` → `providers(id)`
- **Check constraints:** `availability\_time\_order`, `availability\_time\_order`

| Column          | Type                     | Nullable | Default               |
| --------------- | ------------------------ | -------: | --------------------- |
| `id`            | uuid                     |       No | `gen\_random\_uuid()` |
| `provider\_id`  | uuid                     |       No | —                     |
| `start\_time`   | timestamp with time zone |       No | —                     |
| `end\_time`     | timestamp with time zone |       No | —                     |
| `is\_available` | boolean                  |       No | `true`                |
| `created\_at`   | timestamp with time zone |       No | `now()`               |
| `updated\_at`   | timestamp with time zone |       No | `now()`               |

### `public.notifications`

- **Row-level security:** Enabled
- **Primary key:** id
- **Foreign keys:** `appointment\_id` → `appointments(id)`; `mission\_id` → `care\_missions(id)`; `task\_id` → `care\_tasks(id)`; `user\_id` → `profiles(id)`
- **Check constraints:** `notifications\_body\_check`, `notifications\_notification\_type\_check`, `notifications\_status\_check`, `notifications\_title\_check`

| Column               | Type                     | Nullable | Default               |
| -------------------- | ------------------------ | -------: | --------------------- |
| `id`                 | uuid                     |       No | `gen\_random\_uuid()` |
| `user\_id`           | uuid                     |       No | —                     |
| `task\_id`           | uuid                     |      Yes | —                     |
| `appointment\_id`    | uuid                     |      Yes | —                     |
| `mission\_id`        | uuid                     |      Yes | —                     |
| `title`              | text                     |       No | —                     |
| `body`               | text                     |       No | —                     |
| `notification\_type` | text                     |       No | —                     |
| `scheduled\_at`      | timestamp with time zone |      Yes | —                     |
| `sent\_at`           | timestamp with time zone |      Yes | —                     |
| `read\_at`           | timestamp with time zone |      Yes | —                     |
| `status`             | text                     |       No | `'pending'::text`     |
| `created\_at`        | timestamp with time zone |       No | `now()`               |

### `public.documents`

- **Row-level security:** Enabled
- **Primary key:** id
- **Foreign keys:** `mission\_id` → `care\_missions(id)`; `patient\_id` → `profiles(id)`; `uploaded\_by` → `profiles(id)`
- **Check constraints:** `documents\_document\_type\_check`, `documents\_file\_path\_check`, `documents\_file\_size\_bytes\_check`, `documents\_processing\_status\_check`

| Column                 | Type                     | Nullable | Default               |
| ---------------------- | ------------------------ | -------: | --------------------- |
| `id`                   | uuid                     |       No | `gen\_random\_uuid()` |
| `patient\_id`          | uuid                     |       No | —                     |
| `mission\_id`          | uuid                     |      Yes | —                     |
| `file\_path`           | text                     |       No | —                     |
| `document\_type`       | text                     |       No | —                     |
| `original\_file\_name` | text                     |      Yes | —                     |
| `mime\_type`           | text                     |      Yes | —                     |
| `file\_size\_bytes`    | bigint                   |      Yes | —                     |
| `extracted\_text`      | text                     |      Yes | —                     |
| `structured\_data`     | jsonb                    |       No | `'{}'::jsonb`         |
| `processing\_status`   | text                     |       No | `'pending'::text`     |
| `uploaded\_by`         | uuid                     |       No | —                     |
| `created\_at`          | timestamp with time zone |       No | `now()`               |
| `updated\_at`          | timestamp with time zone |       No | `now()`               |

### `public.caregivers`

- **Row-level security:** Enabled
- **Primary key:** id
- **Foreign keys:** `caregiver\_id` → `profiles(id)`; `patient\_id` → `profiles(id)`
- **Unique constraints:** `unique\_patient\_caregiver` (patient_id, caregiver_id); `unique\_patient\_caregiver` (patient_id, caregiver_id)
- **Check constraints:** `caregiver\_not\_self`, `caregiver\_not\_self`, `caregivers\_relationship\_check`, `caregivers\_status\_check`

| Column          | Type                     | Nullable | Default               |
| --------------- | ------------------------ | -------: | --------------------- |
| `id`            | uuid                     |       No | `gen\_random\_uuid()` |
| `patient\_id`   | uuid                     |       No | —                     |
| `caregiver\_id` | uuid                     |       No | —                     |
| `relationship`  | text                     |       No | —                     |
| `status`        | text                     |       No | `'pending'::text`     |
| `created\_at`   | timestamp with time zone |       No | `now()`               |
| `updated\_at`   | timestamp with time zone |       No | `now()`               |

### `public.consents`

- **Row-level security:** Enabled
- **Primary key:** id
- **Foreign keys:** `caregiver\_id` → `profiles(id)`; `mission\_id` → `care\_missions(id)`; `patient\_id` → `profiles(id)`
- **Check constraints:** `consent\_expiry\_check`, `consent\_expiry\_check`, `consent\_not\_self`, `consent\_not\_self`, `consent\_revocation\_check`, `consent\_revocation\_check`

| Column          | Type                     | Nullable | Default               |
| --------------- | ------------------------ | -------: | --------------------- |
| `id`            | uuid                     |       No | `gen\_random\_uuid()` |
| `patient\_id`   | uuid                     |       No | —                     |
| `caregiver\_id` | uuid                     |       No | —                     |
| `mission\_id`   | uuid                     |      Yes | —                     |
| `permissions`   | jsonb                    |       No | `'{}'::jsonb`         |
| `expires\_at`   | timestamp with time zone |      Yes | —                     |
| `revoked\_at`   | timestamp with time zone |      Yes | —                     |
| `created\_at`   | timestamp with time zone |       No | `now()`               |
| `updated\_at`   | timestamp with time zone |       No | `now()`               |

### `public.spatial\_ref\_sys` (PostGIS system table)

- **Row-level security:** Disabled
- **Primary key:** srid
- **Check constraints:** `spatial\_ref\_sys\_srid\_check`

| Column       | Type              | Nullable | Default |
| ------------ | ----------------- | -------: | ------- |
| `srid`       | integer           |       No | —       |
| `auth\_name` | character varying |      Yes | —       |
| `auth\_srid` | integer           |      Yes | —       |
| `srtext`     | character varying |      Yes | —       |
| `proj4text`  | character varying |      Yes | —       |

### `public.mission\_events`

- **Row-level security:** Enabled
- **Primary key:** id
- **Foreign keys:** `actor\_id` → `profiles(id)`; `mission\_id` → `care\_missions(id)`

| Column        | Type                     | Nullable | Default               |
| ------------- | ------------------------ | -------: | --------------------- |
| `id`          | uuid                     |       No | `gen\_random\_uuid()` |
| `mission\_id` | uuid                     |       No | —                     |
| `event\_type` | mission_event_type       |       No | —                     |
| `actor\_id`   | uuid                     |       No | —                     |
| `metadata`    | jsonb                    |      Yes | `'{}'::jsonb`         |
| `created\_at` | timestamp with time zone |      Yes | `now()`               |

### `public.conversation\_states`

- **Row-level security:** Enabled
- **Primary key:** conversation_id
- **Foreign keys:** `active\_mission\_id` → `care\_missions(id)`; `conversation\_id` → `conversations(id)`; `selected\_provider\_id` → `providers(id)`

| Column                   | Type                     | Nullable | Default       |
| ------------------------ | ------------------------ | -------: | ------------- |
| `conversation\_id`       | uuid                     |       No | —             |
| `active\_intent`         | text                     |      Yes | —             |
| `active\_mission\_id`    | uuid                     |      Yes | —             |
| `selected\_provider\_id` | uuid                     |      Yes | —             |
| `care\_context`          | jsonb                    |      Yes | `'{}'::jsonb` |
| `updated\_at`            | timestamp with time zone |      Yes | `now()`       |
| `summary`                | text                     |      Yes | `''::text`    |

### `public.conversations`

- **Row-level security:** Enabled
- **Primary key:** id
- **Foreign keys:** `patient\_id` → `profiles(id)`

| Column        | Type                     | Nullable | Default               |
| ------------- | ------------------------ | -------: | --------------------- |
| `id`          | uuid                     |       No | `gen\_random\_uuid()` |
| `patient\_id` | uuid                     |       No | —                     |
| `title`       | text                     |      Yes | —                     |
| `created\_at` | timestamp with time zone |      Yes | `now()`               |
| `updated\_at` | timestamp with time zone |      Yes | `now()`               |

### `public.messages`

- **Row-level security:** Enabled
- **Primary key:** id
- **Foreign keys:** `conversation\_id` → `conversations(id)`
- **Check constraints:** `messages\_role\_check`

| Column             | Type                     | Nullable | Default               |
| ------------------ | ------------------------ | -------: | --------------------- |
| `id`               | uuid                     |       No | `gen\_random\_uuid()` |
| `conversation\_id` | uuid                     |      Yes | —                     |
| `role`             | text                     |      Yes | —                     |
| `content`          | text                     |       No | —                     |
| `tool\_name`       | text                     |      Yes | —                     |
| `tool\_result`     | jsonb                    |      Yes | —                     |
| `created\_at`      | timestamp with time zone |      Yes | `now()`               |

### `public.patient\_health\_profiles`

- **Row-level security:** Enabled
- **Primary key:** patient_id
- **Foreign keys:** `patient\_id` → `profiles(id)`

| Column            | Type                     | Nullable | Default |
| ----------------- | ------------------------ | -------: | ------- |
| `patient\_id`     | uuid                     |       No | —       |
| `date\_of\_birth` | date                     |      Yes | —       |
| `blood\_group`    | text                     |      Yes | —       |
| `allergies`       | text                     |      Yes | —       |
| `conditions`      | text                     |      Yes | —       |
| `medications`     | text                     |      Yes | —       |
| `created\_at`     | timestamp with time zone |      Yes | `now()` |
| `updated\_at`     | timestamp with time zone |      Yes | `now()` |

## 4\. Enum types

### `user\_role`

`patient`, `provider`, `admin`

### `mission\_status`

`created`, `care\_identified`, `provider\_selected`, `appointment\_booked`, `consultation`, `follow\_up`, `completed`, `cancelled`

### `mission\_urgency`

`low`, `normal`, `high`, `urgent`

### `task\_status`

`pending`, `in\_progress`, `completed`, `cancelled`

### `appointment\_status`

`scheduled`, `confirmed`, `completed`, `cancelled`, `no\_show`, `requested`, `approved`, `revoked`, `waitlisted`

### `mission\_event\_type`

`MISSION\_CREATED`, `STATE\_TRANSITION`, `TASK\_ADDED`, `TASK\_COMPLETED`, `PROVIDER\_SELECTED`, `APPOINTMENT\_BOOKED`

## 5\. Row-level security

RLS is enabled on 17 of 18 exported tables. `spatial\_ref\_sys` is the only exported table with RLS disabled.

| Table                       | Policy                                       | Command  | Roles         |
| --------------------------- | -------------------------------------------- | -------- | ------------- |
| `appointments`              | appointments_delete                          | `DELETE` | authenticated |
| `appointments`              | appointments_insert                          | `INSERT` | authenticated |
| `appointments`              | appointments_select                          | `SELECT` | authenticated |
| `appointments`              | appointments_update                          | `UPDATE` | authenticated |
| `care\_missions`            | caregivers_select_missions                   | `SELECT` | authenticated |
| `care\_missions`            | missions_delete                              | `DELETE` | authenticated |
| `care\_missions`            | missions_insert                              | `INSERT` | authenticated |
| `care\_missions`            | missions_select                              | `SELECT` | authenticated |
| `care\_missions`            | missions_update                              | `UPDATE` | authenticated |
| `care\_tasks`               | care_tasks_insert                            | `INSERT` | authenticated |
| `care\_tasks`               | care_tasks_update                            | `UPDATE` | authenticated |
| `care\_tasks`               | caregivers_select_tasks                      | `SELECT` | authenticated |
| `care\_tasks`               | tasks_delete                                 | `DELETE` | authenticated |
| `care\_tasks`               | tasks_insert                                 | `INSERT` | authenticated |
| `care\_tasks`               | tasks_select                                 | `SELECT` | authenticated |
| `care\_tasks`               | tasks_update                                 | `UPDATE` | authenticated |
| `caregivers`                | caregivers_delete                            | `DELETE` | authenticated |
| `caregivers`                | caregivers_insert                            | `INSERT` | authenticated |
| `caregivers`                | caregivers_select                            | `SELECT` | authenticated |
| `caregivers`                | caregivers_update                            | `UPDATE` | authenticated |
| `consents`                  | consents_delete                              | `DELETE` | authenticated |
| `consents`                  | consents_insert                              | `INSERT` | authenticated |
| `consents`                  | consents_select                              | `SELECT` | authenticated |
| `consents`                  | consents_update                              | `UPDATE` | authenticated |
| `conversation\_states`      | Users can manage their own states            | `ALL`    | public        |
| `conversations`             | Users can manage their own conversations     | `ALL`    | public        |
| `documents`                 | documents_delete                             | `DELETE` | authenticated |
| `documents`                 | documents_insert                             | `INSERT` | authenticated |
| `documents`                 | documents_select                             | `SELECT` | authenticated |
| `documents`                 | documents_update                             | `UPDATE` | authenticated |
| `messages`                  | Users can manage their own messages          | `ALL`    | public        |
| `mission\_events`           | Users can view events for their missions     | `SELECT` | authenticated |
| `mission\_events`           | mission_events_insert                        | `INSERT` | authenticated |
| `notifications`             | notifications_delete_own                     | `DELETE` | authenticated |
| `notifications`             | notifications_insert_admin                   | `INSERT` | authenticated |
| `notifications`             | notifications_select_own                     | `SELECT` | authenticated |
| `notifications`             | notifications_update_own                     | `UPDATE` | authenticated |
| `patient\_health\_profiles` | Patients can insert own health profile       | `INSERT` | public        |
| `patient\_health\_profiles` | Patients can update own health profile       | `UPDATE` | public        |
| `patient\_health\_profiles` | Patients can view own health profile         | `SELECT` | public        |
| `profiles`                  | Profiles are viewable by authenticated users | `SELECT` | authenticated |
| `profiles`                  | profiles_delete_admin                        | `DELETE` | authenticated |
| `profiles`                  | profiles_insert_own                          | `INSERT` | authenticated |
| `profiles`                  | profiles_select_all                          | `SELECT` | authenticated |
| `profiles`                  | profiles_update_own                          | `UPDATE` | authenticated |
| `provider\_availability`    | availability_delete                          | `DELETE` | authenticated |
| `provider\_availability`    | availability_insert                          | `INSERT` | authenticated |
| `provider\_availability`    | availability_select                          | `SELECT` | authenticated |
| `provider\_availability`    | availability_update                          | `UPDATE` | authenticated |
| `providers`                 | providers_delete_admin                       | `DELETE` | authenticated |
| `providers`                 | providers_insert_admin                       | `INSERT` | authenticated |
| `providers`                 | providers_insert_own                         | `INSERT` | authenticated |
| `providers`                 | providers_select_active                      | `SELECT` | authenticated |
| `providers`                 | providers_update_own                         | `UPDATE` | authenticated |
| `rag\_chunks`               | Users can read their own RAG chunks          | `SELECT` | authenticated |
| `rag\_sources`              | Users can read their own RAG sources         | `SELECT` | authenticated |

### Policy behavior notes

- **Profiles:** authenticated users have broad `SELECT` policies (`using true`); users can insert their own profile; updates are allowed for the owner or admin; deletion is admin-only.
- **Missions and tasks:** policies use patient ownership, provider assignment, assigned task ownership, caregiver consent checks, and admin helper functions.
- **Appointments:** patients, the assigned provider account, and admins can read/update; inserts validate patient ownership and mission ownership; a trigger also enforces patient/mission consistency.
- **Documents:** access is granted to the patient, admin, assigned mission provider, or caregiver with valid `view\_documents` consent. Upload policy checks `uploaded\_by` and patient/mission ownership.
- **Caregivers and consents:** policies distinguish patient and caregiver identities; consent creation is patient/admin controlled.
- **RAG:** authenticated users can select only their own `rag\_sources` and `rag\_chunks`. The write/replace path is implemented through the `replace\_patient\_rag\_source` security-definer RPC.
- **Conversations, messages, and conversation states:** policies scope access through the owning conversation's `patient\_id`.
- **Provider availability:** providers manage their own slots; available slots are visible to authenticated users; admins are included in management policies.

> This is a summary of the exported policies, not a security audit. Review the exact `USING` and `WITH CHECK` expressions in Supabase before changing access behavior. Multiple permissive policies can combine with OR semantics.

## 6\. Indexes

### `appointments`

- `appointments\_pkey` — `CREATE UNIQUE INDEX appointments\_pkey ON public.appointments USING btree (id)`
- `idx\_appointments\_mission\_id` — `CREATE INDEX idx\_appointments\_mission\_id ON public.appointments USING btree (mission\_id)`
- `idx\_appointments\_patient\_id` — `CREATE INDEX idx\_appointments\_patient\_id ON public.appointments USING btree (patient\_id)`
- `idx\_appointments\_provider\_id` — `CREATE INDEX idx\_appointments\_provider\_id ON public.appointments USING btree (provider\_id)`
- `idx\_appointments\_scheduled\_at` — `CREATE INDEX idx\_appointments\_scheduled\_at ON public.appointments USING btree (scheduled\_at)`
- `idx\_appointments\_status` — `CREATE INDEX idx\_appointments\_status ON public.appointments USING btree (status)`

### `care\_missions`

- `care\_missions\_pkey` — `CREATE UNIQUE INDEX care\_missions\_pkey ON public.care\_missions USING btree (id)`
- `idx\_care\_missions\_patient\_id` — `CREATE INDEX idx\_care\_missions\_patient\_id ON public.care\_missions USING btree (patient\_id)`
- `idx\_care\_missions\_provider\_id` — `CREATE INDEX idx\_care\_missions\_provider\_id ON public.care\_missions USING btree (provider\_id)`
- `idx\_care\_missions\_status` — `CREATE INDEX idx\_care\_missions\_status ON public.care\_missions USING btree (status)`

### `care\_tasks`

- `care\_tasks\_pkey` — `CREATE UNIQUE INDEX care\_tasks\_pkey ON public.care\_tasks USING btree (id)`
- `idx\_care\_tasks\_assigned\_to` — `CREATE INDEX idx\_care\_tasks\_assigned\_to ON public.care\_tasks USING btree (assigned\_to)`
- `idx\_care\_tasks\_mission\_id` — `CREATE INDEX idx\_care\_tasks\_mission\_id ON public.care\_tasks USING btree (mission\_id)`
- `idx\_care\_tasks\_status` — `CREATE INDEX idx\_care\_tasks\_status ON public.care\_tasks USING btree (status)`

### `caregivers`

- `caregivers\_pkey` — `CREATE UNIQUE INDEX caregivers\_pkey ON public.caregivers USING btree (id)`
- `idx\_caregivers\_caregiver\_id` — `CREATE INDEX idx\_caregivers\_caregiver\_id ON public.caregivers USING btree (caregiver\_id)`
- `idx\_caregivers\_patient\_id` — `CREATE INDEX idx\_caregivers\_patient\_id ON public.caregivers USING btree (patient\_id)`
- `idx\_caregivers\_status` — `CREATE INDEX idx\_caregivers\_status ON public.caregivers USING btree (status)`
- `unique\_patient\_caregiver` — `CREATE UNIQUE INDEX unique\_patient\_caregiver ON public.caregivers USING btree (patient\_id, caregiver\_id)`

### `consents`

- `consents\_pkey` — `CREATE UNIQUE INDEX consents\_pkey ON public.consents USING btree (id)`
- `idx\_consents\_active` — `CREATE INDEX idx\_consents\_active ON public.consents USING btree (patient\_id, caregiver\_id, revoked\_at)`
- `idx\_consents\_caregiver\_id` — `CREATE INDEX idx\_consents\_caregiver\_id ON public.consents USING btree (caregiver\_id)`
- `idx\_consents\_mission\_id` — `CREATE INDEX idx\_consents\_mission\_id ON public.consents USING btree (mission\_id)`
- `idx\_consents\_patient\_id` — `CREATE INDEX idx\_consents\_patient\_id ON public.consents USING btree (patient\_id)`

### `conversation\_states`

- `conversation\_states\_pkey` — `CREATE UNIQUE INDEX conversation\_states\_pkey ON public.conversation\_states USING btree (conversation\_id)`

### `conversations`

- `conversations\_pkey` — `CREATE UNIQUE INDEX conversations\_pkey ON public.conversations USING btree (id)`

### `documents`

- `documents\_pkey` — `CREATE UNIQUE INDEX documents\_pkey ON public.documents USING btree (id)`
- `idx\_documents\_mission\_id` — `CREATE INDEX idx\_documents\_mission\_id ON public.documents USING btree (mission\_id)`
- `idx\_documents\_patient\_id` — `CREATE INDEX idx\_documents\_patient\_id ON public.documents USING btree (patient\_id)`
- `idx\_documents\_type` — `CREATE INDEX idx\_documents\_type ON public.documents USING btree (document\_type)`
- `idx\_documents\_uploaded\_by` — `CREATE INDEX idx\_documents\_uploaded\_by ON public.documents USING btree (uploaded\_by)`

### `messages`

- `messages\_pkey` — `CREATE UNIQUE INDEX messages\_pkey ON public.messages USING btree (id)`

### `mission\_events`

- `idx\_mission\_events\_mission\_id` — `CREATE INDEX idx\_mission\_events\_mission\_id ON public.mission\_events USING btree (mission\_id)`
- `mission\_events\_pkey` — `CREATE UNIQUE INDEX mission\_events\_pkey ON public.mission\_events USING btree (id)`

### `notifications`

- `idx\_notifications\_scheduled` — `CREATE INDEX idx\_notifications\_scheduled ON public.notifications USING btree (scheduled\_at)`
- `idx\_notifications\_status` — `CREATE INDEX idx\_notifications\_status ON public.notifications USING btree (status)`
- `idx\_notifications\_unread` — `CREATE INDEX idx\_notifications\_unread ON public.notifications USING btree (user\_id, read\_at)`
- `idx\_notifications\_user` — `CREATE INDEX idx\_notifications\_user ON public.notifications USING btree (user\_id)`
- `notifications\_pkey` — `CREATE UNIQUE INDEX notifications\_pkey ON public.notifications USING btree (id)`

### `patient\_health\_profiles`

- `patient\_health\_profiles\_pkey` — `CREATE UNIQUE INDEX patient\_health\_profiles\_pkey ON public.patient\_health\_profiles USING btree (patient\_id)`

### `profiles`

- `idx\_profiles\_role` — `CREATE INDEX idx\_profiles\_role ON public.profiles USING btree (role)`
- `profiles\_pkey` — `CREATE UNIQUE INDEX profiles\_pkey ON public.profiles USING btree (id)`

### `provider\_availability`

- `idx\_provider\_availability\_available` — `CREATE INDEX idx\_provider\_availability\_available ON public.provider\_availability USING btree (provider\_id, is\_available)`
- `idx\_provider\_availability\_provider` — `CREATE INDEX idx\_provider\_availability\_provider ON public.provider\_availability USING btree (provider\_id)`
- `idx\_provider\_availability\_start` — `CREATE INDEX idx\_provider\_availability\_start ON public.provider\_availability USING btree (start\_time)`
- `provider\_availability\_pkey` — `CREATE UNIQUE INDEX provider\_availability\_pkey ON public.provider\_availability USING btree (id)`

### `providers`

- `idx\_providers\_active` — `CREATE INDEX idx\_providers\_active ON public.providers USING btree (is\_active)`
- `idx\_providers\_profile\_id` — `CREATE INDEX idx\_providers\_profile\_id ON public.providers USING btree (profile\_id)`
- `idx\_providers\_speciality` — `CREATE INDEX idx\_providers\_speciality ON public.providers USING btree (speciality)`
- `providers\_pkey` — `CREATE UNIQUE INDEX providers\_pkey ON public.providers USING btree (id)`
- `providers\_profile\_id\_key` — `CREATE UNIQUE INDEX providers\_profile\_id\_key ON public.providers USING btree (profile\_id)`

### `rag\_chunks`

- `rag\_chunks\_embedding\_hnsw\_idx` — `CREATE INDEX rag\_chunks\_embedding\_hnsw\_idx ON public.rag\_chunks USING hnsw (embedding vector\_cosine\_ops)`
- `rag\_chunks\_pkey` — `CREATE UNIQUE INDEX rag\_chunks\_pkey ON public.rag\_chunks USING btree (id)`
- `rag\_chunks\_source\_id\_chunk\_index\_key` — `CREATE UNIQUE INDEX rag\_chunks\_source\_id\_chunk\_index\_key ON public.rag\_chunks USING btree (source\_id, chunk\_index)`
- `rag\_chunks\_source\_id\_idx` — `CREATE INDEX rag\_chunks\_source\_id\_idx ON public.rag\_chunks USING btree (source\_id)`
- `rag\_chunks\_user\_id\_idx` — `CREATE INDEX rag\_chunks\_user\_id\_idx ON public.rag\_chunks USING btree (user\_id)`

### `rag\_sources`

- `rag\_sources\_pkey` — `CREATE UNIQUE INDEX rag\_sources\_pkey ON public.rag\_sources USING btree (id)`
- `rag\_sources\_user\_date\_idx` — `CREATE INDEX rag\_sources\_user\_date\_idx ON public.rag\_sources USING btree (user\_id, source\_date DESC)`

### `spatial\_ref\_sys`

- `spatial\_ref\_sys\_pkey` — `CREATE UNIQUE INDEX spatial\_ref\_sys\_pkey ON public.spatial\_ref\_sys USING btree (srid)`

## 7\. Application functions and RPCs

### `handle\_new\_user`

- **Arguments:** `none`
- **Returns:** `trigger`
- **Language:** `plpgsql`
- **Security definer:** Yes

```sql
CREATE OR REPLACE FUNCTION public.handle\_new\_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search\_path TO 'public'
AS $function$
begin
    -- 1. Check if the user is explicitly registering as a provider
    if (new.raw\_user\_meta\_data ->> 'role') = 'provider' then
        insert into public.profiles (id, full\_name, email, phone, role)
        values (
            new.id,
            coalesce(new.raw\_user\_meta\_data ->> 'full\_name', 'User'),
            new.email,
            new.raw\_user\_meta\_data ->> 'phone',
            'provider'
        );
    else
        -- 2. Fallback for all other users (Patients)
        insert into public.profiles (id, full\_name, email, phone, role)
        values (
            new.id,
            coalesce(new.raw\_user\_meta\_data ->> 'full\_name', 'User'),
            new.email,
            new.raw\_user\_meta\_data ->> 'phone',
            'patient'
        );
    end if;

    return new;
end;
$function$
```

### `has\_document\_consent`

- **Arguments:** `document\_patient\_id uuid, document\_mission\_id uuid, required\_permission text`
- **Returns:** `boolean`
- **Language:** `sql`
- **Security definer:** Yes

```sql
CREATE OR REPLACE FUNCTION public.has\_document\_consent(document\_patient\_id uuid, document\_mission\_id uuid, required\_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search\_path TO 'public'
AS $function$
    select exists (
        select 1
        from public.consents c
        where c.patient\_id = document\_patient\_id
          and c.caregiver\_id = auth.uid()

          and c.revoked\_at is null

          and (
              c.expires\_at is null
              or c.expires\_at > now()
          )

          and (
              c.mission\_id is null
              or c.mission\_id = document\_mission\_id
          )

          and coalesce(
              (c.permissions ->> required\_permission)::boolean,
              false
          ) = true
    );
$function$
```

### `is\_admin`

- **Arguments:** `none`
- **Returns:** `boolean`
- **Language:** `sql`
- **Security definer:** Yes

```sql
CREATE OR REPLACE FUNCTION public.is\_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search\_path TO 'public'
AS $function$
    select exists (
        select 1
        from public.profiles
        where id = auth.uid()
          and role = 'admin'
    );
$function$
```

### `is\_mission\_patient`

- **Arguments:** `mission\_uuid uuid`
- **Returns:** `boolean`
- **Language:** `sql`
- **Security definer:** Yes

```sql
CREATE OR REPLACE FUNCTION public.is\_mission\_patient(mission\_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search\_path TO 'public'
AS $function$
    select exists (
        select 1
        from public.care\_missions
        where id = mission\_uuid
          and patient\_id = auth.uid()
    );
$function$
```

### `is\_mission\_provider`

- **Arguments:** `mission\_uuid uuid`
- **Returns:** `boolean`
- **Language:** `sql`
- **Security definer:** Yes

```sql
CREATE OR REPLACE FUNCTION public.is\_mission\_provider(mission\_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search\_path TO 'public'
AS $function$
    select exists (
        select 1
        from public.care\_missions cm
        join public.providers p
          on p.id = cm.provider\_id
        where cm.id = mission\_uuid
          and p.profile\_id = auth.uid()
    );
$function$
```

### `is\_provider`

- **Arguments:** `none`
- **Returns:** `boolean`
- **Language:** `sql`
- **Security definer:** Yes

```sql
CREATE OR REPLACE FUNCTION public.is\_provider()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search\_path TO 'public'
AS $function$
    select exists (
        select 1
        from public.profiles
        where id = auth.uid()
          and role = 'provider'
    );
$function$
```

### `match\_patient\_rag\_chunks`

- **Arguments:** `query\_embedding vector, match\_count integer DEFAULT 5`
- **Returns:** `TABLE(id uuid, source\_id uuid, content text, metadata jsonb, similarity double precision)`
- **Language:** `sql`
- **Security definer:** Yes

```sql
CREATE OR REPLACE FUNCTION public.match\_patient\_rag\_chunks(query\_embedding vector, match\_count integer DEFAULT 5)
 RETURNS TABLE(id uuid, source\_id uuid, content text, metadata jsonb, similarity double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search\_path TO ''
AS $function$
  select
    c.id,
    c.source\_id,
    c.content,
    c.metadata,
    (1 - (c.embedding OPERATOR(extensions.<=>) query\_embedding))::double precision as similarity
  from public.rag\_chunks as c
  where c.user\_id = (select auth.uid())
  order by c.embedding OPERATOR(extensions.<=>) query\_embedding
  limit least(greatest(coalesce(match\_count, 5), 1), 8);
$function$
```

### `replace\_patient\_rag\_source`

- **Arguments:** `p\_source\_id uuid, p\_source\_type text, p\_title text, p\_source\_date date, p\_content text, p\_structured\_data jsonb, p\_metadata jsonb, p\_chunks jsonb`
- **Returns:** `uuid`
- **Language:** `plpgsql`
- **Security definer:** Yes

```sql
CREATE OR REPLACE FUNCTION public.replace\_patient\_rag\_source(p\_source\_id uuid, p\_source\_type text, p\_title text, p\_source\_date date, p\_content text, p\_structured\_data jsonb, p\_metadata jsonb, p\_chunks jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search\_path TO ''
AS $function$
declare
  v\_user\_id uuid := auth.uid();
  v\_source\_id uuid;
  v\_chunk jsonb;
  v\_index integer := 0;
begin
  if v\_user\_id is null then
    raise exception 'Authentication required';
  end if;

  if p\_source\_type not in ('daily\_log', 'medical\_document') then
    raise exception 'Unsupported source type';
  end if;

  if p\_content is null or length(trim(p\_content)) = 0 then
    raise exception 'Source content cannot be empty';
  end if;

  if jsonb\_typeof(p\_chunks) <> 'array' or jsonb\_array\_length(p\_chunks) = 0 then
    raise exception 'At least one embedded chunk is required';
  end if;

  insert into public.rag\_sources (
    id, user\_id, source\_type, title, source\_date, content,
    structured\_data, metadata, updated\_at
  ) values (
    p\_source\_id, v\_user\_id, p\_source\_type, p\_title, p\_source\_date,
    p\_content, p\_structured\_data, coalesce(p\_metadata, '{}'::jsonb), now()
  )
  on conflict (id) do update set
    source\_type = excluded.source\_type,
    title = excluded.title,
    source\_date = excluded.source\_date,
    content = excluded.content,
    structured\_data = excluded.structured\_data,
    metadata = excluded.metadata,
    updated\_at = now()
  where public.rag\_sources.user\_id = v\_user\_id
  returning id into v\_source\_id;

  if v\_source\_id is null then
    raise exception 'Source not found or access denied';
  end if;

  delete from public.rag\_chunks
  where source\_id = v\_source\_id and user\_id = v\_user\_id;

  for v\_chunk in select value from jsonb\_array\_elements(p\_chunks)
  loop
    insert into public.rag\_chunks (
      source\_id, user\_id, chunk\_index, content, embedding, metadata
    ) values (
      v\_source\_id,
      v\_user\_id,
      coalesce((v\_chunk ->> 'chunk\_index')::integer, v\_index),
      v\_chunk ->> 'content',
      ((v\_chunk -> 'embedding')::text)::extensions.vector(768),
      coalesce(v\_chunk -> 'metadata', '{}'::jsonb)
    );
    v\_index := v\_index + 1;
  end loop;

  return v\_source\_id;
end;
$function$
```

### `search\_providers`

- **Arguments:** `user\_lat double precision, user\_lng double precision, radius\_km numeric, target\_speciality text DEFAULT NULL::text`
- **Returns:** `TABLE(id uuid, name text, provider\_type text, speciality text, consultation\_fee numeric, address text, phone text, languages text\[], insurance\_schemes text\[], accessibility text\[], distance\_km numeric)`
- **Language:** `plpgsql`
- **Security definer:** Yes

```sql
CREATE OR REPLACE FUNCTION public.search\_providers(user\_lat double precision, user\_lng double precision, radius\_km numeric, target\_speciality text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, name text, provider\_type text, speciality text, consultation\_fee numeric, address text, phone text, languages text\[], insurance\_schemes text\[], accessibility text\[], distance\_km numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.provider\_type,
    p.speciality,
    p.consultation\_fee,
    p.address,
    p.phone,
    p.languages,
    p.insurance\_schemes,
    p.accessibility,
    (ST\_Distance(
      ST\_MakePoint(p.longitude, p.latitude)::geography,
      ST\_MakePoint(user\_lng, user\_lat)::geography
    ) / 1000.0)::numeric AS distance\_km
  FROM providers p
  WHERE p.is\_active = true
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND (target\_speciality IS NULL OR p.speciality ILIKE '%' || target\_speciality || '%')
    AND ST\_DWithin(
      ST\_MakePoint(p.longitude, p.latitude)::geography,
      ST\_MakePoint(user\_lng, user\_lat)::geography,
      radius\_km \* 1000
    );
END;
$function$
```

### `set\_updated\_at`

- **Arguments:** `none`
- **Returns:** `trigger`
- **Language:** `plpgsql`
- **Security definer:** No

```sql
CREATE OR REPLACE FUNCTION public.set\_updated\_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search\_path TO 'public'
AS $function$
begin
    new.updated\_at = now();
    return new;
end;
$function$
```

### `validate\_appointment\_patient`

- **Arguments:** `none`
- **Returns:** `trigger`
- **Language:** `plpgsql`
- **Security definer:** Yes

```sql
CREATE OR REPLACE FUNCTION public.validate\_appointment\_patient()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search\_path TO 'public'
AS $function$
declare
    mission\_patient uuid;
begin
    select patient\_id
    into mission\_patient
    from public.care\_missions
    where id = new.mission\_id;

    if mission\_patient is null then
        raise exception 'Mission does not exist';
    end if;

    if new.patient\_id <> mission\_patient then
        raise exception
            'Appointment patient must match mission patient';
    end if;

    return new;
end;
$function$
```

## 8\. Triggers

| Table                    | Trigger                                    | Timing | Event  | Action                                              |
| ------------------------ | ------------------------------------------ | ------ | ------ | --------------------------------------------------- |
| `appointments`           | `appointments\_set\_updated\_at`           | BEFORE | UPDATE | `EXECUTE FUNCTION set\_updated\_at()`               |
| `documents`              | `documents\_set\_updated\_at`              | BEFORE | UPDATE | `EXECUTE FUNCTION set\_updated\_at()`               |
| `caregivers`             | `caregivers\_set\_updated\_at`             | BEFORE | UPDATE | `EXECUTE FUNCTION set\_updated\_at()`               |
| `consents`               | `consents\_set\_updated\_at`               | BEFORE | UPDATE | `EXECUTE FUNCTION set\_updated\_at()`               |
| `provider\_availability` | `provider\_availability\_set\_updated\_at` | BEFORE | UPDATE | `EXECUTE FUNCTION set\_updated\_at()`               |
| `appointments`           | `validate\_appointment\_patient\_trigger`  | BEFORE | INSERT | `EXECUTE FUNCTION validate\_appointment\_patient()` |
| `appointments`           | `validate\_appointment\_patient\_trigger`  | BEFORE | UPDATE | `EXECUTE FUNCTION validate\_appointment\_patient()` |
| `profiles`               | `profiles\_set\_updated\_at`               | BEFORE | UPDATE | `EXECUTE FUNCTION set\_updated\_at()`               |
| `providers`              | `providers\_set\_updated\_at`              | BEFORE | UPDATE | `EXECUTE FUNCTION set\_updated\_at()`               |
| `care\_missions`         | `care\_missions\_set\_updated\_at`         | BEFORE | UPDATE | `EXECUTE FUNCTION set\_updated\_at()`               |
| `care\_tasks`            | `care\_tasks\_set\_updated\_at`            | BEFORE | UPDATE | `EXECUTE FUNCTION set\_updated\_at()`               |

### Trigger behavior

- `set\_updated\_at()` updates `updated\_at` on updates to profiles, providers, missions, tasks, appointments, documents, caregivers, consents, and provider availability.
- `validate\_appointment\_patient()` runs before appointment inserts and updates and rejects an appointment if its `patient\_id` does not match the patient on its mission.
- `handle\_new\_user()` is exported as an application trigger function. Its associated trigger on `auth.users` is outside the `public`-schema trigger inventory.

## 9\. RAG schema

### `rag\_sources`

Stores one source record per patient-owned source. Exported `source\_type` check constraint is present; the `replace\_patient\_rag\_source` function accepts `daily\_log` and `medical\_document`.

### `rag\_chunks`

- `source\_id` references `rag\_sources(id)`.
- `embedding` uses the pgvector `vector` type.
- `(source\_id, chunk\_index)` is unique.
- `rag\_chunks\_embedding\_hnsw\_idx` uses `hnsw (embedding vector\_cosine\_ops)` for cosine similarity search.

### RAG RPCs

**`replace\_patient\_rag\_source`**

- Accepts source metadata/content and a JSON array of pre-embedded chunks.
- Requires an authenticated user.
- Supports `daily\_log` and `medical\_document` source types.
- Upserts the source only when it belongs to the authenticated user, replaces that source's chunks, and returns the source UUID.

**`match\_patient\_rag\_chunks`**

- Accepts a query embedding and optional match count (default `5`).
- Filters chunks to `auth.uid()`.
- Orders by cosine distance and returns similarity.
- Clamps the requested result count to the range 1–8.

## 10\. Other database objects

### Views

- `geography\_columns` (PostGIS metadata view)
- `geometry\_columns` (PostGIS metadata view)

### Materialized views

- None reported in the export.

### Extensions

| Extension              | Version | Schema        |
| ---------------------- | ------: | ------------- |
| `plpgsql`              |     1.0 | `pg\_catalog` |
| `pg\_stat\_statements` |    1.11 | `extensions`  |
| `uuid-ossp`            |     1.1 | `extensions`  |
| `pgcrypto`             |     1.3 | `extensions`  |
| `supabase\_vault`      |   0.3.1 | `vault`       |
| `postgis`              |   3.3.7 | `public`      |
| `vector`               |   0.8.2 | `extensions`  |

## 11\. Important implementation notes

- `public.spatial\_ref\_sys`, `geometry\_columns`, and `geography\_columns` are PostGIS-provided objects, not CareFlow business entities.
- `documents.processing\_status`, `notifications.status`, and `caregivers.status` are `text` columns with check constraints where exported; they are not enum types.
- `appointment\_status` includes `requested`, `approved`, `revoked`, and `waitlisted` in addition to the usual scheduling states.
- The `providers` table uses `latitude` and `longitude` as `double precision`; provider search uses PostGIS geography calculations.
- The export does not include Storage bucket definitions or Storage object policies. Those must be inspected separately in Supabase Storage.
- The export lists 732 public functions because PostGIS contributes a large function surface. This document includes the application-owned functions relevant to CareFlow and RAG, not the full PostGIS API.

## 12\. Keeping this document current

Regenerate the schema JSON from Supabase after database migrations or policy changes, then update this document. Treat the live database as the source of truth for deployed objects and migrations as the source of truth for reproducible schema changes.
