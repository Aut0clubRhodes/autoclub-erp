import { supabase } from './supabaseClient';

export async function fetchCars() {
  const { data, error } = await supabase
    .from('cars')
    .select('*');

  if (error) {
    console.log(error);
    return [];
  }

  return data || [];
}