-- WNMU Programming Library Schedule Planner migration v1.5.63
-- Run after wnmu_prog_sched_v1_5_61.sql and wnmu_prog_sched_v1_5_62_migration.sql.
-- Migration only: does not recreate planner tables and does not touch Library, aired-history,
-- holiday, pledge, monthly schedule, or ProTrack tables.
-- Adds NOLA-based required-rotation pool matching for scheduler test templates.

alter table public.wnmu_prog_sched_program_pools
  add column if not exists nola_match_text text;

alter table public.wnmu_prog_sched_program_pool_items
  add column if not exists nola_match_text text;

-- v1.5.62 allowed title_text/exact_record/mixed only. v1.5.63 adds nola_prefix.
alter table public.wnmu_prog_sched_program_pools
  drop constraint if exists wnmu_prog_sched_program_pools_pool_type_check;

alter table public.wnmu_prog_sched_program_pools
  drop constraint if exists wnmu_prog_sched_program_pools_match_mode_check;

alter table public.wnmu_prog_sched_program_pools
  drop constraint if exists wnmu_prog_sched_program_pools_pool_type_v1563_chk;

alter table public.wnmu_prog_sched_program_pools
  drop constraint if exists wnmu_prog_sched_program_pools_match_mode_v1563_chk;

alter table public.wnmu_prog_sched_program_pools
  add constraint wnmu_prog_sched_program_pools_pool_type_v1563_chk
  check (pool_type in ('title_text', 'nola_prefix', 'selected_records', 'mixed'));

alter table public.wnmu_prog_sched_program_pools
  add constraint wnmu_prog_sched_program_pools_match_mode_v1563_chk
  check (match_mode in ('title_text', 'nola_prefix', 'exact_record', 'mixed'));

create index if not exists wnmu_prog_sched_program_pools_nola_match_idx
  on public.wnmu_prog_sched_program_pools (nola_match_text)
  where nola_match_text is not null;

create index if not exists wnmu_prog_sched_program_pool_items_nola_match_idx
  on public.wnmu_prog_sched_program_pool_items (pool_id, active, nola_match_text)
  where nola_match_text is not null;

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

comment on column public.wnmu_prog_sched_program_pools.nola_match_text is 'Optional NOLA prefix/code used for required-rotation pool matching. v1.5.63 test-only.';
comment on column public.wnmu_prog_sched_program_pool_items.nola_match_text is 'Optional NOLA prefix/code for an allowed pool item. Matching is by NOLA prefix/contains first, then title fallback.';
comment on constraint wnmu_prog_sched_program_pools_pool_type_v1563_chk on public.wnmu_prog_sched_program_pools is 'Allows NOLA-prefix program pools for required-rotation slots.';
comment on constraint wnmu_prog_sched_program_pools_match_mode_v1563_chk on public.wnmu_prog_sched_program_pools is 'Allows NOLA-prefix matching for required-rotation slots.';
