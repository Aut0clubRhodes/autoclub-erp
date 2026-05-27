alter table public.agencies enable row level security;
alter table public.representatives enable row level security;

drop policy if exists "Allow public read agencies" on public.agencies;
create policy "Allow public read agencies"
on public.agencies
for select
to anon, authenticated
using (true);

drop policy if exists "Allow authenticated manage agencies" on public.agencies;
create policy "Allow authenticated manage agencies"
on public.agencies
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Allow public read representatives" on public.representatives;
create policy "Allow public read representatives"
on public.representatives
for select
to anon, authenticated
using (true);

drop policy if exists "Allow authenticated manage representatives" on public.representatives;
create policy "Allow authenticated manage representatives"
on public.representatives
for all
to authenticated
using (true)
with check (true);
