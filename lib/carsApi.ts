import { supabase } from './supabaseClient';

export async function fetchCars() {
  const { data, error } = await supabase
    .from('cars')
    .select('*');

  if (error) {
    console.error('Fetch cars error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return [];
  }

  return data || [];
}
export async function addCar(car: {
  plate: string;
  category: string;
  brand: string;
  model: string;
  year: number;
  current_km: number;
  purchase_price: number;
 vin?: string;
fuel?: string;
engine_cc?: string;
kteo_expiry?: string;
insurance_expiry?: string;
road_tax_expiry?: string;
}) {
  const { data, error } = await supabase
    .from('cars')
    .insert([car])
    .select()
    .single();

  if (error) {
    console.log(error);
    return null;
  }

  return data;
} 
export async function deleteCar(id: string) {
  const { error } = await supabase
    .from('cars')
    .delete()
    .eq('id', id);

  if (error) {
    console.log(error);
    return false;
  }

  return true;
}

export async function updateCar(
  id: string,
  updates: {
    plate: string;
    category: string;
    brand: string;
    model: string;
    year: number;
    current_km: number;
    purchase_price: number;
    vin?: string;
    fuel?: string;
    engine_cc?: string;
    kteo_expiry?: string;
    insurance_expiry?: string;
    road_tax_expiry?: string;
  }
) {
  const { data, error } = await supabase
    .from('cars')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.log(error);
    return null;
  }

  return data;
}
