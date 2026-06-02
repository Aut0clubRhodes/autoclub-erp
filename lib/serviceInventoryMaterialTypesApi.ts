import { supabase } from './supabaseClient';

const SERVICE_TYPES_TABLE = 'service_inventory_service_types';
const MATERIAL_TYPES_TABLE = 'service_inventory_material_types';
const SERVICE_TYPE_MATERIALS_TABLE = 'service_inventory_service_type_materials';

const isMissingTableError = (error: { code?: string; message?: string; details?: string } | null) => {
  if (!error) return false;

  const text = `${error.message || ''} ${error.details || ''}`.toLowerCase();
  return error.code === '42P01' || error.code === 'PGRST205' || text.includes('does not exist') || text.includes('not found');
};

const logCatalogWarning = (label: string, error: { code?: string; message?: string; details?: string; hint?: string }) => {
  console.warn(label, {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  });
};

const logSupabaseActionError = (
  operation: string,
  payload: Record<string, unknown>,
  error: { code?: string; message?: string; details?: string; hint?: string }
) => {
  console.error('Service inventory catalog action failed:', {
    operation,
    payload,
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  });
};

export type ServiceInventoryServiceTypeRecord = {
  id: number;
  name: string;
  is_base: boolean;
  is_active: boolean;
  created_at?: string;
};

export type ServiceInventoryMaterialTypeRecord = {
  id: number;
  name: string;
  is_active: boolean;
  service_type_ids: number[];
  created_at?: string;
};

export type ServiceInventoryMaterialTypeLink = {
  id: number;
  service_type_id: number;
  material_type_id: number;
};

export type ServiceInventoryCatalog = {
  serviceTypes: ServiceInventoryServiceTypeRecord[];
  materialTypes: ServiceInventoryMaterialTypeRecord[];
  links: ServiceInventoryMaterialTypeLink[];
  missingTables: boolean;
};

export type CreateCatalogResult<T> =
  | { success: true; record: T }
  | { success: false; reason: 'missing_table' | 'duplicate' | 'error' };

export async function fetchServiceInventoryCatalog(): Promise<ServiceInventoryCatalog> {
  const [serviceTypesResponse, materialTypesResponse] = await Promise.all([
    supabase
      .from(SERVICE_TYPES_TABLE)
      .select('id, name, is_base, is_active, created_at')
      .eq('is_active', true)
      .order('is_base', { ascending: false })
      .order('name'),
    supabase.from(MATERIAL_TYPES_TABLE).select('id, name, is_active, created_at').eq('is_active', true).order('name'),
  ]);

  const missingTables = isMissingTableError(serviceTypesResponse.error) || isMissingTableError(materialTypesResponse.error);

  if (missingTables) {
    if (serviceTypesResponse.error) {
      logCatalogWarning(
        `Service inventory service types table "${SERVICE_TYPES_TABLE}" is missing. Falling back to base service catalog.`,
        serviceTypesResponse.error
      );
    }
    if (materialTypesResponse.error) {
      logCatalogWarning(
        `Service inventory material types table "${MATERIAL_TYPES_TABLE}" is missing. Falling back to base material catalog.`,
        materialTypesResponse.error
      );
    }

    return { serviceTypes: [], materialTypes: [], links: [], missingTables: true };
  }

  if (serviceTypesResponse.error) {
    logSupabaseActionError('fetch_service_types', {}, serviceTypesResponse.error);
  }

  if (materialTypesResponse.error) {
    logSupabaseActionError('fetch_material_types', {}, materialTypesResponse.error);
  }

  const serviceTypes = (serviceTypesResponse.data || [])
    .map((row: any) => ({
      id: Number(row.id),
      name: String(row.name || '').trim(),
      is_base: Boolean(row.is_base),
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
    }))
    .filter((row) => row.id && row.name && !/^\d+$/.test(row.name));
  const materialTypes = (materialTypesResponse.data || [])
    .map((row: any) => ({
      id: Number(row.id),
      name: String(row.name || '').trim(),
      is_active: Boolean(row.is_active),
      service_type_ids: [],
      created_at: row.created_at,
    }))
    .filter((row) => row.id && row.name && !/^\d+$/.test(row.name));

  const serviceTypeIds = serviceTypes.map((row) => row.id).filter(Boolean);
  const materialTypeIds = materialTypes.map((row) => row.id).filter(Boolean);
  const { data: linkRows, error: linkError } =
    serviceTypeIds.length > 0 && materialTypeIds.length > 0
      ? await supabase
          .from(SERVICE_TYPE_MATERIALS_TABLE)
          .select('id, service_type_id, material_type_id')
          .in('service_type_id', serviceTypeIds)
          .in('material_type_id', materialTypeIds)
      : { data: [], error: null };

  if (linkError) {
    if (isMissingTableError(linkError)) {
      logCatalogWarning(
        `Service inventory service/material links table "${SERVICE_TYPE_MATERIALS_TABLE}" is missing. Falling back to base material mapping.`,
        linkError
      );
      return { serviceTypes, materialTypes, links: [], missingTables: true };
    }

    logSupabaseActionError('fetch_service_type_material_links', { serviceTypeIds, materialTypeIds }, linkError);
  }

  const links = (linkRows || []).map((row: any) => ({
    id: Number(row.id),
    service_type_id: Number(row.service_type_id),
    material_type_id: Number(row.material_type_id),
  }));
  const serviceTypeIdsByMaterial = new Map<number, number[]>();
  for (const link of links) {
    serviceTypeIdsByMaterial.set(link.material_type_id, [
      ...(serviceTypeIdsByMaterial.get(link.material_type_id) || []),
      link.service_type_id,
    ]);
  }

  return {
    serviceTypes,
    materialTypes: materialTypes.map((row) => ({
      ...row,
      service_type_ids: serviceTypeIdsByMaterial.get(row.id) || [],
    })),
    links,
    missingTables: false,
  };
}

export async function createServiceInventoryServiceType(
  name: string
): Promise<CreateCatalogResult<ServiceInventoryServiceTypeRecord>> {
  const cleanName = name.trim();
  if (!cleanName) return { success: false, reason: 'error' };

  const { data, error } = await supabase
    .from(SERVICE_TYPES_TABLE)
    .insert({ name: cleanName, is_base: false })
    .select('id, name, is_base, is_active, created_at')
    .single();

  if (error) {
    if (isMissingTableError(error)) return { success: false, reason: 'missing_table' };
    if (error.code === '23505') return { success: false, reason: 'duplicate' };
    logSupabaseActionError('create_service_type', { name: cleanName }, error);
    return { success: false, reason: 'error' };
  }

  return {
    success: true,
    record: {
      id: Number(data.id),
      name: String(data.name || ''),
      is_base: Boolean(data.is_base),
      is_active: Boolean(data.is_active),
      created_at: data.created_at,
    },
  };
}

export async function updateServiceInventoryServiceType(id: number, name: string) {
  const cleanName = name.trim();
  if (!id || !cleanName) return false;

  const { error } = await supabase.from(SERVICE_TYPES_TABLE).update({ name: cleanName }).eq('id', id).eq('is_base', false);
  if (error) {
    logSupabaseActionError('update_service_type', { service_type_id: id, name: cleanName }, error);
    return false;
  }

  return true;
}

export async function deleteServiceInventoryServiceType(id: number) {
  if (!id) return false;

  const { error: mapError } = await supabase.from(SERVICE_TYPE_MATERIALS_TABLE).delete().eq('service_type_id', id);
  if (mapError) {
    logSupabaseActionError('delete_service_type_links', { service_type_id: id }, mapError);
    return false;
  }

  const { error } = await supabase.from(SERVICE_TYPES_TABLE).update({ is_active: false }).eq('id', id);
  if (error) {
    logSupabaseActionError('soft_delete_service_type', { service_type_id: id }, error);
    return false;
  }

  return true;
}

export async function createServiceInventoryMaterialType(
  name: string,
  serviceTypeId?: number
): Promise<CreateCatalogResult<ServiceInventoryMaterialTypeRecord>> {
  const cleanName = name.trim();
  if (!cleanName) return { success: false, reason: 'error' };

  const { data, error } = await supabase
    .from(MATERIAL_TYPES_TABLE)
    .insert({ name: cleanName })
    .select('id, name, is_active, created_at')
    .single();

  if (error) {
    if (isMissingTableError(error)) return { success: false, reason: 'missing_table' };
    if (error.code === '23505') return { success: false, reason: 'duplicate' };
    logSupabaseActionError('create_material_type', { name: cleanName }, error);
    return { success: false, reason: 'error' };
  }

  const materialType = {
    id: Number(data.id),
    name: String(data.name || ''),
    is_active: Boolean(data.is_active),
    service_type_ids: serviceTypeId ? [serviceTypeId] : [],
    created_at: data.created_at,
  };

  if (serviceTypeId) {
    await linkServiceInventoryMaterialTypeToServiceType(serviceTypeId, materialType.id);
  }

  return { success: true, record: materialType };
}

export async function linkServiceInventoryMaterialTypeToServiceType(serviceTypeId: number, materialTypeId: number) {
  if (!serviceTypeId || !materialTypeId) return false;

  const { error } = await supabase
    .from(SERVICE_TYPE_MATERIALS_TABLE)
    .insert({ service_type_id: serviceTypeId, material_type_id: materialTypeId });

  if (error) {
    if (error.code === '23505') return true;
    logSupabaseActionError('link_material_to_service_type', { service_type_id: serviceTypeId, material_type_id: materialTypeId }, error);
    return false;
  }

  return true;
}

export async function unlinkServiceInventoryMaterialTypeFromServiceType(serviceTypeId: number, materialTypeId: number) {
  if (!serviceTypeId || !materialTypeId) return false;

  const { error } = await supabase
    .from(SERVICE_TYPE_MATERIALS_TABLE)
    .delete()
    .eq('service_type_id', serviceTypeId)
    .eq('material_type_id', materialTypeId);

  if (error) {
    logSupabaseActionError('unlink_material_from_service_type', { service_type_id: serviceTypeId, material_type_id: materialTypeId }, error);
    return false;
  }

  return true;
}

export async function fetchServiceInventoryMaterialTypes(): Promise<ServiceInventoryMaterialTypeRecord[]> {
  const catalog = await fetchServiceInventoryCatalog();
  return catalog.materialTypes;
}
