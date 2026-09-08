-- Inbox tables for Snapaddy + Plaud (safe to re-run)
create table if not exists public.snapaddy_inbox (
  id text primary key,
  payload jsonb not null,
  status text not null default 'pending',
  received_at timestamptz not null default now()
);

create index if not exists snapaddy_inbox_status_idx on public.snapaddy_inbox (status);

alter table public.snapaddy_inbox enable row level security;

drop policy if exists "service manage snapaddy_inbox" on public.snapaddy_inbox;
create policy "service manage snapaddy_inbox"
  on public.snapaddy_inbox for all
  to service_role
  using (true)
  with check (true);

create table if not exists public.plaud_inbox (
  id text primary key,
  payload jsonb not null,
  status text not null default 'pending',
  received_at timestamptz not null default now()
);

create index if not exists plaud_inbox_status_idx on public.plaud_inbox (status);

alter table public.plaud_inbox enable row level security;

drop policy if exists "service manage plaud_inbox" on public.plaud_inbox;
create policy "service manage plaud_inbox"
  on public.plaud_inbox for all
  to service_role
  using (true)
  with check (true);
