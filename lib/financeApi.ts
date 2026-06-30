import { supabase } from './supabaseClient';

const SUPABASE_PAGE_SIZE = 1000;
const TRANSACTION_COLUMNS =
  'id, date, amount, payment_method, type, source, car_id, agency_id, representative_id, supplier, supplier_id, category, notes, contract_number, income_entry_id, booking_id, service_id';

export async function fetchTransactions() {
  const rows: any[] = [];
  let expectedCount: number | null = null;
  let from = 0;

  while (true) {
    const to = from + SUPABASE_PAGE_SIZE - 1;
    const { data, error, count } = await supabase
      .from('transactions')
      .select(TRANSACTION_COLUMNS, { count: 'exact' })
      .order('date', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('FETCH TRANSACTIONS ERROR RAW:', JSON.stringify(error, null, 2));
      console.error('FETCH TRANSACTIONS ERROR OBJECT:', error);
      return null;
    }

    if (expectedCount === null) {
      expectedCount = count ?? null;
      console.log('TRANSACTIONS SUPABASE COUNT', expectedCount);
    }

    const pageRows = data || [];
    rows.push(...pageRows);
    console.log('TRANSACTIONS FETCH PAGE', {
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

  console.log('TRANSACTIONS FETCH SUMMARY', {
    fetchedRows: rows.length,
    supabaseCount: expectedCount,
    incomeRows: rows.filter((transaction: any) => transaction.type === 'income').length,
    expenseRows: rows.filter(
      (transaction: any) => transaction.type === 'expense' || transaction.type === 'supplier_payment'
    ).length,
    complete: expectedCount === null ? true : rows.length >= expectedCount,
  });

  const legacyCreditInventoryPurchases = rows.filter(
    (transaction: any) =>
      transaction.source === 'service_inventory_purchase' &&
      String(transaction.payment_method || '').toLowerCase() === 'credit'
  );

  if (legacyCreditInventoryPurchases.length > 0) {
    console.warn('Removing legacy credit inventory expense transactions. Credit inventory purchases are supplier debts, not expenses.', {
      ids: legacyCreditInventoryPurchases.map((transaction: any) => transaction.id),
    });
    await Promise.all(
      legacyCreditInventoryPurchases.map((transaction: any) =>
        supabase.from('transactions').delete().eq('id', transaction.id)
      )
    );
  }

  return rows.filter(
    (transaction: any) =>
      !(
        transaction.source === 'service_inventory_purchase' &&
        String(transaction.payment_method || '').toLowerCase() === 'credit'
      )
  );
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
  service_id?: number | null;
  agency_id?: number | null;
  representative_id?: number | null;
  supplier?: string | null;
  supplier_id?: number | null;
  contract_number?: string | null;
  notes?: string | null;
  income_entry_id?: number | null;
}) {
  console.log('TRANSACTION SAVE OPERATION', {
    operation: 'insert',
    table: 'transactions',
    record_id: null,
    type: transaction.type,
    income_entry_id: transaction.income_entry_id ?? null,
  });
  console.log('INSERT PAYLOAD:', transaction);

  const { data, error, status, statusText } = await supabase
    .from('transactions')
    .insert([transaction])
    .select()
    .single();

  console.log('INSERT DATA:', data);
  console.log('TRANSACTION SAVE AFFECTED ROWS', data ? 1 : 0);
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
    service_id?: number | null;
  }
) {
  console.log('TRANSACTION SAVE OPERATION', {
    operation: 'update',
    table: 'transactions',
    record_id: id,
    update_keys: Object.keys(updates),
  });
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

  console.log('TRANSACTION SAVE AFFECTED ROWS', data ? 1 : 0);
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
  const { data: transaction, error: fetchError } = await supabase
    .from('transactions')
    .select('id, income_entry_id, type')
    .eq('id', transactionId)
    .eq('type', 'income')
    .single();

  if (fetchError) {
    console.error('Income delete fetch error:', fetchError);
    return { data: null, error: fetchError };
  }

  const { data: deletedTransactions, error: transactionDeleteError } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId)
    .eq('type', 'income')
    .select('id');

  if (transactionDeleteError) {
    console.error('Income transaction delete error:', transactionDeleteError);
    return { data: null, error: transactionDeleteError };
  }

  let deletedIncomeEntries = null;
  if (transaction?.income_entry_id) {
    const { data: incomeEntryData, error: incomeEntryDeleteError } = await supabase
      .from('income_entries')
      .delete()
      .eq('id', transaction.income_entry_id)
      .select('id');

    if (incomeEntryDeleteError) {
      console.error('Linked income entry delete error:', incomeEntryDeleteError);
      return { data: null, error: incomeEntryDeleteError };
    }

    deletedIncomeEntries = incomeEntryData;
  }

  return {
    data: {
      deletedTransactions,
      deletedIncomeEntries,
      affectedRows: (deletedTransactions?.length || 0) + (deletedIncomeEntries?.length || 0),
    },
    error: null,
  };
}
