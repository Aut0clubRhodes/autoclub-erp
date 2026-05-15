import { supabase } from './supabaseClient';

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
