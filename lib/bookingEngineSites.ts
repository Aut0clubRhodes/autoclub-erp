'use client';

import {
  bookingEngineLocalConfig,
  type BookingEngineEmailTemplateId,
  type BookingEngineLocalConfig,
} from './bookingEngineLocalConfig';
import { supabase } from './supabaseClient';

export const BOOKING_ENGINE_SELECTED_SITE_STORAGE_KEY = 'autoclub_booking_engine_selected_site_id';
export const BOOKING_ENGINE_SELECTED_SITE_CHANGED_EVENT = 'autoclub-booking-engine-selected-site-changed';
export const BOOKING_ENGINE_SITES_CHANGED_EVENT = 'autoclub-booking-engine-sites-changed';

export type BookingEngineSiteSummary = {
  id: string;
  siteCode: string;
  name: string;
  domain: string;
  status: string;
  createdAt: string;
};

export type BookingEngineSiteInput = {
  siteName: string;
  domain: string;
  companyName: string;
  supportEmail: string;
  phone: string;
  whatsapp: string;
  primaryColor: string;
  secondaryColor: string;
  googleReviewUrl: string;
  currency: string;
  timezone: string;
  status?: string;
};

type SupabaseErrorShape = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

const defaultSiteInput: BookingEngineSiteInput = {
  siteName: '',
  domain: '',
  companyName: '',
  supportEmail: '',
  phone: '',
  whatsapp: '',
  primaryColor: '#073f5d',
  secondaryColor: '#059669',
  googleReviewUrl: bookingEngineLocalConfig.siteSettings.googleReviewUrl,
  currency: 'EUR',
  timezone: 'Europe/Athens',
  status: 'Active',
};

export const emptyBookingEngineSiteInput = (): BookingEngineSiteInput => ({ ...defaultSiteInput });

export const getSelectedBookingEngineSiteId = () => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(BOOKING_ENGINE_SELECTED_SITE_STORAGE_KEY) || '';
};

export const setSelectedBookingEngineSiteId = (siteId: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BOOKING_ENGINE_SELECTED_SITE_STORAGE_KEY, siteId);
  window.dispatchEvent(
    new CustomEvent(BOOKING_ENGINE_SELECTED_SITE_CHANGED_EVENT, { detail: { siteId } }),
  );
};

export const notifyBookingEngineSitesChanged = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(BOOKING_ENGINE_SITES_CHANGED_EVENT));
};

export const fetchBookingEngineSites = async (): Promise<BookingEngineSiteSummary[]> => {
  const { data, error } = await supabase
    .from('be_sites')
    .select('*')
    .order('domain', { ascending: true });

  if (error) {
    console.error('SITE MANAGER LOAD ERROR', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  return ((data || []) as Array<Record<string, string | null>>).map((row) => ({
    id: String(row.id || ''),
    siteCode: row.site_code || generateSiteCode(row.name || row.domain || row.id || 'SITE'),
    name: row.name || 'Booking site',
    domain: row.domain || '',
    status: row.status || 'Active',
    createdAt: row.created_at || '',
  }));
};

const generateSiteCode = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/https?:\/\//gi, '')
    .replace(/www\./gi, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase()
    .slice(0, 32) || 'SITE';

const isMissingColumnError = (error: SupabaseErrorShape) => {
  const errorText = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`.toLowerCase();
  return (
    error.code === 'PGRST204' ||
    error.code === '42703' ||
    errorText.includes('schema cache') ||
    errorText.includes('could not find') ||
    errorText.includes('column')
  );
};

const stripColumns = <T extends Record<string, unknown>>(payload: T, columns: string[]) => {
  const nextPayload: Record<string, unknown> = { ...payload };
  columns.forEach((column) => {
    delete nextPayload[column];
  });
  return nextPayload;
};

const probeMissingBeSiteColumns = async (columns: string[]) => {
  const missingColumns = new Set<string>();
  await Promise.all(
    columns.map(async (column) => {
      const { error } = await supabase
        .from('be_sites')
        .select(`id, ${column}`)
        .limit(1);

      if (!error) return;

      if (isMissingColumnError(error)) {
        missingColumns.add(column);
        return;
      }

      console.warn('SITE MANAGER COLUMN CHECK WARNING', {
        column,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
    }),
  );

  if (missingColumns.size > 0) {
    console.warn('SITE MANAGER MISSING OPTIONAL COLUMNS', Array.from(missingColumns));
  }
  return missingColumns;
};

const insertSiteWithOptionalColumns = async (payload: Record<string, unknown>) => {
  const { data, error } = await supabase.from('be_sites').insert(payload).select('*').single();
  if (!error) return { data, skippedColumns: [] as string[] };

  if (!isMissingColumnError(error)) {
    console.error('SITE MANAGER CREATE ERROR', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  const optionalColumns = [
    'site_code',
    'support_email',
    'phone',
    'whatsapp',
    'whatsapp_number',
    'primary_color',
    'secondary_color',
    'google_review_url',
    'currency',
    'timezone',
    'website_url',
    'default_pickup_time',
    'default_return_time',
    'review_enabled',
    'review_delay_days',
    'theme_layout',
    'custom_css',
    'reservation_destination',
  ];
  const fallbackPayload = stripColumns(payload, optionalColumns);
  const fallback = await supabase.from('be_sites').insert(fallbackPayload).select('*').single();
  if (fallback.error) {
    console.error('SITE MANAGER CREATE FALLBACK ERROR', {
      code: fallback.error.code,
      message: fallback.error.message,
      details: fallback.error.details,
      hint: fallback.error.hint,
    });
    throw fallback.error;
  }

  console.warn('SITE MANAGER CREATE SKIPPED OPTIONAL COLUMNS', optionalColumns);
  return { data: fallback.data, skippedColumns: optionalColumns };
};

const sitePayloadFromInput = (input: BookingEngineSiteInput) => ({
  name: (input.companyName || input.siteName || 'Booking site').trim(),
  site_code: generateSiteCode(input.siteName || input.companyName || input.domain || 'SITE'),
  domain: input.domain.trim(),
  admin_email: input.supportEmail.trim(),
  booking_notification_email: input.supportEmail.trim(),
  support_email: input.supportEmail.trim(),
  phone: input.phone.trim(),
  whatsapp: input.whatsapp.trim(),
  whatsapp_number: input.whatsapp.trim(),
  primary_color: input.primaryColor.trim() || '#073f5d',
  secondary_color: input.secondaryColor.trim() || '#059669',
  google_review_url: input.googleReviewUrl.trim(),
  currency: input.currency.trim() || 'EUR',
  timezone: input.timezone.trim() || 'Europe/Athens',
  website_url: input.domain.trim() ? `https://${input.domain.trim().replace(/^https?:\/\//i, '')}` : '',
  status: input.status === 'Inactive' ? 'Inactive' : 'Active',
  email_footer_text: bookingEngineLocalConfig.siteSettings.emailFooterText,
  default_pickup_time: '10:00',
  default_return_time: '10:00',
  review_enabled: true,
  review_delay_days: 1,
  theme_layout: 'Default',
  custom_css: '',
  reservation_destination: 'main_board',
});

const editableSiteOptionalColumns = [
  'site_code',
  'support_email',
  'phone',
  'whatsapp',
  'whatsapp_number',
  'primary_color',
  'secondary_color',
  'google_review_url',
  'currency',
  'timezone',
  'website_url',
] as const;

export const fetchBookingEngineSiteForEdit = async (siteId: string): Promise<BookingEngineSiteInput> => {
  const { data, error } = await supabase.from('be_sites').select('*').eq('id', siteId).single();
  if (error) throw error;
  const row = data as Record<string, string | null>;
  return {
    siteName: row.site_code || generateSiteCode(row.name || row.domain || siteId),
    domain: row.domain || '',
    companyName: row.name || '',
    supportEmail: row.support_email || row.admin_email || '',
    phone: row.phone || '',
    whatsapp: row.whatsapp || row.whatsapp_number || '',
    primaryColor: row.primary_color || '#073f5d',
    secondaryColor: row.secondary_color || '#059669',
    googleReviewUrl: row.google_review_url || bookingEngineLocalConfig.siteSettings.googleReviewUrl,
    currency: row.currency || 'EUR',
    timezone: row.timezone || 'Europe/Athens',
    status: row.status || 'Active',
  };
};

export const updateBookingEngineSite = async (siteId: string, input: BookingEngineSiteInput) => {
  const payload = sitePayloadFromInput(input);
  const missingColumns = await probeMissingBeSiteColumns([...editableSiteOptionalColumns]);
  const writablePayload = stripColumns(payload, Array.from(missingColumns));
  const { error } = await supabase.from('be_sites').update(writablePayload).eq('id', siteId);
  if (error) {
    console.error('SITE MANAGER UPDATE ERROR', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }
  notifyBookingEngineSitesChanged();
  setSelectedBookingEngineSiteId(siteId);
  return { skippedColumns: Array.from(missingColumns) };
};

const groupPayload = (
  group: BookingEngineLocalConfig['groups'][number],
  siteId: string,
) => ({
  site_id: siteId,
  code: group.code,
  name: group.name,
  description: group.notes || '',
  status: group.active ? 'Active' : 'Inactive',
});

const locationPayload = (
  location: BookingEngineLocalConfig['locations'][number],
  siteId: string,
) => ({
  site_id: siteId,
  name: location.name,
  type: location.type,
  active: location.active,
  fee: location.fee,
  status: location.active ? 'Active' : 'Inactive',
});

const featurePayload = (
  feature: BookingEngineLocalConfig['features'][number],
  siteId: string,
) => ({
  site_id: siteId,
  name: feature.name,
});

const extraPayload = (
  extra: BookingEngineLocalConfig['extras'][number],
  siteId: string,
) => ({
  site_id: siteId,
  name: extra.name,
  description: extra.description,
  pricing_mode: extra.pricingMode,
  price: Number(extra.price) || 0,
  image_url: extra.imageUrl,
  status: extra.status,
  maximum_quantity: extra.maximumQuantity ? Number(extra.maximumQuantity) : null,
});

const couponPayload = (
  coupon: BookingEngineLocalConfig['coupons'][number],
  siteId: string,
) => ({
  site_id: siteId,
  code: coupon.code,
  discount_type: coupon.discountType,
  discount_value: Number(coupon.discountValue) || 0,
  valid_from: coupon.validFrom || null,
  valid_to: coupon.validTo || null,
  minimum_days: coupon.minimumDays ? Number(coupon.minimumDays) : null,
  allowed_group_codes: coupon.allowedGroupCodes || [],
  usage_limit: coupon.usageLimit ? Number(coupon.usageLimit) : null,
  status: coupon.status,
});

const paymentMethodPayload = (
  method: BookingEngineLocalConfig['paymentMethods'][number],
  siteId: string,
) => ({
  site_id: siteId,
  name: method.name,
  type: method.type,
  description: method.description,
  deposit_required: method.depositRequired,
  deposit_amount: method.depositAmount ? Number(method.depositAmount) : null,
  status: method.status,
});

const bookingSettingsPayload = (siteId: string) => ({
  site_id: siteId,
  advance_booking_active: true,
  advance_booking_hours: 48,
  minimum_rental_days: 3,
  default_language: 'English',
  require_rental_terms: true,
  show_marketing_consent: true,
  terms_url: '',
  new_reservation_status: 'Pending',
});

const checkoutFieldPayload = (
  field: BookingEngineLocalConfig['checkoutFields'][number],
  siteId: string,
  sortOrder: number,
) => ({
  site_id: siteId,
  field_key: field.id,
  name: field.name,
  field_type: field.fieldType,
  enabled: field.enabled,
  required: field.required,
  label: field.label,
  options: field.options || [],
  built_in: Boolean(field.builtIn),
  sort_order: sortOrder,
});

const emailTemplatePayload = (
  template: BookingEngineLocalConfig['emailSettings']['templates'][BookingEngineEmailTemplateId],
  siteId: string,
) => ({
  site_id: siteId,
  template_key: template.id,
  label: template.label,
  active: template.active,
  subject: template.subject,
  message: template.message,
});

export const seedDefaultBookingEngineSiteConfig = async (siteId: string) => {
  const config = bookingEngineLocalConfig;
  const inserts = [
    supabase.from('be_groups').insert(config.groups.map((group) => groupPayload(group, siteId))),
    supabase.from('be_locations').insert(config.locations.map((location) => locationPayload(location, siteId))),
    supabase.from('be_features').insert(config.features.map((feature) => featurePayload(feature, siteId))),
    supabase.from('be_extras').insert(config.extras.map((extra) => extraPayload(extra, siteId))),
    supabase.from('be_coupons').insert(config.coupons.map((coupon) => couponPayload(coupon, siteId))),
    supabase.from('be_payment_methods').insert(config.paymentMethods.map((method) => paymentMethodPayload(method, siteId))),
    supabase.from('be_booking_settings').insert(bookingSettingsPayload(siteId)),
    supabase.from('be_checkout_fields').insert(config.checkoutFields.map((field, index) => checkoutFieldPayload(field, siteId, index))),
    supabase.from('be_email_templates').insert(
      (Object.keys(config.emailSettings.templates) as BookingEngineEmailTemplateId[]).map((templateId) =>
        emailTemplatePayload(config.emailSettings.templates[templateId], siteId),
      ),
    ),
  ];

  const results = await Promise.all(inserts);
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    console.error('SITE MANAGER DEFAULT SEED ERROR', {
      code: failed.error.code,
      message: failed.error.message,
      details: failed.error.details,
      hint: failed.error.hint,
    });
    throw failed.error;
  }
};

export const createBookingEngineSite = async (input: BookingEngineSiteInput) => {
  const { data, skippedColumns } = await insertSiteWithOptionalColumns(sitePayloadFromInput(input));
  const siteId = String((data as { id?: string })?.id || '');
  if (!siteId) throw new Error('Created site did not return an id.');
  await seedDefaultBookingEngineSiteConfig(siteId);
  setSelectedBookingEngineSiteId(siteId);
  notifyBookingEngineSitesChanged();
  return { siteId, skippedColumns };
};

const cloneTable = async (
  table: string,
  sourceSiteId: string,
  targetSiteId: string,
  omitColumns: string[] = ['id', 'created_at', 'updated_at'],
) => {
  const { data, error } = await supabase.from(table).select('*').eq('site_id', sourceSiteId);
  if (error) throw error;
  const rows = ((data || []) as Record<string, unknown>[]).map((row) => {
    const nextRow: Record<string, unknown> = { ...row, site_id: targetSiteId };
    omitColumns.forEach((column) => delete nextRow[column]);
    return nextRow;
  });
  if (!rows.length) return;
  const result = await supabase.from(table).insert(rows);
  if (result.error) throw result.error;
};

export const duplicateBookingEngineSite = async (sourceSiteId: string) => {
  const { data: source, error } = await supabase.from('be_sites').select('*').eq('id', sourceSiteId).single();
  if (error) throw error;
  const sourceRow = source as Record<string, unknown>;
  const payload = { ...sourceRow };
  delete payload.id;
  delete payload.created_at;
  delete payload.updated_at;
  payload.name = `${String(sourceRow.name || 'Booking site')} Copy`;
  payload.domain = `${String(sourceRow.domain || 'copy').replace(/^https?:\/\//i, '')}-copy`;
  payload.status = 'Active';

  const { data: target } = await insertSiteWithOptionalColumns(payload);
  const targetSiteId = String((target as { id?: string })?.id || '');
  if (!targetSiteId) throw new Error('Duplicated site did not return an id.');

  await cloneTable('be_groups', sourceSiteId, targetSiteId);
  await cloneTable('be_locations', sourceSiteId, targetSiteId);
  await cloneTable('be_features', sourceSiteId, targetSiteId);
  await cloneTable('be_extras', sourceSiteId, targetSiteId);
  await cloneTable('be_coupons', sourceSiteId, targetSiteId);
  await cloneTable('be_payment_methods', sourceSiteId, targetSiteId);
  await cloneTable('be_booking_settings', sourceSiteId, targetSiteId);
  await cloneTable('be_checkout_fields', sourceSiteId, targetSiteId);
  await cloneTable('be_email_templates', sourceSiteId, targetSiteId);

  setSelectedBookingEngineSiteId(targetSiteId);
  notifyBookingEngineSitesChanged();
  return targetSiteId;
};

export const updateBookingEngineSiteStatus = async (siteId: string, status: 'Active' | 'Inactive') => {
  const { error } = await supabase.from('be_sites').update({ status }).eq('id', siteId);
  if (error) throw error;
  notifyBookingEngineSitesChanged();
};

export const deleteBookingEngineSiteIfSafe = async (siteId: string) => {
  const { count, error: countError } = await supabase
    .from('be_reservations')
    .select('id', { count: 'exact', head: true })
    .eq('site_id', siteId);
  if (countError) throw countError;
  if ((count || 0) > 0) {
    throw new Error('This site has reservations and cannot be deleted safely. Disable it instead.');
  }

  const configTables = [
    'be_email_templates',
    'be_checkout_fields',
    'be_booking_settings',
    'be_payment_methods',
    'be_coupons',
    'be_extras',
    'be_features',
    'be_locations',
    'be_groups',
  ];
  for (const table of configTables) {
    const result = await supabase.from(table).delete().eq('site_id', siteId);
    if (result.error) throw result.error;
  }
  const { error } = await supabase.from('be_sites').delete().eq('id', siteId);
  if (error) throw error;
  notifyBookingEngineSitesChanged();
};
