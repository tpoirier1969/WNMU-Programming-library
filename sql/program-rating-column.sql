-- WNMU Program Library rating support
-- Safe to run more than once.

alter table public.programs
  add column if not exists rating smallint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'programs_rating_check'
      and conrelid = 'public.programs'::regclass
  ) then
    alter table public.programs
      add constraint programs_rating_check
      check (rating is null or rating between 1 and 5);
  end if;
end
$$;

create index if not exists programs_rating_idx on public.programs (rating);

comment on column public.programs.rating is
  'Program review rating from 1 to 5 stars.';

-- Note:
-- This build reads ratings directly from public.programs, so updating
-- programs_enriched is optional unless you want the view itself to expose rating.
