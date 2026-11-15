# Architecture and product decisions

Decision status is distinct from implementation status. These decisions record
the intended product direction; the current implementation is summarized in
[`ARCHITECTURE.md`](./ARCHITECTURE.md) and the limitations are listed in
[`docs/maintenance/known-limitations.md`](./docs/maintenance/known-limitations.md).

## Accepted decisions

1. Use Expo/React Native/TypeScript with Expo Router.
2. Use Supabase Auth and PostgreSQL as the application backend.
3. Keep healthcare data subject to least-privilege database authorization.
4. Keep deterministic application actions separate from model-generated text.
5. Do not let an LLM execute arbitrary SQL or claim to diagnose, prescribe, or
   replace a clinician.
6. Require explicit caregiver consent before sharing patient resources.
7. Prefer a simple modular client over premature service decomposition.

## Current implementation notes

- Supabase Auth, persisted sessions, role lookup, direct workflow services, and
  the two RAG RPCs are implemented.
- The main assistant is a persisted Gemini-backed orchestration path, not the
  static UI described by older documentation.
- Provider ranking and appointment/mission operations exist, but availability
  scoring, status handling, and error propagation are not fully consistent.
- The only source-controlled workflow migration is
  [`20261110000000_careflow_rag.sql`](./supabase/migrations/20261110000000_careflow_rag.sql).
  The remaining schema documented in [`DATABASE.md`](./DATABASE.md) must be
  captured in migrations before the project is reproducible from a clean
  checkout.
- The current document flow sends image bytes to OCR.Space and indexes extracted
  text through RAG; it does not upload the original file to Supabase Storage.
- The mobile client currently reads `EXPO_PUBLIC_GEMINI_API_KEY` for the main
  assistant, which conflicts with the intended server-only secret boundary.

## Superseded descriptions

Older statements that the assistant, provider matching, appointments, or all
database access are entirely unimplemented are obsolete. They should be
interpreted only as historical planning notes and are replaced by the
source-backed documentation under [`docs/`](./docs/README.md).
