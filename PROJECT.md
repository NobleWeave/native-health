# CareFlow project brief

CareFlow is a patient-centered care-coordination prototype. The current app
supports authentication, patient/provider navigation, care missions and tasks,
provider discovery, appointment coordination, Care Circle sharing, daily health
logs, OCR-to-RAG document indexing, nutrition lookups, CDC content, a persisted
care assistant, and a separate health-record assistant.

The product goal is to turn a care need into an organized workflow rather than
presenting a generic autonomous medical chatbot. The app must not be presented
as a diagnostic, prescribing, or emergency-care system.

## Roles

- **Patient:** primary care-workflow user.
- **Provider:** schedule and appointment workflow user.
- **Admin:** a database/application role represented in the schema, but no
  complete admin UI or approval workflow is implemented in this repository.

## Source-backed feature map

| Area | Primary implementation |
| --- | --- |
| Auth and role state | [`AuthContext`](./context/AuthContext.tsx), [`app/login.tsx`](./app/login.tsx), [`app/signup.tsx`](./app/signup.tsx) |
| Missions and tasks | [`missionEngine.ts`](./services/missionEngine.ts), [`app/mission/`](./app/mission) |
| Providers and availability | [`navigator.ts`](./services/navigator.ts), [`profileModel.ts`](./services/profileModel.ts), [`availabilityModel.ts`](./services/availabilityModel.ts) |
| Appointments | [`appointmentModel.ts`](./services/appointmentModel.ts), [`app/appointments.tsx`](./app/appointments.tsx) |
| Care Circle | [`careCircle.ts`](./services/careCircle.ts), [`app/care-circle/`](./app/care-circle) |
| Main assistant | [`chatApi.ts`](./services/chatApi.ts), [`chatOrchestrator.ts`](./services/chatOrchestrator.ts) |
| RAG assistant | [`rag.ts`](./services/rag.ts), [`careflow-rag`](./supabase/functions/careflow-rag/index.ts) |
| Nutrition and public health | [`nutrition.ts`](./services/nutrition.ts), [`barcodeNutrition.ts`](./services/barcodeNutrition.ts), [`cdc.ts`](./services/cdc.ts) |

For implementation status and discrepancies, use the documentation index
instead of the original product vision checklist.
