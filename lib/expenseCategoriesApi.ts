import { supabase } from './supabaseClient';

export type ExpenseCategory = {
  id: number;
  name: string;
  created_at?: string;
};

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Service',
  'Ασφάλεια',
  'ΚΤΕΟ',
  'Λάστιχα',
  'Τέλη Κυκλοφορίας',
  'Ενοίκιο',
  'Αναλώσιμα Γραφείου',
  'Λογιστής',
  'Δημόσιο / Παράβολα',
  'Άλλο',
];

export const fetchExpenseCategories = async (): Promise<ExpenseCategory[]> => {
  const { data, error } = await supabase.from('expense_categories').select('*').order('name');
  if (error) {
    console.error('Fetch expense categories error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return [];
  }

  return data || [];
};

export const seedDefaultExpenseCategories = async () => {
  const { data, error } = await supabase
    .from('expense_categories')
    .insert(DEFAULT_EXPENSE_CATEGORIES.map((name) => ({ name })))
    .select();

  if (error) {
    console.error('Seed expense categories error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return [];
  }

  return data || [];
};

export const addExpenseCategory = async (name: string) => {
  const { data, error } = await supabase
    .from('expense_categories')
    .insert({ name })
    .select()
    .single();

  if (error) {
    console.error('Add expense category error:', error);
    return null;
  }

  return data;
};

export async function deleteExpenseCategory(id: number): Promise<boolean> {
  const { error } = await supabase.from('expense_categories').delete().eq('id', id);
  if (error) {
    console.error('Delete expense category error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return false;
  }

  return true;
}
