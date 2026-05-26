import { supabase } from './supabaseClient';

export type ReservationGroupStockRecord = {
  id: string;
  vehicle_group: string;
  allowed_stock: number;
  active: boolean;
  notes: string | null;
  updated_at?: string | null;
};

export type ReservationGroupStockPayload = {
  vehicle_group: string;
  allowed_stock: number;
  active: boolean;
  notes?: string | null;
};

const logAvailabilityWarning = (label: string, error: unknown) => {
  const availabilityError = error as { message?: string; details?: string; hint?: string; code?: string } | null;

  console.warn(label, {
    message: availabilityError?.message || 'Unknown reservation_group_stock error',
    details: availabilityError?.details || '',
    hint: availabilityError?.hint || '',
    code: availabilityError?.code || '',
    raw: error,
  });
};

export async function fetchGroupStock(): Promise<ReservationGroupStockRecord[]> {
  const { data, error } = await supabase
    .from('reservation_group_stock')
    .select('id, vehicle_group, allowed_stock, active, notes, updated_at')
    .order('vehicle_group', { ascending: true });

  if (error) {
    logAvailabilityWarning('Fetch reservation_group_stock warning:', error);
    return [];
  }

  return (data || []) as ReservationGroupStockRecord[];
}

export async function upsertGroupStock(payload: ReservationGroupStockPayload): Promise<ReservationGroupStockRecord | null> {
  const { data, error } = await supabase
    .from('reservation_group_stock')
    .upsert(
      {
        vehicle_group: payload.vehicle_group,
        allowed_stock: payload.allowed_stock,
        active: payload.active,
        notes: payload.notes || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'vehicle_group' }
    )
    .select('id, vehicle_group, allowed_stock, active, notes, updated_at')
    .single();

  if (error) {
    logAvailabilityWarning('Upsert reservation_group_stock warning:', error);
    return null;
  }

  return data as ReservationGroupStockRecord;
}

export async function updateGroupStock(id: string, payload: Partial<ReservationGroupStockPayload>): Promise<ReservationGroupStockRecord | null> {
  const { data, error } = await supabase
    .from('reservation_group_stock')
    .update({
      ...payload,
      notes: payload.notes === undefined ? undefined : payload.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, vehicle_group, allowed_stock, active, notes, updated_at')
    .single();

  if (error) {
    logAvailabilityWarning('Update reservation_group_stock warning:', error);
    return null;
  }

  return data as ReservationGroupStockRecord;
}
