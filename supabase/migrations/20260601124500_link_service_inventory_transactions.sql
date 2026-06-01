alter table public.service_inventory_movements
add column if not exists transaction_id bigint references public.transactions(id) on delete set null;

alter table public.transactions
add column if not exists service_id bigint references public.services(id) on delete set null;
