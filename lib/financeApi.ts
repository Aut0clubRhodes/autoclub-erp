import { supabase } from './supabaseClient';

export async function fetchTransactions() {
  const { data, error } = await supabase
    .from('transactions')
    .select(
      'id, date, amount, payment_method, type, source, car_id, agency_id, representative_id, supplier, supplier_id, category, notes, contract_number, income_entry_id, booking_id'
    )
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
    .select()
    .single();

  console.log('INSERT DATA:', data);
  console.log('INSERT STATUS:', status, statusText);
  console.log('INSERT ERROR RAW:', JSON.stringify(error, null, 2));
  console.log('INSERT ERROR OBJECT:', error);

  if (error) {
    console.error('Add transaction error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return null;
  }

  return data;
}

export async function getTransactionById(id: number) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Transaction fetch error:', error);
    return null;
  }

  return data;
}

export async function updateTransaction(
  id: number,
  updates: {
    type?: string;
    source?: string;
    amount?: number;
    date?: string;
    payment_method?: string;
    car_id?: number | null;
    agency_id?: number | null;
    representative_id?: number | null;
    supplier?: string | null;
    supplier_id?: number | null;
    category?: string | null;
    contract_number?: string | null;
    notes?: string | null;
  }
) {
  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Transaction update error:', error);
    return null;
  }

  return data;
}

export async function deleteTransaction(id: number) {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Transaction delete error:', error);
    return false;
  }

  return true;
}

export async function deleteIncomeFull(transactionId: number) {
  const { data, error } = await supabase.rpc('delete_income_full', {
    p_transaction_id: transactionId,
  });

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}
