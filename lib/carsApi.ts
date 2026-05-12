import { supabase } from './supabaseClient';

export async function fetchCars() {
  const { data, error } = await supabase
    .from('cars')
    .select('*');

  if (error) {
    console.log(error);
    return [];
  }

  return data || [];
}export async function addCar(car: {
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