create or replace function public.check_vehicle_group_availability(
  p_pickup_date date,
  p_return_date date
)
returns table (
  vehicle_group text,
  allowed_stock integer,
  booked_count integer,
  available integer,
  sort_order integer
)
language sql
stable
as $$
  with active_stock as (
    select
      stock.vehicle_group,
      stock.allowed_stock,
      groups.sort_order
    from public.reservation_group_stock as stock
    inner join public.vehicle_groups as groups
      on groups.code = stock.vehicle_group
    where stock.active = true
      and groups.active = true
      and stock.allowed_stock > 0
  ),
  accepted_bookings as (
    select
      requests.vehicle_group,
      count(*)::integer as booked_count
    from public.reservation_requests as requests
    where requests.status = 'ACCEPTED'
      and requests.vehicle_group is not null
      and requests.pickup_date <= p_return_date
      and requests.return_date >= p_pickup_date
    group by requests.vehicle_group
  )
  select
    active_stock.vehicle_group,
    active_stock.allowed_stock,
    coalesce(accepted_bookings.booked_count, 0)::integer as booked_count,
    (active_stock.allowed_stock - coalesce(accepted_bookings.booked_count, 0))::integer as available,
    active_stock.sort_order
  from active_stock
  left join accepted_bookings
    on accepted_bookings.vehicle_group = active_stock.vehicle_group
  where (active_stock.allowed_stock - coalesce(accepted_bookings.booked_count, 0)) > 0
  order by active_stock.sort_order asc, active_stock.vehicle_group asc;
$$;

grant execute on function public.check_vehicle_group_availability(date, date) to anon;
grant execute on function public.check_vehicle_group_availability(date, date) to authenticated;
