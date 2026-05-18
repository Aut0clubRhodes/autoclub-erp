import { supabase } from './supabaseClient';

export type ServiceRecord = {
  id: number;
  created_at?: string;
  car_id: number;
  supplier_id?: number | null;
  service_date: string;
  km?: number | null;
  service_type?: string | null;
  description: string;
  cost?: number | null;
  payment_method?: string | null;
  next_service_km?: number | null;
  invoice_number?: string | null;
  notes?: string | null;
};

export async function fetchServices(): Promise<ServiceRecord[]> {
  const { data, error } = await supabase.from('services').select('*').order('service_date', { ascending: false });

  if (error) {
    console.error('Fetch services error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return [];
  }

  return data || [];
}

export async function fetchServicesByCarId(carId: number): Promise<ServiceRecord[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('car_id', carId)
    .order('service_date', { ascending: false });

  if (error) {
    console.error('Fetch car services error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return [];
  }

  return data || [];
}

export async function addService(service: {
  car_id: number;
  supplier_id?: number | null;
  service_date: string;
  km?: number | null;
  service_type?: string | null;
  description: string;
  cost?: number | null;
  payment_method?: string | null;
  next_service_km?: number | null;
  notes?: string | null;
}) {
  const { data, error } = await supabase.from('services').insert(service).select().single();

  if (error) {
    console.error('Add service error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return null;
  }

  return data as ServiceRecord;
}

export async function updateService(
  id: number,
  updates: {
    service_date: string;
    km?: number | null;
    description: string;
    cost?: number | null;
    notes?: string | null;
  }
) {
  const { data, error } = await supabase.from('services').update(updates).eq('id', id).select().single();

  if (error) {
    console.error('Update service error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return null;
  }

  return data as ServiceRecord;
}

export async function deleteService(id: number): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('services').delete().eq('id', id);

  if (error) {
    console.error('Delete service error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return {
      success: false,
      error: `${error.code || ''} ${error.message || ''} ${error.details || ''}`.trim(),
    };
  }

  return { success: true };
}
