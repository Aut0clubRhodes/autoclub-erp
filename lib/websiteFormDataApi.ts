import { supabase } from './supabaseClient';

export type WebsiteAgency = {
  id: number;
  name: string;
};

export type WebsiteRepresentative = {
  id: number;
  name: string;
  agency_id: number;
};

export type WebsiteVehicleGroup = {
  id: string;
  code: string;
  active: boolean;
  sort_order: number;
};

export type WebsiteFormDataResult = {
  agencies: WebsiteAgency[];
  representatives: WebsiteRepresentative[];
  vehicleGroups: WebsiteVehicleGroup[];
  error: string | null;
};

export async function fetchWebsiteAgencies() {
  const { data, error } = await supabase
    .from('agencies')
    .select('id, name')
    .order('name');

  if (error) {
    console.warn('Fetch website agencies warning:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return { agencies: [] as WebsiteAgency[], error: 'Unable to load agencies.' };
  }

  return { agencies: (data || []) as WebsiteAgency[], error: null };
}

export async function fetchWebsiteRepresentatives() {
  const { data, error } = await supabase
    .from('representatives')
    .select('id, name, agency_id')
    .order('name');

  if (error) {
    console.warn('Fetch website representatives warning:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return { representatives: [] as WebsiteRepresentative[], error: 'Unable to load representatives.' };
  }

  return { representatives: (data || []) as WebsiteRepresentative[], error: null };
}

export async function fetchWebsiteVehicleGroups() {
  const { data, error } = await supabase
    .from('vehicle_groups')
    .select('id, code, active, sort_order')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('code', { ascending: true });

  if (error) {
    console.warn('Fetch website vehicle groups warning:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return { vehicleGroups: [] as WebsiteVehicleGroup[], error: 'Unable to load vehicle groups.' };
  }

  return { vehicleGroups: (data || []) as WebsiteVehicleGroup[], error: null };
}

export async function fetchWebsiteFormData(): Promise<WebsiteFormDataResult> {
  const [agencyResult, representativeResult, vehicleGroupResult] = await Promise.all([
    fetchWebsiteAgencies(),
    fetchWebsiteRepresentatives(),
    fetchWebsiteVehicleGroups(),
  ]);

  return {
    agencies: agencyResult.agencies,
    representatives: representativeResult.representatives,
    vehicleGroups: vehicleGroupResult.vehicleGroups,
    error: agencyResult.error || representativeResult.error || vehicleGroupResult.error,
  };
}
