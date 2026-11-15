# Appointments

## User workflow

Patients select a provider, choose an availability slot, and book from
[`provider/[id].tsx`](../../app/provider/[id].tsx). The appointments screen
lists patient appointments and supports cancellation. Providers use the
Schedule tab to filter appointments, update statuses, and manage availability.

## Services and data

[`appointmentModel.ts`](../../services/appointmentModel.ts) provides patient
fetch/cancel/book operations, provider appointment queries, status updates, and
dashboard counts. [`availabilityModel.ts`](../../services/availabilityModel.ts)
performs availability CRUD. The deployed schema relates each appointment to
`patient_id`, `provider_id`, and `mission_id`; see
[`DATABASE.md`](../../DATABASE.md).

The normal booking path inserts status `requested`. The chat orchestrator can
insert `scheduled`, while provider UI primarily handles `requested`,
`approved`, `waitlisted`, and `revoked`. This is a known status mismatch.

## Integrity and authorization

The live schema reference documents a patient/mission consistency trigger and
RLS policies. The repository migration does not define those workflow objects,
so a clean local database cannot reproduce them from source control.

Overlap prevention, complete rescheduling, reminder delivery, and automated
provider confirmation are not implemented.
