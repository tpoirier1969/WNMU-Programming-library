-- WNMU Programming Library Schedule Planner migration v1.5.86
-- Run after v1.5.61 base planner SQL and prior planner migrations as needed.
-- Migration only. Does not reset tables and does not touch Library program records,
-- aired-history fields, holiday records, pledge tables, monthly schedule tables, or ProTrack.

-- Cumulative template-side candidate filter/sort fields used by v1.5.84-v1.5.86.
-- These belong on templates/rules, not date-specific overrides.
alter table public.wnmu_prog_sched_slot_templates
  add column if not exists use_filter_mode text not null default 'off',
  add column if not exists use_filter_text text not null default '',
  add column if not exists rights_begin_after date,
  add column if not exists aired_filter_mode text not null default 'off',
  add column if not exists candidate_sort_by text not null default 'score',
  add column if not exists candidate_sort_direction text not null default 'desc',
  add column if not exists priority_pool_match integer not null default 5,
  add column if not exists priority_rights_urgency integer not null default 4,
  add column if not exists priority_rating integer not null default 3,
  add column if not exists priority_length_fit integer not null default 2,
  add column if not exists priority_repeat_gap integer not null default 4,
  add column if not exists priority_event_match integer not null default 4;

-- Allow repeat-gap values up to three years. Older migrations capped these at 365.
alter table public.wnmu_prog_sched_slot_templates
  drop constraint if exists wnmu_prog_sched_slot_templates_repeat_gap_chk;
alter table public.wnmu_prog_sched_slot_templates
  add constraint wnmu_prog_sched_slot_templates_repeat_gap_chk
  check (repeat_gap_days between 0 and 1095);

alter table public.wnmu_prog_sched_slot_overrides
  drop constraint if exists wnmu_prog_sched_slot_overrides_repeat_gap_chk;
alter table public.wnmu_prog_sched_slot_overrides
  add constraint wnmu_prog_sched_slot_overrides_repeat_gap_chk
  check (repeat_gap_days between 0 and 1095);

alter table public.wnmu_prog_sched_program_pools
  drop constraint if exists wnmu_prog_sched_program_pools_repeat_gap_days_check;
alter table public.wnmu_prog_sched_program_pools
  add constraint wnmu_prog_sched_program_pools_repeat_gap_days_check
  check (repeat_gap_days between 0 and 1095);

-- Constraints for new template-only filter/sort fields. Guarded for repeatable safe runs.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'wnmu_prog_sched_slot_templates_use_filter_mode_chk') then
    alter table public.wnmu_prog_sched_slot_templates
      add constraint wnmu_prog_sched_slot_templates_use_filter_mode_chk
      check (use_filter_mode in ('off', 'require_contains', 'exclude_contains'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'wnmu_prog_sched_slot_templates_aired_filter_mode_chk') then
    alter table public.wnmu_prog_sched_slot_templates
      add constraint wnmu_prog_sched_slot_templates_aired_filter_mode_chk
      check (aired_filter_mode in ('off', 'aired_before', 'not_aired_before'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'wnmu_prog_sched_slot_templates_candidate_sort_by_chk') then
    alter table public.wnmu_prog_sched_slot_templates
      add constraint wnmu_prog_sched_slot_templates_candidate_sort_by_chk
      check (candidate_sort_by in ('score', 'title', 'nola', 'topic', 'type', 'rating', 'length', 'use', 'rights_begin', 'rights_end', 'last_aired', 'times_aired'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'wnmu_prog_sched_slot_templates_candidate_sort_direction_chk') then
    alter table public.wnmu_prog_sched_slot_templates
      add constraint wnmu_prog_sched_slot_templates_candidate_sort_direction_chk
      check (candidate_sort_direction in ('asc', 'desc'));
  end if;

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
end $$;

revoke all on table public.wnmu_prog_sched_slot_templates from anon;
revoke all on table public.wnmu_prog_sched_slot_overrides from anon;
revoke all on table public.wnmu_prog_sched_program_pools from anon;
revoke all on table public.wnmu_prog_sched_program_pool_items from anon;

grant select, insert, update, delete on table public.wnmu_prog_sched_slot_templates to authenticated;
grant select, insert, update, delete on table public.wnmu_prog_sched_slot_overrides to authenticated;
grant select, insert, update, delete on table public.wnmu_prog_sched_program_pools to authenticated;
grant select, insert, update, delete on table public.wnmu_prog_sched_program_pool_items to authenticated;

grant all privileges on table public.wnmu_prog_sched_slot_templates to service_role;
grant all privileges on table public.wnmu_prog_sched_slot_overrides to service_role;
grant all privileges on table public.wnmu_prog_sched_program_pools to service_role;
grant all privileges on table public.wnmu_prog_sched_program_pool_items to service_role;

comment on column public.wnmu_prog_sched_slot_templates.aired_filter_mode is 'Schedule Planner test hard filter for candidate titles aired before/not aired before on the selected channel before the selected date.';
comment on column public.wnmu_prog_sched_slot_templates.candidate_sort_by is 'Schedule Planner test candidate sort field.';
comment on column public.wnmu_prog_sched_slot_templates.candidate_sort_direction is 'Schedule Planner test candidate sort direction.';

notify pgrst, 'reload schema';
