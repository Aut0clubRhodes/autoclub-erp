import { supabase } from './supabaseClient';

export async function fetchTransactions() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('FETCH TRANSACTIONS ERROR RAW:', JSON.stringify(error, null, 2));
    console.error('FETCH TRANSACTIONS ERROR OBJECT:', error);
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
  contract_number?: string | null;
  notes?: string | null;
  income_entry_id?: number | null;
}) {
  console.log('INSERT PAYLOAD:', transaction);

  const { data, error, status, statusText } = await supabase
    .from('transactions')
    .insert([transaction])
    .select();

  console.log('INSERT DATA:', data);
  console.log('INSERT STATUS:', status, statusText);
  console.log('INSERT ERROR RAW:', JSON.stringify(error, null, 2));
  console.log('INSERT ERROR OBJECT:', error);

  if (error) {
    return null;
  }

  if (data && data.length > 0) {
    return data[0];
  }

  return true;
}
