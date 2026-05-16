import { supabase } from './supabaseClient';

export type BookingRecord = {
  id: number;
  car_id?: number | null;
  amount?: number | null;
  payment_method?: string | null;
  agency_id?: number | null;
  representative_id?: number | null;
  contract_number?: string | null;
  income_type?: string | null;
  transaction_id?: number | null;
  created_at?: string | null;
};

export const fetchBookings = async (): Promise<BookingRecord[]> => {
  const { data, error } = await supabase.from('bookings').select('*').order('id', { ascending: false });

  if (error) {
    console.error('Fetch bookings error:', error);
    return [];
  }

  return data || [];
};

export const addBooking = async (bookingData: any) => {
  const { data, error } = await supabase
    .from('bookings')
    .insert([bookingData])
    .select()
    .single();

  if (error) {
    console.error('Booking insert error:', error);
    return null;
  }

  return data;
};

export const deleteBooking = async (id: number) => {
  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id);

  if (error) {
    console.warn('Booking delete error:', error);
    return false;
  }

  return true;
};

export const updateBookingTransactionLink = async (
  bookingId: number,
  transactionId: number
) => {
  const { error } = await supabase
    .from('bookings')
    .update({
      transaction_id: transactionId,
    })
    .eq('id', bookingId);

  if (error) {
    console.error('Booking update error:', error);
    return false;
  }

  return true;
};
