import { supabase } from './supabaseClient';

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
    return [];
  }

  if (!data || data.length === 0) {
    console.warn('Supplier ledger view returned no rows.');
  }

  return (data || []).map((row) => ({
    supplier_id: Number(row.supplier_id),
    supplier_name: String(row.supplier_name ?? ''),
    total_credit_charges: Number(row.total_credit_charges) || 0,
    total_payments: Number(row.total_payments) || 0,
    outstanding_balance: Number(row.outstanding_balance) || 0,
  }));
};
