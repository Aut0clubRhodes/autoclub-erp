alter table public.service_inventory_items
drop constraint if exists service_inventory_items_type_check;

alter table public.service_inventory_items
add constraint service_inventory_items_type_check
check (type in ('oil', 'oil_filter', 'cabin_filter', 'air_filter', 'brakes', 'belts', 'tire', 'battery', 'other'));
