import { supabase } from './supabaseClient';

export async function fetchTransactions() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.log(error);
    return [];
  }

  return data || [];
}