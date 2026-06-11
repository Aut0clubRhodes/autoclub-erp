import { supabase } from './supabaseClient';

export type NotificationRecord = {
  id: string;
  reservation_id: string | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
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
    .select('id, reservation_id, type, title, message, read, created_at')
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
  display_name?: string;
}) {
  const insertPayload = {
    reservation_id: payload.reservation_id ?? null,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    read: false,
  };

  const { data, error } = await supabase
    .from('notifications')
    .insert(insertPayload)
    .select('id, reservation_id, type, title, message, read, created_at')
    .single();

  if (error) {
    console.error('Notification creation failed', {
      event_type: payload.type,
      reservation_id: payload.reservation_id ?? null,
      display_name: payload.display_name || '',
      payload: insertPayload,
      supabase_error: error,
    });
    logNotificationError('Create notification error:', error);
    return null;
  }

  console.log('Notification created', {
    event_type: payload.type,
    reservation_id: payload.reservation_id ?? null,
    display_name: payload.display_name || '',
    payload: insertPayload,
  });

  return data as NotificationRecord;
}

export async function createNotificationOnce(payload: {
  reservation_id: string;
  type: string;
  title: string;
  message: string;
  display_name?: string;
}) {
  const { data: existingNotification, error: existingError } = await supabase
    .from('notifications')
    .select('id, reservation_id, type, title, message, read, created_at')
    .eq('reservation_id', payload.reservation_id)
    .eq('type', payload.type)
    .limit(1);

  if (existingError) {
    logNotificationWarning('Check existing notification warning:', existingError);
  }

  if (existingNotification?.[0]) {
    return existingNotification[0] as NotificationRecord;
  }

  return createNotification(payload);
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
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
    .update({ read: true })
    .eq('read', false);

  if (error) {
    logNotificationWarning('Mark all notifications read warning:', error);
    return false;
  }

  return true;
}

export async function markReservationNotificationsRead(reservationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('reservation_id', reservationId)
    .eq('read', false);

  if (error) {
    logNotificationWarning('Mark reservation notifications read warning:', error);
    return false;
  }

  return true;
}
