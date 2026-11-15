# CareFlow RAG — integration patch

This patch adds a first working RAG path to the existing Expo + Supabase project.

## What it implements

- Daily Health Log: submits the structured log to an authenticated Supabase Edge Function.
- Documents: after the existing OCR flow extracts text, submits the extracted text for indexing.
- Ingestion: creates readable chunks, generates Gemini document embeddings, and stores source + chunks in Supabase PostgreSQL/pgvector.
- Assistant: submits a question, embeds it with Gemini, retrieves the signed-in user's closest chunks, and asks Gemini to produce a concise answer grounded in those records.
- Source labels: the assistant displays the source document/log and date returned by retrieval.
- Isolation: the Edge Function verifies the Supabase session; database RPC functions derive the owner from `auth.uid()` and never accept a client-supplied patient ID.

## Files to place

Copy the files/folders into the root of your existing `health-native` project, preserving paths. Allow the two screen files to replace their existing versions.

```text
app/
  daily-log.tsx                 REPLACE
  documents.tsx                 REPLACE
  (tabs)/
    assistant.tsx               REPLACE
services/
  rag.ts                         NEW
supabase/
  config.toml                    NEW (merge if you already have this file)
  migrations/
    20261110000000_careflow_rag.sql  NEW
  functions/
    careflow-rag/
      index.ts                   NEW
```

No Expo package changes are required. The patch uses the Supabase client already installed in this project.

---

# Setup walkthrough

Do these steps in order. Do not test with real patient information yet; use synthetic test records until the provider/data-protection requirements for your deployment have been reviewed.

## 1. Apply the database migration

1. Open your Supabase project dashboard.
2. Open **SQL Editor**.
3. Open `supabase/migrations/20261110000000_careflow_rag.sql` from this patch.
4. Copy the complete SQL into a new SQL Editor query and run it.
5. Confirm these tables exist under **Table Editor**:
   - `rag_sources`
   - `rag_chunks`
6. Confirm the `vector` extension is enabled under **Database → Extensions**.

The migration creates a 768-dimensional vector column, an HNSW cosine index, RLS policies, and two restricted RPC functions. It does not depend on the proposed `profiles` table, which is not present in the supplied project archive.

> If your project already has the `vector` extension installed in a schema other than `extensions`, stop and tell me before running the migration; the vector type/operator-class schema references may need to be adjusted.

## 2. Create a Gemini API key

1. Open [Google AI Studio API keys](https://aistudio.google.com/app/apikey).
2. Sign in and create an API key for your project.
3. Copy it somewhere safe.
4. **Do not** put it in `app.json`, an `EXPO_PUBLIC_*` variable, or any React Native file.

The implementation uses:

- Embeddings: `gemini-embedding-001`, output dimension `768`.
- Generation: `gemini-3.1-flash-lite` by default.

The generation model can be changed using the `GEMINI_GENERATION_MODEL` Edge Function secret without editing the app.

## 3. Install and link the Supabase CLI

If you do not already have the Supabase CLI installed, install it using the official instructions:

[Supabase CLI installation](https://supabase.com/docs/guides/cli/getting-started)

Then, from the project root (`health-native`):

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Find `YOUR_PROJECT_REF` in your Supabase project URL:

```text
https://YOUR_PROJECT_REF.supabase.co
```

The patch includes `supabase/config.toml`. If your local project already has a Supabase config, merge the `[functions.careflow-rag]` section instead of replacing your existing settings.

## 4. Add the Gemini key as a Supabase secret

Run this from the project root:

```bash
supabase secrets set GEMINI_API_KEY=YOUR_GEMINI_API_KEY GEMINI_GENERATION_MODEL=gemini-3.1-flash-lite
```

Do not commit the key. Supabase Edge Functions receive their platform URL and anonymous key from the Supabase runtime; the Gemini key is the only provider secret this function needs.

## 5. Deploy the Edge Function

```bash
supabase functions deploy careflow-rag
```

Keep JWT verification enabled. The function is designed to be called only by signed-in Supabase users.

## 6. Check the Expo environment

Your existing `services/supabase/client.ts` expects:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Keep these existing variables in your local `.env` file. The patch does not require a new Expo-side Gemini key. Restart Expo after changing environment variables:

```bash
npx expo start -c
```

## 7. Test end-to-end with synthetic data

1. Sign in to CareFlow using a Supabase Auth account.
2. Submit a Daily Health Log with synthetic values (for example BP 120/80 and sleep 7 hours).
3. Confirm the save alert appears.
4. Open Supabase **Table Editor → rag_sources** and confirm a `daily_log` source was created for the signed-in user's UUID.
5. Open `rag_chunks` and confirm chunk rows have 768-dimensional embeddings.
6. Upload a synthetic sample prescription/report image through the existing OCR screen.
7. Confirm the extracted OCR text is saved as a `medical_document` source and its chunks appear in `rag_chunks`.
8. Ask the Assistant a question whose answer is present in one of those records.
9. Confirm the answer and source title/date appear.

Useful questions:

- "What blood pressure reading did I log?"
- "How many hours did I sleep in my daily log?"
- "What medication is mentioned in the uploaded prescription?"

If the assistant says it cannot find the answer, check the Edge Function logs in **Supabase → Edge Functions → careflow-rag → Logs**.

---

# Data behavior and limitations in this first version

- A daily log is stored as structured JSON in `rag_sources.structured_data` and as category-oriented text chunks in `rag_chunks`.
- An OCR document stores its extracted text, filename, and OCR metadata. **The original image/PDF itself is not uploaded to Supabase Storage by this patch.**
- Reprocessing the same source can replace its chunks by sending the same `sourceId` to the ingestion endpoint. The current screens create a new source for each submission, preserving earlier submissions.
- A changed prescription or later daily log is stored as a new historical source. This version does not infer that an older medication was discontinued or label a medication as clinically current. If records disagree, the prompt tells Gemini to report the conflict rather than guess.
- The Assistant screen keeps conversation bubbles in local screen state only. Each question is independently retrieved; conversation history is not persisted or sent as context.
- Retrieval is top-5 cosine similarity with a conservative relevance cutoff. It is a baseline that will need evaluation against real, de-identified test questions.
- The implementation caps each source at 40 chunks and each source text at 60,000 characters to bound API usage. Oversized sources are rejected rather than silently truncated.
- This is a prototype, not a medical device or a clinical decision-support system. It must not diagnose, prescribe, or recommend medication changes.

## Important patient-data privacy note

Gemini API data-use terms depend on the account/tier and current Google terms. Google's published pricing information distinguishes whether submitted data may be used to improve products between free and paid tiers. Do not send identifiable or real patient health information through a free-tier key. Before production, review Google's current data-use terms, applicable healthcare privacy law, consent requirements, retention, and whether the selected service/account is contractually appropriate for sensitive health data. A paid API tier alone does not automatically establish regulatory compliance.

## Troubleshooting

| Symptom | Check |
|---|---|
| `401` from the function | User is signed in; function deployment has JWT verification enabled; app has a valid session. |
| `GEMINI_API_KEY is not configured` | Run the `supabase secrets set` command against the linked project. |
| Gemini embedding error | Verify the key, API access, model availability, quota and billing in Google AI Studio. |
| `Could not search patient records` | Confirm the SQL migration ran successfully and the RPC functions exist. |
| No matching information | Confirm the source and chunks exist for the same authenticated user; try a more specific question. |
| Vector dimension error | Keep `outputDimensionality=768` aligned with `extensions.vector(768)` in SQL. |

## Official references

- [Gemini embeddings](https://ai.google.dev/gemini-api/docs/embeddings)
- [Gemini API models and pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Supabase pgvector](https://supabase.com/docs/guides/database/extensions/pgvector)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)
