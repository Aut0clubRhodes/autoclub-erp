import { supabase } from './supabaseClient';
import {
  GOOGLE_REVIEW_URL,
  buildBookingEmailEventPayload,
  normalizeSupabaseEmailTemplates,
  type BookingEngineEmailReservationContext,
  type BookingEngineEmailSiteContext,
  type BookingEngineEmailTemplateRow,
} from './bookingEngineEmailEngine';

type SchedulerSiteRow = {
  id: string;
  name?: string | null;
  domain?: string | null;
  admin_email?: string | null;
  booking_notification_email?: string | null;
  logo_image?: string | null;
  whatsapp_number?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  support_email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  website_url?: string | null;
  google_review_url?: string | null;
  email_header_image?: string | null;
  email_footer_text?: string | null;
  currency?: string | null;
  review_enabled?: boolean | null;
  review_delay_days?: string | number | null;
};

type SchedulerReservationRow = {
  id: string;
  site_id: string;
  reservation_id?: string | null;
  reservation_code?: string | null;
  customer_name?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  country_code?: string | null;
  date_of_birth?: string | null;
  accommodation_name?: string | null;
  pickup_location?: string | null;
  return_location?: string | null;
  pickup_date?: string | null;
  pickup_time?: string | null;
  return_date?: string | null;
  return_time?: string | null;
  vehicle_category?: string | null;
  extras?: BookingEngineEmailReservationContext['extras'] | null;
  payment_method?: string | null;
  payment_link?: string | null;
  total_price?: string | number | null;
  status?: string | null;
  notes?: string | null;
  flight_number?: string | null;
  hotel_villa_apartment?: string | null;
  review_email_sent?: boolean | null;
};

export type ReviewSchedulerResult = {
  checked: number;
  sent: number;
  skipped: number;
  failed: number;
  errors: string[];
};

type RunReviewSchedulerOptions = {
  sendEmailPayload: (payload: ReturnType<typeof buildBookingEmailEventPayload>) => Promise<{ success: boolean; message?: string }>;
  now?: Date;
};

const REQUIRED_RESERVATION_REVIEW_COLUMNS = [
  'review_email_sent',
  'review_email_sent_at',
  'review_email_error',
];

const getErrorField = (error: unknown, field: 'code' | 'message' | 'details' | 'hint' | 'stack') => {
  if (!error || typeof error !== 'object' || !(field in error)) return undefined;
  const value = (error as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : undefined;
};

const logSupabaseQueryError = ({
  table,
  purpose,
  error,
}: {
  table: string;
  purpose: string;
  error: unknown;
}) => {
  console.error('BOOKING REVIEW SCHEDULER SUPABASE ERROR', {
    table,
    purpose,
    code: getErrorField(error, 'code') || '',
    message: getErrorField(error, 'message') || '',
    details: getErrorField(error, 'details') || '',
    hint: getErrorField(error, 'hint') || '',
  });
  console.error(error);
};

const formatAmount = (value: string | number | null | undefined, currency = 'EUR') =>
  new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency,
    minimumFractionDigits: Number.isInteger(Number(value || 0)) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const dateOnly = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const addDays = (value: string, days: number) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date;
};

const isCancelledStatus = (value: string | null | undefined) =>
  String(value || '').trim().toUpperCase() === 'CANCELLED';

const parseVehicleCategory = (value = '') => {
  const [carName, groupPart] = value.split('/').map((part) => part.trim());
  const group = groupPart?.replace(/^group\s*/i, '').trim() || '';
  return {
    carName: carName || value || 'Selected vehicle',
    group,
  };
};

const mapReservationContext = (
  reservation: SchedulerReservationRow,
  currency = 'EUR',
): BookingEngineEmailReservationContext => {
  const vehicle = parseVehicleCategory(reservation.vehicle_category || '');
  const totalPrice = formatAmount(reservation.total_price, currency);

  return {
    reservationId: reservation.reservation_id || reservation.reservation_code || reservation.id,
    customerName: reservation.customer_name || 'Customer',
    email: reservation.email || '',
    phone: reservation.phone || '',
    country: reservation.country || '',
    countryCode: reservation.country_code || '',
    dateOfBirth: reservation.date_of_birth || '',
    accommodationName: reservation.accommodation_name || reservation.hotel_villa_apartment || '',
    flightNumber: reservation.flight_number || '',
    notes: reservation.notes || '',
    carName: vehicle.carName,
    group: vehicle.group,
    pickupDate: reservation.pickup_date || '',
    pickupTime: reservation.pickup_time || '',
    returnDate: reservation.return_date || '',
    returnTime: reservation.return_time || '',
    pickupLocation: reservation.pickup_location || '',
    returnLocation: reservation.return_location || '',
    rentalTotal: totalPrice,
    totalPrice,
    paymentMethod: reservation.payment_method || '',
    paymentLink: reservation.payment_link || '',
    extras: Array.isArray(reservation.extras) ? reservation.extras : [],
  };
};

const mapSiteContext = (site: SchedulerSiteRow): BookingEngineEmailSiteContext => ({
  siteId: site.id,
  siteName: site.name || site.domain || 'Booking site',
  adminEmail: site.booking_notification_email || site.admin_email || '',
  domain: site.domain || '',
  logoImage: site.logo_image || '',
  whatsappNumber: site.whatsapp || site.whatsapp_number || '',
  primaryColor: site.primary_color || '',
  secondaryColor: site.secondary_color || '',
  supportEmail: site.support_email || site.admin_email || '',
  phone: site.phone || '',
  websiteUrl: site.website_url || '',
  website_url: site.website_url || '',
  googleReviewUrl: site.google_review_url || '',
  emailHeaderImage: site.email_header_image || '',
  emailFooterText: site.email_footer_text || '',
  currency: site.currency || 'EUR',
});

const withSiteReviewUrl = (
  templates: ReturnType<typeof normalizeSupabaseEmailTemplates>['templates'],
  reviewUrl: string,
) => {
  const template = templates.customer_reminder;
  const fallbackMessage =
    `Hello {{customer_name}},\n\nThank you for choosing {{car_name}} for reservation {{reservation_id}}.\n\n` +
    `We hope everything went well with your rental.\nPlease leave us a quick Google review:\n${reviewUrl}`;
  const sourceMessage = template?.message?.trim() || fallbackMessage;
  const messageWithReviewUrl = sourceMessage.includes(reviewUrl)
    ? sourceMessage
    : sourceMessage.includes(GOOGLE_REVIEW_URL)
      ? sourceMessage.replaceAll(GOOGLE_REVIEW_URL, reviewUrl)
      : `${sourceMessage}\n${reviewUrl}`;

  return {
    ...templates,
    customer_reminder: {
      ...template,
      id: 'customer_reminder' as const,
      label: template?.label || 'Review Request',
      active: template?.active !== false,
      subject: template?.subject || 'How was your rental with {{car_name}}?',
      message: messageWithReviewUrl,
    },
  };
};

export const probeReservationReviewColumns = async () => {
  const missing: string[] = [];

  for (const column of REQUIRED_RESERVATION_REVIEW_COLUMNS) {
    let error: unknown = null;

    try {
      const result = await supabase.from('be_reservations').select(`id, ${column}`).limit(1);
      error = result.error;
    } catch (queryError) {
      error = queryError;
    }

    if (error) {
      missing.push(column);
      console.warn('REVIEW SCHEDULER MISSING COLUMN', {
        table: 'be_reservations',
        column,
        code: getErrorField(error, 'code') || '',
        message: getErrorField(error, 'message') || '',
        details: getErrorField(error, 'details') || '',
        hint: getErrorField(error, 'hint') || '',
      });
      logSupabaseQueryError({
        table: 'be_reservations',
        purpose: `probe optional review scheduler column ${column}`,
        error,
      });
    }
  }

  return missing;
};

export const runBookingEngineReviewScheduler = async ({
  sendEmailPayload,
  now = new Date(),
}: RunReviewSchedulerOptions): Promise<ReviewSchedulerResult> => {
  const result: ReviewSchedulerResult = {
    checked: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };
  const missingColumns = await probeReservationReviewColumns();

  if (missingColumns.length) {
    result.failed += missingColumns.length;
    result.errors.push(`Missing be_reservations columns: ${missingColumns.join(', ')}`);
    return result;
  }

  let sites: SchedulerSiteRow[] | null = null;
  let siteError: unknown = null;

  try {
    const result = await supabase
      .from('be_sites')
      .select('*')
      .eq('review_enabled', true);
    sites = (result.data || []) as SchedulerSiteRow[];
    siteError = result.error;
  } catch (queryError) {
    siteError = queryError;
  }

  if (siteError) {
    logSupabaseQueryError({
      table: 'be_sites',
      purpose: 'load review-enabled booking sites',
      error: siteError,
    });
    result.failed += 1;
    result.errors.push(`Failed to load review-enabled sites: ${getErrorField(siteError, 'message') || String(siteError)}`);
    return result;
  }

  const today = dateOnly(now);

  for (const site of sites || []) {
    const reviewUrl = String(site.google_review_url || '').trim();
    const delayDays = Math.max(0, Number(site.review_delay_days ?? 1) || 0);

    if (!reviewUrl) {
      result.skipped += 1;
      continue;
    }

    let reservations: SchedulerReservationRow[] | null = null;
    let reservationError: unknown = null;
    let templateRows: BookingEngineEmailTemplateRow[] | null = null;
    let templateError: unknown = null;

    try {
      const reservationResult = await supabase
          .from('be_reservations')
          .select('*')
          .eq('site_id', site.id)
          .or('review_email_sent.is.null,review_email_sent.eq.false')
          .not('email', 'is', null)
          .not('return_date', 'is', null);
      reservations = (reservationResult.data || []) as SchedulerReservationRow[];
      reservationError = reservationResult.error;
    } catch (queryError) {
      reservationError = queryError;
    }

    try {
      const templateResult = await supabase
        .from('be_email_templates')
        .select('*')
        .eq('site_id', site.id);
      templateRows = (templateResult.data || []) as BookingEngineEmailTemplateRow[];
      templateError = templateResult.error;
    } catch (queryError) {
      templateError = queryError;
    }

    if (reservationError) {
      logSupabaseQueryError({
        table: 'be_reservations',
        purpose: `load eligible review reservations for site ${site.id}`,
        error: reservationError,
      });
      result.failed += 1;
      result.errors.push(`Failed to load reservations for ${site.name || site.id}: ${getErrorField(reservationError, 'message') || String(reservationError)}`);
      continue;
    }

    if (templateError) {
      logSupabaseQueryError({
        table: 'be_email_templates',
        purpose: `load review email templates for site ${site.id}`,
        error: templateError,
      });
      result.failed += 1;
      result.errors.push(`Failed to load email templates for ${site.name || site.id}: ${getErrorField(templateError, 'message') || String(templateError)}`);
      continue;
    }

    const templates = withSiteReviewUrl(
      normalizeSupabaseEmailTemplates((templateRows || []) as BookingEngineEmailTemplateRow[], site.admin_email || '').templates,
      reviewUrl,
    );
    const siteContext = mapSiteContext(site);

    for (const reservation of (reservations || []) as SchedulerReservationRow[]) {
      result.checked += 1;

      if (isCancelledStatus(reservation.status) || !reservation.email || !reservation.return_date) {
        result.skipped += 1;
        continue;
      }

      const eligibleDate = addDays(reservation.return_date, delayDays);
      if (!eligibleDate || eligibleDate > today) {
        result.skipped += 1;
        continue;
      }

      const reservationContext = mapReservationContext(reservation, site.currency || 'EUR');
      const payload = buildBookingEmailEventPayload({
        eventType: 'review_request',
        templates,
        site: siteContext,
        reservation: reservationContext,
      });

      if (!payload.emails.length) {
        result.skipped += 1;
        continue;
      }

      try {
        const sendResult = await sendEmailPayload(payload);
        if (!sendResult.success) {
          throw new Error(sendResult.message || 'Review email send failed');
        }

        let updateError: unknown = null;
        try {
          const updateResult = await supabase
            .from('be_reservations')
            .update({
              review_email_sent: true,
              review_email_sent_at: new Date().toISOString(),
              review_email_error: null,
            })
            .eq('id', reservation.id);
          updateError = updateResult.error;
        } catch (queryError) {
          updateError = queryError;
        }

        if (updateError) {
          logSupabaseQueryError({
            table: 'be_reservations',
            purpose: `mark review email sent for reservation ${reservation.id}`,
            error: updateError,
          });
          throw updateError;
        }
        result.sent += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown review scheduler error';
        result.failed += 1;
        result.errors.push(`${reservationContext.reservationId}: ${message}`);
        try {
          const updateErrorResult = await supabase
            .from('be_reservations')
            .update({ review_email_error: message })
            .eq('id', reservation.id);
          if (updateErrorResult.error) {
            logSupabaseQueryError({
              table: 'be_reservations',
              purpose: `store review email error for reservation ${reservation.id}`,
              error: updateErrorResult.error,
            });
          }
        } catch (queryError) {
          logSupabaseQueryError({
            table: 'be_reservations',
            purpose: `store review email error for reservation ${reservation.id}`,
            error: queryError,
          });
        }
      }
    }
  }

  return result;
};
