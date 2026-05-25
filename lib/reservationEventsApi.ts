import { supabase } from './supabaseClient';

export type ReservationEventRecord = {
  id: string;
  reservation_id: string;
  event_type: string;
  event_message: string;
  created_at?: string;
};

export type ReservationEventPayload = {
  reservation_id: string;
  event_type: string;
  event_message: string;
};

type ReservationEventError = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

const normalizeReservationEventError = (error: unknown) => {
  const supabaseError = error as ReservationEventError | null;

  return {
    message: supabaseError?.message || 'Unknown reservation_events error',
    details: supabaseError?.details || '',
    hint: supabaseError?.hint || '',
    code: supabaseError?.code || '',
    raw: error,
  };
};

const logReservationEventWarning = (label: string, error: unknown) => {
  console.warn(label, normalizeReservationEventError(error));
};

export async function fetchReservationEvents(reservationId: string): Promise<ReservationEventRecord[]> {
  const { data, error } = await supabase
    .from('reservation_events')
    .select('*')
    .eq('reservation_id', reservationId)
    .order('created_at', { ascending: false });

  if (error) {
    logReservationEventWarning('Fetch reservation_events warning:', error);
    return [];
  }

  return (data || []) as ReservationEventRecord[];
}

export async function createReservationEvent(payload: ReservationEventPayload) {
  const { data, error } = await supabase
    .from('reservation_events')
    .insert(payload)
    .select()
    .single();

  if (error) {
    logReservationEventWarning('Create reservation_events warning:', error);
    return null;
  }

  return data as ReservationEventRecord;
}

export async function deleteReservationEventsForReservation(reservationId: string) {
  const { error } = await supabase.from('reservation_events').delete().eq('reservation_id', reservationId);

  if (error) {
    logReservationEventWarning('Delete reservation_events warning:', error);
    return false;
  }

  return true;
}
