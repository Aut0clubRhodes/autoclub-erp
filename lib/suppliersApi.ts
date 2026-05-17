import { supabase } from './supabaseClient';

export type SupplierRecord = {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
};

let supplierTableName: 'suppliers' | 'Suppliers' | null = null;

const resolveSupplierTableName = async () => {
  if (supplierTableName) return supplierTableName;

  const lowerCaseResult = await supabase.from('suppliers').select('id').limit(1);
  if (!lowerCaseResult.error) {
    supplierTableName = 'suppliers';
    return supplierTableName;
  }

  const capitalizedResult = await supabase.from('Suppliers').select('id').limit(1);
  if (!capitalizedResult.error) {
    supplierTableName = 'Suppliers';
    return supplierTableName;
  }

  console.error('Supplier table lookup error:', lowerCaseResult.error, capitalizedResult.error);
  return null;
};

export const fetchSuppliers = async (): Promise<SupplierRecord[]> => {
  const tableName = await resolveSupplierTableName();
  if (!tableName) return [];

  const { data, error } = await supabase.from(tableName).select('*').order('name');
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
  const tableName = await resolveSupplierTableName();
  if (!tableName) return null;

  const { data, error } = await supabase
    .from(tableName)
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
  const tableName = await resolveSupplierTableName();
  if (!tableName) return false;

  const { error } = await supabase.from(tableName).delete().eq('id', id);
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
