-- WNMU Programming Library Schedule Planner migration v1.5.84
-- Run after wnmu_prog_sched_v1_5_61.sql and prior planner migrations.
-- Migration only: does not recreate planner tables and does not touch Library, aired-history,
-- holiday, pledge, monthly schedule, or ProTrack tables.
-- Adds candidate scoring priority weights for scheduler test templates/overrides.

alter table public.wnmu_prog_sched_slot_templates
  add column if not exists priority_pool_match integer not null default 5,
  add column if not exists priority_rights_urgency integer not null default 4,
  add column if not exists priority_rating integer not null default 3,
  add column if not exists priority_length_fit integer not null default 2,
  add column if not exists priority_repeat_gap integer not null default 4,
  add column if not exists priority_event_match integer not null default 4;

alter table public.wnmu_prog_sched_slot_overrides
  add column if not exists priority_pool_match integer not null default 5,
  add column if not exists priority_rights_urgency integer not null default 4,
  add column if not exists priority_rating integer not null default 3,
  add column if not exists priority_length_fit integer not null default 2,
  add column if not exists priority_repeat_gap integer not null default 4,
  add column if not exists priority_event_match integer not null default 4;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'wnmu_prog_sched_slot_templates_priority_pool_match_chk') then
    alter table public.wnmu_prog_sched_slot_templates add constraint wnmu_prog_sched_slot_templates_priority_pool_match_chk check (priority_pool_match between 1 and 5);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'wnmu_prog_sched_slot_templates_priority_rights_chk') then
    alter table public.wnmu_prog_sched_slot_templates add constraint wnmu_prog_sched_slot_templates_priority_rights_chk check (priority_rights_urgency between 1 and 5);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'wnmu_prog_sched_slot_templates_priority_rating_chk') then
    alter table public.wnmu_prog_sched_slot_templates add constraint wnmu_prog_sched_slot_templates_priority_rating_chk check (priority_rating between 1 and 5);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'wnmu_prog_sched_slot_templates_priority_length_chk') then
    alter table public.wnmu_prog_sched_slot_templates add constraint wnmu_prog_sched_slot_templates_priority_length_chk check (priority_length_fit between 1 and 5);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'wnmu_prog_sched_slot_templates_priority_repeat_chk') then
    alter table public.wnmu_prog_sched_slot_templates add constraint wnmu_prog_sched_slot_templates_priority_repeat_chk check (priority_repeat_gap between 1 and 5);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'wnmu_prog_sched_slot_templates_priority_event_chk') then
    alter table public.wnmu_prog_sched_slot_templates add constraint wnmu_prog_sched_slot_templates_priority_event_chk check (priority_event_match between 1 and 5);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'wnmu_prog_sched_slot_overrides_priority_pool_match_chk') then
    alter table public.wnmu_prog_sched_slot_overrides add constraint wnmu_prog_sched_slot_overrides_priority_pool_match_chk check (priority_pool_match between 1 and 5);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'wnmu_prog_sched_slot_overrides_priority_rights_chk') then
    alter table public.wnmu_prog_sched_slot_overrides add constraint wnmu_prog_sched_slot_overrides_priority_rights_chk check (priority_rights_urgency between 1 and 5);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'wnmu_prog_sched_slot_overrides_priority_rating_chk') then
    alter table public.wnmu_prog_sched_slot_overrides add constraint wnmu_prog_sched_slot_overrides_priority_rating_chk check (priority_rating between 1 and 5);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'wnmu_prog_sched_slot_overrides_priority_length_chk') then
    alter table public.wnmu_prog_sched_slot_overrides add constraint wnmu_prog_sched_slot_overrides_priority_length_chk check (priority_length_fit between 1 and 5);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'wnmu_prog_sched_slot_overrides_priority_repeat_chk') then
    alter table public.wnmu_prog_sched_slot_overrides add constraint wnmu_prog_sched_slot_overrides_priority_repeat_chk check (priority_repeat_gap between 1 and 5);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'wnmu_prog_sched_slot_overrides_priority_event_chk') then
    alter table public.wnmu_prog_sched_slot_overrides add constraint wnmu_prog_sched_slot_overrides_priority_event_chk check (priority_event_match between 1 and 5);
  end if;
end $$;

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

comment on column public.wnmu_prog_sched_slot_templates.priority_pool_match is 'Schedule Planner test candidate score weight 1-5 for matching allowed pool/topic/NOLA.';
comment on column public.wnmu_prog_sched_slot_templates.priority_rights_urgency is 'Schedule Planner test candidate score weight 1-5 for rights urgency.';
comment on column public.wnmu_prog_sched_slot_templates.priority_rating is 'Schedule Planner test candidate score weight 1-5 for Library rating.';
comment on column public.wnmu_prog_sched_slot_templates.priority_length_fit is 'Schedule Planner test candidate score weight 1-5 for exact length fit.';
comment on column public.wnmu_prog_sched_slot_templates.priority_repeat_gap is 'Schedule Planner test candidate score weight 1-5 for repeat gap / recent airing.';
comment on column public.wnmu_prog_sched_slot_templates.priority_event_match is 'Schedule Planner test candidate score weight 1-5 for event/holiday relevance.';

notify pgrst, 'reload schema';
