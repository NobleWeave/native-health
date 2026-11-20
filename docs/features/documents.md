# Documents and daily health logs

## Daily health log

[`daily-log.tsx`](../../app/daily-log.tsx) collects vitals, activity, wellness
ratings, medication adherence, symptoms, and notes. On submit it sends a
structured payload to `services/rag.ts`, which invokes the Edge Function with
`ingest_daily_log`.

The function creates category-oriented text, embeds each chunk with
`gemini-embedding-001`, and persists source/chunk rows through
`replace_patient_rag_source`.

## OCR document flow

[`documents.tsx`](../../app/documents.tsx) accepts an image from
`expo-document-picker`, sends it to OCR.Space using
`EXPO_PUBLIC_OCR_API_KEY`, and shows the extracted text. After extraction, the
user can ask Gemini to produce a JSON array of task strings. The screen finds
the user's most recently created active mission and creates each string as a
pending `care_tasks` row through `missionEngine.addTaskToMission`. If no active
mission exists, it first creates a "Prescription Follow-up" mission.

This flow does not send extracted text to `ingest_document`, insert a row into
the deployed `documents` table, or upload the original image to Supabase
Storage. It creates mission tasks; it is not a complete document library or an
OCR-to-RAG ingestion pipeline.

## Limits and safety

The RAG Edge Function rejects source text over 60,000 characters or more than
40 chunks. OCR and task-generation errors surface as alerts. Gemini-generated
task titles are not clinically verified and must not be presented as diagnosis
or medication advice. The OCR and task-generation API keys are exposed in the
mobile client. See [RAG system](../ai/rag-system.md) for retrieval behavior.
