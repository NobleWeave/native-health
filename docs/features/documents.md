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
`expo-document-picker`, sends it to OCR.Space using `EXPO_PUBLIC_OCR_API_KEY`,
shows the extracted text, and sends that text to `ingest_document`. The RAG
function stores a `medical_document` source and vector chunks.

The original image is not uploaded to Supabase Storage, and the screen does not
insert a row into the deployed `documents` table. Consequently, this is text
indexing, not a complete medical-document management flow.

## Limits and safety

The Edge Function rejects source text over 60,000 characters or more than 40
chunks. OCR and RAG errors surface as alerts. Extracted text is not clinically
verified; the product must not infer diagnosis or medication changes from it.
See [RAG system](../ai/rag-system.md) for retrieval behavior.
