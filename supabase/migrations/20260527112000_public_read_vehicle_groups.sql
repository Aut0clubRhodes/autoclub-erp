alter table public.vehicle_groups enable row level security;

drop policy if exists "Allow public read vehicle groups" on public.vehicle_groups;
create policy "Allow public read vehicle groups"
on public.vehicle_groups
for select
to anon, authenticated
using (true);

drop policy if exists "Allow authenticated manage vehicle groups" on public.vehicle_groups;
create policy "Allow authenticated manage vehicle groups"
on public.vehicle_groups
for all
to authenticated
using (true)
with check (true);
