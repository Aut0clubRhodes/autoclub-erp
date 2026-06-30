import { supabase } from './supabaseClient';

const SUPABASE_PAGE_SIZE = 1000;

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
  const rows: ExpenseCategory[] = [];
  let expectedCount: number | null = null;
  let from = 0;

  while (true) {
    const to = from + SUPABASE_PAGE_SIZE - 1;
    const { data, error, count } = await supabase
      .from('expense_categories')
      .select('*', { count: 'exact' })
      .order('name')
      .range(from, to);

    if (error) {
      console.error('Fetch expense categories error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return [];
    }

    if (expectedCount === null) {
      expectedCount = count ?? null;
      console.log('EXPENSE CATEGORIES SUPABASE COUNT', expectedCount);
    }

    const pageRows = data || [];
    rows.push(...pageRows);
    console.log('EXPENSE CATEGORIES FETCH PAGE', {
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

  console.log('EXPENSE CATEGORIES FETCH SUMMARY', {
    fetchedRows: rows.length,
    supabaseCount: expectedCount,
    complete: expectedCount === null ? true : rows.length >= expectedCount,
  });

  return rows;
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

export async function deleteExpenseCategory(
  id: number
): Promise<{ success: boolean; error?: string; code?: string }> {
  const { error } = await supabase.from('expense_categories').delete().eq('id', id);
  if (error) {
    console.error('Delete expense category error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return {
      success: false,
      error: `${error.code || ''} ${error.message || ''} ${error.details || ''}`.trim(),
      code: error.code,
    };
  }

  return { success: true };
}
