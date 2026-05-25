create table if not exists public.reservation_events (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservation_requests(id) on delete cascade,
  event_type text not null,
  event_message text not null,
  created_at timestamptz not null default now()
);

alter table public.reservation_events enable row level security;

drop policy if exists "Allow full access to reservation events" on public.reservation_events;

create policy "Allow full access to reservation events"
on public.reservation_events
for all
using (true)
with check (true);
