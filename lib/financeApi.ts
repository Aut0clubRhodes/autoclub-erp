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
export async function addTransaction(transaction: {
  type: string;
  source: string;
  amount: number;
  date: string;
  payment_method: string;
  category?: string;
  car_id?: number | null;
  booking_id?: number | null;
  agency_id?: number | null;
  representative_id?: number | null;
  supplier?: string | null;
  supplier_id?: number | null;
  notes?: string | null;
}) {
  const { data, error } = await supabase
    .from('transactions')
    .insert([transaction])
    .select()
    .single();

  if (error) {
    console.log(error);
    return null;
  }

  return data;
}