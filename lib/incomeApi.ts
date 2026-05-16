import { supabase } from './supabaseClient';

export const addIncomeEntry = async (data: any) => {
  const { data: result, error } = await supabase
    .from('income_entries')
    .insert([data])
    .select()
    .single();

  if (error) {
    console.error('Income entry insert error:', error);
    return null;
  }

  return result;
};

export const updateIncomeTransactionLink = async (
  incomeEntryId: number,
  transactionId: number
) => {
  const { error } = await supabase
    .from('income_entries')
    .update({
      transaction_id: transactionId,
    })
    .eq('id', incomeEntryId);

  if (error) {
    console.error('Income entry update error:', error);
    return false;
  }

  return true;
};

export const fetchIncomeEntries = async () => {
  const { data, error } = await supabase
    .from('income_entries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch income entries error:', error);
    return [];
  }

  return data;
};

export const updateIncomeEntry = async (
  id: number,
  updates: {
    amount?: number;
    payment_method?: string;
    car_id?: number | null;
    agency_id?: number | null;
    representative_id?: number | null;
    contract_number?: string | null;
    notes?: string | null;
  }
) => {
  const { data, error } = await supabase
    .from('income_entries')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Income entry update error:', error);
    return null;
  }

  return data;
};

export const deleteIncomeEntryById = async (id: number) => {
  const { data, error } = await supabase
    .from('income_entries')
    .delete()
    .eq('id', id)
    .select();

  return { data, error };
};

export const deleteIncomeEntryByTransactionId = async (transactionId: number) => {
  const { data, error } = await supabase
    .from('income_entries')
    .delete()
    .eq('transaction_id', transactionId)
    .select();

  return { data, error };
};

export const verifyIncomeEntryById = async (id: number) => {
  const { data, error } = await supabase
    .from('income_entries')
    .select('*')
    .eq('id', id);

  return { data: data || [], error };
};

export const verifyIncomeEntriesByTransactionId = async (transactionId: number) => {
  const { data, error } = await supabase
    .from('income_entries')
    .select('*')
    .eq('transaction_id', transactionId);

  return { data: data || [], error };
};
