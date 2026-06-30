import { supabase } from './supabaseClient';

const SUPABASE_PAGE_SIZE = 1000;

export type SupplierLedgerRow = {
  supplier_id: number;
  supplier_name: string;
  total_credit_charges: number;
  total_payments: number;
  outstanding_balance: number;
};

async function fetchAllRows(table: string, columns: string, orderColumn?: string) {
  const rows: any[] = [];
  let expectedCount: number | null = null;
  let from = 0;

  while (true) {
    const to = from + SUPABASE_PAGE_SIZE - 1;
    let query = supabase.from(table).select(columns, { count: 'exact' }).range(from, to);

    if (orderColumn) {
      query = query.order(orderColumn, { ascending: true });
    }

    const { data, error, count } = await query;

    if (error) {
      return { rows: [], error, count: expectedCount };
    }

    if (expectedCount === null) {
      expectedCount = count ?? null;
      console.log('SUPPLIER LEDGER SOURCE COUNT', { table, count: expectedCount });
    }

    const pageRows = data || [];
    rows.push(...pageRows);
    console.log('SUPPLIER LEDGER SOURCE PAGE', {
      table,
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

  console.log('SUPPLIER LEDGER SOURCE SUMMARY', {
    table,
    fetchedRows: rows.length,
    supabaseCount: expectedCount,
    complete: expectedCount === null ? true : rows.length >= expectedCount,
  });

  return { rows, error: null, count: expectedCount };
}

export const fetchSupplierLedger = async (): Promise<SupplierLedgerRow[]> => {
  const [suppliersResult, transactionsResult, debtsResult] = await Promise.all([
    fetchAllRows('suppliers', 'id, name', 'name'),
    fetchAllRows('transactions', 'id, type, amount, payment_method, supplier_id', 'id'),
    fetchAllRows('debts', 'id, supplier_id, original_amount, remaining_amount', 'id'),
  ]);

  if (suppliersResult.error) {
    console.error('Fetch supplier ledger suppliers error:', {
      message: suppliersResult.error.message,
      details: suppliersResult.error.details,
      hint: suppliersResult.error.hint,
      code: suppliersResult.error.code,
    });
    return [];
  }

  if (transactionsResult.error) {
    console.error('Fetch supplier ledger transactions error:', {
      message: transactionsResult.error.message,
      details: transactionsResult.error.details,
      hint: transactionsResult.error.hint,
      code: transactionsResult.error.code,
    });
    return [];
  }

  if (debtsResult.error) {
    console.error('Fetch supplier ledger debts error:', {
      message: debtsResult.error.message,
      details: debtsResult.error.details,
      hint: debtsResult.error.hint,
      code: debtsResult.error.code,
    });
  }

  const suppliers = suppliersResult.rows;
  const transactions = transactionsResult.rows;
  const debts = debtsResult.rows;

  console.log('SUPPLIER LEDGER EXPENSE SOURCE SUMMARY', {
    transactionRows: transactions.length,
    expenseRows: transactions.filter(
      (transaction) => transaction.type === 'expense' || transaction.type === 'supplier_payment'
    ).length,
  });

  return suppliers
    .map((supplier) => {
      const supplierTransactions = (transactions || []).filter(
        (transaction) => Number(transaction.supplier_id) === Number(supplier.id)
      );
      const supplierDebts = (debts || []).filter((debt) => Number(debt.supplier_id) === Number(supplier.id));

      const creditCharges = supplierTransactions
        .filter(
          (transaction) =>
            transaction.type === 'expense' &&
            transaction.payment_method === 'credit'
        )
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0) +
        supplierDebts.reduce((sum, debt) => sum + Number(debt.original_amount || 0), 0);

      const payments = supplierTransactions
        .filter(
          (transaction) =>
            (transaction.type === 'expense' && ['cash', 'card', 'bank'].includes(String(transaction.payment_method || ''))) ||
            transaction.type === 'supplier_payment'
        )
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

      const supplierPayments = supplierTransactions
        .filter((transaction) => transaction.type === 'supplier_payment')
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

      return {
        supplier_id: Number(supplier.id),
        supplier_name: String(supplier.name ?? ''),
        total_credit_charges: creditCharges,
        total_payments: payments,
        outstanding_balance:
          supplierTransactions
            .filter((transaction) => transaction.type === 'expense' && transaction.payment_method === 'credit')
            .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0) -
          supplierPayments +
          supplierDebts.reduce((sum, debt) => sum + Number(debt.remaining_amount || 0), 0),
      };
    })
    .sort((left, right) => left.supplier_name.localeCompare(right.supplier_name, 'el'));
};
