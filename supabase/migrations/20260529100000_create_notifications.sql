create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid references public.reservation_requests(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_created_at_idx
on public.notifications (created_at desc);

create index if not exists notifications_is_read_idx
on public.notifications (is_read);

create index if not exists notifications_reservation_id_idx
on public.notifications (reservation_id);

alter table public.notifications enable row level security;

drop policy if exists "Allow full access to notifications" on public.notifications;
create policy "Allow full access to notifications"
on public.notifications
for all
using (true)
with check (true);

create or replace function public.create_reservation_notification(
  p_reservation_id uuid,
  p_type text,
  p_title text,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (reservation_id, type, title, message)
  values (p_reservation_id, p_type, p_title, p_message);
end;
$$;

create or replace function public.handle_reservation_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row jsonb := case when tg_op = 'UPDATE' then coalesce(to_jsonb(old), '{}'::jsonb) else '{}'::jsonb end;
  new_row jsonb := to_jsonb(new);
  reservation_label text := coalesce(
    nullif(new_row ->> 'customer_name', ''),
    nullif(new_row ->> 'phone', ''),
    'Reservation'
  );
  front_uploaded boolean := coalesce(nullif(new_row ->> 'licence_front_url', ''), '') <> ''
    and coalesce(nullif(old_row ->> 'licence_front_url', ''), '') = '';
  back_uploaded boolean := coalesce(nullif(new_row ->> 'licence_back_url', ''), '') <> ''
    and coalesce(nullif(old_row ->> 'licence_back_url', ''), '') = '';
  return_confirmed boolean := coalesce(new_row ->> 'return_confirmed', 'false') = 'true'
    and coalesce(old_row ->> 'return_confirmed', 'false') <> 'true';
  review_submitted boolean := (
      coalesce(new_row ->> 'review_submitted', 'false') = 'true'
      and coalesce(old_row ->> 'review_submitted', 'false') <> 'true'
    )
    or (
      coalesce(nullif(new_row ->> 'review_submitted_at', ''), '') <> ''
      and coalesce(nullif(old_row ->> 'review_submitted_at', ''), '') = ''
    );
begin
  if tg_op = 'UPDATE' then
    if front_uploaded or back_uploaded then
      perform public.create_reservation_notification(
        new.id,
        'LICENCE_UPLOADED',
        'Licence uploaded',
        reservation_label || ' uploaded licence document.'
      );
    end if;

    if return_confirmed then
      perform public.create_reservation_notification(
        new.id,
        'RETURN_CONFIRMED',
        'Return confirmed',
        reservation_label || ' confirmed the return.'
      );
    end if;

    if review_submitted then
      perform public.create_reservation_notification(
        new.id,
        'REVIEW_SUBMITTED',
        'Review submitted',
        reservation_label || ' submitted a review.'
      );
    end if;

    if coalesce(new.return_reminder_sent, false) = true
      and coalesce(old.return_reminder_sent, false) = false then
      perform public.create_reservation_notification(
        new.id,
        'REMINDER_SENT',
        'Reminder sent',
        'Return reminder sent to ' || reservation_label || '.'
      );
    end if;

    if new.status = 'ACCEPTED'
      and coalesce(old.status, '') <> 'ACCEPTED' then
      perform public.create_reservation_notification(
        new.id,
        'BOOKING_ACCEPTED',
        'Booking accepted',
        reservation_label || ' booking was accepted.'
      );
    end if;
  elsif tg_op = 'INSERT' then
    if new.status = 'ACCEPTED' then
      perform public.create_reservation_notification(
        new.id,
        'BOOKING_ACCEPTED',
        'Booking accepted',
        reservation_label || ' booking was accepted.'
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists reservation_notifications_trigger on public.reservation_requests;
create trigger reservation_notifications_trigger
after insert or update on public.reservation_requests
for each row
execute function public.handle_reservation_notifications();
