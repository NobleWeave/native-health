# Supabase implementation notes

The checked-in Supabase implementation consists of:

- [`migrations/20261110000000_careflow_rag.sql`](./migrations/20261110000000_careflow_rag.sql),
  which creates `rag_sources`, `rag_chunks`, their RLS policies, indexes, and
  the two RAG RPCs.
- [`functions/careflow-rag/index.ts`](./functions/careflow-rag/index.ts), which
  authenticates requests and performs RAG ingestion/retrieval.
- [`config.toml`](./config.toml), which enables JWT verification for the Edge
  Function.

Deploy the RAG path using the instructions in
[`../docs/setup/deployment.md`](../docs/setup/deployment.md). The broader
workflow schema used by client services is documented in
[`../DATABASE.md`](../DATABASE.md), but its tables, policies, and triggers are
not represented by checked-in migrations in this repository.
