# Caregivers and consent

## User workflow

Patients invite a caregiver at `/care-circle/invite`. Caregivers review
pending invitations at `/care-circle/invitations` and can accept or decline.
Mission screens can share a mission with a caregiver and revoke mission access.

[`careCircle.ts`](../../services/careCircle.ts) looks up caregiver profiles,
creates/reads `caregivers` relationships, creates/reads `consents`, and loads
shared missions/tasks. [`utils/permissions.ts`](../../utils/permissions.ts)
rejects revoked or expired consent and checks permission flags.

## Data and authorization

The deployed schema relates caregivers and consents to patient profiles and,
optionally, missions. `permissions`, `expires_at`, and `revoked_at` determine
the intended access decision. Database RLS remains authoritative; the helper
is not sufficient by itself.

## Known inconsistencies

Permission names differ across mock data, mission sharing, and task assignment
(`view_documents`, `view_appointment`, `view`, and `manage` are all present).
The repository does not include end-to-end tests for revoked, expired, or
cross-patient access.
