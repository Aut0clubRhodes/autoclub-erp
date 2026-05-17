import { supabase } from './supabaseClient';

export type SupplierRecord = {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
};

export const fetchSuppliers = async (): Promise<SupplierRecord[]> => {
  const { data, error } = await supabase.from('suppliers').select('*').order('name');
  if (error) {
    console.error('Fetch suppliers error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return [];
  }

  return data || [];
};

export const addSupplier = async (name: string) => {
  const { data, error } = await supabase
    .from('suppliers')
    .insert({ name })
    .select()
    .single();

  if (error) {
    console.error('Add supplier error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return null;
  }

  return data;
};

export const deleteSupplier = async (id: number) => {
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) {
    console.error('Delete supplier error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return false;
  }

  return true;
};
