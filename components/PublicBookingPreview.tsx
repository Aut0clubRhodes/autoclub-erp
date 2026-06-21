'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  bookingEngineLocalConfig,
  type BookingEngineGroup,
  type BookingEngineCarConfig,
  type BookingEngineCheckoutField,
  type BookingEngineCoupon,
  type BookingEngineExtra,
  type BookingEngineFeature,
  type BookingEngineLocalConfig,
  type BookingEngineLocation,
  type BookingEnginePaymentMethod,
  type BookingEngineSeasonPrice,
  type BookingEngineSiteSettings,
  type CheckoutFieldId,
  normalizeBookingEngineCheckoutFields,
} from '@/lib/bookingEngineLocalConfig';
import {
  buildBookingEmailEventPayload,
  normalizeSupabaseEmailTemplates,
  sendBookingEngineEmailEvent,
  type BookingEngineEmailTemplateRow,
} from '@/lib/bookingEngineEmailEngine';
import { supabase } from '@/lib/supabaseClient';

type PreviewStep = 'search' | 'results' | 'checkout' | 'success';
type BookingMode = 'Open' | 'On Request' | 'Hidden';
type SelectedPreviewCar = BookingEngineCarConfig & {
  groupName: string;
  featureNames: string[];
  pricePerDay: number;
  priceOnRequest: boolean;
  mode: BookingMode;
  accent: string;
};

type BeSiteRow = {
  id: string;
  name?: string | null;
  domain?: string | null;
  admin_email?: string | null;
  booking_notification_email?: string | null;
  currency?: string | null;
  timezone?: string | null;
  default_language?: string | null;
  whatsapp_number?: string | null;
  terms_url?: string | null;
  privacy_policy_url?: string | null;
  logo_image?: string | null;
  status?: string | null;
  internal_notes?: string | null;
};

type BeGroupRow = {
  id: string | number;
  code?: string | null;
  name?: string | null;
  description?: string | null;
  status?: string | null;
};

type BeVehicleCategoryRow = {
  id: string | number;
  name?: string | null;
  group_code?: string | null;
  description?: string | null;
  image_url?: string | null;
  feature_ids?: string[] | null;
  location_ids?: string[] | null;
  status?: string | null;
};

type BeFeatureRow = {
  id: string | number;
  name?: string | null;
};

type BePricingSeasonRow = {
  id: string | number;
  group_code?: string | null;
  season_name?: string | null;
  from_date?: string | null;
  to_date?: string | null;
  pricing_tiers?: BookingEngineSeasonPrice['tiers'] | null;
  website_mode?: string | null;
  status?: string | null;
  notes?: string | null;
};

type BeLocationRow = {
  id: string | number;
  name?: string | null;
  type?: string | null;
  active?: boolean | null;
  fee?: string | number | null;
  status?: string | null;
};

type BeExtraRow = {
  id: string | number;
  name?: string | null;
  description?: string | null;
  pricing_mode?: string | null;
  price?: string | number | null;
  image_url?: string | null;
  status?: string | null;
  maximum_quantity?: string | number | null;
};

type BeCouponRow = {
  id: string | number;
  code?: string | null;
  discount_type?: string | null;
  discount_value?: string | number | null;
  valid_from?: string | null;
  valid_to?: string | null;
  minimum_days?: string | number | null;
  allowed_group_codes?: string[] | null;
  usage_limit?: string | number | null;
  status?: string | null;
};

type BePaymentMethodRow = {
  id: string | number;
  name?: string | null;
  type?: string | null;
  description?: string | null;
  deposit_required?: boolean | null;
  depositRequired?: boolean | null;
  deposit_amount?: string | number | null;
  depositAmount?: string | number | null;
  status?: string | null;
  active?: boolean | null;
};

type BeCheckoutFieldRow = {
  id: string | number;
  field_key?: string | null;
  name?: string | null;
  field_type?: string | null;
  enabled?: boolean | null;
  required?: boolean | null;
  label?: string | null;
  options?: string[] | null;
  built_in?: boolean | null;
  sort_order?: number | null;
};

type BeBookingSettingsRow = {
  id?: string | null;
  site_id?: string | null;
  advance_booking_active?: boolean | null;
  advance_booking_hours?: string | number | null;
  default_language?: string | null;
  require_rental_terms?: boolean | null;
  show_marketing_consent?: boolean | null;
  terms_url?: string | null;
  new_reservation_status?: string | null;
};

const STEP_ITEMS: Array<{ id: PreviewStep; label: string; index: number }> = [
  { id: 'search', label: 'Search', index: 1 },
  { id: 'results', label: 'Choose a car', index: 2 },
  { id: 'checkout', label: 'Your details', index: 3 },
  { id: 'success', label: 'Confirmation', index: 4 },
];

const STEP_INDEX: Record<PreviewStep, number> = {
  search: 1,
  results: 2,
  checkout: 3,
  success: 4,
};

const CUSTOMER_FIELD_TYPES: Partial<Record<CheckoutFieldId, 'text' | 'email' | 'tel'>> = {
  email: 'email',
  phone: 'tel',
  date_of_birth: 'text',
};

const BUILT_IN_CHECKOUT_FIELD_IDS = new Set([
  'full_name',
  'email',
  'country',
  'phone',
  'date_of_birth',
  'accommodation_name',
  'flight_number',
  'notes',
]);

type CountryDialCode = {
  name: string;
  iso: string;
  flag: string;
  dialCode: string;
};

const COUNTRY_DIAL_CODES: CountryDialCode[] = [
  { name: 'Greece', iso: 'GR', flag: '🇬🇷', dialCode: '+30' },
  { name: 'Italy', iso: 'IT', flag: '🇮🇹', dialCode: '+39' },
  { name: 'United Kingdom', iso: 'GB', flag: '🇬🇧', dialCode: '+44' },
  { name: 'France', iso: 'FR', flag: '🇫🇷', dialCode: '+33' },
  { name: 'Germany', iso: 'DE', flag: '🇩🇪', dialCode: '+49' },
  { name: 'Czech Republic', iso: 'CZ', flag: '🇨🇿', dialCode: '+420' },
  { name: 'Poland', iso: 'PL', flag: '🇵🇱', dialCode: '+48' },
  { name: 'Netherlands', iso: 'NL', flag: '🇳🇱', dialCode: '+31' },
  { name: 'Belgium', iso: 'BE', flag: '🇧🇪', dialCode: '+32' },
  { name: 'Austria', iso: 'AT', flag: '🇦🇹', dialCode: '+43' },
  { name: 'Switzerland', iso: 'CH', flag: '🇨🇭', dialCode: '+41' },
  { name: 'Sweden', iso: 'SE', flag: '🇸🇪', dialCode: '+46' },
  { name: 'Norway', iso: 'NO', flag: '🇳🇴', dialCode: '+47' },
  { name: 'Denmark', iso: 'DK', flag: '🇩🇰', dialCode: '+45' },
  { name: 'Finland', iso: 'FI', flag: '🇫🇮', dialCode: '+358' },
  { name: 'Ireland', iso: 'IE', flag: '🇮🇪', dialCode: '+353' },
  { name: 'Spain', iso: 'ES', flag: '🇪🇸', dialCode: '+34' },
  { name: 'Portugal', iso: 'PT', flag: '🇵🇹', dialCode: '+351' },
  { name: 'Cyprus', iso: 'CY', flag: '🇨🇾', dialCode: '+357' },
  { name: 'United States', iso: 'US', flag: '🇺🇸', dialCode: '+1' },
  { name: 'Canada', iso: 'CA', flag: '🇨🇦', dialCode: '+1' },
  { name: 'Australia', iso: 'AU', flag: '🇦🇺', dialCode: '+61' },
  { name: 'Israel', iso: 'IL', flag: '🇮🇱', dialCode: '+972' },
  { name: 'Turkey', iso: 'TR', flag: '🇹🇷', dialCode: '+90' },
  { name: 'Romania', iso: 'RO', flag: '🇷🇴', dialCode: '+40' },
  { name: 'Bulgaria', iso: 'BG', flag: '🇧🇬', dialCode: '+359' },
  { name: 'Hungary', iso: 'HU', flag: '🇭🇺', dialCode: '+36' },
  { name: 'Slovakia', iso: 'SK', flag: '🇸🇰', dialCode: '+421' },
  { name: 'Slovenia', iso: 'SI', flag: '🇸🇮', dialCode: '+386' },
  { name: 'Croatia', iso: 'HR', flag: '🇭🇷', dialCode: '+385' },
  { name: 'Lithuania', iso: 'LT', flag: '🇱🇹', dialCode: '+370' },
  { name: 'Latvia', iso: 'LV', flag: '🇱🇻', dialCode: '+371' },
  { name: 'Estonia', iso: 'EE', flag: '🇪🇪', dialCode: '+372' },
  { name: 'Ukraine', iso: 'UA', flag: '🇺🇦', dialCode: '+380' },
  { name: 'Serbia', iso: 'RS', flag: '🇷🇸', dialCode: '+381' },
  { name: 'South Africa', iso: 'ZA', flag: '🇿🇦', dialCode: '+27' },
  { name: 'Brazil', iso: 'BR', flag: '🇧🇷', dialCode: '+55' },
  { name: 'Argentina', iso: 'AR', flag: '🇦🇷', dialCode: '+54' },
  { name: 'India', iso: 'IN', flag: '🇮🇳', dialCode: '+91' },
  { name: 'China', iso: 'CN', flag: '🇨🇳', dialCode: '+86' },
  { name: 'Japan', iso: 'JP', flag: '🇯🇵', dialCode: '+81' },
];

const carAccentByIndex = [
  'from-sky-100 via-white to-cyan-50',
  'from-emerald-50 via-white to-sky-50',
  'from-amber-50 via-white to-rose-50',
  'from-indigo-50 via-white to-cyan-50',
];

const emptySupabaseBookingEngineConfig: BookingEngineLocalConfig = {
  ...bookingEngineLocalConfig,
  groups: [],
  cars: [],
  locations: [],
  features: [],
  extras: [],
  coupons: [],
  paymentMethods: [],
  checkoutFields: [],
  pricingSeasons: [],
  siteSettings: {
    ...bookingEngineLocalConfig.siteSettings,
    companyName: '',
    logoImage: '',
  },
};

const isBookingMode = (value: string | null | undefined): value is BookingMode =>
  value === 'Open' || value === 'On Request' || value === 'Hidden';

const mapSiteSettings = (row: BeSiteRow): BookingEngineSiteSettings => ({
  companyName: (row.name || '').trim(),
  domain: (row.domain || '').trim(),
  adminEmail: row.admin_email || '',
  bookingNotificationEmail: row.booking_notification_email || '',
  currency: row.currency || 'EUR',
  timezone: row.timezone || 'Europe/Athens',
  defaultLanguage: row.default_language || 'English',
  whatsappNumber: row.whatsapp_number || '',
  termsUrl: row.terms_url || '',
  privacyPolicyUrl: row.privacy_policy_url || '',
  logoImage: row.logo_image || '',
  status: row.status === 'Inactive' ? 'Inactive' : 'Active',
  internalNotes: row.internal_notes || '',
});

const mapGroup = (row: BeGroupRow): BookingEngineGroup => ({
  id: String(row.id),
  code: (row.code || '').trim(),
  name: (row.name || '').trim(),
  active: row.status !== 'Inactive',
  notes: row.description || '',
});

const mapCar = (row: BeVehicleCategoryRow): BookingEngineCarConfig => ({
  id: String(row.id),
  name: (row.name || '').trim(),
  groupCode: (row.group_code || '').trim(),
  description: row.description || '',
  imageUrl: row.image_url || '',
  featureIds: Array.isArray(row.feature_ids) ? row.feature_ids : [],
  status: isBookingMode(row.status) ? row.status : 'Open',
  locationIds: Array.isArray(row.location_ids) ? row.location_ids : [],
});

const mapFeature = (row: BeFeatureRow): BookingEngineFeature => ({
  id: String(row.id),
  name: (row.name || '').trim(),
});

const mapLocation = (row: BeLocationRow): BookingEngineLocation => ({
  id: String(row.id),
  name: (row.name || '').trim(),
  type:
    row.type === 'airport' || row.type === 'town' || row.type === 'hotel' || row.type === 'custom'
      ? row.type
      : 'custom',
  active: typeof row.active === 'boolean' ? row.active : row.status !== 'Inactive',
  fee: row.fee === null || row.fee === undefined ? '' : String(row.fee),
});

const mapExtra = (row: BeExtraRow): BookingEngineExtra => ({
  id: String(row.id),
  name: (row.name || '').trim(),
  description: row.description || '',
  pricingMode:
    row.pricing_mode === 'Per Booking' || row.pricing_mode === 'Free' || row.pricing_mode === 'Per Day'
      ? row.pricing_mode
      : 'Per Day',
  price: row.price === null || row.price === undefined ? '' : String(row.price),
  imageUrl: row.image_url || '',
  status: row.status === 'Inactive' ? 'Inactive' : 'Active',
  maximumQuantity:
    row.maximum_quantity === null || row.maximum_quantity === undefined
      ? ''
      : String(row.maximum_quantity),
});

const mapCoupon = (row: BeCouponRow): BookingEngineCoupon => ({
  id: String(row.id),
  code: (row.code || '').trim(),
  discountType: row.discount_type === 'Fixed Amount' ? 'Fixed Amount' : 'Percentage',
  discountValue:
    row.discount_value === null || row.discount_value === undefined
      ? ''
      : String(row.discount_value),
  validFrom: row.valid_from || '',
  validTo: row.valid_to || '',
  minimumDays: row.minimum_days === null || row.minimum_days === undefined ? '' : String(row.minimum_days),
  allowedGroupCodes: Array.isArray(row.allowed_group_codes) ? row.allowed_group_codes : [],
  usageLimit: row.usage_limit === null || row.usage_limit === undefined ? '' : String(row.usage_limit),
  status: row.status === 'Inactive' ? 'Inactive' : 'Active',
});

const mapPaymentMethod = (row: BePaymentMethodRow): BookingEnginePaymentMethod => {
  const normalizedType = (row.type || '').trim().toLowerCase();
  const depositRequired = row.deposit_required ?? row.depositRequired ?? false;
  const depositAmount = row.deposit_amount ?? row.depositAmount;
  const isActive =
    typeof row.active === 'boolean'
      ? row.active
      : (row.status || 'Active').trim().toLowerCase() !== 'inactive';

  return {
    id: String(row.id),
    name: (row.name || '').trim(),
    type:
      normalizedType === 'bank transfer' || normalizedType === 'bank_transfer'
        ? 'Bank Transfer'
        : normalizedType === 'payment link' || normalizedType === 'payment_link'
          ? 'Payment Link'
          : normalizedType === 'card' || normalizedType === 'card on delivery' || normalizedType === 'card_on_delivery'
            ? 'Card'
            : normalizedType === 'custom'
              ? 'Custom'
              : 'Pay on Arrival',
    description: row.description || '',
    depositRequired: Boolean(depositRequired),
    depositAmount: depositAmount === null || depositAmount === undefined ? '' : String(depositAmount),
    status: isActive ? 'Active' : 'Inactive',
  };
};

const mapCheckoutField = (row: BeCheckoutFieldRow): BookingEngineCheckoutField => ({
  id: row.field_key || String(row.id),
  name: row.name || row.label || 'Custom Field',
  fieldType:
    row.field_type === 'Textarea' ||
    row.field_type === 'Number' ||
    row.field_type === 'Email' ||
    row.field_type === 'Phone' ||
    row.field_type === 'Select' ||
    row.field_type === 'Text'
      ? row.field_type
      : 'Text',
  enabled: Boolean(row.enabled),
  required: Boolean(row.required),
  label: row.label || row.name || 'Custom Field',
  options: Array.isArray(row.options) ? row.options : [],
  builtIn: Boolean(row.built_in),
});

const mapPricingSeason = (row: BePricingSeasonRow): BookingEngineSeasonPrice => ({
  id: String(row.id),
  groupCode: (row.group_code || '').trim(),
  seasonName: (row.season_name || '').trim(),
  fromDate: row.from_date || '',
  toDate: row.to_date || '',
  tiers: Array.isArray(row.pricing_tiers)
    ? row.pricing_tiers.map((tier) => ({
        id: tier.id || `${row.id}-${tier.fromDays}-${tier.toDays}`,
        fromDays: String(tier.fromDays || ''),
        toDays: String(tier.toDays || ''),
        pricePerDay: String(tier.pricePerDay || ''),
      }))
    : [],
  websiteMode: isBookingMode(row.website_mode) ? row.website_mode : 'Open',
  status: row.status === 'Inactive' ? 'Inactive' : 'Active',
  notes: row.notes || '',
});

function formatDisplayDate(value: string) {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function getRentalDays(pickupDate: string, returnDate: string) {
  const start = new Date(`${pickupDate}T12:00:00`);
  const end = new Date(`${returnDate}T12:00:00`);
  const difference = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return Math.max(1, difference || 1);
}

function isDateInSeason(date: string, season: BookingEngineSeasonPrice) {
  return date >= season.fromDate && date <= season.toDate;
}

function getSeasonPriceForDays(season: BookingEngineSeasonPrice | undefined, rentalDays: number) {
  const matchingTier = season?.tiers.find((tier) => {
    const fromDays = Number(tier.fromDays || 0);
    const toDays = Number(tier.toDays || 0);
    return rentalDays >= fromDays && rentalDays <= toDays;
  });

  const price = Number(matchingTier?.pricePerDay || 0);
  return price > 0 ? price : null;
}

function getCouponDiscount(coupon: BookingEngineCoupon | undefined, subtotal: number) {
  if (!coupon || subtotal <= 0) return 0;

  const value = Number(coupon.discountValue || 0);
  if (value <= 0) return 0;

  const discount = coupon.discountType === 'Percentage' ? subtotal * (value / 100) : value;
  return Math.min(subtotal, Math.round(discount * 100) / 100);
}

export default function PublicBookingPreview() {
  const [step, setStep] = useState<PreviewStep>('search');
  const [selectedCar, setSelectedCar] = useState<SelectedPreviewCar | null>(null);
  const [bookingEngineConfig, setBookingEngineConfig] =
    useState<BookingEngineLocalConfig>(emptySupabaseBookingEngineConfig);
  const [beSiteId, setBeSiteId] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState('');
  const activeLocations = useMemo(
    () => bookingEngineConfig.locations.filter((location) => location.active),
    [bookingEngineConfig.locations],
  );
  const locationOptions = useMemo(
    () => activeLocations.map((location) => location.name),
    [activeLocations],
  );
  const returnLocationOptions = useMemo(
    () => ['Same as pickup', ...locationOptions],
    [locationOptions],
  );
  const activeExtras = useMemo(
    () => bookingEngineConfig.extras.filter((extra) => extra.status === 'Active'),
    [bookingEngineConfig.extras],
  );
  const activePaymentMethods = useMemo(
    () => bookingEngineConfig.paymentMethods.filter((method) => method.status === 'Active'),
    [bookingEngineConfig.paymentMethods],
  );
  const checkoutFields = useMemo(
    () => bookingEngineConfig.checkoutFields.filter((field) => field.enabled),
    [bookingEngineConfig.checkoutFields],
  );
  const [search, setSearch] = useState({
    pickupLocation: locationOptions[0] || 'Rhodes Airport',
    returnLocation: 'Same as pickup',
    pickupDate: '2026-06-20',
    pickupTime: '10:00',
    returnDate: '2026-06-24',
    returnTime: '10:00',
  });
  const [customer, setCustomer] = useState({
    fullName: '',
    email: '',
    country: 'Greece',
    dateOfBirth: '',
    countryCode: '+30',
    phone: '',
    accommodationName: '',
    flightNumber: '',
    notes: '',
  });
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [extras, setExtras] = useState<Record<string, number>>({});
  const [couponCode, setCouponCode] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [submittedReservationId, setSubmittedReservationId] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submittingReservation, setSubmittingReservation] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const activeCoupons = bookingEngineConfig.coupons.filter((coupon) => coupon.status === 'Active');

  useEffect(() => {
    let cancelled = false;

    const loadSupabasePreviewConfig = async () => {
      setLoadingConfig(true);
      setConfigError('');

      const { data: sites, error: siteError } = await supabase
        .from('be_sites')
        .select('*')
        .order('domain', { ascending: true });

      if (siteError) {
        console.error('Public Booking Preview site load failed:', {
          message: siteError.message,
          code: siteError.code,
          details: siteError.details,
          hint: siteError.hint,
        });
        if (!cancelled) {
          setConfigError('Failed to load booking site from Supabase.');
          setLoadingConfig(false);
        }
        return;
      }

      const site = ((sites || []) as BeSiteRow[]).find(
        (item) => item.domain === 'autoclub-rhodes.com',
      );
      if (!site?.id) {
        if (!cancelled) {
          setConfigError('No Booking Engine site found for autoclub-rhodes.com.');
          setLoadingConfig(false);
        }
        return;
      }

      const [
        groupsResult,
        carsResult,
        featuresResult,
        pricingResult,
        locationsResult,
        extrasResult,
        couponsResult,
        paymentMethodsResult,
        bookingSettingsResult,
        checkoutFieldsResult,
        emailTemplatesResult,
      ] = await Promise.all([
        supabase.from('be_groups').select('*').eq('site_id', site.id).order('code', { ascending: true }),
        supabase.from('be_vehicle_categories').select('*').eq('site_id', site.id).order('name', { ascending: true }),
        supabase.from('be_features').select('*').eq('site_id', site.id).order('name', { ascending: true }),
        supabase.from('be_pricing_seasons').select('*').eq('site_id', site.id).order('from_date', { ascending: true }),
        supabase.from('be_locations').select('*').eq('site_id', site.id).order('name', { ascending: true }),
        supabase.from('be_extras').select('*').eq('site_id', site.id).order('name', { ascending: true }),
        supabase.from('be_coupons').select('*').eq('site_id', site.id).order('code', { ascending: true }),
        supabase.from('be_payment_methods').select('*').eq('site_id', site.id).order('name', { ascending: true }),
        supabase.from('be_booking_settings').select('*').eq('site_id', site.id).maybeSingle(),
        supabase.from('be_checkout_fields').select('*').eq('site_id', site.id).order('sort_order', { ascending: true }),
        supabase.from('be_email_templates').select('*').eq('site_id', site.id).order('template_key', { ascending: true }),
      ]);

      const loadErrors = [
        ['groups', groupsResult.error],
        ['cars', carsResult.error],
        ['features', featuresResult.error],
        ['pricing', pricingResult.error],
        ['locations', locationsResult.error],
        ['extras', extrasResult.error],
        ['coupons', couponsResult.error],
        ['payment methods', paymentMethodsResult.error],
        ['booking settings', bookingSettingsResult.error],
        ['checkout fields', checkoutFieldsResult.error],
        ['email templates', emailTemplatesResult.error],
      ].filter(([, error]) => error);

      if (loadErrors.length > 0) {
        loadErrors.forEach(([label, error]) => {
          const supabaseError = error as NonNullable<typeof groupsResult.error>;
          console.error(`Public Booking Preview ${label} load failed:`, {
            message: supabaseError.message,
            code: supabaseError.code,
            details: supabaseError.details,
            hint: supabaseError.hint,
          });
        });
        if (!cancelled) {
          setConfigError('Failed to load booking preview data from Supabase.');
          setLoadingConfig(false);
        }
        return;
      }

      const bookingSettings = bookingSettingsResult.data as BeBookingSettingsRow | null;
      const termsUrl = bookingSettings?.terms_url || site.terms_url || '';
      const emailSettings = normalizeSupabaseEmailTemplates(
        (emailTemplatesResult.data || []) as BookingEngineEmailTemplateRow[],
        site.booking_notification_email || site.admin_email || '',
      );

      if (!cancelled) {
        setBeSiteId(site.id);
        setBookingEngineConfig({
          ...emptySupabaseBookingEngineConfig,
          siteSettings: {
            ...mapSiteSettings(site),
            termsUrl,
            defaultLanguage: bookingSettings?.default_language || site.default_language || 'English',
          },
          groups: ((groupsResult.data || []) as BeGroupRow[]).map(mapGroup),
          cars: ((carsResult.data || []) as BeVehicleCategoryRow[]).map(mapCar),
          features: ((featuresResult.data || []) as BeFeatureRow[]).map(mapFeature),
          pricingSeasons: ((pricingResult.data || []) as BePricingSeasonRow[]).map(mapPricingSeason),
          locations: ((locationsResult.data || []) as BeLocationRow[]).map(mapLocation),
          extras: ((extrasResult.data || []) as BeExtraRow[]).map(mapExtra),
          coupons: ((couponsResult.data || []) as BeCouponRow[]).map(mapCoupon),
          paymentMethods: ((paymentMethodsResult.data || []) as BePaymentMethodRow[]).map(mapPaymentMethod),
          checkoutFields: normalizeBookingEngineCheckoutFields(
            ((checkoutFieldsResult.data || []) as BeCheckoutFieldRow[]).map(mapCheckoutField),
            false,
          ),
          emailSettings,
        });
        setLoadingConfig(false);
      }
    };

    void loadSupabasePreviewConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!locationOptions.length) return;

    setSearch((current) => {
      const nextPickupLocation = locationOptions.includes(current.pickupLocation)
        ? current.pickupLocation
        : locationOptions[0];
      const nextReturnLocation =
        current.returnLocation === 'Same as pickup' || locationOptions.includes(current.returnLocation)
          ? current.returnLocation
          : 'Same as pickup';

      if (
        current.pickupLocation === nextPickupLocation &&
        current.returnLocation === nextReturnLocation
      ) {
        return current;
      }

      return {
        ...current,
        pickupLocation: nextPickupLocation,
        returnLocation: nextReturnLocation,
      };
    });
  }, [locationOptions]);

  useEffect(() => {
    if (!activePaymentMethods.length) {
      setPaymentMethod('');
      return;
    }

    setPaymentMethod((current) => {
      const nextPaymentMethod = activePaymentMethods.some((method) => method.name === current)
        ? current
        : activePaymentMethods[0].name;

      return current === nextPaymentMethod ? current : nextPaymentMethod;
    });
  }, [activePaymentMethods]);

  const rentalDays = useMemo(
    () => getRentalDays(search.pickupDate, search.returnDate),
    [search.pickupDate, search.returnDate]
  );
  const extrasTotal = activeExtras.reduce((total, extra) => {
    const quantity = extras[extra.id] || 0;
    const price = Number(extra.price || 0);
    return total + quantity * price * rentalDays;
  }, 0);
  const baseRental = selectedCar && !selectedCar.priceOnRequest ? selectedCar.pricePerDay * rentalDays : 0;
  const subtotal = baseRental + extrasTotal;
  const appliedCoupon = activeCoupons.find(
    (coupon) => coupon.code.toLowerCase() === appliedCouponCode.toLowerCase(),
  );
  const couponDiscount = getCouponDiscount(appliedCoupon, subtotal);
  const finalTotal = Math.max(0, baseRental + extrasTotal - couponDiscount);
  const effectiveReturnLocation =
    search.returnLocation === 'Same as pickup' ? search.pickupLocation : search.returnLocation;
  const visibleCheckoutFields = checkoutFields;
  const isCheckoutFieldRequired = (field: BookingEngineCheckoutField) => field.required;
  const getBuiltInFieldValue = (fieldId: string) => {
    if (fieldId === 'full_name') return customer.fullName;
    if (fieldId === 'phone') return customer.phone;
    if (fieldId === 'date_of_birth') return customer.dateOfBirth;
    if (fieldId === 'accommodation_name') return customer.accommodationName;
    if (fieldId === 'flight_number') return customer.flightNumber;
    return String(customer[fieldId as keyof typeof customer] || '');
  };
  const checkoutFieldValidationErrors = visibleCheckoutFields
    .filter((field) => isCheckoutFieldRequired(field))
    .filter((field) =>
      BUILT_IN_CHECKOUT_FIELD_IDS.has(field.id)
        ? !getBuiltInFieldValue(field.id).trim()
        : !String(customFieldValues[field.id] || '').trim()
    )
    .map((field) => `${field.label} is required.`);
  const validationErrors = paymentMethod
    ? checkoutFieldValidationErrors
    : [...checkoutFieldValidationErrors, 'Payment method is required.'];
  const requiredFieldsMissing = validationErrors.length > 0;
  const currentStepIndex = STEP_INDEX[step];
  const selectedPickupLocation = activeLocations.find((location) => location.name === search.pickupLocation);
  const visibleCars = bookingEngineConfig.cars
    .filter((car) => car.status !== 'Hidden')
    .filter((car) => !selectedPickupLocation || car.locationIds.includes(selectedPickupLocation.id))
    .map((car, index) => {
      const group = bookingEngineConfig.groups.find((item) => item.code === car.groupCode);
      const matchingSeason = bookingEngineConfig.pricingSeasons.find(
        (season) =>
          season.groupCode === car.groupCode &&
          season.status !== 'Inactive' &&
          isDateInSeason(search.pickupDate, season),
      );
      const seasonPrice = getSeasonPriceForDays(matchingSeason, rentalDays);
      const priceOnRequest = !matchingSeason || seasonPrice === null;
      const featureNames = car.featureIds
        .map((featureId) => bookingEngineConfig.features.find((feature) => feature.id === featureId)?.name)
        .filter(Boolean)
        .slice(0, 5) as string[];

      return {
        ...car,
        groupName: group?.name || car.groupCode,
        featureNames,
        pricePerDay: seasonPrice || 0,
        priceOnRequest,
        mode: priceOnRequest ? 'On Request' : matchingSeason.websiteMode || car.status,
        accent: carAccentByIndex[index % carAccentByIndex.length],
      };
    })
    .filter((car) => car.mode !== 'Hidden');

  const selectCar = (car: SelectedPreviewCar) => {
    setSelectedCar(car);
    setStep('checkout');
  };

  const applyCoupon = () => {
    const normalizedCode = couponCode.trim().toUpperCase();
    if (!normalizedCode) {
      setAppliedCouponCode('');
      setCouponFeedback({ type: 'error', text: 'Enter a coupon code.' });
      return;
    }

    const matchingCoupon = activeCoupons.find(
      (coupon) => coupon.code.toLowerCase() === normalizedCode.toLowerCase(),
    );
    if (!matchingCoupon) {
      setAppliedCouponCode('');
      setCouponFeedback({ type: 'error', text: 'Coupon is invalid or inactive.' });
      return;
    }

    setAppliedCouponCode(matchingCoupon.code);
    setCouponFeedback({ type: 'success', text: `${matchingCoupon.code} applied.` });
  };

  const changeExtraQuantity = (extra: BookingEngineExtra, delta: number) => {
    const maxQuantity = Number(extra.maximumQuantity || 3);
    setExtras((current) => ({
      ...current,
      [extra.id]: Math.max(0, Math.min(maxQuantity, (current[extra.id] || 0) + delta)),
    }));
  };

  const submitReservation = async () => {
    setSubmitAttempted(true);
    setSubmitError('');
    if (!selectedCar || !acceptTerms || requiredFieldsMissing || submittingReservation) return;
    if (!beSiteId) {
      setSubmitError('Booking site is not loaded. Please refresh and try again.');
      return;
    }

    const selectedExtras = activeExtras
      .filter((extra) => (extras[extra.id] || 0) > 0)
      .map((extra) => {
        const quantity = extras[extra.id] || 0;
        const unitPrice = Number(extra.price || 0);
        return {
          id: extra.id,
          name: extra.name,
          quantity,
          unitPrice,
          total: quantity * unitPrice * rentalDays,
        };
      });

    const reservationId = `ACR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
      1000 + Math.random() * 9000,
    )}`;
    const couponPayload = appliedCoupon
      ? {
          code: appliedCoupon.code,
          discountType: appliedCoupon.discountType,
          discountValue: appliedCoupon.discountValue,
          discount: couponDiscount,
        }
      : null;
    const payload = {
      site_id: beSiteId,
      reservation_id: reservationId,
      customer_name: customer.fullName.trim(),
      email: customer.email.trim(),
      phone: `${customer.countryCode} ${customer.phone}`.trim(),
      country: customer.country.trim(),
      country_code: customer.countryCode.trim(),
      date_of_birth: customer.dateOfBirth || null,
      accommodation_name: customer.accommodationName.trim(),
      hotel_villa_apartment: customer.accommodationName.trim(),
      flight_number: customer.flightNumber.trim(),
      notes: customer.notes.trim(),
      pickup_location: search.pickupLocation,
      return_location: effectiveReturnLocation,
      pickup_date: search.pickupDate,
      pickup_time: search.pickupTime,
      return_date: search.returnDate,
      return_time: search.returnTime,
      vehicle_category: `${selectedCar.name} / Group ${selectedCar.groupCode}`,
      extras: selectedExtras,
      coupon: couponPayload,
      payment_method: paymentMethod,
      total_price: selectedCar.priceOnRequest ? 0 : finalTotal,
      status: selectedCar.mode === 'Open' ? 'PENDING' : 'ON_REQUEST',
    };

    setSubmittingReservation(true);
    console.log('PUBLIC BOOKING RESERVATION INSERT PAYLOAD', payload);
    const { data, error } = await supabase
      .from('be_reservations')
      .insert(payload)
      .select('id, reservation_id')
      .single();

    console.log('PUBLIC BOOKING RESERVATION INSERT RESULT', data);

    if (error) {
      console.error('PUBLIC BOOKING RESERVATION INSERT ERROR', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setSubmitError('Reservation could not be saved. Please try again.');
      setSubmittingReservation(false);
      return;
    }

    const savedReservationId = data?.reservation_id || data?.id || reservationId;
    const emailEventPayload = buildBookingEmailEventPayload({
      eventType: selectedCar.mode === 'Open' ? 'new_reservation_confirmed' : 'reservation_onrequest',
      templates: bookingEngineConfig.emailSettings.templates,
      site: {
        siteId: beSiteId,
        siteName: bookingEngineConfig.siteSettings.companyName || 'AutoClub Rhodes',
        adminEmail:
          bookingEngineConfig.siteSettings.bookingNotificationEmail ||
          bookingEngineConfig.siteSettings.adminEmail ||
          bookingEngineConfig.emailSettings.adminEmail,
        logoImage: bookingEngineConfig.siteSettings.logoImage,
        whatsappNumber: bookingEngineConfig.siteSettings.whatsappNumber,
      },
      reservation: {
        reservationId: savedReservationId,
        customerName: customer.fullName.trim(),
        email: customer.email.trim(),
        phone: `${customer.countryCode} ${customer.phone}`.trim(),
        country: customer.country.trim(),
        countryCode: customer.countryCode.trim(),
        dateOfBirth: customer.dateOfBirth,
        accommodationName: customer.accommodationName.trim(),
        flightNumber: customer.flightNumber.trim(),
        notes: customer.notes.trim(),
        carName: selectedCar.name,
        group: selectedCar.groupCode,
        pickupDate: search.pickupDate,
        pickupTime: search.pickupTime,
        returnDate: search.returnDate,
        returnTime: search.returnTime,
        pickupLocation: search.pickupLocation,
        returnLocation: effectiveReturnLocation,
        totalPrice: selectedCar.priceOnRequest ? 'Price on request' : `€${finalTotal}`,
        paymentMethod,
      },
    });

    console.log('RESERVATION EMAIL WEBHOOK PAYLOAD', emailEventPayload);
    await sendBookingEngineEmailEvent(emailEventPayload);

    setSubmittedReservationId(savedReservationId);
    setSubmittingReservation(false);
    setStep('success');
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-[radial-gradient(circle_at_top_left,#e0f2fe_0,#f8fafc_34%,#eef2f7_100%)] text-slate-950">
      <header className="border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-[#073f5d] text-white shadow-sm">
              {bookingEngineConfig.siteSettings.logoImage ? (
                <img
                  src={bookingEngineConfig.siteSettings.logoImage}
                  alt={bookingEngineConfig.siteSettings.companyName}
                  className="h-full w-full object-contain bg-white p-1"
                />
              ) : (
                <Car className="h-6 w-6" />
              )}
            </div>
            <div>
              <p className="text-lg font-black text-[#073f5d]">
                {bookingEngineConfig.siteSettings.companyName || 'AUTOCLUB RHODES'}
              </p>
              <p className="text-xs font-semibold text-slate-500">Premium car rental in Rhodes</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
            <button
              type="button"
              className="rounded-full border border-[#073f5d]/20 bg-white px-3 py-2 text-xs font-black text-[#073f5d] shadow-sm transition hover:border-[#073f5d] hover:bg-slate-50 sm:px-4 sm:text-sm"
            >
              Manage my booking
            </button>
            <div className="hidden items-center gap-5 md:flex">
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Full insurance included</span>
            <span>EN <ChevronDown className="inline h-4 w-4" /></span>
            </div>
          </div>
        </div>
      </header>

      <div className="border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-start justify-between px-4 py-3 sm:px-6">
          {STEP_ITEMS.map((item, itemIndex) => {
            const isComplete = currentStepIndex > item.index;
            const isActive = currentStepIndex === item.index;

            return (
              <div key={item.id} className="contents">
                <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-black ${
                    isComplete
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : isActive
                        ? 'border-[#0891b2] bg-[#0891b2] text-white'
                        : 'border-slate-300 bg-white text-slate-400'
                  }`}>
                    {isComplete ? <Check className="h-4 w-4" /> : item.index}
                  </div>
                  <span className={`text-[10px] font-bold sm:text-xs ${isActive ? 'text-[#087f9c]' : 'text-slate-500'}`}>
                    {item.label}
                  </span>
                </div>
                {itemIndex < STEP_ITEMS.length - 1 && (
                  <div className={`mt-4 h-px min-w-4 flex-1 sm:mx-3 ${isComplete ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
        {loadingConfig && (
          <div className="mb-4 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-black text-cyan-900">
            Loading booking engine data from Supabase...
          </div>
        )}
        {configError && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-800">
            {configError}
          </div>
        )}
        {step === 'search' && (
          <section className="mx-auto max-w-6xl">
            <div className="mb-4 max-w-2xl">
              <span className="mb-2 inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-black uppercase text-[#087f9c]">
                <Sparkles className="h-3.5 w-3.5" /> Rhodes made easy
              </span>
              <h1 className="text-3xl font-black tracking-tight text-[#073f5d] sm:text-4xl lg:text-5xl">Find your car in Rhodes</h1>
              <p className="mt-2 text-base font-medium text-slate-600 sm:text-lg">
                Transparent prices, full insurance and friendly local support.
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200/90 bg-white p-4 shadow-[0_24px_70px_rgba(7,63,93,0.14)] sm:p-5 lg:p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField label="Pickup Location" icon={<MapPin className="h-4 w-4" />} value={search.pickupLocation} options={locationOptions} onChange={(value) => setSearch((current) => ({ ...current, pickupLocation: value }))} />
                <SelectField label="Return Location" icon={<MapPin className="h-4 w-4" />} value={search.returnLocation} options={returnLocationOptions} onChange={(value) => setSearch((current) => ({ ...current, returnLocation: value }))} />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <InputField label="Pickup Date" icon={<CalendarDays className="h-4 w-4" />} type="date" value={search.pickupDate} onChange={(value) => setSearch((current) => ({ ...current, pickupDate: value }))} />
                <InputField label="Pickup Time" icon={<Clock3 className="h-4 w-4" />} type="time" value={search.pickupTime} onChange={(value) => setSearch((current) => ({ ...current, pickupTime: value }))} />
                <InputField label="Return Date" icon={<CalendarDays className="h-4 w-4" />} type="date" value={search.returnDate} onChange={(value) => setSearch((current) => ({ ...current, returnDate: value }))} />
                <InputField label="Return Time" icon={<Clock3 className="h-4 w-4" />} type="time" value={search.returnTime} onChange={(value) => setSearch((current) => ({ ...current, returnTime: value }))} />
              </div>
              <button type="button" onClick={() => setStep('results')} className="mt-5 flex h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-[#073f5d] px-8 text-base font-black text-white shadow-[0_14px_32px_rgba(7,63,93,0.34)] transition hover:-translate-y-0.5 hover:bg-[#052f46]">
                Search Cars <ArrowRight className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ['Zero excess', 'No surprise charges'],
                ['No deposit', 'Keep your holiday budget free'],
                ['Local support', 'Friendly help throughout Rhodes'],
              ].map(([title, description]) => (
                <div key={title} className="rounded-xl border border-slate-200 bg-white p-4">
                  <CheckCircle2 className="mb-2 h-5 w-5 text-emerald-600" />
                  <p className="font-black text-slate-900">{title}</p>
                  <p className="mt-1 text-sm text-slate-500">{description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {step === 'results' && (
          <section>
            <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div>
                <button type="button" onClick={() => setStep('search')} className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-[#087f9c] hover:text-[#073f5d]">
                  <ArrowLeft className="h-4 w-4" /> Change search
                </button>
                <h1 className="text-3xl font-black tracking-tight text-[#073f5d]">Choose your car</h1>
                <p className="mt-1 text-sm font-medium text-slate-600">
                  {search.pickupLocation} · {formatDisplayDate(search.pickupDate)} to {formatDisplayDate(search.returnDate)} · {rentalDays} days
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                <strong className="text-slate-950">{visibleCars.length} cars</strong> match your search
              </div>
            </div>

            <div className="grid items-stretch gap-4 lg:grid-cols-3">
              {visibleCars.map((car) => (
                <article key={car.id} className="flex h-full flex-col overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-[0_18px_48px_rgba(7,63,93,0.1)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_26px_70px_rgba(7,63,93,0.16)]">
                  <div className={`relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br sm:h-44 ${car.accent}`}>
                    <div className="absolute left-4 top-4 rounded-full border border-white/90 bg-white/95 px-3 py-1 text-xs font-black text-[#073f5d] shadow-sm">Group {car.groupCode}</div>
                    {car.imageUrl ? (
                      <img src={car.imageUrl} alt={car.name} className="h-full w-full object-cover" />
                    ) : (
                      <>
                        <Car className="h-24 w-24 text-[#0e7490]/80" strokeWidth={1.15} />
                        <span className="absolute bottom-3 text-[10px] font-bold uppercase text-slate-400">Car image placeholder</span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4 sm:p-5">
                    <h2 className="text-xl font-black leading-tight text-[#073f5d]">{car.name}</h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">
                        Active
                      </span>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${
                        car.mode === 'Open'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700'
                      }`}>
                        {car.mode}
                      </span>
                    </div>
                    <p className="mt-2 min-h-11 text-sm leading-6 text-slate-600">{car.description}</p>
                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <p className="mb-2 text-xs font-black uppercase text-slate-500">Included in price</p>
                      <div className="grid gap-1.5">
                        {car.featureNames.map((feature) => (
                          <span key={feature} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <Check className="h-4 w-4 text-emerald-600" /> {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
                      <div>
                        <p className="text-xs font-bold text-slate-500">From</p>
                        <p className="text-2xl font-black text-[#073f5d]">
                          {car.priceOnRequest ? (
                            <span className="text-lg">Price on request</span>
                          ) : (
                            <>€{car.pricePerDay}<span className="text-sm font-bold text-slate-500">/day</span></>
                          )}
                        </p>
                      </div>
                      <button type="button" onClick={() => selectCar(car)} className={`min-h-11 min-w-28 rounded-xl px-4 py-2.5 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 ${car.mode === 'Open' ? 'bg-emerald-600 shadow-emerald-900/15 hover:bg-emerald-700' : 'bg-amber-500 shadow-amber-900/15 hover:bg-amber-600'}`}>
                        {car.mode === 'Open' ? 'Book Now' : 'On Request'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {step === 'checkout' && selectedCar && (
          <section>
            <button type="button" onClick={() => setStep('results')} className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-[#087f9c] hover:text-[#073f5d]">
              <ArrowLeft className="h-4 w-4" /> Back to cars
            </button>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="order-2 flex flex-col gap-4 xl:order-1">
                <div className="order-2 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_36px_rgba(7,63,93,0.08)] sm:p-5">
                  <h1 className="text-2xl font-black text-[#073f5d]">Complete your reservation</h1>
                  <p className="mt-1 text-sm text-slate-500">Tell us who will be driving.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {visibleCheckoutFields.map((field) => (
                      !BUILT_IN_CHECKOUT_FIELD_IDS.has(field.id) ? (
                        <CustomCheckoutField
                          key={field.id}
                          field={field}
                          required={isCheckoutFieldRequired(field)}
                          value={customFieldValues[field.id] || ''}
                          onChange={(value) =>
                            setCustomFieldValues((current) => ({ ...current, [field.id]: value }))
                          }
                        />
                      ) : field.id === 'country' ? (
                        <label key={field.id} className="grid gap-1.5">
                          <span className="text-xs font-black text-slate-700">
                            {field.label}{isCheckoutFieldRequired(field) && <span className="ml-1 text-rose-600">*</span>}
                          </span>
                          <select
                            value={customer.country}
                            required={isCheckoutFieldRequired(field)}
                            onChange={(event) => {
                              const nextCountry = COUNTRY_DIAL_CODES.find(
                                (country) => country.name === event.target.value,
                              );
                              setCustomer((current) => ({
                                ...current,
                                country: event.target.value,
                                countryCode: nextCountry?.dialCode || current.countryCode,
                              }));
                            }}
                            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-[#0891b2] focus:ring-2 focus:ring-cyan-100"
                          >
                            {COUNTRY_DIAL_CODES.map((country) => (
                              <option key={`${country.iso}-${country.dialCode}`} value={country.name}>
                                {country.flag} {country.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : field.id === 'phone' ? (
                        <PhoneCountryField
                          key={field.id}
                          label={field.label}
                          required={isCheckoutFieldRequired(field)}
                          countryName={customer.country}
                          countryCode={customer.countryCode}
                          phone={customer.phone}
                          countries={COUNTRY_DIAL_CODES}
                          onCountryChange={(nextCountry) => {
                            setCustomer((current) => ({
                              ...current,
                              countryCode: nextCountry.dialCode,
                              country: nextCountry.name,
                            }));
                          }}
                          onPhoneChange={(phone) => setCustomer((current) => ({ ...current, phone }))}
                        />
                      ) : field.id === 'notes' ? (
                        <label key={field.id} className="grid gap-1.5 sm:col-span-2">
                          <span className="text-xs font-black text-slate-700">
                            {field.label}{isCheckoutFieldRequired(field) && <span className="ml-1 text-rose-600">*</span>}
                          </span>
                          <textarea
                            value={customer.notes}
                            required={isCheckoutFieldRequired(field)}
                            onChange={(event) => setCustomer((current) => ({ ...current, notes: event.target.value }))}
                            rows={2}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-[#0891b2] focus:ring-2 focus:ring-cyan-100"
                            placeholder="Anything we should know?"
                          />
                        </label>
                      ) : (
                        <CustomerField
                          key={field.id}
                          label={field.label}
                          type={field.id === 'date_of_birth' ? 'date' : CUSTOMER_FIELD_TYPES[field.id]}
                          required={isCheckoutFieldRequired(field)}
                          value={getBuiltInFieldValue(field.id)}
                          onChange={(value) =>
                            setCustomer((current) => ({
                              ...current,
                              [
                                field.id === 'full_name'
                                  ? 'fullName'
                                  : field.id === 'date_of_birth'
                                    ? 'dateOfBirth'
                                    : field.id === 'accommodation_name'
                                      ? 'accommodationName'
                                      : field.id === 'flight_number'
                                        ? 'flightNumber'
                                        : field.id
                              ]: value,
                            }))
                          }
                        />
                      )
                    ))}
                  </div>
                  {submitAttempted && validationErrors.length > 0 && (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                      {validationErrors.map((error) => (
                        <p key={error}>{error}</p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="order-1 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_36px_rgba(7,63,93,0.08)] sm:p-5">
                  <h2 className="text-xl font-black text-[#073f5d]">Add extras</h2>
                  <p className="mt-1 text-sm text-slate-500">Make your trip more comfortable with optional equipment.</p>
                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    {activeExtras.map((extra) => (
                      <article key={extra.id} className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/70 p-3 shadow-sm">
                        <div className="flex h-16 items-center justify-center overflow-hidden rounded-xl bg-[linear-gradient(135deg,#e0f2fe_0%,#ecfdf5_100%)]">
                          {extra.imageUrl ? (
                            <img src={extra.imageUrl} alt={extra.name} className="h-full w-full object-cover" />
                          ) : (
                            <ShieldCheck className="h-8 w-8 text-[#087f9c]" strokeWidth={1.4} />
                          )}
                        </div>
                        <div className="mt-3 flex-1">
                          <p className="font-black text-[#073f5d]">{extra.name}</p>
                          <p className="mt-1 text-sm leading-5 text-slate-500">{extra.description}</p>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="text-sm font-black text-[#073f5d]">€{extra.price}<span className="font-semibold text-slate-500">{extra.pricingMode === 'Per Day' ? '/day' : ''}</span></span>
                          <div className="grid min-w-[112px] grid-cols-[36px_40px_36px] items-center overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
                            <button type="button" onClick={() => changeExtraQuantity(extra, -1)} className="flex h-9 items-center justify-center border-r border-slate-200 bg-[#073f5d] text-white transition hover:bg-[#052f46]" aria-label={`Remove ${extra.name}`}><Minus className="h-4 w-4" /></button>
                            <span className="text-center text-sm font-black text-slate-950">{extras[extra.id] || 0}</span>
                            <button type="button" onClick={() => changeExtraQuantity(extra, 1)} className="flex h-9 items-center justify-center bg-[#0891b2] text-white transition hover:bg-[#087f9c]" aria-label={`Add ${extra.name}`}><Plus className="h-4 w-4" /></button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="order-3 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_36px_rgba(7,63,93,0.08)] sm:p-5">
                  <h2 className="font-black text-[#073f5d]">Payment method</h2>
                  <p className="mt-1 text-sm text-slate-500">Choose how you would prefer to complete payment.</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {activePaymentMethods.map((method) => (
                      <label key={method.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm font-bold ${paymentMethod === method.name ? 'border-[#0891b2] bg-cyan-50 text-[#073f5d]' : 'border-slate-200 text-slate-600'}`}>
                        <input type="radio" name="paymentMethod" checked={paymentMethod === method.name} onChange={() => setPaymentMethod(method.name)} className="accent-[#0891b2]" />
                        <CreditCard className="h-4 w-4" /> {method.name}
                      </label>
                    ))}
                    {activePaymentMethods.length === 0 && (
                      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-bold text-amber-800 sm:col-span-2">
                        No active payment methods are currently available.
                      </p>
                    )}
                  </div>
                </div>

              </div>

              <aside className="order-2 h-fit rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(7,63,93,0.16)] xl:order-2 xl:sticky xl:top-4">
                <p className="text-xs font-black uppercase text-[#087f9c]">Reservation summary</p>
                <div className={`mt-3 flex h-24 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${selectedCar.accent}`}>
                  {selectedCar.imageUrl ? (
                    <img src={selectedCar.imageUrl} alt={selectedCar.name} className="h-full w-full object-cover" />
                  ) : (
                    <Car className="h-16 w-16 text-[#0e7490]/80" strokeWidth={1.2} />
                  )}
                </div>
                <h2 className="mt-2 text-xl font-black text-[#073f5d]">{selectedCar.name}</h2>
                <p className="mt-1 text-sm font-bold text-slate-500">Group {selectedCar.groupCode} · {selectedCar.groupName}</p>
                <div className="mt-4 space-y-3 border-y border-slate-100 py-4 text-sm">
                  <SummaryLine label="Pickup" value={`${formatDisplayDate(search.pickupDate)} · ${search.pickupTime}`} />
                  <SummaryLine label="Pickup location" value={search.pickupLocation} />
                  <SummaryLine label="Return" value={`${formatDisplayDate(search.returnDate)} · ${search.returnTime}`} />
                  <SummaryLine label="Return location" value={effectiveReturnLocation} />
                  <SummaryLine
                    label="Rental"
                    value={selectedCar.priceOnRequest ? 'Price on request' : `${rentalDays} days × €${selectedCar.pricePerDay}`}
                  />
                  {activeExtras.filter((extra) => (extras[extra.id] || 0) > 0).map((extra) => (
                    <SummaryLine
                      key={extra.id}
                      label={`${extra.name} × ${extras[extra.id] || 0}`}
                      value={`€${(extras[extra.id] || 0) * Number(extra.price || 0) * rentalDays}`}
                    />
                  ))}
                  <SummaryLine label="Extras" value={extrasTotal > 0 ? `€${extrasTotal}` : '€0'} />
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="mb-2 font-black text-slate-700">Coupon</p>
                    <div className="flex gap-2">
                      <input
                        value={couponCode}
                        onChange={(event) => {
                          setCouponCode(event.target.value);
                          setAppliedCouponCode('');
                          setCouponFeedback(null);
                        }}
                        placeholder="Coupon code"
                        className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#0891b2]"
                      />
                      <button
                        type="button"
                        onClick={applyCoupon}
                        className="rounded-lg bg-[#0891b2] px-3 py-2 text-xs font-black text-white hover:bg-[#087f9c]"
                      >
                        Apply
                      </button>
                    </div>
                    {couponFeedback && (
                      <p className={`mt-2 text-xs font-bold ${couponFeedback.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {couponFeedback.text}
                      </p>
                    )}
                  </div>
                  <SummaryLine label="Coupon Discount" value={couponDiscount > 0 ? `-€${couponDiscount}` : '€0'} />
                  <SummaryLine label="Payment Method" value={paymentMethod} />
                </div>
                <div className="flex items-end justify-between py-4">
                  <span className="font-black text-slate-700">Total</span>
                  <span className="text-3xl font-black text-[#073f5d]">
                    {selectedCar.priceOnRequest ? 'Price on request' : `€${finalTotal}`}
                  </span>
                </div>
                <div className="mb-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} className="mt-0.5 h-5 w-5 accent-[#0891b2]" />
                    <span>I accept the rental terms and conditions.</span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={marketingConsent} onChange={(event) => setMarketingConsent(event.target.checked)} className="mt-0.5 h-5 w-5 accent-[#0891b2]" />
                    <span>I would like to receive AutoClub Rhodes offers.</span>
                  </label>
                </div>
                {submitAttempted && !acceptTerms && (
                  <p className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
                    Please accept the rental terms before continuing.
                  </p>
                )}
                {submitError && (
                  <p className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
                    {submitError}
                  </p>
                )}
                <button type="button" disabled={submittingReservation} aria-disabled={!acceptTerms || requiredFieldsMissing || submittingReservation} onClick={submitReservation} className={`flex h-[54px] w-full items-center justify-center gap-2 rounded-xl px-6 text-base font-black text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 ${selectedCar.mode === 'Open' ? 'bg-emerald-600 shadow-emerald-900/20 hover:bg-emerald-700' : 'bg-[#0891b2] shadow-cyan-900/20 hover:bg-[#087f9c]'}`}>
                  {submittingReservation ? 'Saving...' : selectedCar.mode === 'Open' ? 'Confirm Booking' : 'Send Request'} <ArrowRight className="h-5 w-5" />
                </button>
                <p className="mt-2 text-center text-xs text-slate-400">Prototype only · no payment will be taken</p>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs font-bold leading-5 text-emerald-800">
                  Full insurance, zero excess and road assistance are included.
                </div>
              </aside>
            </div>
          </section>
        )}

        {step === 'success' && selectedCar && (
          <section className="mx-auto max-w-3xl py-6 text-center sm:py-10">
            <div className="rounded-[30px] border border-slate-200 bg-white px-5 py-9 shadow-[0_30px_90px_rgba(7,63,93,0.18)] sm:px-12 sm:py-11">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-8 border-emerald-50 bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-10 w-10" /></div>
              <p className="mt-5 text-sm font-black uppercase text-emerald-700">Reservation Received</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[#073f5d] sm:text-4xl">Your reservation is received</h1>
              <p className="mt-5 text-sm font-bold text-slate-500">Reservation Code</p>
              <p className="mx-auto mt-2 max-w-sm rounded-2xl bg-[#073f5d] px-5 py-4 font-mono text-xl font-black tracking-[0.08em] text-white shadow-lg shadow-slate-900/15">
                {submittedReservationId || 'ACR-DEMO-0001'}
              </p>
              <p className="mx-auto mt-6 max-w-lg whitespace-pre-line text-base leading-7 text-slate-600">
                {'Thank you for choosing AutoClub Rhodes.\nYour reservation request has been received.\nYou will receive confirmation by email.'}
              </p>
              <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left sm:grid-cols-2">
                <SummaryLine label="Car" value={selectedCar.name} />
                <SummaryLine label="Coupon Discount" value={couponDiscount > 0 ? `-€${couponDiscount}` : '€0'} />
                <SummaryLine label="Total" value={selectedCar.priceOnRequest ? 'Price on request' : `€${finalTotal}`} />
                <SummaryLine label="Pickup" value={`${formatDisplayDate(search.pickupDate)} · ${search.pickupTime}`} />
                <SummaryLine label="Return" value={`${formatDisplayDate(search.returnDate)} · ${search.returnTime}`} />
              </div>
              <div className="mt-5 grid gap-3 text-left sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="font-black text-[#073f5d]">What happens next</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">We will review your reservation and send confirmation by email.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="font-black text-[#073f5d]">Need an urgent change?</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">For urgent changes, contact us on WhatsApp.</p>
                </div>
              </div>
              <button type="button" onClick={() => { setSelectedCar(null); setStep('search'); setAcceptTerms(false); setSubmittedReservationId(''); }} className="mt-7 rounded-xl bg-[#073f5d] px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition hover:bg-[#052f46]">
                Start another search
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function SelectField({ label, icon, value, options, onChange }: { label: string; icon: React.ReactNode; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1.5">
      <span className="flex items-center gap-2 text-sm font-black text-slate-700">{icon}{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-13 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-950 shadow-sm outline-none transition focus:border-[#0891b2] focus:ring-4 focus:ring-cyan-100">
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function InputField({ label, icon, type, value, onChange }: { label: string; icon: React.ReactNode; type: 'date' | 'time'; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1.5">
      <span className="flex items-center gap-2 text-sm font-black text-slate-700">{icon}{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-13 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-950 shadow-sm outline-none transition focus:border-[#0891b2] focus:ring-4 focus:ring-cyan-100" />
    </label>
  );
}

function CustomerField({ label, type = 'text', required = false, value, onChange }: { label: string; type?: 'text' | 'email' | 'tel' | 'date'; required?: boolean; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-black text-slate-700">
        {label}{required && <span className="ml-1 text-rose-600">*</span>}
      </span>
      <input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 shadow-sm outline-none transition focus:border-[#0891b2] focus:ring-2 focus:ring-cyan-100" />
    </label>
  );
}

function PhoneCountryField({
  label,
  required,
  countryName,
  countryCode,
  phone,
  countries,
  onCountryChange,
  onPhoneChange,
}: {
  label: string;
  required: boolean;
  countryName: string;
  countryCode: string;
  phone: string;
  countries: CountryDialCode[];
  onCountryChange: (country: CountryDialCode) => void;
  onPhoneChange: (value: string) => void;
}) {
  const selectedValue = `${countryName}|${countryCode}`;

  return (
    <div className="grid gap-1.5 sm:col-span-2">
      <span className="text-xs font-black text-slate-700">
        {label}{required && <span className="ml-1 text-rose-600">*</span>}
      </span>
      <div className="grid grid-cols-[minmax(135px,0.9fr)_minmax(0,1.1fr)] gap-2">
        <select
          value={selectedValue}
          onChange={(event) => {
            const nextCountry = countries.find(
              (country) => `${country.name}|${country.dialCode}` === event.target.value,
            );
            if (nextCountry) onCountryChange(nextCountry);
          }}
          className="h-10 min-w-0 rounded-lg border border-slate-300 bg-white px-2 text-xs font-black text-slate-950 shadow-sm outline-none focus:border-[#0891b2] focus:ring-2 focus:ring-cyan-100"
        >
          {countries.map((country) => (
            <option key={`${country.iso}-${country.dialCode}`} value={`${country.name}|${country.dialCode}`}>
              {country.iso} {country.name} {country.dialCode}
            </option>
          ))}
        </select>
        <input
          type="tel"
          required={required}
          value={phone}
          onChange={(event) => onPhoneChange(event.target.value)}
          placeholder="Phone number"
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 shadow-sm outline-none transition focus:border-[#0891b2] focus:ring-2 focus:ring-cyan-100"
        />
      </div>
    </div>
  );
}

function CustomCheckoutField({
  field,
  required,
  value,
  onChange,
}: {
  field: BookingEngineCheckoutField;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const commonClassName =
    'h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 shadow-sm outline-none transition focus:border-[#0891b2] focus:ring-2 focus:ring-cyan-100';
  const inputType =
    field.fieldType === 'Email'
      ? 'email'
      : field.fieldType === 'Phone'
        ? 'tel'
        : field.fieldType === 'Number'
          ? 'number'
          : 'text';

  return (
    <label className={`grid gap-1.5 ${field.fieldType === 'Textarea' ? 'sm:col-span-2' : ''}`}>
      <span className="text-xs font-black text-slate-700">
        {field.label}
        {required && <span className="ml-1 text-rose-600">*</span>}
      </span>
      {field.fieldType === 'Textarea' ? (
        <textarea
          value={value}
          required={required}
          onChange={(event) => onChange(event.target.value)}
          rows={2}
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#0891b2] focus:ring-4 focus:ring-cyan-100"
        />
      ) : field.fieldType === 'Select' ? (
        <select
          value={value}
          required={required}
          onChange={(event) => onChange(event.target.value)}
          className={commonClassName}
        >
          <option value="">Select...</option>
          {(field.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={inputType}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={commonClassName}
        />
      )}
    </label>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-black text-slate-800">{value}</span>
    </div>
  );
}
