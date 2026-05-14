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