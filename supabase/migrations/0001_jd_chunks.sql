-- RoleOS RAG store: one row per JD chunk, with vector + lexical search.
-- Apply via: supabase db push  (or paste into the Supabase SQL editor)

create extension if not exists vector;

create table if not exists jd_chunks (
  id              text primary key,                -- "<company-slug>:<ats_job_id>"
  company_slug    text not null,
  company_name    text not null,
  role_title      text not null,
  archetype       text,
  seniority_level text,
  location_type   text,
  source_url      text,
  content         text not null,
  content_tsv     tsvector generated always as (to_tsvector('english', content)) stored,
  embedding       vector(768),                     -- nomic-embed-text dim
  updated_at      timestamptz not null default now()
);

create index if not exists jd_chunks_tsv_idx       on jd_chunks using gin (content_tsv);
create index if not exists jd_chunks_embedding_idx on jd_chunks using hnsw (embedding vector_cosine_ops);
create index if not exists jd_chunks_company_idx   on jd_chunks (company_slug);

-- Hybrid retrieval: reciprocal-rank-fusion of cosine + websearch_to_tsquery.
-- Anon role can call this read-only via PostgREST.
create or replace function match_chunks(
  query_embedding vector(768),
  query_text      text,
  match_count     int default 8
)
returns table (
  id text, company_slug text, company_name text, role_title text,
  archetype text, seniority_level text, location_type text, source_url text,
  content text, score real
)
language sql stable as $$
  with vec as (
    select id, 1 - (embedding <=> query_embedding) as s,
           row_number() over (order by embedding <=> query_embedding) as r
    from jd_chunks
    where embedding is not null
    order by embedding <=> query_embedding
    limit greatest(match_count * 4, 32)
  ),
  lex as (
    select id, ts_rank_cd(content_tsv, websearch_to_tsquery('english', query_text)) as s,
           row_number() over (order by ts_rank_cd(content_tsv, websearch_to_tsquery('english', query_text)) desc) as r
    from jd_chunks
    where content_tsv @@ websearch_to_tsquery('english', query_text)
    limit greatest(match_count * 4, 32)
  ),
  fused as (
    select coalesce(vec.id, lex.id) as id,
           coalesce(1.0 / (60 + vec.r), 0) + coalesce(1.0 / (60 + lex.r), 0) as score
    from vec full outer join lex on vec.id = lex.id
  )
  select c.id, c.company_slug, c.company_name, c.role_title,
         c.archetype, c.seniority_level, c.location_type, c.source_url,
         c.content, f.score::real
  from fused f
  join jd_chunks c on c.id = f.id
  order by f.score desc
  limit match_count;
$$;

-- RLS: anon can SELECT and call match_chunks; only service_role can INSERT/UPDATE.
alter table jd_chunks enable row level security;
drop policy if exists "jd_chunks_anon_read" on jd_chunks;
create policy "jd_chunks_anon_read" on jd_chunks for select to anon using (true);
grant execute on function match_chunks(vector, text, int) to anon;
