import { supabase } from './supabaseClient';

export type CheckGroupAvailabilityInput = {
  pickup_date: string;
  return_date: string;
};

export type GroupAvailabilityResult = {
  vehicle_group: string;
  allowed_stock: number;
  booked_count: number;
  available: number;
};

type GroupStockRow = {
  vehicle_group: string | null;
  allowed_stock: number | null;
  active: boolean | null;
};

type ReservationRequestRow = {
  vehicle_group: string | null;
};

const logAvailabilityEngineWarning = (label: string, error: unknown) => {
  const availabilityError = error as { message?: string; details?: string; hint?: string; code?: string } | null;

  console.warn(label, {
    message: availabilityError?.message || 'Unknown reservation availability engine error',
    details: availabilityError?.details || '',
    hint: availabilityError?.hint || '',
    code: availabilityError?.code || '',
    raw: error,
  });
};

export async function checkGroupAvailability({
  pickup_date,
  return_date,
}: CheckGroupAvailabilityInput): Promise<GroupAvailabilityResult[]> {
  const { data: stockRows, error: stockError } = await supabase
    .from('reservation_group_stock')
    .select('vehicle_group, allowed_stock, active')
    .eq('active', true)
    .gt('allowed_stock', 0);

  if (stockError) {
    logAvailabilityEngineWarning('Fetch reservation_group_stock availability warning:', stockError);
    return [];
  }

  const { data: reservationRows, error: reservationsError } = await supabase
    .from('reservation_requests')
    .select('vehicle_group')
    .eq('status', 'ACCEPTED')
    .lte('pickup_date', return_date)
    .gte('return_date', pickup_date);

  if (reservationsError) {
    logAvailabilityEngineWarning('Fetch reservation_requests availability warning:', reservationsError);
    return [];
  }

  const bookedCounts = ((reservationRows || []) as ReservationRequestRow[]).reduce<Record<string, number>>(
    (counts, reservation) => {
      if (!reservation.vehicle_group) return counts;

      counts[reservation.vehicle_group] = (counts[reservation.vehicle_group] || 0) + 1;
      return counts;
    },
    {}
  );

  return ((stockRows || []) as GroupStockRow[])
    .filter((stock) => stock.active && stock.vehicle_group && Number(stock.allowed_stock || 0) > 0)
    .map((stock) => {
      const vehicleGroup = String(stock.vehicle_group);
      const allowedStock = Number(stock.allowed_stock || 0);
      const bookedCount = bookedCounts[vehicleGroup] || 0;
      const available = allowedStock - bookedCount;

      return {
        vehicle_group: vehicleGroup,
        allowed_stock: allowedStock,
        booked_count: bookedCount,
        available,
      };
    })
    .filter((stock) => stock.available > 0);
}
