-- Run this in Supabase SQL Editor

create extension if not exists pgcrypto;

create table if not exists public.app_state (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null,
  player_id text not null,
  scope text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (campaign_id, player_id, scope)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_state_updated_at on public.app_state;
create trigger trg_app_state_updated_at
before update on public.app_state
for each row
execute function public.set_updated_at();

alter table public.app_state enable row level security;

drop policy if exists "anon_read_app_state" on public.app_state;
create policy "anon_read_app_state"
on public.app_state
for select
to anon, authenticated
using (true);

drop policy if exists "anon_upsert_app_state" on public.app_state;
create policy "anon_upsert_app_state"
on public.app_state
for insert
to anon, authenticated
with check (true);

drop policy if exists "anon_update_app_state" on public.app_state;
create policy "anon_update_app_state"
on public.app_state
for update
to anon, authenticated
using (true)
with check (true);
