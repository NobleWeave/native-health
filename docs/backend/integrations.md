# Backend and external integrations

## Supabase

[`services/supabase/client.ts`](../../services/supabase/client.ts) creates the
Supabase client with AsyncStorage session persistence. Domain services directly
access Auth and the deployed PostgreSQL tables. The repository migration only
defines RAG objects; see [`DATABASE.md`](../../DATABASE.md) for the supplied
live-schema reference.

## Edge Function

[`supabase/functions/careflow-rag/index.ts`](../../supabase/functions/careflow-rag/index.ts)
accepts authenticated POST actions `ingest_daily_log`, `ingest_document`, and
`ask`. It requires `SUPABASE_URL`, uses the request `apikey` or
`SUPABASE_ANON_KEY`, and requires `GEMINI_API_KEY`. `GEMINI_GENERATION_MODEL`
is optional and defaults to `gemini-3.1-flash-lite`.

## External APIs

| Integration | Client | Configuration | Behavior |
| --- | --- | --- | --- |
| Gemini chat | `chatOrchestrator.ts` | `EXPO_PUBLIC_GEMINI_API_KEY` | Intent routing, actions, and responses |
| Gemini RAG | `careflow-rag` | Edge Function secrets | Embeddings and grounded answers |
| OCR.Space | `documents.tsx` | `EXPO_PUBLIC_OCR_API_KEY` | Image-to-text OCR |
| USDA FoodData Central | `nutrition.ts` | `EXPO_PUBLIC_USDA_API_KEY` | Food search/details |
| Open Food Facts | `barcodeNutrition.ts` | None | Barcode product lookup |
| CDC media feed | `cdc.ts` | None | Public health article listing |

Expo public variables are bundled into the app. The Gemini chat, OCR, and USDA
keys must be treated as exposed client credentials; they are not suitable for
private server secrets.
