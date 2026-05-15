begin;

-- Clear any legacy orphaned ids before enforcing the new relationships.
update public.bookings as bookings
set agency_id = null
where agency_id is not null
  and not exists (
    select 1
    from public.agencies as agencies
    where agencies.id = bookings.agency_id
  );

update public.bookings as bookings
set representative_id = null
where representative_id is not null
  and not exists (
    select 1
    from public.representatives as representatives
    where representatives.id = bookings.representative_id
  );

update public.income_entries as income_entries
set agency_id = null
where agency_id is not null
  and not exists (
    select 1
    from public.agencies as agencies
    where agencies.id = income_entries.agency_id
  );

update public.income_entries as income_entries
set representative_id = null
where representative_id is not null
  and not exists (
    select 1
    from public.representatives as representatives
    where representatives.id = income_entries.representative_id
  );

update public.transactions as transactions
set agency_id = null
where agency_id is not null
  and not exists (
    select 1
    from public.agencies as agencies
    where agencies.id = transactions.agency_id
  );

update public.transactions as transactions
set representative_id = null
where representative_id is not null
  and not exists (
    select 1
    from public.representatives as representatives
    where representatives.id = transactions.representative_id
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_agency_id_fkey'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_agency_id_fkey
      foreign key (agency_id)
      references public.agencies (id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_representative_id_fkey'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_representative_id_fkey
      foreign key (representative_id)
      references public.representatives (id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'income_entries_agency_id_fkey'
      and conrelid = 'public.income_entries'::regclass
  ) then
    alter table public.income_entries
      add constraint income_entries_agency_id_fkey
      foreign key (agency_id)
      references public.agencies (id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'income_entries_representative_id_fkey'
      and conrelid = 'public.income_entries'::regclass
  ) then
    alter table public.income_entries
      add constraint income_entries_representative_id_fkey
      foreign key (representative_id)
      references public.representatives (id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'transactions_agency_id_fkey'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_agency_id_fkey
      foreign key (agency_id)
      references public.agencies (id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'transactions_representative_id_fkey'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_representative_id_fkey
      foreign key (representative_id)
      references public.representatives (id)
      on delete set null;
  end if;
end
$$;

commit;
