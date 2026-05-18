import { supabase } from './supabaseClient';
import { addTransaction } from './financeApi';

export type DebtRecord = {
  id: number;
  created_at?: string;
  car_id?: number | null;
  supplier_id?: number | null;
  category?: string | null;
  title: string;
  due_date?: string | null;
  original_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  notes?: string | null;
};

export type DebtPayload = {
  car_id?: number | null;
  supplier_id?: number | null;
  category?: string | null;
  title: string;
  due_date?: string | null;
  original_amount: number;
  paid_amount?: number;
  remaining_amount?: number;
  status?: string;
  notes?: string | null;
};

export type DebtPaymentPayload = {
  amount: number;
  date: string;
  payment_method: string;
  notes?: string | null;
};

export type DebtPaymentResult =
  | { success: true; debt: DebtRecord }
  | { success: false; expenseCreated: boolean };

export async function fetchDebts(): Promise<DebtRecord[]> {
  const { data, error } = await supabase.from('debts').select('*').order('due_date', { ascending: true });

  if (error) {
    console.error('Fetch debts error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return [];
  }

  return data || [];
}

export async function addDebt(payload: DebtPayload) {
  const { data, error } = await supabase.from('debts').insert(payload).select().single();

  if (error) {
    console.log('Add debt error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return null;
  }

  return data as DebtRecord;
}

export async function updateDebt(id: number, payload: Partial<DebtPayload>) {
  const { data, error } = await supabase.from('debts').update(payload).eq('id', id).select().single();

  if (error) {
    console.error('Update debt error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return null;
  }

  return data as DebtRecord;
}

export async function deleteDebt(id: number) {
  const { error } = await supabase.from('debts').delete().eq('id', id);

  if (error) {
    console.error('Delete debt error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return false;
  }

  return true;
}

export async function recordDebtPayment(debtId: number, paymentPayload: DebtPaymentPayload): Promise<DebtPaymentResult> {
  const numericDebtId = Number(debtId);
  const paymentAmount = Number(paymentPayload.amount);
  const { data: debt, error: debtError } = await supabase.from('debts').select('*').eq('id', numericDebtId).single();

  if (debtError) {
    console.error('Fetch debt for payment error:', {
      message: debtError.message,
      details: debtError.details,
      hint: debtError.hint,
      code: debtError.code,
    });
    return { success: false, expenseCreated: false };
  }

  const debtRecord = debt as DebtRecord;
  const transaction = await addTransaction({
    type: 'expense',
    source: 'debt_payment',
    amount: paymentAmount,
    date: paymentPayload.date,
    payment_method: paymentPayload.payment_method,
    supplier_id: debtRecord.supplier_id ?? null,
    car_id: debtRecord.car_id ?? null,
    category: debtRecord.category || undefined,
    notes: `Πληρωμή οφειλής: ${debtRecord.title}`,
  });

  if (!transaction) {
    return { success: false, expenseCreated: false };
  }

  const currentPaidAmount = Number(debtRecord.paid_amount || 0);
  const nextPaidAmount = currentPaidAmount + paymentAmount;
  const { data: updatedDebt, error: updateError } = await supabase
    .from('debts')
    .update({ paid_amount: nextPaidAmount })
    .eq('id', numericDebtId)
    .select()
    .single();

  if (updateError) {
    console.log('Update debt payment error:', {
      message: updateError.message,
      details: updateError.details,
      hint: updateError.hint,
      code: updateError.code,
    });
    return { success: false, expenseCreated: true };
  }

  return { success: true, debt: updatedDebt as DebtRecord };
}
