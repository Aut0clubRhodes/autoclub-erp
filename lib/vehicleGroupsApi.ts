import { supabase } from './supabaseClient';

export type VehicleGroupRecord = {
  id: string;
  code: string;
  active: boolean;
  sort_order: number;
  created_at?: string;
};

export type VehicleGroupUpdatePayload = {
  code?: string;
  active?: boolean;
  sort_order?: number;
};

export const DEFAULT_VEHICLE_GROUP_CODES = [
  'A',
  'B',
  'C',
  'D',
  'D1',
  'D2',
  'E',
  'H',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'K',
  'K1',
  'K2',
];

const fallbackVehicleGroups = (): VehicleGroupRecord[] =>
  DEFAULT_VEHICLE_GROUP_CODES.map((code, index) => ({
    id: `fallback-${code}`,
    code,
    active: true,
    sort_order: index,
  }));

const normalizeCode = (code: string) => code.trim().toUpperCase();

const logVehicleGroupsWarning = (label: string, error: unknown) => {
  const groupError = error as { message?: string; details?: string; hint?: string; code?: string } | null;

  console.warn(label, {
    message: groupError?.message || 'Unknown vehicle_groups error',
    details: groupError?.details || '',
    hint: groupError?.hint || '',
    code: groupError?.code || '',
    raw: error,
  });
};

async function seedMissingDefaultGroups(existingGroups: VehicleGroupRecord[]) {
  const existingCodes = new Set(existingGroups.map((group) => normalizeCode(group.code)));
  const missingRows = DEFAULT_VEHICLE_GROUP_CODES
    .filter((code) => !existingCodes.has(code))
    .map((code, index) => ({
      code,
      active: true,
      sort_order: existingGroups.length + index,
    }));

  if (missingRows.length === 0) return;

  const { error } = await supabase.from('vehicle_groups').upsert(missingRows, { onConflict: 'code' });

  if (error) {
    logVehicleGroupsWarning('Seed vehicle_groups warning:', error);
  }
}

export async function fetchVehicleGroups(): Promise<VehicleGroupRecord[]> {
  const { data, error } = await supabase
    .from('vehicle_groups')
    .select('id, code, active, sort_order, created_at')
    .order('sort_order', { ascending: true })
    .order('code', { ascending: true });

  if (error) {
    logVehicleGroupsWarning('Fetch vehicle_groups warning:', error);
    return fallbackVehicleGroups();
  }

  const groups = (data || []) as VehicleGroupRecord[];
  await seedMissingDefaultGroups(groups);

  if (groups.length === 0 || DEFAULT_VEHICLE_GROUP_CODES.some((code) => !groups.some((group) => normalizeCode(group.code) === code))) {
    const { data: refreshedData, error: refreshError } = await supabase
      .from('vehicle_groups')
      .select('id, code, active, sort_order, created_at')
      .order('sort_order', { ascending: true })
      .order('code', { ascending: true });

    if (refreshError) {
      logVehicleGroupsWarning('Refresh vehicle_groups warning:', refreshError);
      return groups.length > 0 ? groups : fallbackVehicleGroups();
    }

    return (refreshedData || []) as VehicleGroupRecord[];
  }

  return groups;
}

export async function createVehicleGroup(code: string): Promise<VehicleGroupRecord | null> {
  const normalizedCode = normalizeCode(code);

  if (!normalizedCode) return null;

  const { data: currentGroups } = await supabase.from('vehicle_groups').select('sort_order');
  const maxSortOrder = Math.max(-1, ...((currentGroups || []) as Array<{ sort_order?: number }>).map((group) => Number(group.sort_order || 0)));

  const { data, error } = await supabase
    .from('vehicle_groups')
    .insert({
      code: normalizedCode,
      active: true,
      sort_order: maxSortOrder + 1,
    })
    .select('id, code, active, sort_order, created_at')
    .single();

  if (error) {
    logVehicleGroupsWarning('Create vehicle_group warning:', error);
    return null;
  }

  return data as VehicleGroupRecord;
}

export async function updateVehicleGroup(id: string, payload: VehicleGroupUpdatePayload): Promise<VehicleGroupRecord | null> {
  const updatePayload = {
    ...payload,
    ...(payload.code ? { code: normalizeCode(payload.code) } : {}),
  };

  const { data, error } = await supabase
    .from('vehicle_groups')
    .update(updatePayload)
    .eq('id', id)
    .select('id, code, active, sort_order, created_at')
    .single();

  if (error) {
    logVehicleGroupsWarning('Update vehicle_group warning:', error);
    return null;
  }

  return data as VehicleGroupRecord;
}

export async function deleteVehicleGroup(id: string): Promise<boolean> {
  const { error } = await supabase.from('vehicle_groups').delete().eq('id', id);

  if (error) {
    logVehicleGroupsWarning('Delete vehicle_group warning:', error);
    return false;
  }

  return true;
}
