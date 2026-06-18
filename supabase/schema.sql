-- PHT Mastertool – Tender-Speicher für Phase-B-Ingest
-- Ausführen in Supabase SQL Editor (einmalig)
-- Env: SUPABASE_URL, SUPABASE_SERVICE_KEY (Ingest), SUPABASE_ANON_KEY (Frontend-Lesung)

create table if not exists public.tenders (
  id text primary key,
  title text not null,
  country text,
  deadline date,
  url text,
  source text,
  raw_json jsonb not null default '{}'::jsonb,
  ingested_at timestamptz not null default now()
);

create index if not exists tenders_country_idx on public.tenders (country);
create index if not exists tenders_deadline_idx on public.tenders (deadline);
create index if not exists tenders_ingested_at_idx on public.tenders (ingested_at desc);
create index if not exists tenders_source_idx on public.tenders (source);

-- Service-Role schreibt via REST; RLS optional für spätere Frontend-Lesung
alter table public.tenders enable row level security;

create policy "anon read tenders"
  on public.tenders for select
  to anon, authenticated
  using (true);

-- Ingest-Zustand für High-Score-Alerts (letzte Lauf-IDs)
create table if not exists public.ingest_state (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.ingest_state enable row level security;

-- Nur Service-Role schreibt; Lesen für Service via REST service_key
create policy "service manage ingest_state"
  on public.ingest_state for all
  to service_role
  using (true)
  with check (true);

-- Interne Vertriebs-Pipeline (optional – Sync via Service-Role)
create table if not exists public.sales_pipeline (
  id text primary key,
  title text not null,
  stage text not null default 'Lead',
  estimated_value numeric not null default 0,
  probability integer not null default 25 check (probability >= 0 and probability <= 100),
  source_type text not null default 'manual',
  source_id text,
  source_url text,
  country text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_pipeline_stage_idx on public.sales_pipeline (stage);
create index if not exists sales_pipeline_source_idx on public.sales_pipeline (source_type, source_id);

alter table public.sales_pipeline enable row level security;

create policy "anon read sales_pipeline"
  on public.sales_pipeline for select
  to anon, authenticated
  using (true);

create policy "service manage sales_pipeline"
  on public.sales_pipeline for all
  to service_role
  using (true)
  with check (true);
