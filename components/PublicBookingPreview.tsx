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
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  bookingEngineLocalConfig,
  type BookingEngineIncludedBenefit,
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
type PublicBookingPreviewVariant = 'fullFlow' | 'homepageEmbed';
type BookingSearchLayout = 'stackedCard' | 'wideBar';
type BookingSearchState = {
  pickupLocation: string;
  returnLocation: string;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
  carCategory: string;
};
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
  included_benefits?: Array<string | Partial<BookingEngineIncludedBenefit>> | null;
  promo_badges?: string[] | null;
  marketing_message?: string | null;
  display_priority?: string | number | null;
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
  minimum_rental_days?: string | number | null;
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
  { name: 'Greece', iso: 'GR', flag: 'π‡¬π‡·', dialCode: '+30' },
  { name: 'Italy', iso: 'IT', flag: 'π‡®π‡Ή', dialCode: '+39' },
  { name: 'United Kingdom', iso: 'GB', flag: 'π‡¬π‡§', dialCode: '+44' },
  { name: 'France', iso: 'FR', flag: 'π‡«π‡·', dialCode: '+33' },
  { name: 'Germany', iso: 'DE', flag: 'π‡©π‡', dialCode: '+49' },
  { name: 'Czech Republic', iso: 'CZ', flag: 'π‡¨π‡Ώ', dialCode: '+420' },
  { name: 'Poland', iso: 'PL', flag: 'π‡µπ‡±', dialCode: '+48' },
  { name: 'Netherlands', iso: 'NL', flag: 'π‡³π‡±', dialCode: '+31' },
  { name: 'Belgium', iso: 'BE', flag: 'π‡§π‡', dialCode: '+32' },
  { name: 'Austria', iso: 'AT', flag: 'π‡¦π‡Ή', dialCode: '+43' },
  { name: 'Switzerland', iso: 'CH', flag: 'π‡¨π‡­', dialCode: '+41' },
  { name: 'Sweden', iso: 'SE', flag: 'π‡Έπ‡', dialCode: '+46' },
  { name: 'Norway', iso: 'NO', flag: 'π‡³π‡΄', dialCode: '+47' },
  { name: 'Denmark', iso: 'DK', flag: 'π‡©π‡°', dialCode: '+45' },
  { name: 'Finland', iso: 'FI', flag: 'π‡«π‡®', dialCode: '+358' },
  { name: 'Ireland', iso: 'IE', flag: 'π‡®π‡', dialCode: '+353' },
  { name: 'Spain', iso: 'ES', flag: 'π‡π‡Έ', dialCode: '+34' },
  { name: 'Portugal', iso: 'PT', flag: 'π‡µπ‡Ή', dialCode: '+351' },
  { name: 'Cyprus', iso: 'CY', flag: 'π‡¨π‡Ύ', dialCode: '+357' },
  { name: 'United States', iso: 'US', flag: 'π‡Ίπ‡Έ', dialCode: '+1' },
  { name: 'Canada', iso: 'CA', flag: 'π‡¨π‡¦', dialCode: '+1' },
  { name: 'Australia', iso: 'AU', flag: 'π‡¦π‡Ί', dialCode: '+61' },
  { name: 'Israel', iso: 'IL', flag: 'π‡®π‡±', dialCode: '+972' },
  { name: 'Turkey', iso: 'TR', flag: 'π‡Ήπ‡·', dialCode: '+90' },
  { name: 'Romania', iso: 'RO', flag: 'π‡·π‡΄', dialCode: '+40' },
  { name: 'Bulgaria', iso: 'BG', flag: 'π‡§π‡¬', dialCode: '+359' },
  { name: 'Hungary', iso: 'HU', flag: 'π‡­π‡Ί', dialCode: '+36' },
  { name: 'Slovakia', iso: 'SK', flag: 'π‡Έπ‡°', dialCode: '+421' },
  { name: 'Slovenia', iso: 'SI', flag: 'π‡Έπ‡®', dialCode: '+386' },
  { name: 'Croatia', iso: 'HR', flag: 'π‡­π‡·', dialCode: '+385' },
  { name: 'Lithuania', iso: 'LT', flag: 'π‡±π‡Ή', dialCode: '+370' },
  { name: 'Latvia', iso: 'LV', flag: 'π‡±π‡»', dialCode: '+371' },
  { name: 'Estonia', iso: 'EE', flag: 'π‡π‡', dialCode: '+372' },
  { name: 'Ukraine', iso: 'UA', flag: 'π‡Ίπ‡¦', dialCode: '+380' },
  { name: 'Serbia', iso: 'RS', flag: 'π‡·π‡Έ', dialCode: '+381' },
  { name: 'South Africa', iso: 'ZA', flag: 'π‡Ώπ‡¦', dialCode: '+27' },
  { name: 'Brazil', iso: 'BR', flag: 'π‡§π‡·', dialCode: '+55' },
  { name: 'Argentina', iso: 'AR', flag: 'π‡¦π‡·', dialCode: '+54' },
  { name: 'India', iso: 'IN', flag: 'π‡®π‡³', dialCode: '+91' },
  { name: 'China', iso: 'CN', flag: 'π‡¨π‡³', dialCode: '+86' },
  { name: 'Japan', iso: 'JP', flag: 'π‡―π‡µ', dialCode: '+81' },
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

const normalizeBookingMode = (
  value: string | null | undefined,
  fallback: BookingMode = 'Open',
): BookingMode => {
  if (isBookingMode(value)) return value;
  const normalized = (value || '').trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (normalized === 'on request') return 'On Request';
  if (normalized === 'hidden') return 'Hidden';
  if (normalized === 'open') return 'Open';
  return fallback;
};

const normalizeIncludedBenefits = (
  value: Array<string | Partial<BookingEngineIncludedBenefit>> | null | undefined,
): BookingEngineIncludedBenefit[] =>
  Array.isArray(value)
    ? value
        .map((item) => {
          if (typeof item === 'string') return { label: item.trim(), tooltip: '' };
          return {
            label: String(item?.label || '').trim(),
            tooltip: String(item?.tooltip || '').trim(),
          };
        })
        .filter((item) => item.label)
    : [];

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
  includedBenefits: normalizeIncludedBenefits(row.included_benefits),
  promoBadges: Array.isArray(row.promo_badges) ? row.promo_badges : [],
  marketingMessage: row.marketing_message || '',
  displayPriority: String(row.display_priority ?? '0'),
  status: normalizeBookingMode(row.status),
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
  websiteMode: normalizeBookingMode(row.website_mode),
  status: row.status === 'Inactive' ? 'Inactive' : 'Active',
  notes: row.notes || '',
});

function formatDisplayDate(value: string) {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatEuro(value: number | string) {
  const amount = Number(value || 0);
  return `€${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

function getRentalDays(pickupDate: string, returnDate: string) {
  const start = new Date(`${pickupDate}T12:00:00`);
  const end = new Date(`${returnDate}T12:00:00`);
  const difference = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return Math.max(1, difference || 1);
}

function toLocalDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysToDateInput(value: string, days: number) {
  if (!value) return '';
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toLocalDateInputValue(date);
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

type PublicBookingPreviewProps = {
  variant?: PublicBookingPreviewVariant;
  embedLayout?: BookingSearchLayout;
};

export function HomepageSearchEmbedPreview() {
  return (
    <div className="h-full min-h-0 overflow-y-auto bg-slate-100 text-slate-950">
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col items-center justify-center px-4 py-8 sm:px-6">
        <p className="mb-4 text-center text-xs font-black uppercase tracking-[0.18em] text-slate-600">
          HOMEPAGE SEARCH EMBED PREVIEW
        </p>
        <HomeBookingSearch />
      </div>
    </div>
  );
}

export function HomeBookingSearch({ layout = 'stackedCard' }: { layout?: BookingSearchLayout }) {
  const [locationOptions, setLocationOptions] = useState<string[]>(['Rhodes Airport']);
  const [categoryOptions, setCategoryOptions] = useState<string[]>(['All categories']);
  const [minimumRentalDays, setMinimumRentalDays] = useState(3);
  const [minimumRentalMessage, setMinimumRentalMessage] = useState('');
  const [search, setSearch] = useState<BookingSearchState>(() => {
    const pickupDate = toLocalDateInputValue(new Date());
    return {
      pickupLocation: 'Rhodes Airport',
      returnLocation: 'Same as pickup',
      pickupDate,
      pickupTime: '10:00',
      returnDate: addDaysToDateInput(pickupDate, 3),
      returnTime: '10:00',
      carCategory: 'All categories',
    };
  });

  const returnLocationOptions = useMemo(
    () => ['Same as pickup', ...locationOptions],
    [locationOptions],
  );

  useEffect(() => {
    let cancelled = false;

    const loadHomepageSearchData = async () => {
      const { data: sites, error: siteError } = await supabase
        .from('be_sites')
        .select('*')
        .order('domain', { ascending: true });

      if (siteError) {
        console.error('Homepage Search Embed site load failed:', {
          message: siteError.message,
          code: siteError.code,
          details: siteError.details,
          hint: siteError.hint,
        });
        return;
      }

      const site = ((sites || []) as BeSiteRow[]).find(
        (item) => item.domain === 'autoclub-rhodes.com',
      );
      if (!site?.id) return;

      const [groupsResult, locationsResult, bookingSettingsResult] = await Promise.all([
        supabase.from('be_groups').select('*').eq('site_id', site.id).order('code', { ascending: true }),
        supabase.from('be_locations').select('*').eq('site_id', site.id).order('name', { ascending: true }),
        supabase.from('be_booking_settings').select('*').eq('site_id', site.id).maybeSingle(),
      ]);

      const loadErrors = [
        ['groups', groupsResult.error],
        ['locations', locationsResult.error],
        ['booking settings', bookingSettingsResult.error],
      ].filter(([, error]) => error);

      if (loadErrors.length > 0) {
        loadErrors.forEach(([label, error]) => {
          const supabaseError = error as NonNullable<typeof groupsResult.error>;
          console.error(`Homepage Search Embed ${label} load failed:`, {
            message: supabaseError.message,
            code: supabaseError.code,
            details: supabaseError.details,
            hint: supabaseError.hint,
          });
        });
        return;
      }

      if (cancelled) return;

      const nextLocations = ((locationsResult.data || []) as BeLocationRow[])
        .map(mapLocation)
        .filter((location) => location.active)
        .map((location) => location.name);
      const nextCategories = ((groupsResult.data || []) as BeGroupRow[])
        .map(mapGroup)
        .map((group) => `${group.code} - ${group.name}`);
      const bookingSettings = bookingSettingsResult.data as BeBookingSettingsRow | null;

      setLocationOptions(nextLocations.length ? nextLocations : ['Rhodes Airport']);
      setCategoryOptions(['All categories', ...nextCategories]);
      setMinimumRentalDays(Math.max(1, Number(bookingSettings?.minimum_rental_days) || 3));
    };

    void loadHomepageSearchData();

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
    setSearch((current) => {
      const minimumReturnDate = addDaysToDateInput(current.pickupDate, minimumRentalDays);
      if (current.returnDate >= minimumReturnDate) return current;
      return { ...current, returnDate: minimumReturnDate };
    });
  }, [minimumRentalDays]);

  const changePickupDate = (value: string) => {
    setSearch((current) => {
      const minimumReturnDate = addDaysToDateInput(value, minimumRentalDays);
      const nextReturnDate = current.returnDate >= minimumReturnDate ? current.returnDate : minimumReturnDate;
      return { ...current, pickupDate: value, returnDate: nextReturnDate };
    });
    setMinimumRentalMessage('');
  };

  const changeReturnDate = (value: string) => {
    setSearch((current) => {
      const minimumReturnDate = addDaysToDateInput(current.pickupDate, minimumRentalDays);
      if (value < minimumReturnDate) {
        setMinimumRentalMessage(`Minimum rental period is ${minimumRentalDays} days.`);
        return { ...current, returnDate: minimumReturnDate };
      }
      setMinimumRentalMessage('');
      return { ...current, returnDate: value };
    });
  };

  const submitHomepageSearch = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('autoclub_homepage_search_params', JSON.stringify(search));
    window.dispatchEvent(new CustomEvent('autoclub-homepage-search', { detail: search }));
  };

  return (
    <HomeBookingSearchForm
      layout={layout}
      search={search}
      locationOptions={locationOptions}
      returnLocationOptions={returnLocationOptions}
      categoryOptions={categoryOptions}
      minimumRentalMessage={minimumRentalMessage}
      onSearchChange={(patch) => setSearch((current) => ({ ...current, ...patch }))}
      onPickupDateChange={changePickupDate}
      onReturnDateChange={changeReturnDate}
      onSearch={submitHomepageSearch}
    />
  );
}

export default function PublicBookingPreview({
  variant = 'fullFlow',
  embedLayout = 'stackedCard',
}: PublicBookingPreviewProps = {}) {
  const isHomepageEmbed = variant === 'homepageEmbed';
  const [step, setStep] = useState<PreviewStep>('search');
  const [selectedCar, setSelectedCar] = useState<SelectedPreviewCar | null>(null);
  const [bookingEngineConfig, setBookingEngineConfig] =
    useState<BookingEngineLocalConfig>(emptySupabaseBookingEngineConfig);
  const [beSiteId, setBeSiteId] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState('');
  const [selectedPassengerFilter, setSelectedPassengerFilter] = useState('All');
  const [selectedTransmissionFilter, setSelectedTransmissionFilter] = useState('All');
  const [activeBenefitTooltip, setActiveBenefitTooltip] = useState<string | null>(null);
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
  const [minimumRentalDays, setMinimumRentalDays] = useState(3);
  const [minimumRentalMessage, setMinimumRentalMessage] = useState('');
  const [search, setSearch] = useState(() => {
    const pickupDate = toLocalDateInputValue(new Date());
    return {
      pickupLocation: locationOptions[0] || 'Rhodes Airport',
      returnLocation: 'Same as pickup',
      pickupDate,
      pickupTime: '10:00',
      returnDate: addDaysToDateInput(pickupDate, 3),
      returnTime: '10:00',
      carCategory: 'All categories',
    } satisfies BookingSearchState;
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
  const [driverAgeConfirmed, setDriverAgeConfirmed] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [submittedReservationId, setSubmittedReservationId] = useState('');
  const [submittedReservationDbId, setSubmittedReservationDbId] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submittingReservation, setSubmittingReservation] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [licenceUploadOpen, setLicenceUploadOpen] = useState(false);
  const [licenceFrontFile, setLicenceFrontFile] = useState<File | null>(null);
  const [licenceBackFile, setLicenceBackFile] = useState<File | null>(null);
  const [licenceNumber, setLicenceNumber] = useState('');
  const [licenceIssueDate, setLicenceIssueDate] = useState('');
  const [licenceExpiryDate, setLicenceExpiryDate] = useState('');
  const [licenceFullName, setLicenceFullName] = useState('');
  const [licenceUploading, setLicenceUploading] = useState(false);
  const [licenceUploadFeedback, setLicenceUploadFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteBookingOpen, setDeleteBookingOpen] = useState(false);
  const [deletingBooking, setDeletingBooking] = useState(false);
  const [deleteBookingFeedback, setDeleteBookingFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
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
        setMinimumRentalDays(
          Math.max(1, Number(bookingSettings?.minimum_rental_days) || 3),
        );
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
    if (!beSiteId) return;

    const refreshCars = async () => {
      const { data, error } = await supabase
        .from('be_vehicle_categories')
        .select('*')
        .eq('site_id', beSiteId)
        .order('name', { ascending: true });

      if (error) {
        console.error('Public Booking Preview cars refresh failed:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        return;
      }

      const nextCars = ((data || []) as BeVehicleCategoryRow[]).map(mapCar);
      setBookingEngineConfig((current) => ({ ...current, cars: nextCars }));
      setSelectedCar((current) => {
        if (!current) return current;
        const refreshedCar = nextCars.find((car) => car.id === current.id);
        if (!refreshedCar) return null;
        const matchingSeason = bookingEngineConfig.pricingSeasons.find(
          (season) =>
            season.groupCode === refreshedCar.groupCode &&
            season.status !== 'Inactive' &&
            isDateInSeason(search.pickupDate, season),
        );
        const seasonMode = matchingSeason?.websiteMode || 'Open';
        const mode =
          refreshedCar.status === 'Hidden' || seasonMode === 'Hidden'
            ? 'Hidden'
            : current.priceOnRequest ||
                refreshedCar.status === 'On Request' ||
                seasonMode === 'On Request'
              ? 'On Request'
              : 'Open';
        return { ...current, ...refreshedCar, mode };
      });
    };

    const handleCarsUpdated = (event: Event) => {
      const updatedSiteId = (event as CustomEvent<{ siteId?: string }>).detail?.siteId;
      if (!updatedSiteId || updatedSiteId === beSiteId) void refreshCars();
    };

    window.addEventListener('booking-engine-cars-updated', handleCarsUpdated);
    return () => window.removeEventListener('booking-engine-cars-updated', handleCarsUpdated);
  }, [beSiteId, bookingEngineConfig.pricingSeasons, search.pickupDate]);

  useEffect(() => {
    if (!activeBenefitTooltip) return;

    const closeTooltip = () => setActiveBenefitTooltip(null);
    window.addEventListener('click', closeTooltip);
    return () => window.removeEventListener('click', closeTooltip);
  }, [activeBenefitTooltip]);

  useEffect(() => {
    setSearch((current) => {
      const minimumReturnDate = addDaysToDateInput(current.pickupDate, minimumRentalDays);
      if (!minimumReturnDate || current.returnDate >= minimumReturnDate) return current;
      return { ...current, returnDate: minimumReturnDate };
    });
  }, [minimumRentalDays]);

  const changePickupDate = (pickupDate: string) => {
    setMinimumRentalMessage('');
    setSearch((current) => {
      const minimumReturnDate = addDaysToDateInput(pickupDate, minimumRentalDays);
      return {
        ...current,
        pickupDate,
        returnDate:
          !current.returnDate || current.returnDate < minimumReturnDate
            ? minimumReturnDate
            : current.returnDate,
      };
    });
  };

  const changeReturnDate = (returnDate: string) => {
    const minimumReturnDate = addDaysToDateInput(search.pickupDate, minimumRentalDays);
    if (returnDate && returnDate < minimumReturnDate) {
      setSearch((current) => ({ ...current, returnDate: minimumReturnDate }));
      setMinimumRentalMessage(`Minimum rental period is ${minimumRentalDays} days.`);
      return;
    }

    setMinimumRentalMessage('');
    setSearch((current) => ({ ...current, returnDate }));
  };

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
  const categoryOptions = useMemo(
    () => ['All categories', ...bookingEngineConfig.groups.map((group) => `${group.code} - ${group.name}`)],
    [bookingEngineConfig.groups],
  );
  const selectedCategoryCode =
    search.carCategory === 'All categories' ? '' : search.carCategory.split(' - ')[0] || '';
  const getCarFeatureNames = (featureIds: string[]) =>
    featureIds
      .map((featureId) => bookingEngineConfig.features.find((feature) => feature.id === featureId)?.name)
      .filter(Boolean) as string[];
  const normalizeFeatureName = (value: string) => value.trim().toLowerCase();
  const carMatchesPassengerFilter = (featureNames: string[]) => {
    if (selectedPassengerFilter === 'All') return true;
    const normalizedTarget = selectedPassengerFilter;
    return featureNames.some((featureName) => {
      const normalized = normalizeFeatureName(featureName);
      return (
        normalized === normalizedTarget ||
        normalized.includes(`${normalizedTarget} seat`) ||
        normalized.includes(`${normalizedTarget} passenger`)
      );
    });
  };
  const carMatchesTransmissionFilter = (featureNames: string[]) => {
    if (selectedTransmissionFilter === 'All') return true;
    return featureNames.some((featureName) => {
      const normalized = normalizeFeatureName(featureName);
      if (selectedTransmissionFilter === 'Manual') return normalized.includes('manual');
      return normalized.includes('auto') || normalized.includes('automatic');
    });
  };
  const visibleCars = bookingEngineConfig.cars
    .filter((car) => car.status !== 'Hidden')
    .filter((car) => !selectedPickupLocation || car.locationIds.includes(selectedPickupLocation.id))
    .filter((car) => !selectedCategoryCode || car.groupCode === selectedCategoryCode)
    .filter((car) => {
      const featureNames = getCarFeatureNames(car.featureIds);
      return carMatchesPassengerFilter(featureNames) && carMatchesTransmissionFilter(featureNames);
    })
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
      const seasonMode = matchingSeason?.websiteMode || 'Open';
      const mode: BookingMode =
        car.status === 'Hidden' || seasonMode === 'Hidden'
          ? 'Hidden'
          : priceOnRequest || car.status === 'On Request' || seasonMode === 'On Request'
            ? 'On Request'
            : 'Open';
      const featureNames = getCarFeatureNames(car.featureIds);
      return {
        ...car,
        groupName: group?.name || car.groupCode,
        featureNames,
        pricePerDay: seasonPrice || 0,
        priceOnRequest,
        mode,
        accent: carAccentByIndex[index % carAccentByIndex.length],
      };
    })
    .filter((car) => car.mode !== 'Hidden')
    .sort((a, b) => {
      const priorityDiff = (Number(b.displayPriority) || 0) - (Number(a.displayPriority) || 0);
      if (priorityDiff !== 0) return priorityDiff;
      const aPrice = a.priceOnRequest ? Number.POSITIVE_INFINITY : a.pricePerDay;
      const bPrice = b.priceOnRequest ? Number.POSITIVE_INFINITY : b.pricePerDay;
      return aPrice - bPrice;
    });

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

  const uploadLicenceFile = async (file: File, side: 'front' | 'back') => {
    if (!beSiteId || !submittedReservationDbId) throw new Error('Reservation is not ready for licence upload.');
    const extension = file.name.split('.').pop()?.toLowerCase() || 'file';
    const path = `${beSiteId}/${submittedReservationDbId}/${side}.${extension}`;
    const { error } = await supabase.storage.from('be-licences').upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });
    if (error) throw error;
    const { data } = supabase.storage.from('be-licences').getPublicUrl(path);
    return data.publicUrl;
  };

  const sendLicenceUploadAdminNotice = async () => {
    const adminEmail =
      bookingEngineConfig.siteSettings.bookingNotificationEmail ||
      bookingEngineConfig.siteSettings.adminEmail ||
      bookingEngineConfig.emailSettings.adminEmail;
    if (!adminEmail) return;
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: adminEmail,
          subject: `Driver licence uploaded for reservation ${submittedReservationId}`,
          html_body: `
            <div style="font-family:Arial,sans-serif;line-height:1.55;color:#102033;">
              <h2 style="margin:0 0 12px;color:#073f5d;">Driver licence uploaded</h2>
              <p>Driver licence files were uploaded for reservation <strong>${submittedReservationId}</strong>.</p>
              <p><strong>Customer:</strong> ${licenceFullName || customer.fullName}</p>
              <p><strong>Licence number:</strong> ${licenceNumber || '-'}</p>
              <p><strong>Licence issue:</strong> ${licenceIssueDate || '-'}</p>
              <p><strong>Licence expiry:</strong> ${licenceExpiryDate || '-'}</p>
            </div>
          `,
        }),
      });
    } catch (error) {
      console.error('LICENCE UPLOAD ADMIN EMAIL ERROR', error);
    }
  };

  const submitLicenceUpload = async () => {
    setLicenceUploadFeedback(null);
    if (!submittedReservationDbId || !beSiteId) {
      setLicenceUploadFeedback({ type: 'error', text: 'Reservation reference is missing. Please refresh and try again.' });
      return;
    }
    if (!licenceFrontFile || !licenceBackFile) {
      setLicenceUploadFeedback({ type: 'error', text: 'Please upload both the front and back of the driving licence.' });
      return;
    }

    setLicenceUploading(true);
    try {
      const [frontUrl, backUrl] = await Promise.all([
        uploadLicenceFile(licenceFrontFile, 'front'),
        uploadLicenceFile(licenceBackFile, 'back'),
      ]);

      const updatePayload = {
        customer_name: licenceFullName.trim() || customer.fullName.trim(),
        licence_front_url: frontUrl,
        licence_back_url: backUrl,
        licence_number: licenceNumber.trim(),
        licence_issue_date: licenceIssueDate || null,
        licence_expiry_date: licenceExpiryDate || null,
        licence_uploaded_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('be_reservations')
        .update(updatePayload)
        .eq('id', submittedReservationDbId);

      if (error) throw error;
      await sendLicenceUploadAdminNotice();
      setLicenceUploadFeedback({ type: 'success', text: 'Your driving licence was uploaded successfully.' });
    } catch (error) {
      console.error('LICENCE UPLOAD ERROR', error);
      setLicenceUploadFeedback({
        type: 'error',
        text: 'Licence upload failed. Please check the storage bucket and reservation columns, then try again.',
      });
    } finally {
      setLicenceUploading(false);
    }
  };

  const deleteBookingRequest = async () => {
    setDeleteBookingFeedback(null);
    if (!submittedReservationDbId) {
      setDeleteBookingFeedback({ type: 'error', text: 'Reservation reference is missing. Please contact us on WhatsApp.' });
      return;
    }

    setDeletingBooking(true);
    try {
      const { error } = await supabase
        .from('be_reservations')
        .update({ status: 'CANCELLED' })
        .eq('id', submittedReservationDbId);

      if (error) throw error;

      const cancellationFlagResult = await supabase
        .from('be_reservations')
        .update({ cancellation_requested: true })
        .eq('id', submittedReservationDbId);

      if (cancellationFlagResult.error) {
        console.warn('CANCELLATION REQUESTED COLUMN UPDATE WARNING', cancellationFlagResult.error);
      }

      setDeleteBookingFeedback({ type: 'success', text: 'Your booking request has been cancelled.' });
    } catch (error) {
      console.error('DELETE BOOKING REQUEST ERROR', error);
      setDeleteBookingFeedback({ type: 'error', text: 'We could not cancel this request automatically. Please contact us on WhatsApp.' });
    } finally {
      setDeletingBooking(false);
    }
  };

  const submitReservation = async () => {
    setSubmitAttempted(true);
    setSubmitError('');
    if (!selectedCar || !acceptTerms || !driverAgeConfirmed || requiredFieldsMissing || submittingReservation) return;
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
      driver_age_confirmed: driverAgeConfirmed,
    };

    setSubmittingReservation(true);
    console.log('PUBLIC BOOKING RESERVATION INSERT PAYLOAD', payload);
    let { data, error } = await supabase
      .from('be_reservations')
      .insert(payload)
      .select('id, reservation_id')
      .single();

    if (error && (error.code === '42703' || error.message.toLowerCase().includes('driver_age_confirmed'))) {
      console.warn('PUBLIC BOOKING DRIVER AGE COLUMN MISSING - retrying insert without driver_age_confirmed', error);
      const { driver_age_confirmed: _driverAgeConfirmed, ...fallbackPayload } = payload;
      const retryResult = await supabase
        .from('be_reservations')
        .insert(fallbackPayload)
        .select('id, reservation_id')
        .single();
      data = retryResult.data;
      error = retryResult.error;
    }

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

    const savedReservationDbId = data?.id || '';
    const savedReservationId = data?.reservation_id || savedReservationDbId || reservationId;
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
        rentalTotal: selectedCar.priceOnRequest ? 'Price on request' : formatEuro(baseRental),
        totalPrice: selectedCar.priceOnRequest ? 'Price on request' : formatEuro(finalTotal),
        paymentMethod,
        extras: selectedExtras,
      },
    });

    console.log('INTERNAL EMAIL PAYLOAD', emailEventPayload);
    await sendBookingEngineEmailEvent(emailEventPayload);

    setSubmittedReservationId(savedReservationId);
    setSubmittedReservationDbId(savedReservationDbId);
    setLicenceFullName(customer.fullName.trim());
    setSubmittingReservation(false);
    setStep('success');
  };

  return (
    <div className={isHomepageEmbed ? 'h-full min-h-0 text-slate-950' : 'h-full min-h-0 overflow-y-auto bg-[radial-gradient(circle_at_top_left,#e0f2fe_0,#f8fafc_34%,#eef2f7_100%)] text-slate-950'}>
      {!isHomepageEmbed && (
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
            <div className="hidden items-center gap-5 md:flex">
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Full insurance included</span>
            <span>EN <ChevronDown className="inline h-4 w-4" /></span>
            </div>
          </div>
        </div>
      </header>
      )}

      {!isHomepageEmbed && (
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
      )}

      <main className={isHomepageEmbed ? 'mx-auto w-full' : 'mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8 lg:py-5'}>
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
          <section className={isHomepageEmbed ? 'mx-auto w-full' : 'mx-auto max-w-6xl'}>
            {!isHomepageEmbed && (
              <div className="mb-4 max-w-2xl">
                <span className="mb-2 inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-black uppercase text-[#087f9c]">
                  <Sparkles className="h-3.5 w-3.5" /> Rhodes made easy
                </span>
                <h1 className="text-3xl font-black tracking-tight text-[#073f5d] sm:text-4xl lg:text-5xl">Find your car in Rhodes</h1>
                <p className="mt-2 text-base font-medium text-slate-600 sm:text-lg">
                  Transparent prices, full insurance and friendly local support.
                </p>
              </div>
            )}

            <BookingSearchForm
              variant={variant}
              layout={embedLayout}
              search={search}
              locationOptions={locationOptions}
              returnLocationOptions={returnLocationOptions}
              categoryOptions={categoryOptions}
              minimumRentalMessage={minimumRentalMessage}
              onSearchChange={(patch) => setSearch((current) => ({ ...current, ...patch }))}
              onPickupDateChange={changePickupDate}
              onReturnDateChange={changeReturnDate}
              onSearch={() => setStep('results')}
            />

            {!isHomepageEmbed && (
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
            )}
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
                  {search.pickupLocation} - {formatDisplayDate(search.pickupDate)} to {formatDisplayDate(search.returnDate)} - {rentalDays} days
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                <strong className="text-slate-950">{visibleCars.length} cars</strong> match your search
              </div>
            </div>

            <div className="mb-4">
              <FeatureFilterPanel
                selectedPassengerFilter={selectedPassengerFilter}
                selectedTransmissionFilter={selectedTransmissionFilter}
                onSelectPassenger={setSelectedPassengerFilter}
                onSelectTransmission={setSelectedTransmissionFilter}
              />
            </div>

            <div className="grid items-start gap-5">
              <div className="grid items-stretch justify-start gap-6 md:grid-cols-2 xl:grid-cols-3 xl:gap-8">
              {visibleCars.map((car) => {
                const primaryPromoBadge = car.promoBadges[0];
                const secondaryPromoBadges = car.promoBadges.slice(1, 3);

                return (
                  <article key={car.id} className="flex h-full w-full max-w-[440px] flex-col overflow-hidden rounded-[26px] border border-slate-200/90 bg-white shadow-[0_18px_48px_rgba(7,63,93,0.11)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_28px_74px_rgba(7,63,93,0.17)]">
                    <div className={`relative flex h-52 items-center justify-center overflow-hidden bg-gradient-to-br sm:h-56 ${car.accent}`}>
                      <div className="absolute left-4 top-4 z-10 rounded-full border border-white/90 bg-white/95 px-3 py-1 text-xs font-black text-[#073f5d] shadow-sm">Group {car.groupCode}</div>
                      {car.imageUrl ? (
                        <img src={car.imageUrl} alt={car.name} className="h-full w-full object-cover" />
                      ) : (
                        <>
                          <Car className="h-28 w-28 text-[#0e7490]/80" strokeWidth={1.15} />
                          <span className="absolute bottom-3 text-[10px] font-bold uppercase text-slate-400">Car image placeholder</span>
                        </>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col p-[22px] sm:p-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-black leading-tight text-[#073f5d]">{car.name}</h2>
                        {primaryPromoBadge && (
                          <span className="rounded-full border border-emerald-300 bg-gradient-to-r from-[#0b6f9f] to-emerald-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.06em] text-white shadow-[0_8px_18px_rgba(11,111,159,0.22)]">
                            {primaryPromoBadge}
                          </span>
                        )}
                        {secondaryPromoBadges.map((badge) => (
                          <span key={badge} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.04em] text-slate-600">
                            {badge}
                          </span>
                        ))}
                      </div>
                      {car.description && <p className="mt-1.5 text-sm leading-5 text-slate-600">{car.description}</p>}
                        {car.includedBenefits.length > 0 && (
                          <div className="mt-3 border-t border-slate-100 pt-3">
                            <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.06em] text-slate-500">Included in price</p>
                            <div className="grid gap-x-5 gap-y-1 lg:grid-cols-2">
                            {car.includedBenefits.map((benefit, index) => (
                              <span key={`${car.id}-benefit-${benefit.label}-${index}`} className="flex items-center gap-2 text-[13px] font-semibold leading-5 text-slate-700">
                                <Check className="h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
                                {benefit.label}
                                {benefit.tooltip && (
                                  <span className="relative inline-flex">
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setActiveBenefitTooltip((current) =>
                                          current === `${car.id}-${index}` ? null : `${car.id}-${index}`,
                                        );
                                      }}
                                      onMouseEnter={() => setActiveBenefitTooltip(`${car.id}-${index}`)}
                                      onMouseLeave={() => setActiveBenefitTooltip(null)}
                                      className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-black text-slate-500 hover:border-[#0b6f9f] hover:text-[#0b6f9f]"
                                      aria-label={`More information about ${benefit.label}`}
                                    >
                                      i
                                    </button>
                                    {activeBenefitTooltip === `${car.id}-${index}` && (
                                      <span className="absolute left-1/2 top-6 z-30 w-48 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold leading-5 text-slate-700 shadow-xl">
                                        {benefit.tooltip}
                                      </span>
                                    )}
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-auto pt-4">
                        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
                          <div className="flex items-end justify-between gap-4 rounded-[14px] border border-slate-200 bg-[#fbfcfe] p-4 md:p-3">
                            <div className="min-w-0">
                              <p className="text-base font-bold leading-tight text-[#1f2937]">
                                Duration: {rentalDays} Day{rentalDays === 1 ? '' : 's'}
                              </p>
                              <p className="mt-2 text-[13px] font-bold text-[#374151]">Status:</p>
                              <p className={`mt-0.5 inline-flex items-center gap-2 text-base font-bold ${car.mode === 'Open' ? 'text-[#16a34a]' : 'text-orange-600'}`}>
                                <span className={`h-2 w-2 rounded-full ${car.mode === 'Open' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                                {car.mode === 'Open' ? 'Available' : 'On Request'}
                              </p>
                              {car.marketingMessage && (
                                <span className="mt-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.05em] text-emerald-800 shadow-sm">
                                  {car.marketingMessage}
                                </span>
                              )}
                            </div>
                            <div className="shrink-0 text-center">
                              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Total</p>
                              <p className="mt-0.5 text-[34px] font-extrabold leading-none text-[#073f5d] md:text-[32px]">
                                  {car.priceOnRequest ? (
                                    <span className="text-xl">On request</span>
                                  ) : (
                                    formatEuro(car.pricePerDay * rentalDays)
                                  )}
                              </p>
                              <p className="mt-1 text-[13px] font-bold text-slate-500">
                                {car.priceOnRequest ? 'Price on request' : <>{formatEuro(car.pricePerDay)} / day</>}
                              </p>
                            </div>
                          </div>
                          <button type="button" onClick={() => selectCar(car)} className={`h-12 w-full rounded-[14px] px-5 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 ${car.mode === 'Open' ? 'bg-emerald-600 shadow-emerald-900/20 hover:bg-emerald-700' : 'bg-orange-500 shadow-orange-900/20 hover:bg-orange-600'}`}>
                            {car.mode === 'Open' ? 'Reserve Now' : 'Request Booking'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
              </div>
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
                                {country.iso} {country.name}
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
                  <div className="mt-4 space-y-2.5">
                    {activeExtras.map((extra) => (
                      <article key={extra.id} className="flex min-h-[76px] items-center gap-3 rounded-xl border border-[#dbe7f3] bg-white px-3 py-2.5 transition hover:border-[#a8cfe8] hover:bg-[#fbfdff] hover:shadow-[0_8px_22px_rgba(7,63,93,0.08)] sm:px-3.5">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-cyan-100 bg-[linear-gradient(135deg,#e0f2fe_0%,#ecfdf5_100%)]">
                          {extra.imageUrl ? (
                            <img src={extra.imageUrl} alt={extra.name} className="h-full w-full object-cover" />
                          ) : (
                            <ShieldCheck className="h-5 w-5 text-[#087f9c]" strokeWidth={1.6} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black leading-5 text-[#073f5d]">{extra.name}</p>
                          {extra.description && <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-slate-500">{extra.description}</p>}
                          <span className="mt-1 block text-[15px] font-black leading-5 text-[#047857]">
                            {formatEuro(extra.price)}
                            <span className="ml-1 text-sm font-bold text-slate-500">
                              {extra.pricingMode === 'Per Day'
                                ? ' / day'
                                : extra.pricingMode === 'Per Booking'
                                  ? ' / rental'
                                  : ''}
                            </span>
                          </span>
                        </div>
                        {(() => {
                          const quantity = extras[extra.id] || 0;
                          const maxQuantity = Number(extra.maximumQuantity || 3);
                          const canDecrease = quantity > 0;
                          const canIncrease = quantity < maxQuantity;
                          return (
                            <div className="ml-auto grid min-w-[116px] grid-cols-[38px_40px_38px] items-center overflow-hidden rounded-xl border border-emerald-300 bg-white shadow-[0_6px_16px_rgba(5,150,105,0.12)]">
                              <button
                                type="button"
                                onClick={() => changeExtraQuantity(extra, -1)}
                                disabled={!canDecrease}
                                className="flex h-9 items-center justify-center border-r border-emerald-200 bg-[#059669] text-white transition hover:bg-[#047857] active:bg-[#065f46] disabled:bg-slate-200 disabled:text-slate-600 disabled:hover:bg-slate-200"
                                aria-label={`Remove ${extra.name}`}
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="flex h-9 items-center justify-center border-x border-emerald-100 bg-white text-sm font-black text-slate-950">
                                {quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => changeExtraQuantity(extra, 1)}
                                disabled={!canIncrease}
                                className="flex h-9 items-center justify-center border-l border-emerald-200 bg-[#059669] text-white transition hover:bg-[#047857] active:bg-[#065f46] disabled:bg-slate-200 disabled:text-slate-600 disabled:hover:bg-slate-200"
                                aria-label={`Add ${extra.name}`}
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        })()}
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
                <div className={`mt-3 flex h-[124px] items-center justify-center overflow-hidden rounded-[14px] border border-slate-100 bg-gradient-to-br ${selectedCar.accent}`}>
                  {selectedCar.imageUrl ? (
                    <img src={selectedCar.imageUrl} alt={selectedCar.name} className="h-full w-full rounded-[14px] object-cover object-center" />
                  ) : (
                    <Car className="h-16 w-16 text-[#0e7490]/80" strokeWidth={1.2} />
                  )}
                </div>
                <h2 className="mt-2 text-xl font-black text-[#073f5d]">{selectedCar.name}</h2>
                <p className="mt-1 text-sm font-bold text-slate-500">Group {selectedCar.groupCode} - {selectedCar.groupName}</p>
                <div className="mt-4 space-y-3 border-y border-slate-100 py-4 text-sm">
                  <SummaryLine label="Pickup" value={`${formatDisplayDate(search.pickupDate)} - ${search.pickupTime}`} />
                  <SummaryLine label="Pickup location" value={search.pickupLocation} />
                  <SummaryLine label="Return" value={`${formatDisplayDate(search.returnDate)} - ${search.returnTime}`} />
                  <SummaryLine label="Return location" value={effectiveReturnLocation} />
                  <SummaryLine
                    label="Rental"
                    value={selectedCar.priceOnRequest ? 'Price on request' : `${rentalDays} days x ${formatEuro(selectedCar.pricePerDay)}`}
                  />
                  {activeExtras.filter((extra) => (extras[extra.id] || 0) > 0).map((extra) => (
                    <SummaryLine
                      key={extra.id}
                      label={`${extra.name} x ${extras[extra.id] || 0}`}
                      value={formatEuro((extras[extra.id] || 0) * Number(extra.price || 0) * rentalDays)}
                    />
                  ))}
                  <SummaryLine label="Extras" value={formatEuro(extrasTotal)} />
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
                  <SummaryLine label="Coupon Discount" value={couponDiscount > 0 ? `-${formatEuro(couponDiscount)}` : formatEuro(0)} />
                  <SummaryLine label="Payment Method" value={paymentMethod} />
                </div>
                <div className="flex items-end justify-between py-4">
                  <span className="font-black text-slate-700">Total</span>
                  <span className="text-3xl font-black text-[#073f5d]">
                    {selectedCar.priceOnRequest ? 'Price on request' : formatEuro(finalTotal)}
                  </span>
                </div>
                <div className="mb-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} className="mt-0.5 h-5 w-5 accent-[#0891b2]" />
                    <span>I accept the rental terms and conditions.</span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={driverAgeConfirmed}
                      onChange={(event) => setDriverAgeConfirmed(event.target.checked)}
                      className="mt-0.5 h-5 w-5 accent-emerald-600"
                    />
                    <span>I confirm that the main driver is at least 23 years old and has a valid driving licence.</span>
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
                {submitAttempted && !driverAgeConfirmed && (
                  <p className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
                    Please confirm that the main driver is at least 23 years old and has a valid driving licence.
                  </p>
                )}
                {submitError && (
                  <p className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
                    {submitError}
                  </p>
                )}
                <button type="button" disabled={!acceptTerms || !driverAgeConfirmed || requiredFieldsMissing || submittingReservation} aria-disabled={!acceptTerms || !driverAgeConfirmed || requiredFieldsMissing || submittingReservation} onClick={submitReservation} className={`flex h-[54px] w-full items-center justify-center gap-2 rounded-xl px-6 text-base font-black text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 ${selectedCar.mode === 'Open' ? 'bg-emerald-600 shadow-emerald-900/20 hover:bg-emerald-700' : 'bg-[#0891b2] shadow-cyan-900/20 hover:bg-[#087f9c]'}`}>
                  {submittingReservation ? 'Saving...' : selectedCar.mode === 'Open' ? 'Confirm Booking' : 'Send Request'} <ArrowRight className="h-5 w-5" />
                </button>
                <p className="mt-2 text-center text-xs text-slate-400">Preview only - no payment will be taken</p>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs font-bold leading-5 text-emerald-800">
                  Full insurance, zero excess and road assistance are included.
                </div>
              </aside>
            </div>
          </section>
        )}

        {step === 'success' && selectedCar && (
          <section className="mx-auto flex min-h-[calc(100vh-190px)] max-w-3xl items-center py-5 text-center sm:py-8">
            <div className="w-full rounded-[26px] border border-slate-200 bg-white px-5 py-7 shadow-[0_24px_70px_rgba(7,63,93,0.16)] sm:px-10 sm:py-9">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-8 border-emerald-50 bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Reservation Received</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[#073f5d]">Your reservation is received</h1>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
                Thank you for choosing AutoClub Rhodes. Your reservation request has been received and you will receive confirmation by email.
              </p>
              <div className="mx-auto mt-5 max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Reservation Code</p>
                <p className="mt-2 rounded-xl bg-[#073f5d] px-4 py-3 font-mono text-lg font-black tracking-[0.08em] text-white shadow-lg shadow-slate-900/15">
                  {submittedReservationId || 'ACR-DEMO-0001'}
                </p>
              </div>
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
                <ConfirmationSummaryBlock label="Car">
                  <p className="font-black text-slate-950">{selectedCar.name}</p>
                </ConfirmationSummaryBlock>
                <ConfirmationSummaryBlock label="Pickup">
                  <p className="font-black text-slate-950">{search.pickupLocation}</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-600">
                    {formatDisplayDate(search.pickupDate)} - {search.pickupTime}
                  </p>
                </ConfirmationSummaryBlock>
                <ConfirmationSummaryBlock label="Return">
                  <p className="font-black text-slate-950">{effectiveReturnLocation}</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-600">
                    {formatDisplayDate(search.returnDate)} - {search.returnTime}
                  </p>
                </ConfirmationSummaryBlock>
                {activeExtras.filter((extra) => (extras[extra.id] || 0) > 0).length > 0 && (
                  <ConfirmationSummaryBlock label="Extras">
                    <div className="space-y-1">
                      {activeExtras.filter((extra) => (extras[extra.id] || 0) > 0).map((extra) => (
                        <p key={extra.id} className="flex items-center justify-between gap-4 text-sm font-bold text-slate-700">
                          <span>{extra.name} x{extras[extra.id] || 0}</span>
                          <span className="font-black text-slate-950">
                            {formatEuro((extras[extra.id] || 0) * Number(extra.price || 0) * rentalDays)}
                          </span>
                        </p>
                      ))}
                    </div>
                  </ConfirmationSummaryBlock>
                )}
                <ConfirmationSummaryBlock label="Total" last>
                  <p className="text-xl font-black text-[#073f5d]">
                    {selectedCar.priceOnRequest ? 'Price on request' : formatEuro(finalTotal)}
                  </p>
                </ConfirmationSummaryBlock>
              </div>
              <div className="mt-4 grid gap-3 text-left sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="font-black text-[#073f5d]">What happens next</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">We will review your reservation and send confirmation by email.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="font-black text-[#073f5d]">Need an urgent change?</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    For urgent changes, contact us on{' '}
                    <a href="https://wa.me/306948202397" target="_blank" rel="noreferrer" className="font-black text-emerald-700 underline decoration-emerald-300 underline-offset-2">
                      WhatsApp +306948202397
                    </a>.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteBookingFeedback(null);
                    setDeleteBookingOpen(true);
                  }}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-rose-300 bg-white px-5 text-sm font-black text-rose-700 shadow-sm transition hover:border-rose-400 hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete my booking
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLicenceFullName(customer.fullName.trim());
                    setLicenceUploadFeedback(null);
                    setLicenceUploadOpen(true);
                  }}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-emerald-600 px-5 text-sm font-black text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-700"
                >
                  <Upload className="h-4 w-4" />
                  Upload my driver licence
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
      {licenceUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(7,63,93,0.18)]">
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Driver licence upload</p>
                <h2 className="mt-1 text-xl font-black text-[#073f5d]">{submittedReservationId}</h2>
                <p className="mt-1 text-sm text-slate-500">Upload files for the main driver linked to this reservation.</p>
              </div>
              <button
                type="button"
                onClick={() => setLicenceUploadOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100"
                aria-label="Close licence upload"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <CustomerField label="Full Name" value={licenceFullName} onChange={setLicenceFullName} />
              <CustomerField label="Licence Number" value={licenceNumber} onChange={setLicenceNumber} />
              <CustomerField label="Licence Issue Date" type="date" value={licenceIssueDate} onChange={setLicenceIssueDate} />
              <CustomerField label="Licence Expiry Date" type="date" value={licenceExpiryDate} onChange={setLicenceExpiryDate} />
              <label className="block sm:col-span-2">
                <span className="text-xs font-black text-slate-700">Driving licence front</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(event) => setLicenceFrontFile(event.target.files?.[0] || null)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-black file:text-emerald-800"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-black text-slate-700">Driving licence back</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(event) => setLicenceBackFile(event.target.files?.[0] || null)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-black file:text-emerald-800"
                />
              </label>
              {licenceUploadFeedback && (
                <p className={`rounded-xl border px-3 py-2 text-sm font-bold sm:col-span-2 ${licenceUploadFeedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                  {licenceUploadFeedback.text}
                </p>
              )}
            </div>
            <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setLicenceUploadOpen(false)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
              >
                Close
              </button>
              <button
                type="button"
                disabled={licenceUploading}
                onClick={submitLicenceUpload}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-700 bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
              >
                <Upload className="h-4 w-4" />
                {licenceUploading ? 'Uploading...' : 'Save licence'}
              </button>
            </footer>
          </div>
        </div>
      )}
      {deleteBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(7,63,93,0.18)]">
            <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-rose-700">Delete booking request?</p>
              <h2 className="mt-1 text-xl font-black text-[#073f5d]">Delete booking request?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                This will cancel your booking request. If you made a mistake, you can also contact us on WhatsApp.
              </p>
            </header>
            <div className="p-5">
              {deleteBookingFeedback && (
                <p className={`rounded-xl border px-3 py-2 text-sm font-bold ${deleteBookingFeedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                  {deleteBookingFeedback.text}
                </p>
              )}
            </div>
            <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteBookingOpen(false)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
              >
                Keep booking
              </button>
              <button
                type="button"
                disabled={deletingBooking || deleteBookingFeedback?.type === 'success'}
                onClick={deleteBookingRequest}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-rose-600 bg-rose-600 px-4 text-sm font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Trash2 className="h-4 w-4" />
                {deletingBooking ? 'Deleting...' : 'Delete booking'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

function HomeBookingSearchForm({
  layout,
  search,
  locationOptions,
  returnLocationOptions,
  categoryOptions,
  minimumRentalMessage,
  onSearchChange,
  onPickupDateChange,
  onReturnDateChange,
  onSearch,
}: {
  layout: BookingSearchLayout;
  search: BookingSearchState;
  locationOptions: string[];
  returnLocationOptions: string[];
  categoryOptions: string[];
  minimumRentalMessage: string;
  onSearchChange: (patch: Partial<BookingSearchState>) => void;
  onPickupDateChange: (value: string) => void;
  onReturnDateChange: (value: string) => void;
  onSearch: () => void;
}) {
  const buttonClass =
    'flex w-full items-center justify-center rounded-xl border-0 bg-[#198754] px-5 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(25,135,84,0.26)] transition hover:-translate-y-0.5 hover:bg-[#157347] active:translate-y-0 active:bg-[#146c43] disabled:bg-[#198754] disabled:text-white disabled:opacity-80';

  if (layout === 'wideBar') {
    return (
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
        <div className="grid items-end gap-2 lg:grid-cols-[1.2fr_1.2fr_1fr_0.8fr_1fr_0.8fr_1fr_150px]">
          <CompactSelectField label="Pickup Location" value={search.pickupLocation} options={locationOptions} onChange={(value) => onSearchChange({ pickupLocation: value })} />
          <CompactSelectField label="Return Location" value={search.returnLocation} options={returnLocationOptions} onChange={(value) => onSearchChange({ returnLocation: value })} />
          <CompactInputField label="Pickup Date" type="date" value={search.pickupDate} onChange={onPickupDateChange} />
          <CompactInputField label="Pickup Time" type="time" value={search.pickupTime} onChange={(value) => onSearchChange({ pickupTime: value })} />
          <CompactInputField label="Return Date" type="date" value={search.returnDate} onChange={onReturnDateChange} />
          <CompactInputField label="Return Time" type="time" value={search.returnTime} onChange={(value) => onSearchChange({ returnTime: value })} />
          <CompactSelectField label="Car Category" value={search.carCategory} options={categoryOptions} onChange={(value) => onSearchChange({ carCategory: value })} />
          <button type="button" onClick={onSearch} className={`${buttonClass} h-11`}>
            Search
          </button>
        </div>
        {minimumRentalMessage && <p className="mt-2 text-xs font-bold text-amber-700">{minimumRentalMessage}</p>}
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.12)] sm:p-5">
      <div className="grid gap-3 md:grid-cols-2">
        <SelectField label="Pickup Location" icon={<MapPin className="h-4 w-4" />} value={search.pickupLocation} options={locationOptions} onChange={(value) => onSearchChange({ pickupLocation: value })} compact />
        <SelectField label="Return Location" icon={<MapPin className="h-4 w-4" />} value={search.returnLocation} options={returnLocationOptions} onChange={(value) => onSearchChange({ returnLocation: value })} compact />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InputField label="Pickup Date" icon={<CalendarDays className="h-4 w-4" />} type="date" value={search.pickupDate} onChange={onPickupDateChange} compact />
        <InputField label="Pickup Time" icon={<Clock3 className="h-4 w-4" />} type="time" value={search.pickupTime} onChange={(value) => onSearchChange({ pickupTime: value })} compact />
        <InputField label="Return Date" icon={<CalendarDays className="h-4 w-4" />} type="date" value={search.returnDate} onChange={onReturnDateChange} compact />
        <InputField label="Return Time" icon={<Clock3 className="h-4 w-4" />} type="time" value={search.returnTime} onChange={(value) => onSearchChange({ returnTime: value })} compact />
      </div>
      {minimumRentalMessage && (
        <p className="mt-2 text-xs font-bold text-amber-700">
          {minimumRentalMessage}
        </p>
      )}
      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
        <SelectField label="Car Category" icon={<Car className="h-4 w-4" />} value={search.carCategory} options={categoryOptions} onChange={(value) => onSearchChange({ carCategory: value })} compact />
        <button type="button" onClick={onSearch} className={`${buttonClass} h-12 md:self-end`}>
          Search
        </button>
      </div>
    </div>
  );
}

function FeatureFilterPanel({
  selectedPassengerFilter,
  selectedTransmissionFilter,
  onSelectPassenger,
  onSelectTransmission,
}: {
  selectedPassengerFilter: string;
  selectedTransmissionFilter: string;
  onSelectPassenger: (value: string) => void;
  onSelectTransmission: (value: string) => void;
}) {
  const hasActiveFilter = selectedPassengerFilter !== 'All' || selectedTransmissionFilter !== 'All';
  return (
    <div className="rounded-[20px] border border-[#d7e7f5] bg-[linear-gradient(180deg,#f8fcff_0%,#eef7ff_100%)] px-4 py-3 shadow-[0_10px_25px_rgba(26,78,130,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-[#073f5d]">Filters</p>
        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => {
              onSelectPassenger('All');
              onSelectTransmission('All');
            }}
            className="booking-filter-button rounded-full border px-2.5 py-1 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B73C9]/30"
          >
            Clear
          </button>
        )}
      </div>
      <div className="mt-3 grid gap-3.5 md:grid-cols-2 md:items-end">
        <SegmentedFilterGroup
          label="Number of Passengers"
          options={['All', '4', '5', '7', '9']}
          value={selectedPassengerFilter}
          onChange={onSelectPassenger}
        />
        <SegmentedFilterGroup
          label="Transmission Type"
          options={['All', 'Manual', 'Auto']}
          value={selectedTransmissionFilter}
          onChange={onSelectTransmission}
        />
      </div>
    </div>
  );
}

function SegmentedFilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-[#31566d]">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = value === option;
          return (
            <button
              key={`${label}-${option}`}
              type="button"
              aria-pressed={selected}
              data-state={selected ? 'on' : 'off'}
              onClick={() => onChange(option)}
              className="booking-filter-button h-8 rounded-full border px-3 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BookingSearchForm({
  variant,
  layout,
  search,
  locationOptions,
  returnLocationOptions,
  categoryOptions,
  minimumRentalMessage,
  onSearchChange,
  onPickupDateChange,
  onReturnDateChange,
  onSearch,
}: {
  variant: PublicBookingPreviewVariant;
  layout: BookingSearchLayout;
  search: BookingSearchState;
  locationOptions: string[];
  returnLocationOptions: string[];
  categoryOptions: string[];
  minimumRentalMessage: string;
  onSearchChange: (patch: Partial<BookingSearchState>) => void;
  onPickupDateChange: (value: string) => void;
  onReturnDateChange: (value: string) => void;
  onSearch: () => void;
}) {
  const isHomepageEmbed = variant === 'homepageEmbed';
  const isWideBar = isHomepageEmbed && layout === 'wideBar';

  if (isWideBar) {
    return (
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
        <div className="grid items-end gap-2 lg:grid-cols-[1.2fr_1.2fr_1fr_0.8fr_1fr_0.8fr_1fr_150px]">
          <CompactSelectField label="Pickup Location" value={search.pickupLocation} options={locationOptions} onChange={(value) => onSearchChange({ pickupLocation: value })} />
          <CompactSelectField label="Return Location" value={search.returnLocation} options={returnLocationOptions} onChange={(value) => onSearchChange({ returnLocation: value })} />
          <CompactInputField label="Pickup Date" type="date" value={search.pickupDate} onChange={onPickupDateChange} />
          <CompactInputField label="Pickup Time" type="time" value={search.pickupTime} onChange={(value) => onSearchChange({ pickupTime: value })} />
          <CompactInputField label="Return Date" type="date" value={search.returnDate} onChange={onReturnDateChange} />
          <CompactInputField label="Return Time" type="time" value={search.returnTime} onChange={(value) => onSearchChange({ returnTime: value })} />
          <CompactSelectField label="Car Category" value={search.carCategory} options={categoryOptions} onChange={(value) => onSearchChange({ carCategory: value })} />
          <button type="button" onClick={onSearch} className="flex h-11 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-black text-white shadow-[0_12px_26px_rgba(5,150,105,0.24)] transition hover:-translate-y-0.5 hover:bg-emerald-700">
            Search
          </button>
        </div>
        {minimumRentalMessage && <p className="mt-2 text-xs font-bold text-amber-700">{minimumRentalMessage}</p>}
      </div>
    );
  }

  return (
    <div className={isHomepageEmbed ? 'rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.12)] sm:p-5' : 'rounded-[24px] border border-slate-200/90 bg-white p-4 shadow-[0_24px_70px_rgba(7,63,93,0.14)] sm:p-5 lg:p-6'}>
      <div className="grid gap-3 md:grid-cols-2">
        <SelectField label="Pickup Location" icon={<MapPin className="h-4 w-4" />} value={search.pickupLocation} options={locationOptions} onChange={(value) => onSearchChange({ pickupLocation: value })} compact={isHomepageEmbed} />
        <SelectField label="Return Location" icon={<MapPin className="h-4 w-4" />} value={search.returnLocation} options={returnLocationOptions} onChange={(value) => onSearchChange({ returnLocation: value })} compact={isHomepageEmbed} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InputField label="Pickup Date" icon={<CalendarDays className="h-4 w-4" />} type="date" value={search.pickupDate} onChange={onPickupDateChange} compact={isHomepageEmbed} />
        <InputField label="Pickup Time" icon={<Clock3 className="h-4 w-4" />} type="time" value={search.pickupTime} onChange={(value) => onSearchChange({ pickupTime: value })} compact={isHomepageEmbed} />
        <InputField label="Return Date" icon={<CalendarDays className="h-4 w-4" />} type="date" value={search.returnDate} onChange={onReturnDateChange} compact={isHomepageEmbed} />
        <InputField label="Return Time" icon={<Clock3 className="h-4 w-4" />} type="time" value={search.returnTime} onChange={(value) => onSearchChange({ returnTime: value })} compact={isHomepageEmbed} />
      </div>
      {minimumRentalMessage && (
        <p className="mt-2 text-xs font-bold text-amber-700">
          {minimumRentalMessage}
        </p>
      )}
      {isHomepageEmbed ? (
        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
          <SelectField label="Car Category" icon={<Car className="h-4 w-4" />} value={search.carCategory} options={categoryOptions} onChange={(value) => onSearchChange({ carCategory: value })} compact />
          <button type="button" onClick={onSearch} className="flex h-12 w-full items-center justify-center rounded-xl bg-emerald-600 px-6 text-sm font-black text-white shadow-[0_12px_26px_rgba(5,150,105,0.24)] transition hover:-translate-y-0.5 hover:bg-emerald-700 md:self-end">
            Search
          </button>
        </div>
      ) : (
        <button type="button" onClick={onSearch} className="mt-5 flex h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-[#073f5d] px-8 text-base font-black text-white shadow-[0_14px_32px_rgba(7,63,93,0.34)] transition hover:-translate-y-0.5 hover:bg-[#052f46]">
          Search Cars <ArrowRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

function CompactSelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-black uppercase tracking-[0.06em] text-slate-600">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-950 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function CompactInputField({ label, type, value, onChange }: { label: string; type: 'date' | 'time'; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-black uppercase tracking-[0.06em] text-slate-600">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-950 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
    </label>
  );
}

function SelectField({ label, icon, value, options, onChange, compact = false }: { label: string; icon: React.ReactNode; value: string; options: string[]; onChange: (value: string) => void; compact?: boolean }) {
  return (
    <label className={compact ? 'grid gap-1' : 'grid gap-1.5'}>
      <span className={`flex items-center gap-2 font-black text-slate-700 ${compact ? 'text-xs' : 'text-sm'}`}>{icon}{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={`${compact ? 'min-h-11 px-3 text-xs' : 'min-h-13 px-4 text-sm'} rounded-xl border border-slate-300 bg-white font-bold text-slate-950 shadow-sm outline-none transition focus:border-[#0891b2] focus:ring-4 focus:ring-cyan-100`}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function InputField({ label, icon, type, value, onChange, compact = false }: { label: string; icon: React.ReactNode; type: 'date' | 'time'; value: string; onChange: (value: string) => void; compact?: boolean }) {
  return (
    <label className={compact ? 'grid gap-1' : 'grid gap-1.5'}>
      <span className={`flex items-center gap-2 font-black text-slate-700 ${compact ? 'text-xs' : 'text-sm'}`}>{icon}{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className={`${compact ? 'min-h-11 px-3 text-xs' : 'min-h-13 px-4 text-sm'} rounded-xl border border-slate-300 bg-white font-bold text-slate-950 shadow-sm outline-none transition focus:border-[#0891b2] focus:ring-4 focus:ring-cyan-100`} />
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

function ConfirmationSummaryBlock({
  label,
  children,
  last = false,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={`${last ? '' : 'border-b border-slate-200'} py-3 first:pt-0 last:pb-0`}>
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

