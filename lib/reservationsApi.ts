import { supabase } from './supabaseClient';

export type ReservationRequestRecord = {
  id: string | number;
  created_at?: string;
  phone?: string | null;
  email?: string | null;
  customer_name?: string | null;
  hotel_room?: string | null;
  vehicle_group?: string | null;
  agency?: string | null;
  representative?: string | null;
  pickup_date?: string | null;
  return_date?: string | null;
  pickup_time?: string | null;
  return_time?: string | null;
  price?: number | null;
  status?: string | null;
  language?: string | null;
  confirmation_sent?: boolean | null;
  send_return?: boolean | null;
  return_reminder_sent?: boolean | null;
  return_reminder_sent_at?: string | null;
  return_confirmed?: boolean | null;
  return_confirmed_at?: string | null;
  baby_seat_qty?: number | null;
  booster_qty?: number | null;
  infant_qty?: number | null;
  notes?: string | null;
  licence_front_url?: string | null;
  licence_back_url?: string | null;
};

export type ReservationRequestPayload = {
  phone: string;
  email?: string | null;
  customer_name: string;
  hotel_room?: string | null;
  vehicle_group?: string | null;
  agency?: string | null;
  representative?: string | null;
  pickup_date?: string | null;
  return_date?: string | null;
  pickup_time?: string | null;
  return_time?: string | null;
  price?: number | null;
  status?: string | null;
  language?: string | null;
  send_return?: boolean;
  return_reminder_sent?: boolean;
  return_reminder_sent_at?: string | null;
  return_confirmed?: boolean;
  return_confirmed_at?: string | null;
  baby_seat_qty?: number;
  booster_qty?: number;
  infant_qty?: number;
  notes?: string | null;
};

const logReservationError = (label: string, error: { message?: string; details?: string; hint?: string; code?: string }) => {
  console.error(label, {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  });
};

export async function fetchReservations(): Promise<ReservationRequestRecord[]> {
  const { data, error } = await supabase
    .from('reservation_requests')
    .select('*')
    .order('pickup_date', { ascending: false });

  if (error) {
    logReservationError('Fetch reservations error:', error);
    return [];
  }

  return (data || []) as ReservationRequestRecord[];
}

export async function createReservation(payload: ReservationRequestPayload) {
  const { data, error } = await supabase
    .from('reservation_requests')
    .insert(payload)
    .select()
    .single();

  if (error) {
    logReservationError('Create reservation error:', error);
    return null;
  }

  return data as ReservationRequestRecord;
}

export async function updateReservation(id: string | number, payload: Partial<ReservationRequestPayload>) {
  const { data, error } = await supabase
    .from('reservation_requests')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    logReservationError('Update reservation error:', error);
    return null;
  }

  return data as ReservationRequestRecord;
}

export async function deleteReservation(id: string | number) {
  const { error } = await supabase.from('reservation_requests').delete().eq('id', id);

  if (error) {
    logReservationError('Delete reservation error:', error);
    return false;
  }

  return true;
}
