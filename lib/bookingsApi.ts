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