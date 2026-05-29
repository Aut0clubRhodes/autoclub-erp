alter table public.reservation_requests
add column if not exists return_confirmed boolean not null default false,
add column if not exists return_confirmed_at timestamptz;

create index if not exists reservation_requests_return_confirmed_idx
on public.reservation_requests (return_confirmed);

create index if not exists reservation_requests_return_confirmed_at_idx
on public.reservation_requests (return_confirmed_at);
