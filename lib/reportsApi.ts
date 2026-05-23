import { supabase } from './supabaseClient';

export type SupplierLedgerRow = {
  supplier_id: number;
  supplier_name: string;
  total_credit_charges: number;
  total_payments: number;
  outstanding_balance: number;
};

export const fetchSupplierLedger = async (): Promise<SupplierLedgerRow[]> => {
  const [
    { data: suppliers, error: suppliersError },
    { data: transactions, error: transactionsError },
  ] = await Promise.all([
    supabase.from('suppliers').select('id, name'),
    supabase.from('transactions').select('id, type, amount, payment_method, supplier_id'),
  ]);

  if (suppliersError) {
    console.error('Fetch supplier ledger suppliers error:', {
      message: suppliersError.message,
      details: suppliersError.details,
      hint: suppliersError.hint,
      code: suppliersError.code,
    });
    return [];
  }

  if (transactionsError) {
    console.error('Fetch supplier ledger transactions error:', {
      message: transactionsError.message,
      details: transactionsError.details,
      hint: transactionsError.hint,
      code: transactionsError.code,
    });
    return [];
  }

  return (suppliers || [])
    .map((supplier) => {
      const supplierTransactions = (transactions || []).filter(
        (transaction) => Number(transaction.supplier_id) === Number(supplier.id)
      );

      const creditCharges = supplierTransactions
        .filter(
          (transaction) =>
            transaction.type === 'expense' &&
            transaction.payment_method === 'credit'
        )
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

      const payments = supplierTransactions
        .filter(
          (transaction) =>
            (transaction.type === 'expense' || transaction.type === 'supplier_payment') &&
            ['cash', 'card', 'bank'].includes(String(transaction.payment_method || ''))
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
        outstanding_balance: creditCharges - supplierPayments,
      };
    })
    .sort((left, right) => left.supplier_name.localeCompare(right.supplier_name, 'el'));
};
