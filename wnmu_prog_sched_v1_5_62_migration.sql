-- WNMU Programming Library Schedule Planner migration v1.5.62
-- Run after wnmu_prog_sched_v1_5_61.sql has already been run.
-- Migration only: does not recreate v1.5.61 tables and does not touch Library, aired-history,
-- holiday, pledge, monthly schedule, or ProTrack tables.
-- Adds required-rotation / program-pool support for scheduler test templates.

create extension if not exists pgcrypto;

create table if not exists public.wnmu_prog_sched_program_pools (
  id uuid primary key default gen_random_uuid(),
  source_app text not null default 'WNMU-Programming-library',
  pool_name text not null unique,
  pool_type text not null default 'title_text' check (pool_type in ('title_text', 'selected_records', 'mixed')),
  match_mode text not null default 'title_text' check (match_mode in ('title_text', 'exact_record', 'mixed')),
  title_match_text text,
  avoid_back_to_back boolean not null default true,
  repeat_gap_days integer not null default 0 check (repeat_gap_days between 0 and 365),
  rights_urgency_months integer not null default 6 check (rights_urgency_months between 0 and 36),
  active boolean not null default true,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wnmu_prog_sched_program_pool_items (
  id uuid primary key default gen_random_uuid(),
  source_app text not null default 'WNMU-Programming-library',
  pool_id uuid not null references public.wnmu_prog_sched_program_pools(id) on delete cascade,
  item_label text not null,
  title_match_text text not null,
  program_record_id text,
  program_title text,
  season_label text,
  priority_weight integer not null default 0 check (priority_weight between -100 and 100),
  active boolean not null default true,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  constraint wnmu_prog_sched_program_pool_items_pool_match_unique unique (pool_id, title_match_text)
);

alter table public.wnmu_prog_sched_slot_templates add column if not exists slot_behavior text not null default 'open_search';
alter table public.wnmu_prog_sched_slot_templates add column if not exists required_pool_id uuid;
alter table public.wnmu_prog_sched_slot_templates add column if not exists avoid_back_to_back boolean not null default true;
alter table public.wnmu_prog_sched_slot_templates add column if not exists repeat_gap_days integer not null default 0;
alter table public.wnmu_prog_sched_slot_templates add column if not exists rights_urgency_months integer not null default 0;

alter table public.wnmu_prog_sched_slot_overrides add column if not exists slot_behavior text not null default 'open_search';
alter table public.wnmu_prog_sched_slot_overrides add column if not exists required_pool_id uuid;
alter table public.wnmu_prog_sched_slot_overrides add column if not exists avoid_back_to_back boolean not null default true;
alter table public.wnmu_prog_sched_slot_overrides add column if not exists repeat_gap_days integer not null default 0;
alter table public.wnmu_prog_sched_slot_overrides add column if not exists rights_urgency_months integer not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'wnmu_prog_sched_slot_templates_behavior_chk') then
    alter table public.wnmu_prog_sched_slot_templates
      add constraint wnmu_prog_sched_slot_templates_behavior_chk
      check (slot_behavior in ('open_search', 'required_rotation'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'wnmu_prog_sched_slot_templates_required_pool_fk') then
    alter table public.wnmu_prog_sched_slot_templates
      add constraint wnmu_prog_sched_slot_templates_required_pool_fk
      foreign key (required_pool_id)
      references public.wnmu_prog_sched_program_pools(id)
      on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'wnmu_prog_sched_slot_templates_repeat_gap_chk') then
    alter table public.wnmu_prog_sched_slot_templates
      add constraint wnmu_prog_sched_slot_templates_repeat_gap_chk
      check (repeat_gap_days between 0 and 365);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'wnmu_prog_sched_slot_templates_rights_urgency_chk') then
    alter table public.wnmu_prog_sched_slot_templates
      add constraint wnmu_prog_sched_slot_templates_rights_urgency_chk
      check (rights_urgency_months between 0 and 36);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'wnmu_prog_sched_slot_overrides_behavior_chk') then
    alter table public.wnmu_prog_sched_slot_overrides
      add constraint wnmu_prog_sched_slot_overrides_behavior_chk
      check (slot_behavior in ('open_search', 'required_rotation'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'wnmu_prog_sched_slot_overrides_required_pool_fk') then
    alter table public.wnmu_prog_sched_slot_overrides
      add constraint wnmu_prog_sched_slot_overrides_required_pool_fk
      foreign key (required_pool_id)
      references public.wnmu_prog_sched_program_pools(id)
      on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'wnmu_prog_sched_slot_overrides_repeat_gap_chk') then
    alter table public.wnmu_prog_sched_slot_overrides
      add constraint wnmu_prog_sched_slot_overrides_repeat_gap_chk
      check (repeat_gap_days between 0 and 365);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'wnmu_prog_sched_slot_overrides_rights_urgency_chk') then
    alter table public.wnmu_prog_sched_slot_overrides
      add constraint wnmu_prog_sched_slot_overrides_rights_urgency_chk
      check (rights_urgency_months between 0 and 36);
  end if;
end $$;

create unique index if not exists wnmu_prog_sched_program_pools_pool_name_uidx
  on public.wnmu_prog_sched_program_pools (pool_name);

create unique index if not exists wnmu_prog_sched_program_pool_items_pool_match_uidx
  on public.wnmu_prog_sched_program_pool_items (pool_id, title_match_text);

create index if not exists wnmu_prog_sched_program_pools_active_idx
  on public.wnmu_prog_sched_program_pools (active, pool_name);

create index if not exists wnmu_prog_sched_program_pool_items_lookup_idx
  on public.wnmu_prog_sched_program_pool_items (pool_id, active, title_match_text);

create index if not exists wnmu_prog_sched_slot_templates_required_pool_idx
  on public.wnmu_prog_sched_slot_templates (required_pool_id);

create index if not exists wnmu_prog_sched_slot_overrides_required_pool_idx
  on public.wnmu_prog_sched_slot_overrides (required_pool_id);

create or replace function public.wnmu_prog_sched_touch_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists wnmu_prog_sched_program_pools_touch_updated_at on public.wnmu_prog_sched_program_pools;
create trigger wnmu_prog_sched_program_pools_touch_updated_at
before update on public.wnmu_prog_sched_program_pools
for each row execute function public.wnmu_prog_sched_touch_updated_at();

drop trigger if exists wnmu_prog_sched_program_pool_items_touch_updated_at on public.wnmu_prog_sched_program_pool_items;
create trigger wnmu_prog_sched_program_pool_items_touch_updated_at
before update on public.wnmu_prog_sched_program_pool_items
for each row execute function public.wnmu_prog_sched_touch_updated_at();

alter table public.wnmu_prog_sched_program_pools enable row level security;
alter table public.wnmu_prog_sched_program_pool_items enable row level security;

-- Planner remains login-only. Anonymous users get no grants and no RLS policy.
revoke all on table public.wnmu_prog_sched_program_pools from anon;
revoke all on table public.wnmu_prog_sched_program_pool_items from anon;
revoke all on table public.wnmu_prog_sched_slot_templates from anon;
revoke all on table public.wnmu_prog_sched_slot_overrides from anon;

grant select, insert, update, delete on table public.wnmu_prog_sched_program_pools to authenticated;
grant select, insert, update, delete on table public.wnmu_prog_sched_program_pool_items to authenticated;
grant select, insert, update, delete on table public.wnmu_prog_sched_slot_templates to authenticated;
grant select, insert, update, delete on table public.wnmu_prog_sched_slot_overrides to authenticated;

grant all privileges on table public.wnmu_prog_sched_program_pools to service_role;
grant all privileges on table public.wnmu_prog_sched_program_pool_items to service_role;
grant all privileges on table public.wnmu_prog_sched_slot_templates to service_role;
grant all privileges on table public.wnmu_prog_sched_slot_overrides to service_role;

drop policy if exists wnmu_prog_sched_program_pools_authenticated_all on public.wnmu_prog_sched_program_pools;
create policy wnmu_prog_sched_program_pools_authenticated_all
on public.wnmu_prog_sched_program_pools
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists wnmu_prog_sched_program_pool_items_authenticated_all on public.wnmu_prog_sched_program_pool_items;
create policy wnmu_prog_sched_program_pool_items_authenticated_all
on public.wnmu_prog_sched_program_pool_items
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

comment on table public.wnmu_prog_sched_program_pools is 'WNMU Schedule Planner test required-rotation pools. Login-only; project-scoped; no Library program data is modified.';
comment on table public.wnmu_prog_sched_program_pool_items is 'WNMU Schedule Planner test pool membership/matching rows. Initially supports title-text matching; can later hold exact Library program references.';
comment on column public.wnmu_prog_sched_slot_templates.slot_behavior is 'open_search = normal helper candidate search; required_rotation = choose only from required_pool_id.';
comment on column public.wnmu_prog_sched_slot_templates.required_pool_id is 'Optional required-rotation pool for slots like WAI LANA YOGA seasons.';
comment on column public.wnmu_prog_sched_slot_overrides.slot_behavior is 'open_search = normal helper candidate search; required_rotation = choose only from required_pool_id.';
comment on column public.wnmu_prog_sched_slot_overrides.required_pool_id is 'Optional required-rotation pool for temporary/date-range overrides.';
