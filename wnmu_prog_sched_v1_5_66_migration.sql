-- WNMU Programming Library Schedule Planner migration v1.5.66
-- Run after wnmu_prog_sched_v1_5_61.sql, v1.5.62 migration, and v1.5.63 migration.
-- Migration only: does not recreate planner tables and does not touch Library, aired-history,
-- holiday, pledge, monthly schedule, or ProTrack tables.
-- Adds selected-program reference fields for candidate-click planner overrides.

alter table public.wnmu_prog_sched_slot_overrides
  add column if not exists selected_program_record_id text;

alter table public.wnmu_prog_sched_slot_overrides
  add column if not exists selected_program_title text;

alter table public.wnmu_prog_sched_slot_overrides
  add column if not exists selected_program_nola text;

create index if not exists wnmu_prog_sched_slot_overrides_selected_program_idx
  on public.wnmu_prog_sched_slot_overrides (selected_program_record_id)
  where selected_program_record_id is not null;

create index if not exists wnmu_prog_sched_slot_overrides_selected_nola_idx
  on public.wnmu_prog_sched_slot_overrides (selected_program_nola)
  where selected_program_nola is not null;

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

comment on column public.wnmu_prog_sched_slot_overrides.selected_program_record_id is 'Optional Library program identifier selected from Schedule Planner candidate preview. Test-only; Library program row is not modified.';
comment on column public.wnmu_prog_sched_slot_overrides.selected_program_title is 'Optional display title selected from Schedule Planner candidate preview. Test-only planner override data.';
comment on column public.wnmu_prog_sched_slot_overrides.selected_program_nola is 'Optional NOLA/EIDR selected from Schedule Planner candidate preview. Test-only planner override data.';
