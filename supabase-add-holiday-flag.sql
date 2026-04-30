alter table if exists public.programs
add column if not exists is_holiday_program boolean not null default false;

comment on column public.programs.is_holiday_program is
'Default-hide holiday programs from the main list unless the user chooses to include them.';
