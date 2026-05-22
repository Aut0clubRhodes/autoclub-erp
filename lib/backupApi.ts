import { supabase } from './supabaseClient';

const backupTables = [
  'cars',
  'services',
  'transactions',
  'suppliers',
  'agencies',
  'representatives',
  'bookings',
  'car_documents',
  'expense_categories',
] as const;

export type BackupTableName = (typeof backupTables)[number];

export type BackupPayload = {
  created_at: string;
  version: '1.0';
  tables: Record<BackupTableName, unknown[]>;
  errors?: Partial<Record<BackupTableName, string>>;
};

export async function createBackup(): Promise<BackupPayload> {
  const tables = {} as Record<BackupTableName, unknown[]>;
  const errors: Partial<Record<BackupTableName, string>> = {};

  await Promise.all(
    backupTables.map(async (tableName) => {
      const { data, error } = await supabase.from(tableName).select('*');

      if (error) {
        console.error(`Backup export ${tableName} error:`, {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        tables[tableName] = [];
        errors[tableName] = `${error.code || ''} ${error.message || ''} ${error.details || ''}`.trim();
        return;
      }

      tables[tableName] = data || [];
    })
  );

  return {
    created_at: new Date().toISOString(),
    version: '1.0',
    tables,
    ...(Object.keys(errors).length ? { errors } : {}),
  };
}
