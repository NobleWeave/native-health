# CareFlow

CareFlow is an Expo/React Native healthcare-care coordination prototype. It
combines Supabase authentication and workflow data with provider discovery,
missions, appointments, caregiver sharing, a persistent care assistant, and a
separate retrieval-augmented health-record assistant.

## Current implementation

- **Client:** Expo Router, React Native, and TypeScript under [`app/`](./app).
- **Authentication:** Supabase Auth with persisted sessions in
  [`context/AuthContext.tsx`](./context/AuthContext.tsx).
- **Workflow data:** Client services read and write the deployed Supabase
  tables documented in [`DATABASE.md`](./DATABASE.md).
- **Care assistant:** Persisted conversations and Gemini-backed intent/tool
  orchestration in [`services/chatOrchestrator.ts`](./services/chatOrchestrator.ts).
- **Record assistant:** Authenticated RAG ingestion and retrieval through the
  `careflow-rag` Edge Function; see [`docs/ai/rag-system.md`](./docs/ai/rag-system.md).
- **External integrations:** USDA FoodData Central, Open Food Facts, CDC content,
  OCR.Space, Gemini, and Supabase. See [`docs/backend/integrations.md`](./docs/backend/integrations.md).

This is a prototype, not a medical device or a diagnostic service. Several
authorization, storage, deployment, and workflow-hardening tasks remain
incomplete; they are recorded in [`docs/maintenance/known-limitations.md`](./docs/maintenance/known-limitations.md).

## Documentation

- [Documentation index](./docs/README.md)
- [Architecture overview](./docs/architecture/overview.md)
- [Data flows](./docs/architecture/data-flow.md)
- [Database reference](./DATABASE.md)
- [Database security and RLS](./docs/database/security-and-rls.md)
- [Development setup](./docs/setup/development.md)
- [Deployment](./docs/setup/deployment.md)
- [Known limitations](./docs/maintenance/known-limitations.md)

## Local development

```bash
npm install
npm run start
```

The client expects `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Optional integrations use additional
`EXPO_PUBLIC_*` variables described in the setup and integration documentation.
