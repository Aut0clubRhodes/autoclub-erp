import { supabase } from './supabaseClient';

export type FinancialObligationStatus = 'active' | 'completed' | 'cancelled';

export type FinancialObligation = {
  id: number;
  created_at?: string;
  title: string;
  category: string;
  total_amount: number;
  down_payment: number;
  seasons_count: number;
  months_per_season: number;
  start_month: number;
  start_year: number;
  payment_method?: string | null;
  notes?: string | null;
  status: FinancialObligationStatus;
};

export type FinancialObligationPayload = {
  title: string;
  category: string;
  total_amount: number;
  down_payment: number;
  seasons_count: number;
  months_per_season: number;
  start_month: number;
  start_year: number;
  payment_method?: string | null;
  notes?: string | null;
  status: FinancialObligationStatus;
};

export async function fetchFinancialObligations(): Promise<FinancialObligation[]> {
  const { data, error } = await supabase
    .from('financial_obligations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Fetch financial obligations warning:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return [];
  }

  return (data || []).map(normalizeFinancialObligation);
}

export async function addFinancialObligation(payload: FinancialObligationPayload) {
  const { data, error } = await supabase
    .from('financial_obligations')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Add financial obligation error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return null;
  }

  return normalizeFinancialObligation(data);
}

export async function updateFinancialObligation(id: number, payload: Partial<FinancialObligationPayload>) {
  const { data, error } = await supabase
    .from('financial_obligations')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Update financial obligation error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return null;
  }

  return normalizeFinancialObligation(data);
}

export async function deleteFinancialObligation(id: number) {
  const { error } = await supabase.from('financial_obligations').delete().eq('id', id);

  if (error) {
    console.error('Delete financial obligation error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return false;
  }

  return true;
}

function normalizeFinancialObligation(row: any): FinancialObligation {
  return {
    id: Number(row.id),
    created_at: row.created_at,
    title: String(row.title || ''),
    category: String(row.category || 'Λοιπά'),
    total_amount: Number(row.total_amount ?? row.amount ?? 0),
    down_payment: Number(row.down_payment ?? 0),
    seasons_count: Number(row.seasons_count ?? 1),
    months_per_season: Number(row.months_per_season ?? 1),
    start_month: Number(row.start_month ?? getMonthFromDate(row.start_date) ?? 1),
    start_year: Number(row.start_year ?? getYearFromDate(row.start_date) ?? new Date().getFullYear()),
    payment_method: row.payment_method || null,
    notes: row.notes || null,
    status: (row.status || 'active') as FinancialObligationStatus,
  };
}

function getMonthFromDate(value?: string | null) {
  if (!value) return null;
  const month = Number(value.slice(5, 7));
  return Number.isFinite(month) ? month : null;
}

function getYearFromDate(value?: string | null) {
  if (!value) return null;
  const year = Number(value.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}
