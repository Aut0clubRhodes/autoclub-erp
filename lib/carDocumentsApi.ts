import { supabase } from './supabaseClient';

const BUCKET_NAME = 'car-documents';

export type CarDocumentRecord = {
  id: number;
  created_at?: string;
  car_id: number;
  document_type: string;
  file_name: string;
  file_url: string;
  notes?: string | null;
};

export async function fetchCarDocuments(carId: number): Promise<CarDocumentRecord[]> {
  const { data, error } = await supabase
    .from('car_documents')
    .select('*')
    .eq('car_id', carId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch car documents error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return [];
  }

  return data || [];
}

export async function uploadCarDocument({
  carId,
  documentType,
  file,
  notes,
}: {
  carId: number;
  documentType: string;
  file: File;
  notes?: string | null;
}): Promise<CarDocumentRecord | null> {
  const safeFileName = file.name.replace(/[^\w.\-]+/g, '_');
  const filePath = `${carId}/${Date.now()}-${safeFileName}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file, {
    upsert: false,
  });

  if (uploadError) {
    console.log('Upload car document file error:', {
      message: uploadError.message,
      name: uploadError.name,
      statusCode: 'statusCode' in uploadError ? uploadError.statusCode : undefined,
      error: uploadError,
    });
    return null;
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
  const { data, error } = await supabase
    .from('car_documents')
    .insert({
      car_id: carId,
      document_type: documentType,
      file_name: file.name,
      file_url: publicUrlData.publicUrl,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    console.log('Save car document row error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    await supabase.storage.from(BUCKET_NAME).remove([filePath]);
    return null;
  }

  return data as CarDocumentRecord;
}

export async function deleteCarDocument(document: CarDocumentRecord): Promise<boolean> {
  const filePath = getStoragePathFromPublicUrl(document.file_url);

  if (filePath) {
    const { error: storageError } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);

    if (storageError) {
      console.error('Delete car document file error:', {
        message: storageError.message,
        name: storageError.name,
      });
      return false;
    }
  }

  const { error } = await supabase.from('car_documents').delete().eq('id', document.id);

  if (error) {
    console.error('Delete car document row error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return false;
  }

  return true;
}

function getStoragePathFromPublicUrl(fileUrl: string) {
  const marker = `/storage/v1/object/public/${BUCKET_NAME}/`;
  const [, path] = fileUrl.split(marker);

  return path ? decodeURIComponent(path) : '';
}
