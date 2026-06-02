import { supabase } from './supabaseClient';

export type ServiceInventoryType =
  | 'oil'
  | 'oil_filter'
  | 'cabin_filter'
  | 'air_filter'
  | 'brakes'
  | 'belts'
  | 'tire'
  | 'battery'
  | 'other';

export type ServiceInventoryItem = {
  id: number;
  name: string;
  type: ServiceInventoryType;
  brand?: string | null;
  size_or_spec?: string | null;
  supplier_id?: number | null;
  unit_cost: number;
  current_stock: number;
  created_at?: string;
};

export type ServiceInventoryMovement = {
  id: number;
  item_id: number;
  car_id?: number | null;
  service_id?: number | null;
  movement_type: 'purchase' | 'usage' | 'adjustment';
  quantity: number;
  unit_cost: number;
  total_cost: number;
  supplier_id?: number | null;
  payment_method?: string | null;
  transaction_id?: number | null;
  notes?: string | null;
  created_at?: string;
};

export async function fetchServiceInventoryItems(): Promise<ServiceInventoryItem[]> {
  const { data, error } = await supabase
    .from('service_inventory_items')
    .select('*')
    .order('type')
    .order('name');

  if (error) {
    console.error('Fetch service inventory items error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return [];
  }

  return (data || []).map((item: any) => ({
    ...item,
    id: Number(item.id),
    supplier_id: item.supplier_id ? Number(item.supplier_id) : null,
    unit_cost: Number(item.unit_cost) || 0,
    current_stock: Number(item.current_stock) || 0,
  }));
}

export async function fetchServiceInventoryMovements(): Promise<ServiceInventoryMovement[]> {
  const { data, error } = await supabase
    .from('service_inventory_movements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch service inventory movements error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return [];
  }

  return (data || []).map((movement: any) => ({
    ...movement,
    id: Number(movement.id),
    item_id: Number(movement.item_id),
    car_id: movement.car_id ? Number(movement.car_id) : null,
    service_id: movement.service_id ? Number(movement.service_id) : null,
    quantity: Number(movement.quantity) || 0,
    unit_cost: Number(movement.unit_cost) || 0,
    total_cost: Number(movement.total_cost) || 0,
    supplier_id: movement.supplier_id ? Number(movement.supplier_id) : null,
    transaction_id: movement.transaction_id ? Number(movement.transaction_id) : null,
  }));
}

export async function createServiceInventoryItem(payload: {
  name: string;
  type: ServiceInventoryType;
  brand?: string | null;
  size_or_spec?: string | null;
  supplier_id?: number | null;
  unit_cost: number;
}) {
  const { data, error } = await supabase
    .from('service_inventory_items')
    .insert({
      ...payload,
      current_stock: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Create service inventory item error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return null;
  }

  return data as ServiceInventoryItem;
}

export async function addServiceInventoryPurchase(payload: {
  item_id: number;
  quantity: number;
  unit_cost: number;
  supplier_id?: number | null;
  payment_method?: string | null;
  transaction_id?: number | null;
  notes?: string | null;
}) {
  const totalCost = payload.quantity * payload.unit_cost;

  const { data: movement, error: movementError } = await supabase
    .from('service_inventory_movements')
    .insert({
      item_id: payload.item_id,
      movement_type: 'purchase',
      quantity: payload.quantity,
      unit_cost: payload.unit_cost,
      total_cost: totalCost,
      supplier_id: payload.supplier_id ?? null,
      payment_method: payload.payment_method ?? null,
      transaction_id: payload.transaction_id ?? null,
      notes: payload.notes ?? null,
    })
    .select()
    .single();

  if (movementError) {
    console.error('Create service inventory purchase movement error:', {
      message: movementError.message,
      details: movementError.details,
      hint: movementError.hint,
      code: movementError.code,
    });
    return null;
  }

  const { data: currentItem, error: fetchError } = await supabase
    .from('service_inventory_items')
    .select('current_stock')
    .eq('id', payload.item_id)
    .single();

  if (fetchError) {
    console.error('Fetch service inventory item stock error:', {
      message: fetchError.message,
      details: fetchError.details,
      hint: fetchError.hint,
      code: fetchError.code,
    });
    return movement as ServiceInventoryMovement;
  }

  const nextStock = (Number(currentItem?.current_stock) || 0) + payload.quantity;
  const { error: updateError } = await supabase
    .from('service_inventory_items')
    .update({
      current_stock: nextStock,
      unit_cost: payload.unit_cost,
      supplier_id: payload.supplier_id ?? null,
    })
    .eq('id', payload.item_id);

  if (updateError) {
    console.error('Update service inventory stock error:', {
      message: updateError.message,
      details: updateError.details,
      hint: updateError.hint,
      code: updateError.code,
    });
  }

  return movement as ServiceInventoryMovement;
}

export async function adjustServiceInventoryStock(itemId: number, delta: number) {
  const { data: currentItem, error: fetchError } = await supabase
    .from('service_inventory_items')
    .select('current_stock')
    .eq('id', itemId)
    .single();

  if (fetchError) {
    console.error('Fetch service inventory stock for adjustment error:', {
      message: fetchError.message,
      details: fetchError.details,
      hint: fetchError.hint,
      code: fetchError.code,
    });
    return false;
  }

  const nextStock = (Number(currentItem?.current_stock) || 0) + delta;
  if (nextStock < 0) {
    console.error('Service inventory stock adjustment blocked: negative stock.', {
      itemId,
      currentStock: Number(currentItem?.current_stock) || 0,
      delta,
      nextStock,
    });
    return false;
  }

  const { error: updateError } = await supabase
    .from('service_inventory_items')
    .update({ current_stock: nextStock })
    .eq('id', itemId);

  if (updateError) {
    console.error('Update service inventory stock adjustment error:', {
      message: updateError.message,
      details: updateError.details,
      hint: updateError.hint,
      code: updateError.code,
    });
    return false;
  }

  return true;
}

export async function reconcileServiceInventoryStock(itemId: number) {
  const [{ data: currentItem, error: itemError }, { data: movements, error: movementError }] = await Promise.all([
    supabase.from('service_inventory_items').select('current_stock').eq('id', itemId).single(),
    supabase.from('service_inventory_movements').select('movement_type, quantity').eq('item_id', itemId),
  ]);

  if (itemError) {
    console.error('Fetch service inventory item for stock reconciliation error:', {
      message: itemError.message,
      details: itemError.details,
      hint: itemError.hint,
      code: itemError.code,
    });
    return null;
  }

  if (movementError) {
    console.error('Fetch service inventory movements for stock reconciliation error:', {
      message: movementError.message,
      details: movementError.details,
      hint: movementError.hint,
      code: movementError.code,
    });
    return null;
  }

  const expectedStock = (movements || []).reduce((sum: number, movement: any) => {
    const quantity = Number(movement.quantity) || 0;
    if (movement.movement_type === 'purchase') return sum + quantity;
    if (movement.movement_type === 'usage') return sum - quantity;
    return sum;
  }, 0);

  if (expectedStock < 0) {
    console.error('Service inventory stock reconciliation blocked: movement total is negative.', {
      itemId,
      expectedStock,
    });
    return null;
  }

  const currentStock = Number(currentItem?.current_stock) || 0;
  if (currentStock === expectedStock) {
    return expectedStock;
  }

  const { error: updateError } = await supabase
    .from('service_inventory_items')
    .update({ current_stock: expectedStock })
    .eq('id', itemId);

  if (updateError) {
    console.error('Update service inventory reconciled stock error:', {
      message: updateError.message,
      details: updateError.details,
      hint: updateError.hint,
      code: updateError.code,
    });
    return null;
  }

  return expectedStock;
}

export async function updateServiceInventoryItem(
  id: number,
  updates: Partial<Pick<ServiceInventoryItem, 'name' | 'type' | 'brand' | 'size_or_spec' | 'supplier_id' | 'unit_cost' | 'current_stock'>>
) {
  const { data, error } = await supabase
    .from('service_inventory_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Update service inventory item error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return null;
  }

  return data as ServiceInventoryItem;
}

export async function updateServiceInventoryMovement(
  id: number,
  updates: Partial<
    Pick<
      ServiceInventoryMovement,
      'quantity' | 'unit_cost' | 'total_cost' | 'supplier_id' | 'payment_method' | 'transaction_id' | 'notes'
    >
  >
) {
  const { data, error } = await supabase
    .from('service_inventory_movements')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Update service inventory movement error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return null;
  }

  return data as ServiceInventoryMovement;
}

export async function deleteServiceInventoryItem(id: number) {
  const { error } = await supabase.from('service_inventory_items').delete().eq('id', id);

  if (error) {
    console.error('Delete service inventory item error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return false;
  }

  return true;
}

export async function deleteServiceInventoryMovement(id: number) {
  const { error } = await supabase.from('service_inventory_movements').delete().eq('id', id);

  if (error) {
    console.error('Delete service inventory movement error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return false;
  }

  return true;
}

export async function addServiceInventoryUsage(payload: {
  item_id: number;
  car_id: number;
  service_id: number;
  quantity: number;
  unit_cost: number;
  notes?: string | null;
}) {
  const { data: currentItem, error: fetchError } = await supabase
    .from('service_inventory_items')
    .select('current_stock, supplier_id')
    .eq('id', payload.item_id)
    .single();

  if (fetchError) {
    console.error('Fetch service inventory item for usage error:', {
      message: fetchError.message,
      details: fetchError.details,
      hint: fetchError.hint,
      code: fetchError.code,
    });
    return null;
  }

  const currentStock = Number(currentItem?.current_stock) || 0;
  if (currentStock < payload.quantity) {
    console.error('Service inventory usage blocked: insufficient stock.', {
      item_id: payload.item_id,
      currentStock,
      quantity: payload.quantity,
    });
    return null;
  }

  const totalCost = payload.quantity * payload.unit_cost;
  const { data: movement, error: movementError } = await supabase
    .from('service_inventory_movements')
    .insert({
      item_id: payload.item_id,
      car_id: payload.car_id,
      service_id: payload.service_id,
      movement_type: 'usage',
      quantity: payload.quantity,
      unit_cost: payload.unit_cost,
      total_cost: totalCost,
      supplier_id: currentItem?.supplier_id ?? null,
      payment_method: null,
      notes: payload.notes ?? null,
    })
    .select()
    .single();

  if (movementError) {
    console.error('Create service inventory usage movement error:', {
      message: movementError.message,
      details: movementError.details,
      hint: movementError.hint,
      code: movementError.code,
    });
    return null;
  }

  const { error: updateError } = await supabase
    .from('service_inventory_items')
    .update({ current_stock: currentStock - payload.quantity })
    .eq('id', payload.item_id);

  if (updateError) {
    console.error('Update service inventory stock after usage error:', {
      message: updateError.message,
      details: updateError.details,
      hint: updateError.hint,
      code: updateError.code,
    });
    return null;
  }

  return movement as ServiceInventoryMovement;
}
