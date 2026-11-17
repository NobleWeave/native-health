# Known limitations and implementation discrepancies

## Security and reproducibility

- Only RAG tables/RPCs/RLS are reproducible from checked-in migrations; the
  workflow schema in [`DATABASE.md`](../../DATABASE.md) is a live/exported
  reference.
- Route hiding is not route authorization.
- Main-chat and document-task Gemini calls, OCR.Space, and USDA credentials
  use Expo public variables.
- No Storage bucket/policy or original medical-file upload is implemented.
- No comprehensive cross-patient, provider, caregiver, or admin RLS tests exist.

## Workflow inconsistencies

- Normal appointment booking uses `requested`; chat booking uses `scheduled`;
  provider UI handles a different set of statuses.
- Mission/task runtime statuses and unused mock statuses differ in casing and
  vocabulary.
- Provider ranking awards availability without checking actual slots.
- Caregiver permission keys differ between services, UI, and mock data.
- Several service/screen failures are logged without a user-visible recovery
  state.
- `TASK_ASSIGNED` is emitted by task code but is not listed in the documented
  mission-event enum.

## Product scope

- Notifications are schema-only; there is no notification center, scheduler,
  push provider, or read-state UI.
- Document processing currently scans images and generates mission tasks; it
  does not persist document metadata/files or provide a complete library.
- Email verification callback, password reset, provider approval, admin UI,
  offline behavior, and complete appointment rescheduling are absent.
- `data/mockDb.ts` is unused demo data, not a fallback datastore.
- Neither assistant provides diagnosis, prescribing, or emergency care.
