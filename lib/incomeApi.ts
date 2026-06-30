import { supabase } from './supabaseClient';

const SUPABASE_PAGE_SIZE = 1000;

export const addIncomeEntry = async (data: any) => {
  console.log('INCOME ENTRY SAVE OPERATION', {
    operation: 'insert',
    table: 'income_entries',
    record_id: null,
    income_type: data?.income_type,
  });
  const { data: result, error } = await supabase
    .from('income_entries')
    .insert([data])
    .select()
    .single();

  if (error) {
    console.error('Income entry insert error:', error);
    return null;
  }

  console.log('INCOME ENTRY SAVE RESULT', result);
  console.log('INCOME ENTRY SAVE AFFECTED ROWS', result ? 1 : 0);
  return result;
};

export const updateIncomeTransactionLink = async (
  incomeEntryId: number,
  transactionId: number
) => {
  console.log('INCOME ENTRY LINK OPERATION', {
    operation: 'update',
    table: 'income_entries',
    record_id: incomeEntryId,
    transaction_id: transactionId,
  });
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
  const rows: any[] = [];
  let expectedCount: number | null = null;
  let from = 0;

  while (true) {
    const to = from + SUPABASE_PAGE_SIZE - 1;
    const { data, error, count } = await supabase
      .from('income_entries')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Fetch income entries error:', error);
      return null;
    }

    if (expectedCount === null) {
      expectedCount = count ?? null;
      console.log('INCOME ENTRIES SUPABASE COUNT', expectedCount);
    }

    const pageRows = data || [];
    rows.push(...pageRows);
    console.log('INCOME ENTRIES FETCH PAGE', {
      from,
      to,
      fetchedRows: pageRows.length,
      totalFetchedRows: rows.length,
      supabaseCount: expectedCount,
    });

    if (pageRows.length < SUPABASE_PAGE_SIZE) break;
    if (expectedCount !== null && rows.length >= expectedCount) break;
    from += SUPABASE_PAGE_SIZE;
  }

  console.log('INCOME ENTRIES FETCH SUMMARY', {
    fetchedRows: rows.length,
    supabaseCount: expectedCount,
    complete: expectedCount === null ? true : rows.length >= expectedCount,
  });

  return rows;
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
  console.log('INCOME ENTRY SAVE OPERATION', {
    operation: 'update',
    table: 'income_entries',
    record_id: id,
    update_keys: Object.keys(updates),
  });
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

  console.log('INCOME ENTRY SAVE RESULT', data);
  console.log('INCOME ENTRY SAVE AFFECTED ROWS', data ? 1 : 0);
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
