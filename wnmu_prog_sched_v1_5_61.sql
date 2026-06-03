-- WNMU Programming Library Schedule Planner test tables v1.5.61
-- Run once in the Supabase SQL Editor before uploading/using the v1.5.61 planner page.
-- These tables are intentionally project-scoped with the wnmu_prog_sched_ prefix.
-- They do not alter existing Library, Monthly Schedule, Pledge, or Holiday tables.

create extension if not exists pgcrypto;

create table if not exists public.wnmu_prog_sched_slot_templates (
  id uuid primary key default gen_random_uuid(),
  source_app text not null default 'WNMU-Programming-library',
  channel text not null default '13.1' check (channel in ('13.1', '13.3')),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_minutes integer not null check (start_minutes between 0 and 1560),
  length_minutes integer not null check (length_minutes between 1 and 360),
  purpose text not null default 'standalone' check (purpose in ('standalone', 'series', 'flex', 'local', 'pbs_feed', 'fundraiser', 'holiday', 'hold')),
  is_pbs_feed boolean not null default false,
  title_topic text,
  fill_strategy text not null default 'single' check (fill_strategy in ('single', 'two_half_hours', 'single_or_two')),
  series_pattern text not null default 'none' check (series_pattern in ('none', 'weekly_one_day', 'independent_by_weekday', 'consecutive_across_days')),
  template_group_name text,
  episode_min integer check (episode_min is null or episode_min > 0),
  episode_max integer check (episode_max is null or episode_max > 0),
  rating_mode text not null default 'boost' check (rating_mode in ('boost', 'ignore', 'minimum')),
  rating_min integer check (rating_min is null or rating_min between 1 and 5),
  freshness_months integer not null default 0 check (freshness_months >= 0),
  event_mode text not null default 'none' check (event_mode in ('none', 'prefer', 'require')),
  event_window_days integer not null default 5 check (event_window_days between 0 and 30),
  active_start_date date,
  active_end_date date,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  constraint wnmu_prog_sched_slot_templates_episode_range_chk check (episode_max is null or episode_min is null or episode_max >= episode_min),
  constraint wnmu_prog_sched_slot_templates_active_range_chk check (active_end_date is null or active_start_date is null or active_end_date >= active_start_date)
);

create table if not exists public.wnmu_prog_sched_slot_overrides (
  id uuid primary key default gen_random_uuid(),
  source_app text not null default 'WNMU-Programming-library',
  channel text not null default '13.1' check (channel in ('13.1', '13.3')),
  start_date date not null,
  end_date date not null,
  override_template_id uuid references public.wnmu_prog_sched_slot_templates(id) on delete cascade,
  pbs_was_overridden boolean not null default false,
  override_reason text not null default 'manual',
  start_minutes integer not null check (start_minutes between 0 and 1560),
  length_minutes integer not null check (length_minutes between 1 and 360),
  purpose text not null default 'standalone' check (purpose in ('standalone', 'series', 'flex', 'local', 'pbs_feed', 'fundraiser', 'holiday', 'hold')),
  is_pbs_feed boolean not null default false,
  title_topic text,
  fill_strategy text not null default 'single' check (fill_strategy in ('single', 'two_half_hours', 'single_or_two')),
  series_pattern text not null default 'none' check (series_pattern in ('none', 'weekly_one_day', 'independent_by_weekday', 'consecutive_across_days')),
  template_group_name text,
  episode_min integer check (episode_min is null or episode_min > 0),
  episode_max integer check (episode_max is null or episode_max > 0),
  rating_mode text not null default 'boost' check (rating_mode in ('boost', 'ignore', 'minimum')),
  rating_min integer check (rating_min is null or rating_min between 1 and 5),
  freshness_months integer not null default 0 check (freshness_months >= 0),
  event_mode text not null default 'none' check (event_mode in ('none', 'prefer', 'require')),
  event_window_days integer not null default 5 check (event_window_days between 0 and 30),
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  constraint wnmu_prog_sched_slot_overrides_date_range_chk check (end_date >= start_date),
  constraint wnmu_prog_sched_slot_overrides_episode_range_chk check (episode_max is null or episode_min is null or episode_max >= episode_min)
);

create index if not exists wnmu_prog_sched_slot_templates_lookup_idx
  on public.wnmu_prog_sched_slot_templates (channel, day_of_week, start_minutes);

create index if not exists wnmu_prog_sched_slot_templates_active_dates_idx
  on public.wnmu_prog_sched_slot_templates (active_start_date, active_end_date);

create index if not exists wnmu_prog_sched_slot_overrides_lookup_idx
  on public.wnmu_prog_sched_slot_overrides (channel, start_date, end_date, start_minutes);

create index if not exists wnmu_prog_sched_slot_overrides_template_idx
  on public.wnmu_prog_sched_slot_overrides (override_template_id);

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

drop trigger if exists wnmu_prog_sched_slot_templates_touch_updated_at on public.wnmu_prog_sched_slot_templates;
create trigger wnmu_prog_sched_slot_templates_touch_updated_at
before update on public.wnmu_prog_sched_slot_templates
for each row execute function public.wnmu_prog_sched_touch_updated_at();

drop trigger if exists wnmu_prog_sched_slot_overrides_touch_updated_at on public.wnmu_prog_sched_slot_overrides;
create trigger wnmu_prog_sched_slot_overrides_touch_updated_at
before update on public.wnmu_prog_sched_slot_overrides
for each row execute function public.wnmu_prog_sched_touch_updated_at();

alter table public.wnmu_prog_sched_slot_templates enable row level security;
alter table public.wnmu_prog_sched_slot_overrides enable row level security;

-- Planner is login-only. Anonymous users get no table access and no RLS policy.
revoke all on table public.wnmu_prog_sched_slot_templates from anon;
revoke all on table public.wnmu_prog_sched_slot_overrides from anon;

-- Authenticated WNMU app users can manage only these scheduler test tables.
grant select, insert, update, delete on table public.wnmu_prog_sched_slot_templates to authenticated;
grant select, insert, update, delete on table public.wnmu_prog_sched_slot_overrides to authenticated;

grant all privileges on table public.wnmu_prog_sched_slot_templates to service_role;
grant all privileges on table public.wnmu_prog_sched_slot_overrides to service_role;

drop policy if exists wnmu_prog_sched_slot_templates_authenticated_all on public.wnmu_prog_sched_slot_templates;
create policy wnmu_prog_sched_slot_templates_authenticated_all
on public.wnmu_prog_sched_slot_templates
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists wnmu_prog_sched_slot_overrides_authenticated_all on public.wnmu_prog_sched_slot_overrides;
create policy wnmu_prog_sched_slot_overrides_authenticated_all
on public.wnmu_prog_sched_slot_overrides
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

comment on table public.wnmu_prog_sched_slot_templates is 'WNMU Programming Library Schedule Planner test templates. Login-only; project-scoped; does not alter Library program records.';
comment on table public.wnmu_prog_sched_slot_overrides is 'WNMU Programming Library Schedule Planner test one-time/date-range overrides. Login-only; project-scoped; does not alter Library program records.';
