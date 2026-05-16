import { supabase } from './supabaseClient';
import { fetchSuppliers } from './suppliersApi';

export type SupplierLedgerRow = {
  supplier_id: number;
  supplier_name: string;
  total_credit_charges: number;
  total_payments: number;
  outstanding_balance: number;
};

export const fetchSupplierLedger = async (): Promise<SupplierLedgerRow[]> => {
  const { data, error } = await supabase
    .from('supplier_ledger_view')
    .select('supplier_id, supplier_name, total_credit_charges, total_payments, outstanding_balance')
    .order('supplier_name');

  if (error) {
    console.error('Fetch supplier ledger error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return fetchSupplierLedgerFallback();
  }

  if (!data || data.length === 0) {
    console.warn('Supplier ledger view returned no rows.');
    return fetchSupplierLedgerFallback();
  }

  return (data || []).map((row) => ({
    supplier_id: Number(row.supplier_id),
    supplier_name: String(row.supplier_name ?? ''),
    total_credit_charges: Number(row.total_credit_charges) || 0,
    total_payments: Number(row.total_payments) || 0,
    outstanding_balance: Number(row.outstanding_balance) || 0,
  }));
};

const fetchSupplierLedgerFallback = async (): Promise<SupplierLedgerRow[]> => {
  const [suppliers, transactionsResult] = await Promise.all([
    fetchSuppliers(),
    supabase
      .from('transactions')
      .select('supplier_id, type, payment_method, amount')
      .not('supplier_id', 'is', null),
  ]);

  if (transactionsResult.error) {
    console.error('Fetch supplier ledger fallback transactions error:', {
      message: transactionsResult.error.message,
      details: transactionsResult.error.details,
      hint: transactionsResult.error.hint,
      code: transactionsResult.error.code,
    });
    return [];
  }

  const totalsBySupplier = new Map<
    number,
    { total_credit_charges: number; total_payments: number; outstanding_balance: number }
  >();

  (transactionsResult.data || []).forEach((transaction) => {
    if (!transaction.supplier_id) return;

    const supplierId = Number(transaction.supplier_id);
    const amount = Number(transaction.amount) || 0;
    const current = totalsBySupplier.get(supplierId) || {
      total_credit_charges: 0,
      total_payments: 0,
      outstanding_balance: 0,
    };

    if (transaction.type === 'expense' && transaction.payment_method === 'credit') {
      current.total_credit_charges += amount;
      current.outstanding_balance += amount;
    }

    if (transaction.type === 'supplier_payment') {
      current.total_payments += amount;
      current.outstanding_balance -= amount;
    }

    totalsBySupplier.set(supplierId, current);
  });

  return suppliers
    .map((supplier) => {
      const totals = totalsBySupplier.get(supplier.id) || {
        total_credit_charges: 0,
        total_payments: 0,
        outstanding_balance: 0,
      };

      return {
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        ...totals,
      };
    })
    .sort((left, right) => left.supplier_name.localeCompare(right.supplier_name, 'el'));
};
