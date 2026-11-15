-- CareFlow RAG foundation
-- Gemini gemini-embedding-001 with outputDimensionality=768.

create schema if not exists extensions;
create extension if not exists vector with schema extensions;
grant usage on schema extensions to authenticated;

create table if not exists public.rag_sources (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('daily_log', 'medical_document')),
  title text not null,
  source_date date,
  content text not null,
  structured_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rag_sources_user_date_idx
  on public.rag_sources (user_id, source_date desc);

create table if not exists public.rag_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.rag_sources(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding extensions.vector(768) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_id, chunk_index)
);

create index if not exists rag_chunks_user_id_idx
  on public.rag_chunks (user_id);

create index if not exists rag_chunks_source_id_idx
  on public.rag_chunks (source_id);

create index if not exists rag_chunks_embedding_hnsw_idx
  on public.rag_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.rag_sources enable row level security;
alter table public.rag_chunks enable row level security;

-- Users can inspect only their own source/chunk rows. Writes happen through
-- narrowly-scoped RPC functions which derive user_id from auth.uid().
drop policy if exists "Users can read their own RAG sources" on public.rag_sources;
create policy "Users can read their own RAG sources"
  on public.rag_sources for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can read their own RAG chunks" on public.rag_chunks;
create policy "Users can read their own RAG chunks"
  on public.rag_chunks for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.rag_sources to authenticated;
grant select on public.rag_chunks to authenticated;

-- Atomically upsert a source and replace its chunks. This is intended for
-- re-processing the same source (same source_id), not for overwriting history.
create or replace function public.replace_patient_rag_source(
  p_source_id uuid,
  p_source_type text,
  p_title text,
  p_source_date date,
  p_content text,
  p_structured_data jsonb,
  p_metadata jsonb,
  p_chunks jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_source_id uuid;
  v_chunk jsonb;
  v_index integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_source_type not in ('daily_log', 'medical_document') then
    raise exception 'Unsupported source type';
  end if;

  if p_content is null or length(trim(p_content)) = 0 then
    raise exception 'Source content cannot be empty';
  end if;

  if jsonb_typeof(p_chunks) <> 'array' or jsonb_array_length(p_chunks) = 0 then
    raise exception 'At least one embedded chunk is required';
  end if;

  insert into public.rag_sources (
    id, user_id, source_type, title, source_date, content,
    structured_data, metadata, updated_at
  ) values (
    p_source_id, v_user_id, p_source_type, p_title, p_source_date,
    p_content, p_structured_data, coalesce(p_metadata, '{}'::jsonb), now()
  )
  on conflict (id) do update set
    source_type = excluded.source_type,
    title = excluded.title,
    source_date = excluded.source_date,
    content = excluded.content,
    structured_data = excluded.structured_data,
    metadata = excluded.metadata,
    updated_at = now()
  where public.rag_sources.user_id = v_user_id
  returning id into v_source_id;

  if v_source_id is null then
    raise exception 'Source not found or access denied';
  end if;

  delete from public.rag_chunks
  where source_id = v_source_id and user_id = v_user_id;

  for v_chunk in select value from jsonb_array_elements(p_chunks)
  loop
    insert into public.rag_chunks (
      source_id, user_id, chunk_index, content, embedding, metadata
    ) values (
      v_source_id,
      v_user_id,
      coalesce((v_chunk ->> 'chunk_index')::integer, v_index),
      v_chunk ->> 'content',
      ((v_chunk -> 'embedding')::text)::extensions.vector(768),
      coalesce(v_chunk -> 'metadata', '{}'::jsonb)
    );
    v_index := v_index + 1;
  end loop;

  return v_source_id;
end;
$$;

-- Similarity search is always scoped to the authenticated user, even though
-- this function is SECURITY DEFINER.
create or replace function public.match_patient_rag_chunks(
  query_embedding extensions.vector(768),
  match_count integer default 5
)
returns table (
  id uuid,
  source_id uuid,
  content text,
  metadata jsonb,
  similarity double precision
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.source_id,
    c.content,
    c.metadata,
    (1 - (c.embedding OPERATOR(extensions.<=>) query_embedding))::double precision as similarity
  from public.rag_chunks as c
  where c.user_id = (select auth.uid())
  order by c.embedding OPERATOR(extensions.<=>) query_embedding
  limit least(greatest(coalesce(match_count, 5), 1), 8);
$$;

revoke all on function public.replace_patient_rag_source(uuid, text, text, date, text, jsonb, jsonb, jsonb) from public;
revoke all on function public.match_patient_rag_chunks(extensions.vector, integer) from public;
grant execute on function public.replace_patient_rag_source(uuid, text, text, date, text, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.match_patient_rag_chunks(extensions.vector, integer) to authenticated;
