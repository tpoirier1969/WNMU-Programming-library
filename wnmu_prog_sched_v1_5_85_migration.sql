-- WNMU Programming Library Schedule Planner migration v1.5.85
-- Run after prior planner migrations, including v1.5.84 if using candidate priority fields.
-- Migration only: does not recreate planner tables and does not touch Library, aired-history,
-- holiday, pledge, monthly schedule, or ProTrack tables.
-- Adds hard candidate filters for Library Use? field text and rights begin/start date.

alter table public.wnmu_prog_sched_slot_templates
  add column if not exists use_filter_mode text not null default 'off',
  add column if not exists use_filter_text text not null default '',
  add column if not exists rights_begin_after date;

alter table public.wnmu_prog_sched_slot_overrides
  add column if not exists use_filter_mode text not null default 'off',
  add column if not exists use_filter_text text not null default '',
  add column if not exists rights_begin_after date;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'wnmu_prog_sched_slot_templates_use_filter_mode_chk') then
    alter table public.wnmu_prog_sched_slot_templates
      add constraint wnmu_prog_sched_slot_templates_use_filter_mode_chk
      check (use_filter_mode in ('off', 'require_contains', 'exclude_contains'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'wnmu_prog_sched_slot_overrides_use_filter_mode_chk') then
    alter table public.wnmu_prog_sched_slot_overrides
      add constraint wnmu_prog_sched_slot_overrides_use_filter_mode_chk
      check (use_filter_mode in ('off', 'require_contains', 'exclude_contains'));
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

comment on column public.wnmu_prog_sched_slot_templates.use_filter_mode is 'Schedule Planner test hard filter for Library Use? field text: off, require_contains, or exclude_contains.';
comment on column public.wnmu_prog_sched_slot_templates.use_filter_text is 'Schedule Planner test text terms for Use? filtering, such as Y or 13.3.';
comment on column public.wnmu_prog_sched_slot_templates.rights_begin_after is 'Schedule Planner test hard filter requiring candidate rights begin/start date on or after this date.';

notify pgrst, 'reload schema';
