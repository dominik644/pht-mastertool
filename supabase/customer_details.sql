-- Stammdaten, Funnel und bestätigte Termine im Kalender
-- Im Supabase SQL Editor ausführen.

create table if not exists public.customer_details (
  customer_id text primary key,
  details jsonb not null default '{}'::jsonb,
  updated_by text,
  updated_at timestamptz not null default now()
);

alter table public.customer_details enable row level security;

drop policy if exists "service manage customer_details" on public.customer_details;
create policy "service manage customer_details"
  on public.customer_details for all
  to service_role
  using (true)
  with check (true);

alter table public.schedule_proposals add column if not exists confirmed_calendar_event_id text;

create table if not exists public.sales_funnel_deals (
  id text primary key,
  owner_key text not null default '',
  deal jsonb not null default '{}'::jsonb,
  updated_by text,
  updated_at timestamptz not null default now()
);

create index if not exists sales_funnel_deals_owner_idx on public.sales_funnel_deals (owner_key);

alter table public.sales_funnel_deals enable row level security;

drop policy if exists "service manage sales_funnel_deals" on public.sales_funnel_deals;
create policy "service manage sales_funnel_deals"
  on public.sales_funnel_deals for all
  to service_role
  using (true)
  with check (true);

