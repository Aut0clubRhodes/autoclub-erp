import { supabase } from './supabaseClient';

export type LeasingStatus = 'active' | 'completed' | 'cancelled';

export type LeasingContract = {
  id: number;
  created_at?: string;
  car_id?: number | null;
  customer_name: string;
  tax_id?: string | null;
  phone?: string | null;
  vehicle_description: string;
  total_amount: number;
  down_payment: number;
  remaining_amount: number;
  installments_count?: number | null;
  monthly_payment: number;
  start_date?: string | null;
  notes?: string | null;
  status: LeasingStatus;
};

export type LeasingPayment = {
  id: number;
  created_at?: string;
  leasing_contract_id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes?: string | null;
  transaction_id?: number | null;
};

export async function fetchLeasingContracts(): Promise<LeasingContract[]> {
  const { data, error } = await supabase
    .from('leasing_contracts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch leasing contracts error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return [];
  }

  return data || [];
}

export async function addLeasingContract(payload: {
  customer_name: string;
  car_id?: number | null;
  tax_id?: string | null;
  phone?: string | null;
  vehicle_description: string;
  total_amount: number;
  down_payment: number;
  remaining_amount: number;
  installments_count?: number | null;
  monthly_payment: number;
  start_date?: string | null;
  notes?: string | null;
  status?: LeasingStatus;
}) {
  const { data, error } = await supabase
    .from('leasing_contracts')
    .insert({
      ...payload,
      status: payload.status || 'active',
    })
    .select()
    .single();

  if (error) {
    console.error('Add leasing contract error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return null;
  }

  return data as LeasingContract;
}

export async function updateLeasingContract(id: number, payload: Partial<LeasingContract>) {
  const { data, error } = await supabase
    .from('leasing_contracts')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Update leasing contract error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return null;
  }

  return data as LeasingContract;
}

export async function addLeasingPayment(payload: {
  leasing_contract_id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes?: string | null;
  transaction_id?: number | null;
}) {
  const { data, error } = await supabase
    .from('leasing_payments')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Add leasing payment error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return null;
  }

  return data as LeasingPayment;
}
