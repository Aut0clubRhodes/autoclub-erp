import { supabase } from './supabaseClient';

export async function fetchCars() {
  try {
    const { data, error } = await supabase
      .from('cars')
      .select('id, plate, category, brand, model, created_at, purchase_price, insurance_expiry, kteo_expiry, road_tax_year, notes, current_km')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching cars:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching cars:', error);
    return [];
  }
}