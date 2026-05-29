import { supabase } from './supabaseClient';

export type NotificationRecord = {
  id: string;
  reservation_id: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

const logNotificationWarning = (label: string, error: unknown) => {
  const notificationError = error as { message?: string; details?: string; hint?: string; code?: string } | null;

  console.warn(label, {
    message: notificationError?.message || 'Unknown notifications error',
    details: notificationError?.details || '',
    hint: notificationError?.hint || '',
    code: notificationError?.code || '',
    raw: error,
  });
};

const logNotificationError = (label: string, error: unknown) => {
  const notificationError = error as { message?: string; details?: string; hint?: string; code?: string } | null;

  console.error(label, {
    message: notificationError?.message || 'Unknown notifications error',
    details: notificationError?.details || '',
    hint: notificationError?.hint || '',
    code: notificationError?.code || '',
    raw: error,
  });
};

export async function fetchLatestNotifications(limit = 12): Promise<NotificationRecord[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, reservation_id, type, title, message, is_read, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    logNotificationWarning('Fetch notifications warning:', error);
    return [];
  }

  return (data || []) as NotificationRecord[];
}

export async function createNotification(payload: {
  reservation_id?: string | null;
  type: string;
  title: string;
  message: string;
}) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      reservation_id: payload.reservation_id ?? null,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      is_read: false,
    })
    .select('id, reservation_id, type, title, message, is_read, created_at')
    .single();

  if (error) {
    logNotificationError('Create notification error:', error);
    return null;
  }

  return data as NotificationRecord;
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);

  if (error) {
    logNotificationWarning('Mark notification read warning:', error);
    return false;
  }

  return true;
}

export async function markAllNotificationsRead() {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false);

  if (error) {
    logNotificationWarning('Mark all notifications read warning:', error);
    return false;
  }

  return true;
}
