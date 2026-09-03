-- App-Login: Passwörter persistent speichern (Vercel Production)
-- Supabase Dashboard → SQL Editor → dieses Skript einfügen → Run

create table if not exists public.app_users (
  email text primary key,
  password_hash text not null,
  name text,
  admin boolean not null default false,
  disabled boolean not null default false,
  bc_salesperson_code text,
  sales_rep text,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.app_users enable row level security;

drop policy if exists "service manage app_users" on public.app_users;
create policy "service manage app_users"
  on public.app_users for all
  to service_role
  using (true)
  with check (true);

-- PostgREST Schema-Cache aktualisieren (falls Tabelle gerade erst angelegt wurde)
notify pgrst, 'reload schema';
