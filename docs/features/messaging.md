# Messaging and care assistant

## Main assistant

The Assistant tab stores conversations and messages through
[`chatApi.ts`](../../services/chatApi.ts). Users can create, select, rename,
and delete conversations. A mission can be attached to a conversation through
`conversation_states.active_mission_id`.

[`chatOrchestrator.ts`](../../services/chatOrchestrator.ts) builds recent
history and selected context, asks Gemini for a structured intent validated by
Zod, performs deterministic actions such as mission/task/provider/appointment
operations, writes messages, and generates a final response. It also
compresses older history into a conversation summary.

## Action coverage

Implemented action paths include mission creation, task creation/delegation,
provider search, appointment booking, caregiver matching, and document
processing analysis. The exact result depends on the deployed tables and RLS.

## Important boundary

This assistant is separate from the record RAG assistant. The main assistant
currently calls the Gemini OpenAI-compatible endpoint from the mobile client
using `EXPO_PUBLIC_GEMINI_API_KEY`; that key is therefore bundled into the
app and must be moved to a trusted server path before production.

Error handling is uneven: some Supabase failures are logged and the UI
continues, while the screen returns a generic connection message.
