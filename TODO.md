# Implementation backlog

This list reflects gaps found during the documentation audit. It is not a
claim that unchecked items are already available.

## Security and backend

- Add reproducible migrations for the workflow schema, functions, triggers,
  RLS, and Storage policies documented in [`DATABASE.md`](./DATABASE.md).
- Move main-chat Gemini calls and all private provider credentials behind a
  trusted server boundary.
- Add route guards, trusted provider/admin approval, and role self-escalation
  protection.
- Add patient-to-patient, provider, caregiver, and admin authorization tests.

## Workflow correctness

- Normalize appointment and mission/task status values across services and UI.
- Make provider availability scoring use actual availability.
- Normalize caregiver permission keys and sharing payloads.
- Propagate service failures into consistent loading/error UI.
- Add notification generation, read state, scheduler, and push integration.

## Records and operations

- Add document metadata persistence and Supabase Storage upload/policies.
- Add email verification, password reset, and deep-link callback screens.
- Add complete appointment rescheduling/overlap handling.
- Add offline, empty, accessibility, and production smoke-test coverage.
