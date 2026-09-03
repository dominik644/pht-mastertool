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

-- Vertriebs-Feedback & Besuche (Dual-Write mit localStorage)
create table if not exists public.sales_feedback (
  customer_id text primary key,
  lead_rating text,
  visit_relevant boolean,
  visit_outcome text,
  sector_hits jsonb not null default '[]'::jsonb,
  positive_count integer not null default 0,
  negative_count integer not null default 0,
  territory text not null default 'Vertrieb Ost',
  user_id text,
  updated_at timestamptz not null default now()
);

create index if not exists sales_feedback_territory_idx on public.sales_feedback (territory);

alter table public.sales_feedback enable row level security;

create policy "anon read sales_feedback"
  on public.sales_feedback for select
  to anon, authenticated
  using (true);

create policy "service manage sales_feedback"
  on public.sales_feedback for all
  to service_role
  using (true)
  with check (true);

create table if not exists public.customer_visits (
  customer_id text primary key,
  last_visit date,
  next_due date,
  scheduled_visit timestamptz,
  notes text not null default '',
  archived boolean not null default false,
  event_type text not null default 'update',
  territory text not null default 'Vertrieb Ost',
  user_id text,
  updated_at timestamptz not null default now()
);

create index if not exists customer_visits_territory_idx on public.customer_visits (territory);
create index if not exists customer_visits_next_due_idx on public.customer_visits (next_due);

alter table public.customer_visits enable row level security;

create policy "anon read customer_visits"
  on public.customer_visits for select
  to anon, authenticated
  using (true);

create policy "service manage customer_visits"
  on public.customer_visits for all
  to service_role
  using (true)
  with check (true);

-- Kunden-Terminvorschläge (Self-Scheduling per E-Mail-Link)
-- OPTIONAL: Ohne diese Tabelle funktioniert die App weiter – Terminvorschläge werden
-- dann lokal gespeichert (data/schedule-proposals.json bzw. /tmp auf Vercel).
-- Für teamweiten persistenten Speicher: diesen Block im Supabase SQL Editor ausführen.
create table if not exists public.schedule_proposals (
  id text primary key,
  customer_id text not null,
  customer_name text not null,
  customer_email text not null,
  slots jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  confirmed_slot_id text,
  confirmed_at timestamptz,
  custom_request jsonb,
  territory text not null default 'Vertrieb Ost',
  sales_rep_email text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  follow_up_scheduled_at timestamptz,
  follow_up_event_id text,
  follow_up_error text
);

create index if not exists schedule_proposals_customer_idx on public.schedule_proposals (customer_id);
create index if not exists schedule_proposals_status_idx on public.schedule_proposals (status);

-- Migration: Follow-up-Spalten für bestehende schedule_proposals-Tabellen
alter table public.schedule_proposals add column if not exists follow_up_scheduled_at timestamptz;
alter table public.schedule_proposals add column if not exists follow_up_event_id text;
alter table public.schedule_proposals add column if not exists follow_up_error text;

alter table public.schedule_proposals enable row level security;

create policy "service manage schedule_proposals"
  on public.schedule_proposals for all
  to service_role
  using (true)
  with check (true);
