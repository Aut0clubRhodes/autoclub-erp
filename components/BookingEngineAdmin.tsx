'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import {
  CalendarRange,
  Car,
  Check,
  ChevronDown,
  CreditCard,
  Edit3,
  Gift,
  Globe2,
  ImagePlus,
  Layers3,
  ListChecks,
  Mail,
  MapPin,
  PackagePlus,
  Plus,
  Save,
  Settings2,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  bookingEngineLocalConfig,
  type BookingEngineEmailSettings,
  type BookingEngineEmailTemplateId,
  type CheckoutFieldType,
  normalizeBookingEngineCheckoutFields,
  resetBookingEngineConfig,
  saveBookingEngineConfig,
} from '@/lib/bookingEngineLocalConfig';
import {
  bookingEngineEmailTemplateOrder,
  buildBookingEmailHtml,
  getBookingEmailIntro,
  renderBookingEmailTemplate,
} from '@/lib/bookingEngineEmailEngine';
import { supabase } from '@/lib/supabaseClient';
import { notifyBookingEngineSitesChanged } from '@/lib/bookingEngineSites';

type AdminTabId =
  | 'groups'
  | 'cars'
  | 'pricing'
  | 'locations'
  | 'features'
  | 'extras'
  | 'coupons'
  | 'payments'
  | 'booking-settings'
  | 'checkout-fields'
  | 'site-settings'
  | 'emails';

type AdminTab = {
  id: AdminTabId;
  label: string;
  description: string;
  icon: LucideIcon;
};

type CarStatus = 'Open' | 'On Request' | 'Hidden';
type LocationType = 'airport' | 'town' | 'hotel' | 'custom';
type SeasonStatus = 'Active' | 'Inactive';
type ExtraPricingMode = 'Per Day' | 'Per Booking' | 'Free';
type CouponDiscountType = 'Percentage' | 'Fixed Amount';
type PaymentMethodType = 'Pay on Arrival' | 'Bank Transfer' | 'Payment Link' | 'Card' | 'Custom';
type BookingDefaultLanguage = 'English' | 'Italian' | 'French' | 'German' | 'Czech' | 'Greek';
type NewReservationStatus = 'Pending' | 'Accepted' | 'On Request';

type BookingGroup = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  notes: string;
};

type BeSiteRow = {
  id: string;
  name: string | null;
  domain: string | null;
  admin_email?: string | null;
  booking_notification_email?: string | null;
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
  timezone?: string | null;
  default_pickup_time?: string | null;
  default_return_time?: string | null;
  review_enabled?: boolean | null;
  review_delay_days?: string | number | null;
  theme_layout?: string | null;
  custom_css?: string | null;
  reservation_destination?: string | null;
  default_language?: BookingDefaultLanguage | string | null;
  whatsapp_number?: string | null;
  terms_url?: string | null;
  privacy_policy_url?: string | null;
  logo_image?: string | null;
  status?: SeasonStatus | string | null;
  internal_notes?: string | null;
};

type BeGroupRow = {
  id: string | number;
  code: string | null;
  name: string | null;
  description: string | null;
  status: string | null;
};

type BeVehicleCategoryRow = {
  id: string | number;
  name?: string | null;
  group_code?: string | null;
  groupCode?: string | null;
  description?: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
  feature_ids?: string[] | null;
  featureIds?: string[] | null;
  included_benefits?: Array<string | Partial<IncludedBenefit>> | null;
  includedBenefits?: Array<string | Partial<IncludedBenefit>> | null;
  promo_badges?: string[] | null;
  promoBadges?: string[] | null;
  marketing_message?: string | null;
  marketingMessage?: string | null;
  display_priority?: string | number | null;
  displayPriority?: string | number | null;
  location_ids?: string[] | null;
  locationIds?: string[] | null;
  status?: string | null;
};

type BePricingSeasonRow = {
  id: string | number;
  group_code?: string | null;
  groupCode?: string | null;
  season_name?: string | null;
  seasonName?: string | null;
  from_date?: string | null;
  fromDate?: string | null;
  to_date?: string | null;
  toDate?: string | null;
  tiers?: PricingTier[] | null;
  pricing_tiers?: PricingTier[] | null;
  website_mode?: string | null;
  websiteMode?: string | null;
  status?: string | null;
  notes?: string | null;
};

type BeLocationRow = {
  id: string | number;
  name?: string | null;
  type?: LocationType | string | null;
  active?: boolean | null;
  fee?: string | number | null;
  status?: string | null;
};

type BeFeatureRow = {
  id: string | number;
  name?: string | null;
};

type BeExtraRow = {
  id: string | number;
  name?: string | null;
  description?: string | null;
  pricing_mode?: ExtraPricingMode | string | null;
  pricingMode?: ExtraPricingMode | string | null;
  price?: string | number | null;
  image_url?: string | null;
  imageUrl?: string | null;
  status?: SeasonStatus | string | null;
  maximum_quantity?: string | number | null;
  maximumQuantity?: string | number | null;
};

type BeCouponRow = {
  id: string | number;
  code?: string | null;
  discount_type?: CouponDiscountType | string | null;
  discountType?: CouponDiscountType | string | null;
  discount_value?: string | number | null;
  discountValue?: string | number | null;
  valid_from?: string | null;
  validFrom?: string | null;
  valid_to?: string | null;
  validTo?: string | null;
  minimum_days?: string | number | null;
  minimumDays?: string | number | null;
  allowed_group_codes?: string[] | null;
  allowedGroupCodes?: string[] | null;
  usage_limit?: string | number | null;
  usageLimit?: string | number | null;
  status?: SeasonStatus | string | null;
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

type BeBookingSettingsRow = {
  id?: string | null;
  site_id?: string | null;
  advance_booking_active?: boolean | null;
  advance_booking_hours?: string | number | null;
  default_language?: BookingDefaultLanguage | string | null;
  require_rental_terms?: boolean | null;
  show_marketing_consent?: boolean | null;
  terms_url?: string | null;
  new_reservation_status?: NewReservationStatus | string | null;
  minimum_rental_days?: string | number | null;
};

type BeCheckoutFieldRow = {
  id: string | number;
  field_key?: string | null;
  name?: string | null;
  field_type?: CheckoutFieldType | string | null;
  enabled?: boolean | null;
  required?: boolean | null;
  label?: string | null;
  options?: string[] | null;
  built_in?: boolean | null;
  sort_order?: number | null;
};

type BeEmailTemplateRow = {
  id: string | number;
  template_key?: string | null;
  label?: string | null;
  active?: boolean | null;
  subject?: string | null;
  message?: string | null;
};

type BookingLocation = {
  id: string;
  name: string;
  type: LocationType;
  active: boolean;
  fee: string;
};

type BookingFeature = {
  id: string;
  name: string;
};

type IncludedBenefit = {
  label: string;
  tooltip: string;
};

type BookingEngineCar = {
  id: string;
  name: string;
  groupCode: string;
  description: string;
  imageUrl: string;
  featureIds: string[];
  includedBenefits: IncludedBenefit[];
  promoBadges: string[];
  marketingMessage: string;
  displayPriority: string;
  status: CarStatus;
  locationIds: string[];
};

type BookingExtra = {
  id: string;
  name: string;
  description: string;
  pricingMode: ExtraPricingMode;
  price: string;
  imageUrl: string;
  status: SeasonStatus;
  maximumQuantity: string;
};

type PricingTier = {
  id: string;
  fromDays: string;
  toDays: string;
  pricePerDay: string;
};

type SeasonPrice = {
  id: string;
  groupCode: string;
  seasonName: string;
  fromDate: string;
  toDate: string;
  tiers: PricingTier[];
  websiteMode: CarStatus;
  status: SeasonStatus;
  notes: string;
};

type BookingCoupon = {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: string;
  validFrom: string;
  validTo: string;
  minimumDays: string;
  allowedGroupCodes: string[];
  usageLimit: string;
  status: SeasonStatus;
};

type BookingPaymentMethod = {
  id: string;
  name: string;
  type: PaymentMethodType;
  description: string;
  depositRequired: boolean;
  depositAmount: string;
  status: SeasonStatus;
};

type BookingEmailSettings = BookingEngineEmailSettings;

type BookingEngineSettings = {
  advanceBookingActive: boolean;
  advanceBookingHours: string;
  minimumRentalDays: string;
  defaultLanguage: BookingDefaultLanguage;
  requireRentalTerms: boolean;
  showMarketingConsent: boolean;
  termsUrl: string;
  newReservationStatus: NewReservationStatus;
};

type CheckoutFieldSetting = {
  id: string;
  name: string;
  fieldType: CheckoutFieldType;
  enabled: boolean;
  required: boolean;
  label: string;
  options?: string[];
  builtIn?: boolean;
};

type SiteSettings = {
  companyName: string;
  domain: string;
  adminEmail: string;
  bookingNotificationEmail: string;
  primaryColor: string;
  secondaryColor: string;
  supportEmail: string;
  phone: string;
  whatsapp: string;
  websiteUrl: string;
  googleReviewUrl: string;
  emailHeaderImage: string;
  emailFooterText: string;
  currency: string;
  timezone: string;
  defaultPickupTime: string;
  defaultReturnTime: string;
  reviewEnabled: boolean;
  reviewDelayDays: string;
  themeLayout: string;
  customCss: string;
  reservationDestination: string;
  defaultLanguage: BookingDefaultLanguage;
  whatsappNumber: string;
  termsUrl: string;
  privacyPolicyUrl: string;
  logoImage: string;
  status: SeasonStatus;
  internalNotes: string;
};

type EmailTemplateFieldKey = `${BookingEngineEmailTemplateId}:subject` | `${BookingEngineEmailTemplateId}:message`;

type CarDraft = Omit<BookingEngineCar, 'id'>;
type GroupDraft = Omit<BookingGroup, 'id'>;
type LocationDraft = Omit<BookingLocation, 'id'>;
type FeatureDraft = Omit<BookingFeature, 'id'>;
type ExtraDraft = Omit<BookingExtra, 'id'>;
type SeasonPriceDraft = Omit<SeasonPrice, 'id'>;
type CouponDraft = Omit<BookingCoupon, 'id'>;
type PaymentMethodDraft = Omit<BookingPaymentMethod, 'id'>;

const adminTabs: AdminTab[] = [
  { id: 'groups', label: 'Groups', description: 'Vehicle groups shared by cars and category pricing.', icon: Layers3 },
  { id: 'cars', label: 'Cars', description: 'Website vehicle catalogue and booking visibility.', icon: Car },
  { id: 'pricing', label: 'Pricing / Seasons', description: 'Season periods, daily rates and pricing rules.', icon: CalendarRange },
  { id: 'locations', label: 'Locations', description: 'Pickup and return locations for website requests.', icon: MapPin },
  { id: 'features', label: 'Features', description: 'Reusable features available for website vehicle categories.', icon: ListChecks },
  { id: 'extras', label: 'Extras', description: 'Optional equipment and customer add-ons.', icon: PackagePlus },
  { id: 'coupons', label: 'Coupons', description: 'Promotional codes and discount definitions.', icon: Gift },
  { id: 'payments', label: 'Payment Methods', description: 'Available payment choices and checkout settings.', icon: CreditCard },
  { id: 'booking-settings', label: 'Booking Settings', description: 'Reservation rules, defaults and customer consent options.', icon: Settings2 },
  { id: 'checkout-fields', label: 'Checkout Fields', description: 'Choose which customer fields appear during checkout.', icon: ListChecks },
  { id: 'site-settings', label: 'Site Settings', description: 'Site identity, regional defaults and contact configuration.', icon: Globe2 },
  { id: 'emails', label: 'Emails', description: 'Customer email templates and delivery settings.', icon: Mail },
];
const BOOKING_ENGINE_ACTIVE_TAB_STORAGE_KEY = 'booking_engine_active_tab';
const includedBenefitOptions = [
  'Full Insurance',
  'Zero Excess',
  'No Deposit',
  'Unlimited Kilometers',
  'Free Second Driver',
  '24/7 Road Assistance',
  'Free Airport Delivery',
].map((name) => ({ id: name, name }));
const promoBadgeOptions = [
  'Best Value',
  'Most Popular',
  '2 Cars Left',
  'Automatic',
  'Family Choice',
  'Economy',
].map((name) => ({ id: name, name }));
const marketingMessageOptions = ['', '🔥 SAVE 30%', 'SPECIAL OFFER', 'LIMITED OFFER', 'custom'];

const getStoredBookingEngineActiveTab = (): AdminTabId => {
  if (typeof window === 'undefined') return 'groups';

  const savedTab = window.localStorage.getItem(BOOKING_ENGINE_ACTIVE_TAB_STORAGE_KEY);
  return adminTabs.some((tab) => tab.id === savedTab) ? (savedTab as AdminTabId) : 'groups';
};

const emptyCarDraft: CarDraft = {
  name: '',
  groupCode: '',
  description: '',
  imageUrl: '',
  featureIds: [],
  includedBenefits: [],
  promoBadges: [],
  marketingMessage: '',
  displayPriority: '0',
  status: 'Open',
  locationIds: [],
};

const emptyGroupDraft: GroupDraft = {
  code: '',
  name: '',
  active: true,
  notes: '',
};

const emptyLocationDraft: LocationDraft = {
  name: '',
  type: 'custom',
  active: true,
  fee: '',
};

const emptyFeatureDraft: FeatureDraft = { name: '' };

const emptyExtraDraft: ExtraDraft = {
  name: '',
  description: '',
  pricingMode: 'Per Day',
  price: '',
  imageUrl: '',
  status: 'Active',
  maximumQuantity: '',
};

const emptySeasonPriceDraft: SeasonPriceDraft = {
  groupCode: '',
  seasonName: '',
  fromDate: '',
  toDate: '',
  tiers: [],
  websiteMode: 'Open',
  status: 'Active',
  notes: '',
};

const emptyCouponDraft: CouponDraft = {
  code: '',
  discountType: 'Percentage',
  discountValue: '',
  validFrom: '',
  validTo: '',
  minimumDays: '',
  allowedGroupCodes: [],
  usageLimit: '',
  status: 'Active',
};

const emptyPaymentMethodDraft: PaymentMethodDraft = {
  name: '',
  type: 'Pay on Arrival',
  description: '',
  depositRequired: false,
  depositAmount: '',
  status: 'Active',
};

const initialBookingEngineSettings: BookingEngineSettings = {
  advanceBookingActive: true,
  advanceBookingHours: '48',
  minimumRentalDays: '3',
  defaultLanguage: 'English',
  requireRentalTerms: true,
  showMarketingConsent: true,
  termsUrl: '',
  newReservationStatus: 'Pending',
};

const initialSiteSettings: SiteSettings = {
  companyName: 'Booking Site',
  domain: '',
  adminEmail: '',
  bookingNotificationEmail: '',
  primaryColor: '#073f5d',
  secondaryColor: '#059669',
  supportEmail: '',
  phone: '',
  whatsapp: '',
  websiteUrl: '',
  googleReviewUrl: 'https://g.page/r/CYOr9zt3_-KVEBM/review',
  emailHeaderImage: '',
  emailFooterText: 'For urgent changes, contact us using the support details above.',
  currency: 'EUR',
  timezone: 'Europe/Athens',
  defaultPickupTime: '10:00',
  defaultReturnTime: '10:00',
  reviewEnabled: true,
  reviewDelayDays: '1',
  themeLayout: 'Default',
  customCss: '',
  reservationDestination: 'main_board',
  defaultLanguage: 'English',
  whatsappNumber: '',
  termsUrl: '',
  privacyPolicyUrl: '',
  logoImage: '',
  status: 'Active',
  internalNotes: '',
};

const lockedEmailTemplateIds: BookingEngineEmailTemplateId[] = bookingEngineEmailTemplateOrder;

const initialEmailSettings: BookingEmailSettings = {
  adminEmail: '',
  templates: (() => {
    const templates = { ...bookingEngineLocalConfig.emailSettings.templates };
    lockedEmailTemplateIds.forEach((templateId) => {
      templates[templateId] = {
        ...templates[templateId],
        subject: '',
        message: '',
      };
    });
    return templates;
  })(),
};

const emailTemplateVariables = [
  '{{customer_name}}',
  '{{reservation_id}}',
  '{{car_name}}',
  '{{group}}',
  '{{pickup_date}}',
  '{{pickup_time}}',
  '{{return_date}}',
  '{{return_time}}',
  '{{pickup_location}}',
  '{{return_location}}',
  '{{total_price}}',
  '{{payment_method}}',
  '{{payment_link}}',
  '{{extras_summary}}',
];

const sampleGroups: BookingGroup[] = [
  { id: 'group-a', code: 'A', name: 'Small Economy', active: true, notes: '' },
  { id: 'group-b', code: 'B', name: 'Economy', active: true, notes: '' },
  { id: 'group-c', code: 'C', name: 'Compact', active: true, notes: '' },
  { id: 'group-d1', code: 'D1', name: 'Compact SUV', active: true, notes: '' },
];

const sampleLocations: BookingLocation[] = [
  { id: 'airport', name: 'Airport', type: 'airport', active: true, fee: '0' },
  { id: 'rhodes-town', name: 'Rhodes Town', type: 'town', active: true, fee: '0' },
  { id: 'faliraki', name: 'Faliraki', type: 'town', active: true, fee: '12' },
  { id: 'lindos', name: 'Lindos', type: 'town', active: true, fee: '30' },
  { id: 'ixia', name: 'Ixia', type: 'town', active: true, fee: '8' },
  { id: 'kolymbia', name: 'Kolymbia', type: 'town', active: true, fee: '20' },
  { id: 'afandou', name: 'Afandou', type: 'town', active: true, fee: '18' },
  { id: 'pefkos', name: 'Pefkos', type: 'town', active: true, fee: '32' },
];

const sampleFeatures: BookingFeature[] = [
  { id: 'air-conditioning', name: 'Air conditioning' },
  { id: 'automatic', name: 'Automatic' },
  { id: 'manual', name: 'Manual' },
  { id: 'five-seats', name: '5 seats' },
  { id: 'four-seats', name: '4 seats' },
  { id: 'two-bags', name: '2 bags' },
  { id: 'three-bags', name: '3 bags' },
];

const sampleExtras: BookingExtra[] = [
  {
    id: 'extra-baby-seat',
    name: 'Baby Seat',
    description: 'Child safety seat suitable for young children.',
    pricingMode: 'Per Day',
    price: '5',
    imageUrl: '',
    status: 'Active',
    maximumQuantity: '2',
  },
  {
    id: 'extra-booster-seat',
    name: 'Booster Seat',
    description: 'Booster seat for older children.',
    pricingMode: 'Per Day',
    price: '4',
    imageUrl: '',
    status: 'Active',
    maximumQuantity: '2',
  },
  {
    id: 'extra-infant-seat',
    name: 'Infant Seat',
    description: 'Rear-facing infant safety seat.',
    pricingMode: 'Per Booking',
    price: '18',
    imageUrl: '',
    status: 'Active',
    maximumQuantity: '1',
  },
];

const sampleCars: BookingEngineCar[] = [
  {
    id: 'demo-city',
    name: 'Peugeot 108 or similar',
    groupCode: 'A',
    description: 'Compact city car for couples and short island trips.',
    imageUrl: '',
    featureIds: ['manual', 'air-conditioning', 'four-seats', 'two-bags'],
    includedBenefits: ['Full Insurance', 'Zero Excess', 'No Deposit'].map((label) => ({ label, tooltip: '' })),
    promoBadges: ['Economy'],
    marketingMessage: '',
    displayPriority: '0',
    status: 'Open',
    locationIds: ['airport', 'rhodes-town', 'faliraki'],
  },
  {
    id: 'demo-family',
    name: 'Peugeot 2008 or similar',
    groupCode: 'D1',
    description: 'Comfortable crossover with additional luggage room.',
    imageUrl: '',
    featureIds: ['automatic', 'air-conditioning', 'five-seats', 'three-bags'],
    includedBenefits: ['Full Insurance', 'Unlimited Kilometers', '24/7 Road Assistance'].map((label) => ({ label, tooltip: '' })),
    promoBadges: ['Family Choice', 'Automatic'],
    marketingMessage: '',
    displayPriority: '0',
    status: 'On Request',
    locationIds: ['airport', 'rhodes-town', 'lindos', 'pefkos'],
  },
];

const sampleSeasonPrices: SeasonPrice[] = [
  {
    id: 'season-a-june',
    groupCode: 'A',
    seasonName: 'Early Summer',
    fromDate: '2026-06-01',
    toDate: '2026-06-30',
    tiers: [
      { id: 'season-a-tier-1', fromDays: '1', toDays: '1', pricePerDay: '50' },
      { id: 'season-a-tier-2', fromDays: '2', toDays: '3', pricePerDay: '40' },
      { id: 'season-a-tier-3', fromDays: '4', toDays: '7', pricePerDay: '32' },
      { id: 'season-a-tier-4', fromDays: '8', toDays: '14', pricePerDay: '30' },
    ],
    websiteMode: 'Open',
    status: 'Active',
    notes: 'Local UI sample.',
  },
  {
    id: 'season-d1-peak',
    groupCode: 'D1',
    seasonName: 'Peak Season',
    fromDate: '2026-07-01',
    toDate: '2026-08-31',
    tiers: [
      { id: 'season-d1-tier-1', fromDays: '1', toDays: '1', pricePerDay: '92' },
      { id: 'season-d1-tier-2', fromDays: '2', toDays: '3', pricePerDay: '84' },
      { id: 'season-d1-tier-3', fromDays: '4', toDays: '7', pricePerDay: '80' },
      { id: 'season-d1-tier-4', fromDays: '8', toDays: '14', pricePerDay: '78' },
    ],
    websiteMode: 'On Request',
    status: 'Active',
    notes: '',
  },
];

const sampleCoupons: BookingCoupon[] = [
  {
    id: 'coupon-summer10',
    code: 'SUMMER10',
    discountType: 'Percentage',
    discountValue: '10',
    validFrom: '2026-06-01',
    validTo: '2026-09-30',
    minimumDays: '',
    allowedGroupCodes: [],
    usageLimit: '',
    status: 'Active',
  },
];

const defaultPaymentMethods: BookingPaymentMethod[] = [
  {
    id: 'payment-arrival',
    name: 'Pay on Arrival',
    type: 'Pay on Arrival',
    description: 'Customer pays when collecting the vehicle.',
    depositRequired: false,
    depositAmount: '',
    status: 'Active',
  },
  {
    id: 'payment-link',
    name: 'Payment Link',
    type: 'Payment Link',
    description: 'A secure payment link is sent to the customer.',
    depositRequired: false,
    depositAmount: '',
    status: 'Active',
  },
  {
    id: 'payment-card-delivery',
    name: 'Card on Delivery',
    type: 'Card',
    description: 'Customer pays by card when the vehicle is delivered.',
    depositRequired: false,
    depositAmount: '',
    status: 'Active',
  },
  {
    id: 'payment-bank-transfer',
    name: 'Bank Transfer',
    type: 'Bank Transfer',
    description: 'Customer pays by bank transfer.',
    depositRequired: false,
    depositAmount: '',
    status: 'Active',
  },
];

const statusStyles: Record<CarStatus, string> = {
  Open: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  'On Request': 'border-amber-300 bg-amber-50 text-amber-800',
  Hidden: 'border-slate-300 bg-slate-100 text-slate-600',
};

const locationTypeLabels: Record<LocationType, string> = {
  airport: 'Airport',
  town: 'Town',
  hotel: 'Hotel',
  custom: 'Custom',
};

const localId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const normalizeIncludedBenefits = (value: Array<string | Partial<IncludedBenefit>> | null | undefined): IncludedBenefit[] =>
  Array.isArray(value)
    ? value
        .map((item) => {
          if (typeof item === 'string') {
            return { label: item.trim(), tooltip: '' };
          }

          return {
            label: String(item?.label || '').trim(),
            tooltip: String(item?.tooltip || '').trim(),
          };
        })
        .filter((item) => item.label)
    : [];

const normalizeStringList = (value: string[] | null | undefined): string[] =>
  Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];

const readImageFileAsDataUrl = (file: File, onLoad: (dataUrl: string) => void) => {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;

  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === 'string') onLoad(reader.result);
  };
  reader.readAsDataURL(file);
};

const createDefaultPricingTiers = (): PricingTier[] => [
  { id: localId('pricing-tier'), fromDays: '1', toDays: '1', pricePerDay: '' },
  { id: localId('pricing-tier'), fromDays: '2', toDays: '3', pricePerDay: '' },
  { id: localId('pricing-tier'), fromDays: '4', toDays: '7', pricePerDay: '' },
];
const checkoutFieldDeleteKeys: Record<string, string[]> = {
  full_name: ['full_name', 'fullName'],
  phone: ['phone', 'whatsapp'],
  date_of_birth: ['date_of_birth', 'dateOfBirth'],
  accommodation_name: ['accommodation_name', 'hotelRoom'],
  flight_number: ['flight_number', 'flightNumber'],
};
const formatDateOnly = (value: string) => {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
};

export default function BookingEngineAdmin({ selectedSiteId = '' }: { selectedSiteId?: string }) {
  const [activeTab, setActiveTab] = useState<AdminTabId>(getStoredBookingEngineActiveTab);
  const [groups, setGroups] = useState<BookingGroup[]>([]);
  const [beSiteId, setBeSiteId] = useState<string | null>(selectedSiteId || null);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState('');
  const [cars, setCars] = useState<BookingEngineCar[]>([]);
  const [carsLoading, setCarsLoading] = useState(false);
  const [carsSaving, setCarsSaving] = useState(false);
  const [carsError, setCarsError] = useState('');
  const [carOptionalColumns, setCarOptionalColumns] = useState({
    includedBenefits: false,
    promoBadges: false,
    marketingMessage: false,
    displayPriority: false,
  });
  const [locations, setLocations] = useState<BookingLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsError, setLocationsError] = useState('');
  const [features, setFeatures] = useState<BookingFeature[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [featuresError, setFeaturesError] = useState('');
  const [extras, setExtras] = useState<BookingExtra[]>([]);
  const [extrasLoading, setExtrasLoading] = useState(false);
  const [extrasError, setExtrasError] = useState('');
  const [seasonPrices, setSeasonPrices] = useState<SeasonPrice[]>([]);
  const [seasonPricesLoading, setSeasonPricesLoading] = useState(false);
  const [seasonPricesError, setSeasonPricesError] = useState('');
  const [coupons, setCoupons] = useState<BookingCoupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponsError, setCouponsError] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<BookingPaymentMethod[]>([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
  const [paymentMethodsSaving, setPaymentMethodsSaving] = useState(false);
  const [paymentMethodsError, setPaymentMethodsError] = useState('');
  const [paymentMethodsMessage, setPaymentMethodsMessage] = useState('');

  const [carModalOpen, setCarModalOpen] = useState(false);
  const [editingCarId, setEditingCarId] = useState<string | null>(null);
  const [carDraft, setCarDraft] = useState<CarDraft>(emptyCarDraft);

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupDraft, setGroupDraft] = useState<GroupDraft>(emptyGroupDraft);

  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [locationDraft, setLocationDraft] = useState<LocationDraft>(emptyLocationDraft);

  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null);
  const [featureDraft, setFeatureDraft] = useState<FeatureDraft>(emptyFeatureDraft);

  const [extraModalOpen, setExtraModalOpen] = useState(false);
  const [editingExtraId, setEditingExtraId] = useState<string | null>(null);
  const [extraDraft, setExtraDraft] = useState<ExtraDraft>(emptyExtraDraft);

  const [seasonPriceModalOpen, setSeasonPriceModalOpen] = useState(false);
  const [editingSeasonPriceId, setEditingSeasonPriceId] = useState<string | null>(null);
  const [seasonPriceDraft, setSeasonPriceDraft] = useState<SeasonPriceDraft>(emptySeasonPriceDraft);

  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [couponDraft, setCouponDraft] = useState<CouponDraft>(emptyCouponDraft);

  const [paymentMethodModalOpen, setPaymentMethodModalOpen] = useState(false);
  const [editingPaymentMethodId, setEditingPaymentMethodId] = useState<string | null>(null);
  const [paymentMethodDraft, setPaymentMethodDraft] =
    useState<PaymentMethodDraft>(emptyPaymentMethodDraft);
  const [emailSettings, setEmailSettings] =
    useState<BookingEmailSettings>(initialEmailSettings);
  const [emailSettingsLoading, setEmailSettingsLoading] = useState(false);
  const [emailSettingsError, setEmailSettingsError] = useState('');
  const [emailSettingsMessage, setEmailSettingsMessage] = useState('');
  const [bookingEngineSettings, setBookingEngineSettings] =
    useState<BookingEngineSettings>(initialBookingEngineSettings);
  const [bookingSettingsLoading, setBookingSettingsLoading] = useState(false);
  const [bookingSettingsError, setBookingSettingsError] = useState('');
  const [bookingSettingsMessage, setBookingSettingsMessage] = useState('');
  const [checkoutFields, setCheckoutFields] =
    useState<CheckoutFieldSetting[]>([]);
  const [checkoutFieldsLoading, setCheckoutFieldsLoading] = useState(false);
  const [checkoutFieldsError, setCheckoutFieldsError] = useState('');
  const [checkoutFieldsMessage, setCheckoutFieldsMessage] = useState('');
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(initialSiteSettings);
  const [siteSettingsLoading, setSiteSettingsLoading] = useState(false);
  const [siteSettingsError, setSiteSettingsError] = useState('');
  const [siteSettingsMessage, setSiteSettingsMessage] = useState('');

  const currentTab = adminTabs.find((tab) => tab.id === activeTab) || adminTabs[0];
  const CurrentIcon = currentTab.icon;
  const activeLocations = locations.filter((location) => location.active);
  const activeGroups = groups
    .filter((group) => group.active)
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

  useEffect(() => {
    window.localStorage.setItem(BOOKING_ENGINE_ACTIVE_TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  const mapBeGroup = (row: BeGroupRow): BookingGroup => ({
    id: String(row.id),
    code: (row.code || '').trim(),
    name: (row.name || '').trim(),
    active: (row.status || 'Active') !== 'Inactive',
    notes: row.description || '',
  });

  const mapBeVehicleCategory = (row: BeVehicleCategoryRow): BookingEngineCar => ({
    id: String(row.id),
    name: (row.name || '').trim(),
    groupCode: (row.group_code || row.groupCode || '').trim(),
    description: row.description || '',
    imageUrl: row.image_url || row.imageUrl || '',
    featureIds: Array.isArray(row.feature_ids)
      ? row.feature_ids
      : Array.isArray(row.featureIds)
        ? row.featureIds
        : [],
    includedBenefits: normalizeIncludedBenefits(
      Array.isArray(row.included_benefits) ? row.included_benefits : row.includedBenefits,
    ),
    promoBadges: normalizeStringList(Array.isArray(row.promo_badges) ? row.promo_badges : row.promoBadges),
    marketingMessage: row.marketing_message || row.marketingMessage || '',
    displayPriority: String(row.display_priority ?? row.displayPriority ?? '0'),
    status:
      row.status === 'On Request' || row.status === 'Hidden' || row.status === 'Open'
        ? row.status
        : 'Open',
    locationIds: Array.isArray(row.location_ids)
      ? row.location_ids
      : Array.isArray(row.locationIds)
        ? row.locationIds
        : [],
  });

  const mapBePricingSeason = (row: BePricingSeasonRow): SeasonPrice => {
    const rawTiers = Array.isArray(row.pricing_tiers)
      ? row.pricing_tiers
      : Array.isArray(row.tiers)
        ? row.tiers
        : [];
    const websiteMode = row.website_mode || row.websiteMode;
    const status = row.status || 'Active';

    return {
      id: String(row.id),
      groupCode: (row.group_code || row.groupCode || '').trim(),
      seasonName: (row.season_name || row.seasonName || '').trim(),
      fromDate: row.from_date || row.fromDate || '',
      toDate: row.to_date || row.toDate || '',
      tiers: rawTiers.map((tier) => ({
        id: tier.id || localId('pricing-tier'),
        fromDays: String(tier.fromDays || ''),
        toDays: String(tier.toDays || ''),
        pricePerDay: String(tier.pricePerDay || ''),
      })),
      websiteMode:
        websiteMode === 'On Request' || websiteMode === 'Hidden' || websiteMode === 'Open'
          ? websiteMode
          : 'Open',
      status: status === 'Inactive' ? 'Inactive' : 'Active',
      notes: row.notes || '',
    };
  };

  const mapBeLocation = (row: BeLocationRow): BookingLocation => ({
    id: String(row.id),
    name: (row.name || '').trim(),
    type:
      row.type === 'airport' || row.type === 'town' || row.type === 'hotel' || row.type === 'custom'
        ? row.type
        : 'custom',
    active: typeof row.active === 'boolean' ? row.active : row.status !== 'Inactive',
    fee: row.fee === null || row.fee === undefined ? '' : String(row.fee),
  });

  const loadSupabaseLocations = async (siteId: string) => {
    setLocationsLoading(true);
    setLocationsError('');

    const { data, error } = await supabase
      .from('be_locations')
      .select('*')
      .eq('site_id', siteId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Booking Engine locations load failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setLocations([]);
      setLocationsError('Failed to load locations from Supabase');
      setLocationsLoading(false);
      return;
    }

    setLocations((data || []).map((row) => mapBeLocation(row as BeLocationRow)));
    setLocationsLoading(false);
  };

  const mapBeFeature = (row: BeFeatureRow): BookingFeature => ({
    id: String(row.id),
    name: (row.name || '').trim(),
  });

  const loadSupabaseFeatures = async (siteId: string) => {
    setFeaturesLoading(true);
    setFeaturesError('');

    const { data, error } = await supabase
      .from('be_features')
      .select('id, name')
      .eq('site_id', siteId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Booking Engine features load failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setFeatures([]);
      setFeaturesError('Failed to load features from Supabase');
      setFeaturesLoading(false);
      return;
    }

    setFeatures((data || []).map((row) => mapBeFeature(row as BeFeatureRow)));
    setFeaturesLoading(false);
  };

  const mapBeExtra = (row: BeExtraRow): BookingExtra => {
    const pricingMode = row.pricing_mode || row.pricingMode;
    const status = row.status || 'Active';

    return {
      id: String(row.id),
      name: (row.name || '').trim(),
      description: row.description || '',
      pricingMode:
        pricingMode === 'Per Day' || pricingMode === 'Per Booking' || pricingMode === 'Free'
          ? pricingMode
          : 'Per Day',
      price: row.price === null || row.price === undefined ? '' : String(row.price),
      imageUrl: row.image_url || row.imageUrl || '',
      status: status === 'Inactive' ? 'Inactive' : 'Active',
      maximumQuantity:
        row.maximum_quantity === null || row.maximum_quantity === undefined
          ? ''
          : String(row.maximum_quantity),
    };
  };

  const loadSupabaseExtras = async (siteId: string) => {
    setExtrasLoading(true);
    setExtrasError('');

    const { data, error } = await supabase
      .from('be_extras')
      .select('*')
      .eq('site_id', siteId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Booking Engine extras load failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setExtras([]);
      setExtrasError('Failed to load extras from Supabase');
      setExtrasLoading(false);
      return;
    }

    setExtras((data || []).map((row) => mapBeExtra(row as BeExtraRow)));
    setExtrasLoading(false);
  };

  const mapBeCoupon = (row: BeCouponRow): BookingCoupon => {
    const discountType = row.discount_type || row.discountType;
    const status = row.status || 'Active';

    return {
      id: String(row.id),
      code: (row.code || '').trim(),
      discountType:
        discountType === 'Fixed Amount' || discountType === 'Percentage'
          ? discountType
          : 'Percentage',
      discountValue:
        row.discount_value === null || row.discount_value === undefined
          ? row.discountValue === null || row.discountValue === undefined
            ? ''
            : String(row.discountValue)
          : String(row.discount_value),
      validFrom: row.valid_from || row.validFrom || '',
      validTo: row.valid_to || row.validTo || '',
      minimumDays:
        row.minimum_days === null || row.minimum_days === undefined
          ? row.minimumDays === null || row.minimumDays === undefined
            ? ''
            : String(row.minimumDays)
          : String(row.minimum_days),
      allowedGroupCodes: Array.isArray(row.allowed_group_codes)
        ? row.allowed_group_codes
        : Array.isArray(row.allowedGroupCodes)
          ? row.allowedGroupCodes
          : [],
      usageLimit:
        row.usage_limit === null || row.usage_limit === undefined
          ? row.usageLimit === null || row.usageLimit === undefined
            ? ''
            : String(row.usageLimit)
          : String(row.usage_limit),
      status: status === 'Inactive' ? 'Inactive' : 'Active',
    };
  };

  const loadSupabaseCoupons = async (siteId: string) => {
    setCouponsLoading(true);
    setCouponsError('');

    const { data, error } = await supabase
      .from('be_coupons')
      .select('*')
      .eq('site_id', siteId)
      .order('code', { ascending: true });

    if (error) {
      console.error('Booking Engine coupons load failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setCoupons([]);
      setCouponsError('Failed to load coupons from Supabase');
      setCouponsLoading(false);
      return;
    }

    setCoupons((data || []).map((row) => mapBeCoupon(row as BeCouponRow)));
    setCouponsLoading(false);
  };

  const mapBePaymentMethod = (row: BePaymentMethodRow): BookingPaymentMethod => {
    const normalizedType = (row.type || '').trim().toLowerCase();
    const type: PaymentMethodType =
      normalizedType === 'bank transfer' || normalizedType === 'bank_transfer'
        ? 'Bank Transfer'
        : normalizedType === 'payment link' || normalizedType === 'payment_link'
          ? 'Payment Link'
          : normalizedType === 'card' || normalizedType === 'card on delivery' || normalizedType === 'card_on_delivery'
            ? 'Card'
            : normalizedType === 'custom'
              ? 'Custom'
              : 'Pay on Arrival';
    const depositRequired = row.deposit_required ?? row.depositRequired ?? false;
    const depositAmount = row.deposit_amount ?? row.depositAmount;
    const isActive =
      typeof row.active === 'boolean'
        ? row.active
        : (row.status || 'Active').trim().toLowerCase() !== 'inactive';

    return {
      id: String(row.id),
      name: (row.name || '').trim(),
      type,
      description: row.description || '',
      depositRequired: Boolean(depositRequired),
      depositAmount: depositAmount === null || depositAmount === undefined ? '' : String(depositAmount),
      status: isActive ? 'Active' : 'Inactive',
    };
  };

  const loadSupabasePaymentMethods = async (siteId: string) => {
    setPaymentMethodsLoading(true);
    setPaymentMethodsError('');

    const { data, error } = await supabase
      .from('be_payment_methods')
      .select('*')
      .eq('site_id', siteId)
      .order('name', { ascending: true });

    if (error) {
      console.error('PAYMENT METHODS LOAD ERROR', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setPaymentMethods([]);
      setPaymentMethodsError('Failed to load payment methods from Supabase');
      setPaymentMethodsLoading(false);
      return;
    }

    setPaymentMethods((data || []).map((row) => mapBePaymentMethod(row as BePaymentMethodRow)));
    setPaymentMethodsLoading(false);
  };

  const mapBeSiteSettings = (row: BeSiteRow): SiteSettings => {
    const defaultLanguage = row.default_language;
    const status = row.status;

    return {
      companyName: (row.name || '').trim(),
      domain: (row.domain || '').trim(),
      adminEmail: row.admin_email || '',
      bookingNotificationEmail: row.booking_notification_email || '',
      primaryColor: row.primary_color || '#073f5d',
      secondaryColor: row.secondary_color || '#059669',
      supportEmail: row.support_email || row.admin_email || '',
      phone: row.phone || '',
      whatsapp: row.whatsapp || row.whatsapp_number || '',
      websiteUrl: row.website_url || '',
      googleReviewUrl: row.google_review_url || 'https://g.page/r/CYOr9zt3_-KVEBM/review',
      emailHeaderImage: row.email_header_image || '',
      emailFooterText: row.email_footer_text || '',
      currency: row.currency || 'EUR',
      timezone: row.timezone || 'Europe/Athens',
      defaultPickupTime: row.default_pickup_time || '10:00',
      defaultReturnTime: row.default_return_time || '10:00',
      reviewEnabled: row.review_enabled !== false,
      reviewDelayDays: String(row.review_delay_days ?? '1'),
      themeLayout: row.theme_layout || 'Default',
      customCss: row.custom_css || '',
      reservationDestination: row.reservation_destination || 'main_board',
      defaultLanguage:
        defaultLanguage === 'English' ||
        defaultLanguage === 'Italian' ||
        defaultLanguage === 'French' ||
        defaultLanguage === 'German' ||
        defaultLanguage === 'Czech' ||
        defaultLanguage === 'Greek'
          ? defaultLanguage
          : 'English',
      whatsappNumber: row.whatsapp_number || '',
      termsUrl: row.terms_url || '',
      privacyPolicyUrl: row.privacy_policy_url || '',
      logoImage: row.logo_image || '',
      status: status === 'Inactive' ? 'Inactive' : 'Active',
      internalNotes: row.internal_notes || '',
    };
  };

  const loadSupabaseSiteSettings = async (siteId: string) => {
    setSiteSettingsLoading(true);
    setSiteSettingsError('');

    const { data, error } = await supabase
      .from('be_sites')
      .select('*')
      .eq('id', siteId)
      .maybeSingle();

    if (error) {
      console.error('Booking Engine site settings load failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setSiteSettingsError('Failed to load site settings from Supabase');
      setSiteSettingsLoading(false);
      return;
    }

    if (data) {
      const mappedSiteSettings = mapBeSiteSettings(data as BeSiteRow);
      setSiteSettings(mappedSiteSettings);
      setEmailSettings((current) => ({ ...current, adminEmail: mappedSiteSettings.adminEmail }));
    }
    setSiteSettingsLoading(false);
  };

  const mapBeEmailTemplate = (
    row: BeEmailTemplateRow,
  ): BookingEmailSettings['templates'][BookingEngineEmailTemplateId] | null => {
    const templateId = row.template_key as BookingEngineEmailTemplateId;
    if (!lockedEmailTemplateIds.includes(templateId)) return null;

    const defaultTemplate = bookingEngineLocalConfig.emailSettings.templates[templateId];
    return {
      id: templateId,
      label: row.label || defaultTemplate.label,
      active: row.active !== false,
      subject: row.subject || '',
      message: row.message || '',
    };
  };

  const loadSupabaseEmailTemplates = async (siteId: string) => {
    setEmailSettingsLoading(true);
    setEmailSettingsError('');

    const { data, error } = await supabase
      .from('be_email_templates')
      .select('*')
      .eq('site_id', siteId)
      .order('template_key', { ascending: true });

    if (error) {
      console.error('Booking Engine email templates load failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setEmailSettings(initialEmailSettings);
      setEmailSettingsError('Failed to load email templates from Supabase');
      setEmailSettingsLoading(false);
      return;
    }

    const nextSettings: BookingEmailSettings = {
      ...initialEmailSettings,
      adminEmail: siteSettings.adminEmail,
      templates: { ...initialEmailSettings.templates },
    };

    (data || []).forEach((row) => {
      const template = mapBeEmailTemplate(row as BeEmailTemplateRow);
      if (template) nextSettings.templates[template.id] = template;
    });

    setEmailSettings(nextSettings);
    setEmailSettingsLoading(false);
  };

  const mapBeBookingSettings = (row: BeBookingSettingsRow): BookingEngineSettings => {
    const defaultLanguage = row.default_language;
    const newReservationStatus = row.new_reservation_status;

    return {
      advanceBookingActive: Boolean(row.advance_booking_active),
      advanceBookingHours:
        row.advance_booking_hours === null || row.advance_booking_hours === undefined
          ? '48'
          : String(row.advance_booking_hours),
      minimumRentalDays:
        row.minimum_rental_days === null || row.minimum_rental_days === undefined
          ? '3'
          : String(row.minimum_rental_days),
      defaultLanguage:
        defaultLanguage === 'English' ||
        defaultLanguage === 'Italian' ||
        defaultLanguage === 'French' ||
        defaultLanguage === 'German' ||
        defaultLanguage === 'Czech' ||
        defaultLanguage === 'Greek'
          ? defaultLanguage
          : 'English',
      requireRentalTerms: Boolean(row.require_rental_terms),
      showMarketingConsent: Boolean(row.show_marketing_consent),
      termsUrl: row.terms_url || '',
      newReservationStatus:
        newReservationStatus === 'Pending' ||
        newReservationStatus === 'Accepted' ||
        newReservationStatus === 'On Request'
          ? newReservationStatus
          : 'Pending',
    };
  };

  const loadSupabaseBookingSettings = async (siteId: string) => {
    setBookingSettingsLoading(true);
    setBookingSettingsError('');

    const { data, error } = await supabase
      .from('be_booking_settings')
      .select('*')
      .eq('site_id', siteId)
      .maybeSingle();

    if (error) {
      console.error('Booking Engine booking settings load failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setBookingSettingsError('Failed to load booking settings from Supabase');
      setBookingSettingsLoading(false);
      return;
    }

    if (data) {
      setBookingEngineSettings(mapBeBookingSettings(data as BeBookingSettingsRow));
    }

    setBookingSettingsLoading(false);
  };

  const mapBeCheckoutField = (row: BeCheckoutFieldRow): CheckoutFieldSetting => {
    const fieldType = row.field_type;

    return {
      id: row.field_key || String(row.id),
      name: row.name || row.label || 'Custom Field',
      fieldType:
        fieldType === 'Text' ||
        fieldType === 'Textarea' ||
        fieldType === 'Number' ||
        fieldType === 'Email' ||
        fieldType === 'Phone' ||
        fieldType === 'Select'
          ? fieldType
          : 'Text',
      enabled: Boolean(row.enabled),
      required: Boolean(row.required),
      label: row.label || row.name || 'Custom Field',
      options: Array.isArray(row.options) ? row.options : [],
      builtIn: Boolean(row.built_in),
    };
  };

  const loadSupabaseCheckoutFields = async (siteId: string) => {
    setCheckoutFieldsLoading(true);
    setCheckoutFieldsError('');

    const { data, error } = await supabase
      .from('be_checkout_fields')
      .select('*')
      .eq('site_id', siteId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Booking Engine checkout fields load failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setCheckoutFields([]);
      setCheckoutFieldsError('Failed to load checkout fields from Supabase');
      setCheckoutFieldsLoading(false);
      return;
    }

    setCheckoutFields(
      normalizeBookingEngineCheckoutFields(
        (data || []).map((row) => mapBeCheckoutField(row as BeCheckoutFieldRow)),
        false,
      ),
    );
    setCheckoutFieldsLoading(false);
  };

  const loadSupabaseSeasonPrices = async (siteId: string) => {
    setSeasonPricesLoading(true);
    setSeasonPricesError('');

    const { data: sites, error: sitesError } = await supabase
      .from('be_sites')
      .select('id, name, domain')
      .order('domain', { ascending: true });
    console.log('ALL BE SITES', sites);
    console.log(
      'MATCHED SITE',
      ((sites || []) as BeSiteRow[]).find((site) => site.id === siteId) || null,
    );
    if (sitesError) {
      console.error('PRICING SEASONS ERROR', {
        message: sitesError.message,
        code: sitesError.code,
        details: sitesError.details,
        hint: sitesError.hint,
      });
    }

    const { data, error } = await supabase
      .from('be_pricing_seasons')
      .select('*')
      .eq('site_id', siteId)
      .order('from_date', { ascending: true });

    console.log('ALL PRICING SEASONS', data);

    if (error) {
      console.error('PRICING SEASONS ERROR', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setSeasonPrices([]);
      setSeasonPricesError('Failed to load pricing seasons from Supabase');
      setSeasonPricesLoading(false);
      return;
    }

    setSeasonPrices((data || []).map((row) => mapBePricingSeason(row as BePricingSeasonRow)));
    setSeasonPricesLoading(false);
  };

  const loadSupabaseCars = async (siteId: string) => {
    setCarsLoading(true);
    setCarsError('');

    const [
      includedBenefitsColumn,
      promoBadgesColumn,
      marketingMessageColumn,
      displayPriorityColumn,
    ] = await Promise.all([
      supabase.from('be_vehicle_categories').select('included_benefits').eq('site_id', siteId).limit(1),
      supabase.from('be_vehicle_categories').select('promo_badges').eq('site_id', siteId).limit(1),
      supabase.from('be_vehicle_categories').select('marketing_message').eq('site_id', siteId).limit(1),
      supabase.from('be_vehicle_categories').select('display_priority').eq('site_id', siteId).limit(1),
    ]);

    setCarOptionalColumns({
      includedBenefits: !includedBenefitsColumn.error,
      promoBadges: !promoBadgesColumn.error,
      marketingMessage: !marketingMessageColumn.error,
      displayPriority: !displayPriorityColumn.error,
    });

    const criticalOptionalColumnErrors = [
      ['included_benefits', includedBenefitsColumn.error],
      ['promo_badges', promoBadgesColumn.error],
      ['marketing_message', marketingMessageColumn.error],
    ].filter(([, error]) => error);

    if (displayPriorityColumn.error) {
      console.info('CAR OPTIONAL COLUMN MISSING display_priority. Apply the required SQL to enable priority sorting.');
    }

    if (criticalOptionalColumnErrors.length > 0) {
      criticalOptionalColumnErrors.forEach(([column, error]) => console.error(`CAR OPTIONAL COLUMN ERROR ${column}`, error));
      setCarsError(
        'Some vehicle category UI columns are missing. Apply the required SQL before saving those fields.',
      );
    }

    const { data, error } = await supabase
      .from('be_vehicle_categories')
      .select('*')
      .eq('site_id', siteId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Booking Engine cars load failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setCars([]);
      setCarsError('Failed to load cars from Supabase');
      setCarsLoading(false);
      return;
    }

    setCars((data || []).map((row) => mapBeVehicleCategory(row as BeVehicleCategoryRow)));
    setCarsLoading(false);
  };

  const loadSupabaseGroups = async () => {
    setGroupsLoading(true);
    setGroupsError('');

    console.log('SUPABASE URL', process.env.NEXT_PUBLIC_SUPABASE_URL);

    const { data: sites, error: siteError } = await supabase
      .from('be_sites')
      .select('id, name, domain')
      .order('domain', { ascending: true });

    console.log('ALL BE SITES', sites);

    if (siteError) {
      console.error('Booking Engine groups site load failed:', {
        message: siteError.message,
        code: siteError.code,
        details: siteError.details,
        hint: siteError.hint,
      });
      setBeSiteId(null);
      setGroupsError('Failed to load groups from Supabase');
      setGroups([]);
      setGroupsLoading(false);
      return;
    }

    if (!sites || sites.length === 0) {
      console.warn('No rows returned from be_sites');
      setBeSiteId(null);
      setGroupsError('No rows returned from be_sites');
      setGroups([]);
      setGroupsLoading(false);
      return;
    }

    const siteRows = (sites || []) as BeSiteRow[];
    const site =
      siteRows.find((item) => item.id === selectedSiteId) ||
      siteRows.find((item) => item.id === beSiteId) ||
      siteRows[0] ||
      null;

    console.log('MATCHED SITE', site);

    if (!site?.id) {
      console.warn('No Booking Engine site could be selected', sites);
      setBeSiteId(null);
      setGroupsError('No Booking Engine site could be selected');
      setGroups([]);
      setGroupsLoading(false);
      return;
    }

    console.log('Loaded BE site', site);
    setBeSiteId(site.id);

    const { data, error } = await supabase
      .from('be_groups')
      .select('id, code, name, description, status')
      .eq('site_id', site.id)
      .order('code', { ascending: true });

    if (error) {
      console.error('Booking Engine groups load failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setGroupsError('Failed to load groups from Supabase');
      setGroups([]);
      setGroupsLoading(false);
      return;
    }

    const mappedGroups = (data || []).map((row) => mapBeGroup(row as BeGroupRow));
    console.log('Loaded BE groups', mappedGroups.length);
    setGroups(mappedGroups);
    setGroupsLoading(false);
  };

  useEffect(() => {
    void loadSupabaseGroups();
  }, [selectedSiteId]);

  useEffect(() => {
    if (!beSiteId) {
      setCars([]);
      setCarsLoading(false);
      setSeasonPrices([]);
      setSeasonPricesLoading(false);
      setLocations([]);
      setLocationsLoading(false);
      setFeatures([]);
      setFeaturesLoading(false);
      setExtras([]);
      setExtrasLoading(false);
      setCoupons([]);
      setCouponsLoading(false);
      setPaymentMethods([]);
      setPaymentMethodsLoading(false);
      setBookingSettingsLoading(false);
      setCheckoutFields([]);
      setCheckoutFieldsLoading(false);
      setSiteSettingsLoading(false);
      setEmailSettings(initialEmailSettings);
      setEmailSettingsLoading(false);
      return;
    }

    void loadSupabaseCars(beSiteId);
    void loadSupabaseSeasonPrices(beSiteId);
    void loadSupabaseLocations(beSiteId);
    void loadSupabaseFeatures(beSiteId);
    void loadSupabaseExtras(beSiteId);
    void loadSupabaseCoupons(beSiteId);
    void loadSupabasePaymentMethods(beSiteId);
    void loadSupabaseBookingSettings(beSiteId);
    void loadSupabaseCheckoutFields(beSiteId);
    void loadSupabaseSiteSettings(beSiteId);
    void loadSupabaseEmailTemplates(beSiteId);
  }, [beSiteId]);

  useEffect(() => {
    saveBookingEngineConfig({
      siteSettings,
      groups,
      cars,
      locations,
      features,
      extras,
      coupons,
      paymentMethods,
      checkoutFields,
      pricingSeasons: seasonPrices,
      emailSettings: bookingEngineLocalConfig.emailSettings,
    });
  }, [
    cars,
    checkoutFields,
    coupons,
    extras,
    features,
    groups,
    groupsLoading,
    locations,
    paymentMethods,
    seasonPrices,
    siteSettings,
  ]);

  const resetDemoData = () => {
    resetBookingEngineConfig();
    setSiteSettingsMessage('');
  };

  const openNewCarModal = () => {
    setEditingCarId(null);
    setCarDraft(emptyCarDraft);
    setCarModalOpen(true);
  };

  const openEditCarModal = (car: BookingEngineCar) => {
    setEditingCarId(car.id);
    setCarDraft({
      name: car.name,
      groupCode: car.groupCode,
      description: car.description,
      imageUrl: car.imageUrl,
      featureIds: [...car.featureIds],
      includedBenefits: [...car.includedBenefits],
      promoBadges: [...car.promoBadges],
      marketingMessage: car.marketingMessage,
      displayPriority: car.displayPriority,
      status: car.status,
      locationIds: [...car.locationIds],
    });
    setCarModalOpen(true);
  };

  const closeCarModal = () => {
    setCarModalOpen(false);
    setEditingCarId(null);
    setCarDraft(emptyCarDraft);
  };

  const toggleCarRelation = (field: 'locationIds' | 'featureIds' | 'promoBadges', id: string) => {
    setCarDraft((current) => ({
      ...current,
      [field]: current[field].includes(id)
        ? current[field].filter((itemId) => itemId !== id)
        : [...current[field], id],
    }));
  };

  const toggleIncludedBenefit = (label: string) => {
    setCarDraft((current) => {
      const exists = current.includedBenefits.some((benefit) => benefit.label === label);
      return {
        ...current,
        includedBenefits: exists
          ? current.includedBenefits.filter((benefit) => benefit.label !== label)
          : [...current.includedBenefits, { label, tooltip: '' }],
      };
    });
  };

  const carPayload = (draft: CarDraft, siteId: string) => {
    const payload: Record<string, string | string[] | IncludedBenefit[]> = {
      site_id: siteId,
      name: draft.name.trim(),
      group_code: draft.groupCode,
      description: draft.description.trim(),
      image_url: draft.imageUrl,
      feature_ids: draft.featureIds,
      location_ids: draft.locationIds,
      status: draft.status,
    };

    if (carOptionalColumns.includedBenefits) {
      payload.included_benefits = draft.includedBenefits;
    }

    if (carOptionalColumns.promoBadges) {
      payload.promo_badges = draft.promoBadges;
    }

    if (carOptionalColumns.marketingMessage) {
      payload.marketing_message = draft.marketingMessage.trim();
    }

    if (carOptionalColumns.displayPriority) {
      payload.display_priority = String(Number(draft.displayPriority) || 0);
    }

    return payload;
  };

  const saveCar = async () => {
    const name = carDraft.name.trim();
    const groupCode = carDraft.groupCode;
    if (!name || !groupCode || !beSiteId || carsSaving) {
      if (!beSiteId) setCarsError('Failed to load cars from Supabase');
      return;
    }

    const payload = carPayload({ ...carDraft, name, groupCode }, beSiteId);
    console.log('CAR SAVE PAYLOAD', payload);
    setCarsSaving(true);
    setCarsError('');

    const result = editingCarId
      ? await supabase
          .from('be_vehicle_categories')
          .update(payload)
          .eq('id', editingCarId)
          .eq('site_id', beSiteId)
      : await supabase.from('be_vehicle_categories').insert(payload);
    const { data, error } = result;

    console.log('CAR SAVE RESULT', data);

    if (error) {
      console.error('CAR SAVE ERROR', error);
      setCarsError('Failed to save car to Supabase');
      setCarsSaving(false);
      return;
    }

    closeCarModal();
    await loadSupabaseCars(beSiteId);
    window.dispatchEvent(new CustomEvent('booking-engine-cars-updated', { detail: { siteId: beSiteId } }));
    setCarsSaving(false);
  };

  const deleteCar = async (carId: string) => {
    if (!beSiteId) {
      setCarsError('Failed to load cars from Supabase');
      return;
    }

    const { error } = await supabase
      .from('be_vehicle_categories')
      .delete()
      .eq('id', carId)
      .eq('site_id', beSiteId);

    if (error) {
      console.error('Booking Engine car delete failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setCarsError('Failed to delete car from Supabase');
      return;
    }

    await loadSupabaseCars(beSiteId);
    window.dispatchEvent(new CustomEvent('booking-engine-cars-updated', { detail: { siteId: beSiteId } }));
  };

  const updateCarStatuses = async (carIds: string[], status: CarStatus) => {
    if (carIds.length === 0) return;
    if (!beSiteId) {
      setCarsError('Failed to load cars from Supabase');
      return;
    }

    const { error } = await supabase
      .from('be_vehicle_categories')
      .update({ status })
      .eq('site_id', beSiteId)
      .in('id', carIds);

    if (error) {
      console.error('Booking Engine car status update failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setCarsError('Failed to update cars in Supabase');
      return;
    }

    await loadSupabaseCars(beSiteId);
    window.dispatchEvent(new CustomEvent('booking-engine-cars-updated', { detail: { siteId: beSiteId } }));
  };

  const openNewGroupModal = () => {
    setEditingGroupId(null);
    setGroupDraft(emptyGroupDraft);
    setGroupModalOpen(true);
  };

  const openEditGroupModal = (group: BookingGroup) => {
    setEditingGroupId(group.id);
    setGroupDraft({
      code: group.code,
      name: group.name,
      active: group.active,
      notes: group.notes,
    });
    setGroupModalOpen(true);
  };

  const closeGroupModal = () => {
    setGroupModalOpen(false);
    setEditingGroupId(null);
    setGroupDraft(emptyGroupDraft);
  };

  const saveGroup = async () => {
    const code = groupDraft.code.trim().toUpperCase();
    const name = groupDraft.name.trim();
    if (!code || !name || !beSiteId) {
      if (!beSiteId) setGroupsError('Failed to load groups from Supabase');
      return;
    }

    const duplicate = groups.some(
      (group) => group.id !== editingGroupId && group.code.toLowerCase() === code.toLowerCase(),
    );
    if (duplicate) return;

    const payload = {
      site_id: beSiteId,
      code,
      name,
      description: groupDraft.notes.trim(),
      status: groupDraft.active ? 'Active' : 'Inactive',
    };

    console.log('GROUP INSERT PAYLOAD', payload);

    const { data, error } = editingGroupId
      ? await supabase.from('be_groups').update(payload).eq('id', editingGroupId).select()
      : await supabase.from('be_groups').insert(payload).select();

    console.log('GROUP INSERT RESULT', data);
    console.error('GROUP INSERT ERROR', error);

    if (error) {
      console.error('Booking Engine group save failed:', error);
      setGroupsError('Failed to load groups from Supabase');
      return;
    }

    if (editingGroupId) {
      const previousCode = groups.find((group) => group.id === editingGroupId)?.code;
      if (previousCode && previousCode !== code) {
        setCars((current) =>
          current.map((car) => (car.groupCode === previousCode ? { ...car, groupCode: code } : car)),
        );
        setSeasonPrices((current) =>
          current.map((price) => (price.groupCode === previousCode ? { ...price, groupCode: code } : price)),
        );
        setCoupons((current) =>
          current.map((coupon) => ({
            ...coupon,
            allowedGroupCodes: coupon.allowedGroupCodes.map((groupCode) =>
              groupCode === previousCode ? code : groupCode,
            ),
          })),
        );
      }
    }

    closeGroupModal();
    await loadSupabaseGroups();
  };

  const deleteGroup = async (groupId: string) => {
    const group = groups.find((item) => item.id === groupId);
    if (!group) return;

    const { error } = await supabase.from('be_groups').delete().eq('id', groupId);

    if (error) {
      console.error('Booking Engine group delete failed:', error);
      setGroupsError('Failed to load groups from Supabase');
      return;
    }

    setCars((current) =>
      current.map((car) => (car.groupCode === group.code ? { ...car, groupCode: '' } : car)),
    );
    setSeasonPrices((current) => current.filter((price) => price.groupCode !== group.code));
    setCoupons((current) =>
      current.map((coupon) => ({
        ...coupon,
          allowedGroupCodes: coupon.allowedGroupCodes.filter((groupCode) => groupCode !== group.code),
      })),
    );
    await loadSupabaseGroups();
  };

  const openNewSeasonPriceModal = () => {
    setEditingSeasonPriceId(null);
    setSeasonPriceDraft({
      ...emptySeasonPriceDraft,
      groupCode: activeGroups[0]?.code || '',
      tiers: createDefaultPricingTiers(),
    });
    setSeasonPriceModalOpen(true);
  };

  const openEditSeasonPriceModal = (seasonPrice: SeasonPrice) => {
    setEditingSeasonPriceId(seasonPrice.id);
    setSeasonPriceDraft({
      groupCode: seasonPrice.groupCode,
      seasonName: seasonPrice.seasonName,
      fromDate: seasonPrice.fromDate,
      toDate: seasonPrice.toDate,
      tiers: seasonPrice.tiers.map((tier) => ({ ...tier })),
      websiteMode: seasonPrice.websiteMode,
      status: seasonPrice.status,
      notes: seasonPrice.notes,
    });
    setSeasonPriceModalOpen(true);
  };

  const closeSeasonPriceModal = () => {
    setSeasonPriceModalOpen(false);
    setEditingSeasonPriceId(null);
    setSeasonPriceDraft(emptySeasonPriceDraft);
  };

  const seasonPricePayload = (draft: SeasonPriceDraft, seasonName: string, siteId: string) => ({
    site_id: siteId,
    group_code: draft.groupCode,
    season_name: seasonName,
    from_date: draft.fromDate,
    to_date: draft.toDate,
    pricing_tiers: draft.tiers.map((tier) => ({ ...tier })),
    website_mode: draft.websiteMode,
    status: draft.status,
    notes: draft.notes.trim(),
  });

  const saveSeasonPrice = async () => {
    const seasonName = seasonPriceDraft.seasonName.trim();
    if (
      !seasonPriceDraft.groupCode ||
      !seasonName ||
      !seasonPriceDraft.fromDate ||
      !seasonPriceDraft.toDate ||
      seasonPriceDraft.tiers.length === 0 ||
      seasonPriceDraft.tiers.some(
        (tier) =>
          !tier.fromDays ||
          !tier.toDays ||
          !tier.pricePerDay ||
          Number(tier.fromDays) < 1 ||
          Number(tier.toDays) < Number(tier.fromDays) ||
          Number(tier.pricePerDay) <= 0,
      ) ||
      seasonPriceDraft.toDate < seasonPriceDraft.fromDate ||
      !beSiteId
    ) {
      if (!beSiteId) setSeasonPricesError('Failed to load pricing seasons from Supabase');
      return;
    }

    const payload = seasonPricePayload(seasonPriceDraft, seasonName, beSiteId);
    const { error } = editingSeasonPriceId
      ? await supabase.from('be_pricing_seasons').update(payload).eq('id', editingSeasonPriceId)
      : await supabase.from('be_pricing_seasons').insert(payload);

    if (error) {
      console.error('Booking Engine pricing season save failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setSeasonPricesError('Failed to save pricing season to Supabase');
      return;
    }

    closeSeasonPriceModal();
    await loadSupabaseSeasonPrices(beSiteId);
  };

  const deleteSeasonPrice = async (seasonPriceId: string) => {
    if (!beSiteId) {
      setSeasonPricesError('Failed to load pricing seasons from Supabase');
      return;
    }

    const { error } = await supabase.from('be_pricing_seasons').delete().eq('id', seasonPriceId);

    if (error) {
      console.error('Booking Engine pricing season delete failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setSeasonPricesError('Failed to delete pricing season from Supabase');
      return;
    }

    await loadSupabaseSeasonPrices(beSiteId);
  };

  const openNewLocationModal = () => {
    setEditingLocationId(null);
    setLocationDraft(emptyLocationDraft);
    setLocationModalOpen(true);
  };

  const openEditLocationModal = (location: BookingLocation) => {
    setEditingLocationId(location.id);
    setLocationDraft({
      name: location.name,
      type: location.type,
      active: location.active,
      fee: location.fee,
    });
    setLocationModalOpen(true);
  };

  const closeLocationModal = () => {
    setLocationModalOpen(false);
    setEditingLocationId(null);
    setLocationDraft(emptyLocationDraft);
  };

  const locationPayload = (draft: LocationDraft, name: string, siteId: string) => ({
    site_id: siteId,
    name,
    type: draft.type,
    active: draft.active,
    fee: draft.fee,
    status: draft.active ? 'Active' : 'Inactive',
  });

  const saveLocation = async () => {
    const name = locationDraft.name.trim();
    if (!name || !beSiteId) {
      if (!beSiteId) setLocationsError('Failed to load locations from Supabase');
      return;
    }

    const payload = locationPayload(locationDraft, name, beSiteId);
    const { error } = editingLocationId
      ? await supabase.from('be_locations').update(payload).eq('id', editingLocationId)
      : await supabase.from('be_locations').insert(payload);

    if (error) {
      console.error('Booking Engine location save failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setLocationsError('Failed to save location to Supabase');
      return;
    }

    closeLocationModal();
    await loadSupabaseLocations(beSiteId);
  };

  const deleteLocation = async (locationId: string) => {
    if (!beSiteId) {
      setLocationsError('Failed to load locations from Supabase');
      return;
    }

    const { error } = await supabase.from('be_locations').delete().eq('id', locationId);

    if (error) {
      console.error('Booking Engine location delete failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setLocationsError('Failed to delete location from Supabase');
      return;
    }

    setCars((current) =>
      current.map((car) => ({
        ...car,
        locationIds: car.locationIds.filter((id) => id !== locationId),
      })),
    );
    await loadSupabaseLocations(beSiteId);
  };

  const openNewFeatureModal = () => {
    setEditingFeatureId(null);
    setFeatureDraft(emptyFeatureDraft);
    setFeatureModalOpen(true);
  };

  const openEditFeatureModal = (feature: BookingFeature) => {
    setEditingFeatureId(feature.id);
    setFeatureDraft({ name: feature.name });
    setFeatureModalOpen(true);
  };

  const closeFeatureModal = () => {
    setFeatureModalOpen(false);
    setEditingFeatureId(null);
    setFeatureDraft(emptyFeatureDraft);
  };

  const saveFeature = async () => {
    const name = featureDraft.name.trim();
    if (!name || !beSiteId) {
      if (!beSiteId) setFeaturesError('Failed to load features from Supabase');
      return;
    }

    const payload = {
      site_id: beSiteId,
      name,
    };
    const { error } = editingFeatureId
      ? await supabase.from('be_features').update(payload).eq('id', editingFeatureId)
      : await supabase.from('be_features').insert(payload);

    if (error) {
      console.error('Booking Engine feature save failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setFeaturesError('Failed to save feature to Supabase');
      return;
    }

    closeFeatureModal();
    await loadSupabaseFeatures(beSiteId);
  };

  const deleteFeature = async (featureId: string) => {
    if (!beSiteId) {
      setFeaturesError('Failed to load features from Supabase');
      return;
    }

    const { error } = await supabase.from('be_features').delete().eq('id', featureId);

    if (error) {
      console.error('Booking Engine feature delete failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setFeaturesError('Failed to delete feature from Supabase');
      return;
    }

    setCars((current) =>
      current.map((car) => ({
        ...car,
        featureIds: car.featureIds.filter((id) => id !== featureId),
      })),
    );
    await loadSupabaseFeatures(beSiteId);
  };

  const openNewExtraModal = () => {
    setEditingExtraId(null);
    setExtraDraft(emptyExtraDraft);
    setExtraModalOpen(true);
  };

  const openEditExtraModal = (extra: BookingExtra) => {
    setEditingExtraId(extra.id);
    setExtraDraft({
      name: extra.name,
      description: extra.description,
      pricingMode: extra.pricingMode,
      price: extra.price,
      imageUrl: extra.imageUrl,
      status: extra.status,
      maximumQuantity: extra.maximumQuantity,
    });
    setExtraModalOpen(true);
  };

  const closeExtraModal = () => {
    setExtraModalOpen(false);
    setEditingExtraId(null);
    setExtraDraft(emptyExtraDraft);
  };

  const extraPayload = (draft: ExtraDraft, name: string, price: string, siteId: string) => ({
    site_id: siteId,
    name,
    description: draft.description.trim(),
    pricing_mode: draft.pricingMode,
    price,
    image_url: draft.imageUrl,
    status: draft.status,
    maximum_quantity: draft.maximumQuantity.trim(),
  });

  const saveExtra = async () => {
    const name = extraDraft.name.trim();
    const price = extraDraft.pricingMode === 'Free' ? '0' : extraDraft.price;
    if (!name || (extraDraft.pricingMode !== 'Free' && !price) || !beSiteId) {
      if (!beSiteId) setExtrasError('Failed to load extras from Supabase');
      return;
    }

    const payload = extraPayload(extraDraft, name, price, beSiteId);
    console.log('EXTRA SAVE PAYLOAD', payload);

    const { data, error } = editingExtraId
      ? await supabase.from('be_extras').update(payload).eq('id', editingExtraId).select()
      : await supabase.from('be_extras').insert(payload).select();

    console.log('EXTRA SAVE RESULT', data);

    if (error) {
      console.error('EXTRA SAVE ERROR', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setExtrasError('Failed to save extra to Supabase');
      return;
    }

    setExtrasError('');
    closeExtraModal();
    await loadSupabaseExtras(beSiteId);
  };

  const deleteExtra = async (extraId: string) => {
    if (!beSiteId) {
      setExtrasError('Failed to load extras from Supabase');
      return;
    }

    console.log('EXTRA DELETE ID', extraId);
    const { data, error } = await supabase.from('be_extras').delete().eq('id', extraId).select();

    console.log('EXTRA DELETE RESULT', data);

    if (error) {
      console.error('EXTRA DELETE ERROR', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setExtrasError('Failed to delete extra from Supabase');
      return;
    }

    setExtrasError('');
    await loadSupabaseExtras(beSiteId);
  };

  const openNewCouponModal = () => {
    setEditingCouponId(null);
    setCouponDraft(emptyCouponDraft);
    setCouponModalOpen(true);
  };

  const openEditCouponModal = (coupon: BookingCoupon) => {
    setEditingCouponId(coupon.id);
    setCouponDraft({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      validFrom: coupon.validFrom,
      validTo: coupon.validTo,
      minimumDays: coupon.minimumDays,
      allowedGroupCodes: [...coupon.allowedGroupCodes],
      usageLimit: coupon.usageLimit,
      status: coupon.status,
    });
    setCouponModalOpen(true);
  };

  const closeCouponModal = () => {
    setCouponModalOpen(false);
    setEditingCouponId(null);
    setCouponDraft(emptyCouponDraft);
  };

  const toggleCouponGroup = (groupCode: string) => {
    setCouponDraft((current) => ({
      ...current,
      allowedGroupCodes: current.allowedGroupCodes.includes(groupCode)
        ? current.allowedGroupCodes.filter((code) => code !== groupCode)
        : [...current.allowedGroupCodes, groupCode],
    }));
  };

  const couponPayload = (draft: CouponDraft, code: string, siteId: string) => ({
    site_id: siteId,
    code,
    discount_type: draft.discountType,
    discount_value: draft.discountValue,
    valid_from: draft.validFrom,
    valid_to: draft.validTo,
    minimum_days: draft.minimumDays.trim(),
    allowed_group_codes: draft.allowedGroupCodes,
    usage_limit: draft.usageLimit.trim(),
    status: draft.status,
  });

  const saveCoupon = async () => {
    const code = couponDraft.code.trim().toUpperCase();
    const duplicateCode = coupons.some(
      (coupon) => coupon.id !== editingCouponId && coupon.code.toLowerCase() === code.toLowerCase(),
    );

    if (
      !code ||
      !couponDraft.discountValue ||
      !couponDraft.validFrom ||
      !couponDraft.validTo ||
      couponDraft.validTo < couponDraft.validFrom ||
      duplicateCode ||
      !beSiteId
    ) {
      if (!beSiteId) setCouponsError('Failed to load coupons from Supabase');
      return;
    }

    const payload = couponPayload(couponDraft, code, beSiteId);
    console.log('COUPON SAVE PAYLOAD', payload);

    const { data, error } = editingCouponId
      ? await supabase.from('be_coupons').update(payload).eq('id', editingCouponId).select()
      : await supabase.from('be_coupons').insert(payload).select();

    console.log('COUPON SAVE RESULT', data);

    if (error) {
      console.error('COUPON SAVE ERROR', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setCouponsError('Failed to save coupon to Supabase');
      return;
    }

    setCouponsError('');
    closeCouponModal();
    await loadSupabaseCoupons(beSiteId);
  };

  const deleteCoupon = async (couponId: string) => {
    if (!beSiteId) {
      setCouponsError('Failed to load coupons from Supabase');
      return;
    }

    console.log('COUPON DELETE ID', couponId);
    const { data, error } = await supabase.from('be_coupons').delete().eq('id', couponId).select();

    console.log('COUPON DELETE RESULT', data);

    if (error) {
      console.error('COUPON DELETE ERROR', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setCouponsError('Failed to delete coupon from Supabase');
      return;
    }

    setCouponsError('');
    await loadSupabaseCoupons(beSiteId);
  };

  const openNewPaymentMethodModal = () => {
    setEditingPaymentMethodId(null);
    setPaymentMethodDraft(emptyPaymentMethodDraft);
    setPaymentMethodModalOpen(true);
  };

  const openEditPaymentMethodModal = (paymentMethod: BookingPaymentMethod) => {
    setEditingPaymentMethodId(paymentMethod.id);
    setPaymentMethodDraft({
      name: paymentMethod.name,
      type: paymentMethod.type,
      description: paymentMethod.description,
      depositRequired: paymentMethod.depositRequired,
      depositAmount: paymentMethod.depositAmount,
      status: paymentMethod.status,
    });
    setPaymentMethodModalOpen(true);
  };

  const closePaymentMethodModal = () => {
    setPaymentMethodModalOpen(false);
    setEditingPaymentMethodId(null);
    setPaymentMethodDraft(emptyPaymentMethodDraft);
  };

  const paymentMethodPayload = (draft: PaymentMethodDraft, siteId: string) => ({
    site_id: siteId,
    name: draft.name.trim(),
    type: draft.type,
    description: draft.description.trim(),
    deposit_required: draft.depositRequired,
    deposit_amount:
      draft.depositRequired && draft.depositAmount !== ''
        ? Number(draft.depositAmount)
        : null,
    status: draft.status,
  });

  const savePaymentMethod = async () => {
    const name = paymentMethodDraft.name.trim();
    if (!name || !beSiteId || paymentMethodsSaving) return;

    const payload = paymentMethodPayload({ ...paymentMethodDraft, name }, beSiteId);
    setPaymentMethodsSaving(true);
    setPaymentMethodsError('');
    setPaymentMethodsMessage('');
    console.log('PAYMENT METHOD SAVE PAYLOAD', payload);

    const { data, error } = editingPaymentMethodId
      ? await supabase
          .from('be_payment_methods')
          .update(payload)
          .eq('id', editingPaymentMethodId)
          .eq('site_id', beSiteId)
          .select()
      : await supabase.from('be_payment_methods').insert(payload).select();

    console.log('PAYMENT METHOD SAVE RESULT', data);

    if (error) {
      console.error('PAYMENT METHOD SAVE ERROR', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setPaymentMethodsError('Failed to save payment method to Supabase');
      setPaymentMethodsSaving(false);
      return;
    }

    closePaymentMethodModal();
    await loadSupabasePaymentMethods(beSiteId);
    setPaymentMethodsMessage('Payment method saved to Supabase.');
    setPaymentMethodsSaving(false);
  };

  const deletePaymentMethod = async (paymentMethodId: string) => {
    if (!beSiteId) return;

    setPaymentMethodsError('');
    setPaymentMethodsMessage('');
    console.log('PAYMENT METHOD DELETE ID', paymentMethodId);
    const { data, error } = await supabase
      .from('be_payment_methods')
      .delete()
      .eq('id', paymentMethodId)
      .eq('site_id', beSiteId)
      .select();

    console.log('PAYMENT METHOD DELETE RESULT', data);

    if (error) {
      console.error('PAYMENT METHOD DELETE ERROR', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setPaymentMethodsError('Failed to delete payment method from Supabase');
      return;
    }

    await loadSupabasePaymentMethods(beSiteId);
    setPaymentMethodsMessage('Payment method deleted from Supabase.');
  };

  const restoreDefaultPaymentMethods = async () => {
    if (!beSiteId || paymentMethodsSaving) return;

    const existingNames = new Set(paymentMethods.map((method) => method.name.trim().toLowerCase()));
    const missingMethods = defaultPaymentMethods.filter(
      (method) => !existingNames.has(method.name.toLowerCase()),
    );

    if (missingMethods.length === 0) {
      setPaymentMethodsMessage('All default payment methods already exist.');
      return;
    }

    const payload = missingMethods.map((method) =>
      paymentMethodPayload(
        {
          name: method.name,
          type: method.type,
          description: method.description,
          depositRequired: method.depositRequired,
          depositAmount: method.depositAmount,
          status: method.status,
        },
        beSiteId,
      ),
    );
    setPaymentMethodsSaving(true);
    setPaymentMethodsError('');
    setPaymentMethodsMessage('');
    console.log('PAYMENT METHODS RESTORE PAYLOAD', payload);

    const { data, error } = await supabase.from('be_payment_methods').insert(payload).select();
    console.log('PAYMENT METHODS RESTORE RESULT', data);

    if (error) {
      console.error('PAYMENT METHODS RESTORE ERROR', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setPaymentMethodsError('Failed to restore default payment methods');
      setPaymentMethodsSaving(false);
      return;
    }

    await loadSupabasePaymentMethods(beSiteId);
    setPaymentMethodsMessage('Missing default payment methods restored.');
    setPaymentMethodsSaving(false);
  };

  const emailTemplatePayload = (
    template: BookingEmailSettings['templates'][BookingEngineEmailTemplateId],
    siteId: string,
  ) => ({
    site_id: siteId,
    template_key: template.id,
    label: template.label,
    active: template.active,
    subject: template.subject,
    message: template.message,
  });

  const saveEmailSettings = async () => {
    if (!beSiteId) {
      setEmailSettingsError('Failed to load email templates from Supabase');
      return;
    }

    const payload = lockedEmailTemplateIds.map((templateId) =>
      emailTemplatePayload(emailSettings.templates[templateId], beSiteId),
    );
    console.log('EMAIL TEMPLATES SAVE PAYLOAD', payload);

    const { data, error } = await supabase
      .from('be_email_templates')
      .upsert(payload, { onConflict: 'site_id,template_key' })
      .select();

    console.log('EMAIL TEMPLATES SAVE RESULT', data);

    if (error) {
      console.error('EMAIL TEMPLATES SAVE ERROR', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setEmailSettingsError('Failed to save email templates to Supabase');
      return;
    }

    setEmailSettingsError('');
    setEmailSettingsMessage('Email templates saved to Supabase.');
    await loadSupabaseEmailTemplates(beSiteId);
  };

  const bookingSettingsPayload = (settings: BookingEngineSettings, siteId: string) => ({
    site_id: siteId,
    advance_booking_active: settings.advanceBookingActive,
    advance_booking_hours: settings.advanceBookingHours,
    minimum_rental_days: Math.max(1, Number(settings.minimumRentalDays) || 3),
    default_language: settings.defaultLanguage,
    require_rental_terms: settings.requireRentalTerms,
    show_marketing_consent: settings.showMarketingConsent,
    terms_url: settings.termsUrl,
    new_reservation_status: settings.newReservationStatus,
  });

  const saveBookingSettings = async () => {
    if (!beSiteId) {
      setBookingSettingsError('Failed to load booking settings from Supabase');
      return;
    }

    const payload = bookingSettingsPayload(bookingEngineSettings, beSiteId);
    console.log('BOOKING SETTINGS SAVE PAYLOAD', payload);

    const { data, error } = await supabase
      .from('be_booking_settings')
      .upsert(payload, { onConflict: 'site_id' })
      .select();

    console.log('BOOKING SETTINGS SAVE RESULT', data);

    if (error) {
      console.error('BOOKING SETTINGS SAVE ERROR', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setBookingSettingsError('Failed to save booking settings to Supabase');
      return;
    }

    setBookingSettingsError('');
    setBookingSettingsMessage('Booking settings saved to Supabase.');
    await loadSupabaseBookingSettings(beSiteId);
  };

  const checkoutFieldPayload = (
    field: CheckoutFieldSetting,
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

  const saveCheckoutFields = async () => {
    if (!beSiteId) {
      setCheckoutFieldsError('Failed to load checkout fields from Supabase');
      return;
    }

    const payload = checkoutFields.map((field, index) =>
      checkoutFieldPayload(field, beSiteId, index),
    );
    console.log('CHECKOUT FIELDS SAVE PAYLOAD', payload);

    const { data, error } = await supabase
      .from('be_checkout_fields')
      .upsert(payload, { onConflict: 'site_id,field_key' })
      .select();

    console.log('CHECKOUT FIELDS SAVE RESULT', data);

    if (error) {
      console.error('CHECKOUT FIELDS SAVE ERROR', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setCheckoutFieldsError('Failed to save checkout fields to Supabase');
      return;
    }

    setCheckoutFieldsError('');
    setCheckoutFieldsMessage('Checkout field settings saved to Supabase.');
    await loadSupabaseCheckoutFields(beSiteId);
  };

  const deleteCheckoutField = async (field: CheckoutFieldSetting) => {
    if (field.id.startsWith('checkout-field-')) {
      setCheckoutFields((current) => current.filter((item) => item.id !== field.id));
      setCheckoutFieldsMessage('');
      return;
    }

    if (!beSiteId) {
      setCheckoutFieldsError('Failed to load checkout fields from Supabase');
      return;
    }

    console.log('CHECKOUT FIELD DELETE ID', field.id);
    const { data, error } = await supabase
      .from('be_checkout_fields')
      .delete()
      .eq('site_id', beSiteId)
      .in('field_key', checkoutFieldDeleteKeys[field.id] || [field.id])
      .select();

    console.log('CHECKOUT FIELD DELETE RESULT', data);

    if (error) {
      console.error('CHECKOUT FIELD DELETE ERROR', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setCheckoutFieldsError('Failed to delete checkout field from Supabase');
      return;
    }

    setCheckoutFieldsError('');
    await loadSupabaseCheckoutFields(beSiteId);
  };

  const siteSettingsPayload = (settings: SiteSettings) => ({
    name: settings.companyName.trim(),
    domain: settings.domain.trim(),
    admin_email: settings.adminEmail.trim(),
    booking_notification_email: settings.bookingNotificationEmail.trim(),
    primary_color: settings.primaryColor.trim(),
    secondary_color: settings.secondaryColor.trim(),
    support_email: settings.supportEmail.trim(),
    phone: settings.phone.trim(),
    whatsapp: settings.whatsapp.trim(),
    website_url: settings.websiteUrl.trim(),
    google_review_url: settings.googleReviewUrl.trim(),
    email_header_image: settings.emailHeaderImage,
    email_footer_text: settings.emailFooterText.trim(),
    currency: settings.currency.trim(),
    timezone: settings.timezone.trim(),
    default_pickup_time: settings.defaultPickupTime,
    default_return_time: settings.defaultReturnTime,
    review_enabled: settings.reviewEnabled,
    review_delay_days: Math.max(1, Number(settings.reviewDelayDays) || 1),
    theme_layout: settings.themeLayout,
    custom_css: settings.customCss,
    reservation_destination: settings.reservationDestination,
    default_language: settings.defaultLanguage,
    whatsapp_number: settings.whatsappNumber.trim(),
    terms_url: settings.termsUrl.trim(),
    privacy_policy_url: settings.privacyPolicyUrl.trim(),
    logo_image: settings.logoImage,
    status: settings.status,
    internal_notes: settings.internalNotes.trim(),
  });

  const optionalBeSiteBrandingColumns = [
    'primary_color',
    'secondary_color',
    'support_email',
    'phone',
    'whatsapp',
    'website_url',
    'google_review_url',
    'email_header_image',
    'email_footer_text',
    'default_pickup_time',
    'default_return_time',
    'review_enabled',
    'review_delay_days',
    'theme_layout',
    'custom_css',
    'reservation_destination',
  ] as const;

  const isMissingBeSiteColumnError = (error: {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  }) => {
    const errorText = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`.toLowerCase();
    return (
      error.code === 'PGRST204' ||
      error.code === '42703' ||
      errorText.includes('schema cache') ||
      errorText.includes('could not find') ||
      errorText.includes('column')
    );
  };

  const removeMissingBeSiteColumns = (
    payload: ReturnType<typeof siteSettingsPayload>,
    missingColumns: Set<string>,
  ) => {
    const writablePayload: Record<string, unknown> = { ...payload };
    missingColumns.forEach((column) => {
      delete writablePayload[column];
    });
    return writablePayload;
  };

  const saveSiteSettings = async () => {
    if (!beSiteId) {
      setSiteSettingsError('Failed to load site settings from Supabase');
      return;
    }

    const payload = siteSettingsPayload(siteSettings);
    setSiteSettingsLoading(true);
    setSiteSettingsError('');
    console.log('SITE SETTINGS SAVE SITE ID', beSiteId);

    const missingOptionalColumns = new Set<string>();
    await Promise.all(
      optionalBeSiteBrandingColumns.map(async (column) => {
        const { error } = await supabase
          .from('be_sites')
          .select(`id, ${column}`)
          .eq('id', beSiteId)
          .limit(1);

        if (!error) {
          return;
        }

        console.warn('SITE SETTINGS OPTIONAL COLUMN MISSING', {
          column,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });

        if (isMissingBeSiteColumnError(error)) {
          missingOptionalColumns.add(column);
        }
      }),
    );

    if (missingOptionalColumns.size > 0) {
      console.warn(
        'SITE SETTINGS MISSING OPTIONAL COLUMNS - saving existing be_sites columns only',
        Array.from(missingOptionalColumns),
      );
    }

    const writablePayload = removeMissingBeSiteColumns(payload, missingOptionalColumns);
    console.log('SITE SETTINGS SAVE PAYLOAD', writablePayload);

    const { data, error } = await supabase
      .from('be_sites')
      .update(writablePayload)
      .eq('id', beSiteId)
      .select('*')
      .maybeSingle();

    console.log('SITE SETTINGS SAVE RESULT', data);

    if (error) {
      console.error('SITE SETTINGS SAVE ERROR', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setSiteSettingsError('Failed to save site settings to Supabase');
      setSiteSettingsLoading(false);
      return;
    }

    if (!data) {
      const emptyUpdateError = {
        message: 'No be_sites row was updated for the current be_site_id',
        code: 'NO_ROWS_UPDATED',
        details: `be_site_id=${beSiteId}`,
        hint: 'Check RLS UPDATE policy and that the current be_site_id exists in public.be_sites.',
      };
      console.error('SITE SETTINGS SAVE ERROR', emptyUpdateError);
      setSiteSettingsError('Site settings were not saved. No Supabase row was updated.');
      setSiteSettingsLoading(false);
      return;
    }

    setSiteSettingsError('');
    setSiteSettingsMessage(
      missingOptionalColumns.size > 0
        ? `Site settings saved. Apply the required SQL to persist: ${Array.from(missingOptionalColumns).join(', ')}.`
        : 'Site settings saved to Supabase.',
    );
    notifyBookingEngineSitesChanged();
    await loadSupabaseSiteSettings(beSiteId);
  };

  return (
    <div className="booking-engine-admin-light relative flex h-full min-h-[600px] overflow-hidden bg-slate-100 text-slate-900">
      <aside className="booking-engine-admin-nav flex w-[230px] flex-shrink-0 flex-col border-r border-slate-200 bg-white p-3">
        <div className="border-b border-white/[0.06] px-2 pb-3 pt-1">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-cyan-700">
            <Settings2 className="h-4 w-4 text-cyan-700" />
            Configuration
          </div>
          <p className="mt-1 text-sm leading-5 text-slate-600">Booking engine setup workspace</p>
        </div>

        <nav className="mt-2.5 space-y-0.5">
          {adminTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-xs font-bold transition ${
                  isActive
                    ? 'border-cyan-300 bg-cyan-50 text-cyan-900 shadow-[inset_4px_0_0_#0891b2]'
                    : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950'
                }`}
              >
                <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-cyan-700' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto rounded-lg border border-amber-200 bg-amber-50 p-3.5">
          <p className="text-xs font-black uppercase tracking-[0.1em] text-amber-800">Local foundation</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">Changes are saved in this browser until Supabase is connected.</p>
          <button
            type="button"
            onClick={resetDemoData}
            className="mt-3 h-9 w-full rounded-lg border border-amber-600 bg-amber-600 px-3 text-xs font-black text-white transition hover:bg-amber-700"
          >
            Reset demo data
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="booking-engine-admin-header flex flex-shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700">
              <CurrentIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-700">Booking Engine Admin</p>
              <h2 className="mt-0.5 text-2xl font-bold text-slate-950">{currentTab.label}</h2>
            </div>
          </div>
          <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3.5 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-cyan-800">
            Local state
          </span>
        </header>

        <div className="booking-engine-admin-content min-h-0 flex-1 overflow-auto bg-slate-100 p-5">
          {activeTab === 'groups' && (
            <GroupsPanel
              groups={groups}
              cars={cars}
              seasonPrices={seasonPrices}
              loading={groupsLoading}
              error={groupsError}
              onAdd={openNewGroupModal}
              onEdit={openEditGroupModal}
              onDelete={deleteGroup}
            />
          )}

          {activeTab === 'cars' && (
            <CarsPanel
              cars={cars}
              groups={groups}
              locations={locations}
              features={features}
              loading={carsLoading}
              error={carsError}
              onAdd={openNewCarModal}
              onEdit={openEditCarModal}
              onDelete={deleteCar}
              onStatusChange={updateCarStatuses}
            />
          )}

          {activeTab === 'pricing' && (
            <PricingPanel
              seasonPrices={seasonPrices}
              loading={seasonPricesLoading}
              error={seasonPricesError}
              onAdd={openNewSeasonPriceModal}
              onEdit={openEditSeasonPriceModal}
              onDelete={deleteSeasonPrice}
            />
          )}

          {activeTab === 'locations' && (
            <LocationsPanel
              locations={locations}
              loading={locationsLoading}
              error={locationsError}
              onAdd={openNewLocationModal}
              onEdit={openEditLocationModal}
              onDelete={deleteLocation}
            />
          )}

          {activeTab === 'features' && (
            <FeaturesPanel
              features={features}
              cars={cars}
              loading={featuresLoading}
              error={featuresError}
              onAdd={openNewFeatureModal}
              onEdit={openEditFeatureModal}
              onDelete={deleteFeature}
            />
          )}

          {activeTab === 'extras' && (
            <ExtrasPanel
              extras={extras}
              loading={extrasLoading}
              error={extrasError}
              onAdd={openNewExtraModal}
              onEdit={openEditExtraModal}
              onDelete={deleteExtra}
            />
          )}

          {activeTab === 'coupons' && (
            <CouponsPanel
              coupons={coupons}
              loading={couponsLoading}
              error={couponsError}
              onAdd={openNewCouponModal}
              onEdit={openEditCouponModal}
              onDelete={deleteCoupon}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentMethodsPanel
              paymentMethods={paymentMethods}
              loading={paymentMethodsLoading}
              saving={paymentMethodsSaving}
              error={paymentMethodsError}
              message={paymentMethodsMessage}
              onAdd={openNewPaymentMethodModal}
              onEdit={openEditPaymentMethodModal}
              onDelete={deletePaymentMethod}
              onRestoreDefaults={restoreDefaultPaymentMethods}
            />
          )}

          {activeTab === 'booking-settings' && (
            <BookingSettingsPanel
              settings={bookingEngineSettings}
              adminEmail={emailSettings.adminEmail}
              sendAdminCopy={emailSettings.templates.admin_new_confirmed_reservation.active}
              savedMessage={bookingSettingsMessage}
              loading={bookingSettingsLoading}
              error={bookingSettingsError}
              onSettingsChange={(nextSettings) => {
                setBookingEngineSettings(nextSettings);
                setBookingSettingsMessage('');
                setBookingSettingsError('');
              }}
              onAdminEmailChange={(adminEmail) => {
                setEmailSettings((current) => ({ ...current, adminEmail }));
                setEmailSettingsMessage('');
                setBookingSettingsMessage('');
              }}
              onSendAdminCopyChange={(adminNotificationActive) => {
                setEmailSettings((current) => ({
                  ...current,
                  templates: {
                    ...current.templates,
                    admin_new_confirmed_reservation: {
                      ...current.templates.admin_new_confirmed_reservation,
                      active: adminNotificationActive,
                    },
                  },
                }));
                setEmailSettingsMessage('');
                setBookingSettingsMessage('');
                setBookingSettingsError('');
              }}
              onSave={saveBookingSettings}
            />
          )}

          {activeTab === 'checkout-fields' && (
            <CheckoutFieldsPanel
              fields={checkoutFields}
              savedMessage={checkoutFieldsMessage}
              loading={checkoutFieldsLoading}
              error={checkoutFieldsError}
              onFieldsChange={(nextFields) => {
                setCheckoutFields(nextFields);
                setCheckoutFieldsMessage('');
                setCheckoutFieldsError('');
              }}
              onDeleteField={deleteCheckoutField}
              onSave={saveCheckoutFields}
            />
          )}

          {activeTab === 'site-settings' && (
            <SiteSettingsPanel
              settings={siteSettings}
              savedMessage={siteSettingsMessage}
              loading={siteSettingsLoading}
              error={siteSettingsError}
              onSettingsChange={(nextSettings) => {
                setSiteSettings(nextSettings);
                setSiteSettingsMessage('');
                setSiteSettingsError('');
              }}
              onSave={saveSiteSettings}
            />
          )}

          {activeTab === 'emails' && (
            <EmailsPanel
              settings={emailSettings}
              siteSettings={siteSettings}
              savedMessage={emailSettingsMessage}
              loading={emailSettingsLoading}
              error={emailSettingsError}
              onSettingsChange={(nextSettings) => {
                setEmailSettings(nextSettings);
                setEmailSettingsMessage('');
                setEmailSettingsError('');
              }}
              onSave={saveEmailSettings}
            />
          )}

          {!['groups', 'cars', 'pricing', 'locations', 'features', 'extras', 'coupons', 'payments', 'booking-settings', 'checkout-fields', 'site-settings', 'emails'].includes(activeTab) && (
            <EmptyAdminPanel tab={currentTab} icon={CurrentIcon} />
          )}
        </div>
      </main>

      {carModalOpen && (
        <CarModal
          draft={carDraft}
          editing={Boolean(editingCarId)}
          saving={carsSaving}
          activeGroups={activeGroups}
          activeLocations={activeLocations}
          features={features}
          onDraftChange={setCarDraft}
          onToggleLocation={(id) => toggleCarRelation('locationIds', id)}
          onToggleFeature={(id) => toggleCarRelation('featureIds', id)}
          onToggleIncludedBenefit={toggleIncludedBenefit}
          onTogglePromoBadge={(id) => toggleCarRelation('promoBadges', id)}
          onClose={closeCarModal}
          onSave={saveCar}
        />
      )}

      {groupModalOpen && (
        <GroupModal
          draft={groupDraft}
          editing={Boolean(editingGroupId)}
          groups={groups}
          editingGroupId={editingGroupId}
          onDraftChange={setGroupDraft}
          onClose={closeGroupModal}
          onSave={saveGroup}
        />
      )}

      {locationModalOpen && (
        <LocationModal
          draft={locationDraft}
          editing={Boolean(editingLocationId)}
          onDraftChange={setLocationDraft}
          onClose={closeLocationModal}
          onSave={saveLocation}
        />
      )}

      {seasonPriceModalOpen && (
        <SeasonPriceModal
          draft={seasonPriceDraft}
          editing={Boolean(editingSeasonPriceId)}
          activeGroups={activeGroups}
          onDraftChange={setSeasonPriceDraft}
          onClose={closeSeasonPriceModal}
          onSave={saveSeasonPrice}
        />
      )}

      {featureModalOpen && (
        <FeatureModal
          draft={featureDraft}
          editing={Boolean(editingFeatureId)}
          onDraftChange={setFeatureDraft}
          onClose={closeFeatureModal}
          onSave={saveFeature}
        />
      )}

      {extraModalOpen && (
        <ExtraModal
          draft={extraDraft}
          editing={Boolean(editingExtraId)}
          onDraftChange={setExtraDraft}
          onClose={closeExtraModal}
          onSave={saveExtra}
        />
      )}

      {couponModalOpen && (
        <CouponModal
          draft={couponDraft}
          editing={Boolean(editingCouponId)}
          coupons={coupons}
          editingCouponId={editingCouponId}
          activeGroups={activeGroups}
          onDraftChange={setCouponDraft}
          onToggleGroup={toggleCouponGroup}
          onClose={closeCouponModal}
          onSave={saveCoupon}
        />
      )}

      {paymentMethodModalOpen && (
        <PaymentMethodModal
          draft={paymentMethodDraft}
          editing={Boolean(editingPaymentMethodId)}
          onDraftChange={setPaymentMethodDraft}
          onClose={closePaymentMethodModal}
          onSave={savePaymentMethod}
          saving={paymentMethodsSaving}
        />
      )}
      <style jsx global>{`
        .booking-engine-admin-light {
          color: #172033;
          font-size: 14px;
        }

        .booking-engine-admin-light .booking-engine-admin-nav {
          box-shadow: 8px 0 28px rgba(15, 23, 42, 0.04);
        }

        .booking-engine-admin-light .booking-engine-admin-nav button {
          min-height: 38px;
          font-size: 13px;
        }

        .booking-engine-admin-light [class*='bg-[#0a111b]'],
        .booking-engine-admin-light [class*='bg-[#090f18]'],
        .booking-engine-admin-light [class*='bg-black/25'],
        .booking-engine-admin-light [class*='bg-black/15'] {
          background: #ffffff !important;
        }

        .booking-engine-admin-light [class*='bg-white/[0.035]'],
        .booking-engine-admin-light [class*='bg-white/[0.025]'],
        .booking-engine-admin-light [class*='bg-white/[0.018]'],
        .booking-engine-admin-light [class*='bg-white/[0.015]'] {
          background: #f8fafc !important;
        }

        .booking-engine-admin-light [class*='border-white/'],
        .booking-engine-admin-light [class*='border-zinc-'] {
          border-color: #dbe3ed !important;
        }

        .booking-engine-admin-light [class*='text-zinc-100'],
        .booking-engine-admin-light [class*='text-zinc-200'] {
          color: #172033 !important;
        }

        .booking-engine-admin-light [class*='text-cyan-200'],
        .booking-engine-admin-light [class*='text-cyan-300'],
        .booking-engine-admin-light [class*='text-sky-100'] {
          color: #0e7490 !important;
        }

        .booking-engine-admin-light [class*='text-zinc-300'],
        .booking-engine-admin-light [class*='text-zinc-400'] {
          color: #475569 !important;
        }

        .booking-engine-admin-light [class*='text-zinc-500'] {
          color: #64748b !important;
        }

        .booking-engine-admin-light [class*='text-zinc-600'],
        .booking-engine-admin-light [class*='text-zinc-700'] {
          color: #78879a !important;
        }

        .booking-engine-admin-light input,
        .booking-engine-admin-light select,
        .booking-engine-admin-light textarea {
          min-height: 40px;
          border-color: #cbd5e1 !important;
          background: #ffffff !important;
          color: #172033 !important;
          font-size: 14px !important;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        }

        .booking-engine-admin-light input::placeholder,
        .booking-engine-admin-light textarea::placeholder {
          color: #94a3b8 !important;
        }

        .booking-engine-admin-light [role='dialog'] {
          border-color: #cbd5e1 !important;
          background: #ffffff !important;
          color: #172033 !important;
          box-shadow: 0 28px 90px rgba(15, 23, 42, 0.28) !important;
        }

        .booking-engine-admin-light [role='dialog'] > header,
        .booking-engine-admin-light [role='dialog'] > footer {
          border-color: #e2e8f0 !important;
          background: #f8fafc !important;
        }

        .booking-engine-admin-light [role='dialog'] > header {
          padding: 15px 18px !important;
        }

        .booking-engine-admin-light [role='dialog'] > div {
          padding: 18px !important;
        }

        .booking-engine-admin-light [role='dialog'] > footer {
          padding: 12px 18px !important;
        }

        .booking-engine-admin-light [class*='grid-cols-'][class*='border-b'] {
          min-height: 44px;
          border-color: #e2e8f0 !important;
          font-size: 13px !important;
        }

        .booking-engine-admin-light .booking-engine-admin-content h3 {
          font-size: 17px !important;
        }

        .booking-engine-admin-light .booking-engine-admin-content [class*='uppercase'] {
          font-size: 11px !important;
          letter-spacing: 0.06em !important;
        }

        .booking-engine-admin-light [class*='grid-cols-'][class*='hover:bg'] {
          min-height: 54px;
          font-size: 13px !important;
        }

        .booking-engine-admin-light .booking-engine-admin-content button[title='Edit'],
        .booking-engine-admin-light .booking-engine-admin-content button[title='Delete local record'] {
          width: 34px !important;
          height: 34px !important;
          background: #ffffff !important;
        }

        .booking-engine-admin-light label > span:first-child {
          font-size: 12px !important;
          color: #475569 !important;
        }

        .booking-engine-admin-light .booking-engine-admin-header > div:first-child > div p {
          color: #0e7490 !important;
        }

        .booking-engine-admin-light .booking-engine-admin-header > div:first-child > div h2 {
          color: #0f172a !important;
          font-size: 22px !important;
        }

        .booking-engine-admin-light button {
          font-size: 13px;
        }

        .booking-engine-admin-light [class*='hover:bg-white']:hover {
          background: #f1f5f9 !important;
        }
      `}</style>
    </div>
  );
}

function GroupsPanel({
  groups,
  cars,
  seasonPrices,
  loading,
  error,
  onAdd,
  onEdit,
  onDelete,
}: {
  groups: BookingGroup[];
  cars: BookingEngineCar[];
  seasonPrices: SeasonPrice[];
  loading: boolean;
  error: string;
  onAdd: () => void;
  onEdit: (group: BookingGroup) => void;
  onDelete: (groupId: string) => void;
}) {
  return (
    <section className="min-w-[760px]">
      <PanelHeading
        title="Vehicle groups"
        description="The shared category source for Cars and Pricing / Seasons."
        buttonLabel="Add Group"
        onAdd={onAdd}
      />
      {loading && (
        <div className="mb-3 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-black text-cyan-900">
          Loading groups...
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-800">
          {error}
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a111b]">
        <div className="grid grid-cols-[110px_minmax(220px,1fr)_120px_110px_120px_100px] border-b border-white/[0.08] bg-white/[0.035] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-zinc-500">
          <span>Code</span>
          <span>Group Name</span>
          <span>Website Mode</span>
          <span>Cars</span>
          <span>Season Prices</span>
          <span className="text-right">Actions</span>
        </div>
        {groups.length > 0 ? (
          groups
            .slice()
            .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
            .map((group) => (
              <div
                key={group.id}
                className="grid grid-cols-[110px_minmax(220px,1fr)_120px_110px_120px_100px] items-center border-b border-white/[0.055] px-4 py-3 text-xs last:border-b-0 hover:bg-white/[0.02]"
              >
                <span className="w-fit rounded-md border border-cyan-300 bg-cyan-50 px-2.5 py-1 font-black text-cyan-900">
                  {group.code}
                </span>
                <div className="min-w-0 pr-4">
                  <p className="truncate font-bold text-zinc-100">{group.name}</p>
                  {group.notes && <p className="mt-1 truncate text-[10px] text-zinc-600">{group.notes}</p>}
                </div>
                <span className={`w-fit rounded-full border px-2 py-1 text-[10px] font-black ${group.active ? statusStyles.Open : statusStyles.Hidden}`}>
                  {group.active ? 'Active' : 'Inactive'}
                </span>
                <span className="text-zinc-400">{cars.filter((car) => car.groupCode === group.code).length}</span>
                <span className="text-zinc-400">
                  {seasonPrices.filter((price) => price.groupCode === group.code).length}
                </span>
                <ActionButtons onEdit={() => onEdit(group)} onDelete={() => onDelete(group.id)} />
              </div>
            ))
        ) : (
          <TableEmpty icon={Layers3} title="No groups yet" description="Add a group before creating cars or season prices." />
        )}
      </div>
    </section>
  );
}

function CarsPanel({
  cars,
  groups,
  locations,
  features,
  loading,
  error,
  onAdd,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  cars: BookingEngineCar[];
  groups: BookingGroup[];
  locations: BookingLocation[];
  features: BookingFeature[];
  loading: boolean;
  error: string;
  onAdd: () => void;
  onEdit: (car: BookingEngineCar) => void;
  onDelete: (carId: string) => void;
  onStatusChange: (carIds: string[], status: CarStatus) => void;
}) {
  const [selectedCarIds, setSelectedCarIds] = useState<string[]>([]);
  const locationName = (id: string) => locations.find((location) => location.id === id)?.name;
  const featureName = (id: string) => features.find((feature) => feature.id === id)?.name;
  const selectedExistingCarIds = selectedCarIds.filter((selectedId) =>
    cars.some((car) => car.id === selectedId),
  );
  const allCarsSelected = cars.length > 0 && cars.every((car) => selectedCarIds.includes(car.id));

  const toggleCarSelection = (carId: string) => {
    setSelectedCarIds((current) =>
      current.includes(carId)
        ? current.filter((selectedId) => selectedId !== carId)
        : [...current, carId],
    );
  };

  const toggleAllCars = () => {
    setSelectedCarIds(allCarsSelected ? [] : cars.map((car) => car.id));
  };

  const applyBulkStatus = (status: CarStatus) => {
    if (selectedExistingCarIds.length === 0) return;
    onStatusChange(selectedExistingCarIds, status);
  };

  return (
    <section className="min-w-[1060px]">
      <PanelHeading
        title="Website car catalogue"
        description="Cars use active locations and reusable features managed in this admin window."
        buttonLabel="Add Car / Category"
        onAdd={onAdd}
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-slate-800">
              {selectedExistingCarIds.length} selected
            </span>
            <button
              type="button"
              onClick={() => applyBulkStatus('Open')}
              disabled={selectedExistingCarIds.length === 0}
              className="h-9 rounded-lg border border-emerald-600 bg-emerald-600 px-3 text-xs font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
            >
              Set selected to Open
            </button>
            <button
              type="button"
              onClick={() => applyBulkStatus('On Request')}
              disabled={selectedExistingCarIds.length === 0}
              className="h-9 rounded-lg border border-amber-500 bg-amber-500 px-3 text-xs font-black text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
            >
              Set selected to On Request
            </button>
            <button
              type="button"
              onClick={() => applyBulkStatus('Hidden')}
              disabled={selectedExistingCarIds.length === 0}
              className="h-9 rounded-lg border border-slate-700 bg-slate-700 px-3 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
            >
              Set selected to Hidden
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Use On Request when you want customers to send a request instead of instant booking.
          </p>
        </div>
      </div>

      {loading && (
        <div className="mb-3 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-black text-cyan-900">
          Loading cars...
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-800">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a111b]">
        <div className="grid grid-cols-[42px_70px_minmax(180px,1.1fr)_125px_150px_minmax(180px,1fr)_minmax(180px,1fr)_90px] items-center border-b border-white/[0.08] bg-white/[0.035] px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-zinc-500">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={allCarsSelected}
              onChange={toggleAllCars}
              aria-label="Select all cars"
              className="h-4 w-4 rounded border-slate-300 text-cyan-700 accent-cyan-700"
            />
          </label>
          <span>Photo</span>
          <span>Name</span>
          <span>Group</span>
          <span>Status</span>
          <span>Display Locations</span>
          <span>Included Features</span>
          <span className="text-right">Actions</span>
        </div>

        {cars.length > 0 ? (
          cars.map((car) => {
            const carLocations = car.locationIds.map(locationName).filter(Boolean) as string[];
            const carFeatures = car.featureIds.map(featureName).filter(Boolean) as string[];
            const group = groups.find((item) => item.code === car.groupCode);

            return (
              <div
                key={car.id}
                className={`grid grid-cols-[42px_70px_minmax(180px,1.1fr)_125px_150px_minmax(180px,1fr)_minmax(180px,1fr)_90px] items-center border-b border-white/[0.055] px-3 py-3 text-xs last:border-b-0 hover:bg-white/[0.02] ${
                  selectedCarIds.includes(car.id) ? 'bg-cyan-50' : ''
                }`}
              >
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedCarIds.includes(car.id)}
                    onChange={() => toggleCarSelection(car.id)}
                    aria-label={`Select ${car.name}`}
                    className="h-4 w-4 rounded border-slate-300 text-cyan-700 accent-cyan-700"
                  />
                </label>
                <div className="flex h-11 w-14 items-center justify-center overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.025] text-zinc-600">
                  {car.imageUrl ? (
                    <img src={car.imageUrl} alt={car.name} className="h-full w-full object-cover" />
                  ) : (
                    <Car className="h-5 w-5" strokeWidth={1.5} />
                  )}
                </div>
                <div className="min-w-0 pr-4">
                  <p className="truncate font-bold text-zinc-100">{car.name}</p>
                  <p className="mt-1 truncate text-[11px] text-zinc-600">{car.description || 'No description'}</p>
                </div>
                <div>
                  <span className="w-fit rounded-md border border-cyan-300 bg-cyan-50 px-2.5 py-1 font-black text-cyan-900">
                    {car.groupCode || '—'}
                  </span>
                  {group && <p className="mt-1 truncate text-[10px] text-zinc-600">{group.name}</p>}
                </div>
                <select
                  value={car.status}
                  onChange={(event) =>
                    onStatusChange([car.id], event.target.value as CarStatus)
                  }
                  aria-label={`Status for ${car.name}`}
                  className={`h-9 w-[136px] rounded-lg border px-2.5 text-xs font-black outline-none transition focus:ring-2 focus:ring-cyan-100 ${statusStyles[car.status]}`}
                >
                  <option value="Open">Open</option>
                  <option value="On Request">On Request</option>
                  <option value="Hidden">Hidden</option>
                </select>
                <PillList values={carLocations} emptyLabel="No locations" />
                <PillList values={carFeatures} emptyLabel="No features" tone="cyan" />
                <ActionButtons onEdit={() => onEdit(car)} onDelete={() => onDelete(car.id)} />
              </div>
            );
          })
        ) : (
          <TableEmpty icon={Car} title="No cars or categories yet" description="Add a local record to preview the booking catalogue." />
        )}
      </div>
    </section>
  );
}

function PricingPanel({
  seasonPrices,
  loading,
  error,
  onAdd,
  onEdit,
  onDelete,
}: {
  seasonPrices: SeasonPrice[];
  loading: boolean;
  error: string;
  onAdd: () => void;
  onEdit: (seasonPrice: SeasonPrice) => void;
  onDelete: (seasonPriceId: string) => void;
}) {
  return (
    <section className="min-w-[760px]">
      <PanelHeading
        title="Category season pricing"
        description="Local duration-tier pricing by vehicle group and season. No booking calculations are connected."
        buttonLabel="Add Season Price"
        onAdd={onAdd}
      />
      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        <ModeMeaning
          mode="Open"
          description="Show the group and price with a Book Now button."
        />
        <ModeMeaning
          mode="On Request"
          description="Show the group and price with an On Request button."
        />
        <ModeMeaning
          mode="Hidden"
          description="Do not show the group for this date range."
        />
      </div>
      {loading && (
        <div className="mb-3 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-black text-cyan-900">
          Loading pricing seasons...
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-800">
          {error}
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a111b]">
        <div className="grid grid-cols-[140px_minmax(220px,1fr)_125px_125px_120px_90px] border-b border-white/[0.08] bg-white/[0.035] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-zinc-500">
          <span>Category / Group</span>
          <span>Season Name</span>
          <span>From Date</span>
          <span>To Date</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>
        {seasonPrices.length > 0 ? (
          seasonPrices.map((seasonPrice) => (
            <div
              key={seasonPrice.id}
              className="grid grid-cols-[140px_minmax(220px,1fr)_125px_125px_120px_90px] items-center border-b border-white/[0.055] px-4 py-3 text-xs last:border-b-0 hover:bg-white/[0.02]"
            >
              <span className="w-fit rounded-md border border-cyan-300 bg-cyan-50 px-2.5 py-1 font-black text-cyan-900">
                {seasonPrice.groupCode}
              </span>
              <div className="min-w-0 pr-4">
                <p className="truncate font-bold text-zinc-100">{seasonPrice.seasonName}</p>
                <p className="mt-1 text-[10px] font-bold text-cyan-700">
                  View pricing tiers · {seasonPrice.tiers.length}
                </p>
              </div>
              <span className="text-zinc-400">{formatDateOnly(seasonPrice.fromDate)}</span>
              <span className="text-zinc-400">{formatDateOnly(seasonPrice.toDate)}</span>
              <span
                className={`w-fit rounded-full border px-2 py-1 text-[10px] font-black ${statusStyles[seasonPrice.websiteMode]}`}
              >
                {seasonPrice.websiteMode}
              </span>
              <ActionButtons onEdit={() => onEdit(seasonPrice)} onDelete={() => onDelete(seasonPrice.id)} />
            </div>
          ))
        ) : (
          <TableEmpty
            icon={CalendarRange}
            title="No season prices yet"
            description="Add a category-level season price to preview the future booking engine setup."
          />
        )}
      </div>
    </section>
  );
}

function ModeMeaning({
  mode,
  description,
}: {
  mode: CarStatus;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black ${statusStyles[mode]}`}>
        {mode}
      </span>
      <p className="text-xs leading-5 text-slate-600">{description}</p>
    </div>
  );
}

function LocationsPanel({
  locations,
  loading,
  error,
  onAdd,
  onEdit,
  onDelete,
}: {
  locations: BookingLocation[];
  loading: boolean;
  error: string;
  onAdd: () => void;
  onEdit: (location: BookingLocation) => void;
  onDelete: (locationId: string) => void;
}) {
  return (
    <section className="min-w-[760px]">
      <PanelHeading
        title="Display locations"
        description="Active locations become selectable immediately in the Cars editor."
        buttonLabel="Add Location"
        onAdd={onAdd}
      />
      {loading && (
        <div className="mb-3 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-black text-cyan-900">
          Loading locations...
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-800">
          {error}
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a111b]">
        <div className="grid grid-cols-[minmax(220px,1fr)_150px_120px_140px_100px] border-b border-white/[0.08] bg-white/[0.035] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-zinc-500">
          <span>Location Name</span>
          <span>Type</span>
          <span>Status</span>
          <span>Optional Fee</span>
          <span className="text-right">Actions</span>
        </div>
        {locations.map((location) => (
          <div
            key={location.id}
            className="grid grid-cols-[minmax(220px,1fr)_150px_120px_140px_100px] items-center border-b border-white/[0.055] px-4 py-3 text-xs last:border-b-0"
          >
            <span className="font-bold text-zinc-100">{location.name}</span>
            <span className="capitalize text-zinc-400">{locationTypeLabels[location.type]}</span>
            <span className={`w-fit rounded-full border px-2 py-1 text-[10px] font-black ${location.active ? statusStyles.Open : statusStyles.Hidden}`}>
              {location.active ? 'Active' : 'Inactive'}
            </span>
            <span className="font-bold text-zinc-300">{location.fee ? `€${Number(location.fee).toFixed(2)}` : 'No fee'}</span>
            <ActionButtons onEdit={() => onEdit(location)} onDelete={() => onDelete(location.id)} />
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturesPanel({
  features,
  cars,
  loading,
  error,
  onAdd,
  onEdit,
  onDelete,
}: {
  features: BookingFeature[];
  cars: BookingEngineCar[];
  loading: boolean;
  error: string;
  onAdd: () => void;
  onEdit: (feature: BookingFeature) => void;
  onDelete: (featureId: string) => void;
}) {
  return (
    <section className="min-w-[620px]">
      <PanelHeading
        title="Included features"
        description="Reusable checkbox options shown in the Cars add/edit modal."
        buttonLabel="Add Feature"
        onAdd={onAdd}
      />
      {loading && (
        <div className="mb-3 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-black text-cyan-900">
          Loading features...
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-800">
          {error}
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a111b]">
        <div className="grid grid-cols-[minmax(260px,1fr)_150px_100px] border-b border-white/[0.08] bg-white/[0.035] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-zinc-500">
          <span>Feature</span>
          <span>Used By</span>
          <span className="text-right">Actions</span>
        </div>
        {features.length > 0 ? (
          features.map((feature) => (
            <div
              key={feature.id}
              className="grid grid-cols-[minmax(260px,1fr)_150px_100px] items-center border-b border-white/[0.055] px-4 py-3 text-xs last:border-b-0"
            >
              <span className="font-bold text-zinc-100">{feature.name}</span>
              <span className="text-zinc-500">{cars.filter((car) => car.featureIds.includes(feature.id)).length} cars</span>
              <ActionButtons onEdit={() => onEdit(feature)} onDelete={() => onDelete(feature.id)} />
            </div>
          ))
        ) : (
          <TableEmpty icon={ListChecks} title="No features yet" description="Add reusable features for the Cars catalogue." />
        )}
      </div>
    </section>
  );
}

function ExtrasPanel({
  extras,
  loading,
  error,
  onAdd,
  onEdit,
  onDelete,
}: {
  extras: BookingExtra[];
  loading: boolean;
  error: string;
  onAdd: () => void;
  onEdit: (extra: BookingExtra) => void;
  onDelete: (extraId: string) => void;
}) {
  return (
    <section className="min-w-[760px]">
      <PanelHeading
        title="Booking extras"
        description="Optional products and services for the future website booking flow."
        buttonLabel="Add Extra"
        onAdd={onAdd}
      />
      {loading && (
        <div className="mb-3 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-black text-cyan-900">
          Loading extras...
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-800">
          {error}
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a111b]">
        <div className="grid grid-cols-[minmax(220px,1fr)_150px_160px_130px_120px_100px] border-b border-white/[0.08] bg-white/[0.035] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-zinc-500">
          <span>Name</span>
          <span>Type</span>
          <span>Pricing Mode</span>
          <span>Price</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>
        {extras.length > 0 ? (
          extras.map((extra) => (
            <div
              key={extra.id}
              className="grid grid-cols-[minmax(220px,1fr)_150px_160px_130px_120px_100px] items-center border-b border-white/[0.055] px-4 py-3 text-xs last:border-b-0 hover:bg-white/[0.02]"
            >
              <div className="min-w-0 pr-4">
                <p className="truncate font-bold text-zinc-100">{extra.name}</p>
                {extra.description && <p className="mt-1 truncate text-[10px] text-zinc-600">{extra.description}</p>}
              </div>
              <span className="text-zinc-400">Extra</span>
              <span className="w-fit rounded-md border border-cyan-200 bg-cyan-50 px-2.5 py-1 font-bold text-cyan-800">
                {extra.pricingMode}
              </span>
              <div>
                <span className="font-black text-zinc-100">
                  {extra.pricingMode === 'Free' ? 'Free' : `€${Number(extra.price).toFixed(2)}`}
                </span>
                {extra.pricingMode !== 'Free' && (
                  <p className="mt-0.5 text-[9px] text-zinc-600">
                    {extra.pricingMode === 'Per Day' ? '/ day' : '/ booking'}
                  </p>
                )}
              </div>
              <span
                className={`w-fit rounded-full border px-2 py-1 text-[10px] font-black ${
                  extra.status === 'Active' ? statusStyles.Open : statusStyles.Hidden
                }`}
              >
                {extra.status}
              </span>
              <ActionButtons onEdit={() => onEdit(extra)} onDelete={() => onDelete(extra.id)} />
            </div>
          ))
        ) : (
          <TableEmpty icon={PackagePlus} title="No extras yet" description="Add an extra for the future booking flow." />
        )}
      </div>
    </section>
  );
}

function CouponsPanel({
  coupons,
  loading,
  error,
  onAdd,
  onEdit,
  onDelete,
}: {
  coupons: BookingCoupon[];
  loading: boolean;
  error: string;
  onAdd: () => void;
  onEdit: (coupon: BookingCoupon) => void;
  onDelete: (couponId: string) => void;
}) {
  return (
    <section className="min-w-[1180px]">
      <PanelHeading
        title="Promotional coupons"
        description="Local discount code definitions for the future website booking flow."
        buttonLabel="Add Coupon"
        onAdd={onAdd}
      />
      {loading && (
        <div className="mb-3 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-black text-cyan-900">
          Loading coupons...
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-800">
          {error}
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a111b]">
        <div className="grid grid-cols-[145px_140px_110px_115px_115px_95px_minmax(180px,1fr)_105px_100px_90px] border-b border-white/[0.08] bg-white/[0.035] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-zinc-500">
          <span>Coupon Code</span>
          <span>Type</span>
          <span>Value</span>
          <span>Valid From</span>
          <span>Valid To</span>
          <span>Min Days</span>
          <span>Allowed Groups</span>
          <span>Usage Limit</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>
        {coupons.length > 0 ? (
          coupons.map((coupon) => (
            <div
              key={coupon.id}
              className="grid grid-cols-[145px_140px_110px_115px_115px_95px_minmax(180px,1fr)_105px_100px_90px] items-center border-b border-white/[0.055] px-4 py-3 text-xs last:border-b-0 hover:bg-white/[0.02]"
            >
              <span className="w-fit rounded-md border border-cyan-300 bg-cyan-50 px-2.5 py-1 font-black text-cyan-900">
                {coupon.code}
              </span>
              <span className="font-bold text-zinc-300">{coupon.discountType}</span>
              <span className="font-black text-zinc-100">
                {coupon.discountType === 'Percentage'
                  ? `${Number(coupon.discountValue)}%`
                  : `€${Number(coupon.discountValue).toFixed(2)}`}
              </span>
              <span className="text-zinc-400">{formatDateOnly(coupon.validFrom)}</span>
              <span className="text-zinc-400">{formatDateOnly(coupon.validTo)}</span>
              <span className="text-zinc-400">{coupon.minimumDays || '—'}</span>
              <PillList
                values={coupon.allowedGroupCodes.length > 0 ? coupon.allowedGroupCodes : ['All groups']}
                emptyLabel="All groups"
                tone="cyan"
              />
              <span className="text-zinc-400">{coupon.usageLimit || 'Unlimited'}</span>
              <span
                className={`w-fit rounded-full border px-2 py-1 text-[10px] font-black ${
                  coupon.status === 'Active' ? statusStyles.Open : statusStyles.Hidden
                }`}
              >
                {coupon.status}
              </span>
              <ActionButtons onEdit={() => onEdit(coupon)} onDelete={() => onDelete(coupon.id)} />
            </div>
          ))
        ) : (
          <TableEmpty icon={Gift} title="No coupons yet" description="Add a coupon to prepare future promotions." />
        )}
      </div>
    </section>
  );
}

function PaymentMethodsPanel({
  paymentMethods,
  loading,
  saving,
  error,
  message,
  onAdd,
  onEdit,
  onDelete,
  onRestoreDefaults,
}: {
  paymentMethods: BookingPaymentMethod[];
  loading: boolean;
  saving: boolean;
  error: string;
  message: string;
  onAdd: () => void;
  onEdit: (paymentMethod: BookingPaymentMethod) => void;
  onDelete: (paymentMethodId: string) => void | Promise<void>;
  onRestoreDefaults: () => void | Promise<void>;
}) {
  return (
    <section className="min-w-[880px]">
      <PanelHeading
        title="Payment methods"
        description="Supabase payment choices shown in the public booking checkout."
        buttonLabel="Add Payment Method"
        onAdd={onAdd}
      />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onRestoreDefaults}
          disabled={loading || saving}
          className="rounded-lg border border-cyan-700 bg-white px-3 py-2 text-xs font-black text-cyan-800 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Restore Default Payment Methods
        </button>
        {message && (
          <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
            {message}
          </span>
        )}
      </div>
      {error && (
        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800">
          {error}
        </div>
      )}
      {loading && (
        <div className="mb-3 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-800">
          Loading payment methods from Supabase...
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a111b]">
        <div className="grid grid-cols-[minmax(180px,1fr)_170px_minmax(260px,1.4fr)_180px_110px_90px] border-b border-white/[0.08] bg-white/[0.035] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-zinc-500">
          <span>Name</span>
          <span>Type</span>
          <span>Description</span>
          <span>Deposit Required</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>
        {paymentMethods.length > 0 ? (
          paymentMethods.map((paymentMethod) => (
            <div
              key={paymentMethod.id}
              className="grid grid-cols-[minmax(180px,1fr)_170px_minmax(260px,1.4fr)_180px_110px_90px] items-center border-b border-white/[0.055] px-4 py-3 text-xs last:border-b-0 hover:bg-white/[0.02]"
            >
              <span className="font-black text-zinc-100">{paymentMethod.name}</span>
              <span className="w-fit rounded-md border border-cyan-200 bg-cyan-50 px-2.5 py-1 font-bold text-cyan-800">
                {paymentMethod.type}
              </span>
              <span className="truncate pr-4 text-zinc-400">
                {paymentMethod.description || 'No description'}
              </span>
              <div>
                <span
                  className={`w-fit rounded-full border px-2 py-1 text-[10px] font-black ${
                    paymentMethod.depositRequired
                      ? 'border-amber-300 bg-amber-50 text-amber-800'
                      : 'border-slate-300 bg-slate-100 text-slate-600'
                  }`}
                >
                  {paymentMethod.depositRequired ? 'Yes' : 'No'}
                </span>
                {paymentMethod.depositRequired && paymentMethod.depositAmount && (
                  <p className="mt-1 text-[10px] font-bold text-slate-600">
                    €{Number(paymentMethod.depositAmount).toFixed(2)}
                  </p>
                )}
              </div>
              <span
                className={`w-fit rounded-full border px-2 py-1 text-[10px] font-black ${
                  paymentMethod.status === 'Active' ? statusStyles.Open : statusStyles.Hidden
                }`}
              >
                {paymentMethod.status}
              </span>
              <ActionButtons
                onEdit={() => onEdit(paymentMethod)}
                onDelete={() => onDelete(paymentMethod.id)}
              />
            </div>
          ))
        ) : (
          <TableEmpty
            icon={CreditCard}
            title="No payment methods yet"
            description="Add a local payment method for the future checkout flow."
          />
        )}
      </div>
    </section>
  );
}

function BookingSettingsPanel({
  settings,
  adminEmail,
  sendAdminCopy,
  savedMessage,
  loading,
  error,
  onSettingsChange,
  onAdminEmailChange,
  onSendAdminCopyChange,
  onSave,
}: {
  settings: BookingEngineSettings;
  adminEmail: string;
  sendAdminCopy: boolean;
  savedMessage: string;
  loading: boolean;
  error: string;
  onSettingsChange: (settings: BookingEngineSettings) => void;
  onAdminEmailChange: (email: string) => void;
  onSendAdminCopyChange: (active: boolean) => void;
  onSave: () => void;
}) {
  const updateSettings = (patch: Partial<BookingEngineSettings>) => {
    onSettingsChange({ ...settings, ...patch });
  };

  return (
    <section className="min-w-[820px]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-950">Booking settings</h3>
          <p className="mt-1 text-sm text-slate-600">
            Supabase reservation defaults and customer-facing booking rules.
          </p>
        </div>
        <button
          type="button"
          onClick={onSave}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-cyan-700 bg-cyan-700 px-4 text-sm font-black text-white shadow-sm transition hover:border-cyan-800 hover:bg-cyan-800"
        >
          <Check className="h-4 w-4" />
          Save settings
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <BookingSettingCard
          title="Minimum Advance Booking Rule"
          description="Define how close to pickup a customer may create a reservation."
        >
          <BookingSettingToggle
            label="Advance booking restriction"
            description={settings.advanceBookingActive ? 'Active' : 'Inactive'}
            active={settings.advanceBookingActive}
            onToggle={(advanceBookingActive) => updateSettings({ advanceBookingActive })}
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <TextField
              label="Hours before pickup"
              value={settings.advanceBookingHours}
              placeholder="48"
              type="number"
              disabled={!settings.advanceBookingActive}
              onChange={(advanceBookingHours) => updateSettings({ advanceBookingHours })}
            />
            <div>
              <FieldLabel>Quick options</FieldLabel>
              <div className="mt-2 flex gap-1.5">
                {['24', '48', '72', '96'].map((hours) => (
                  <button
                    key={hours}
                    type="button"
                    disabled={!settings.advanceBookingActive}
                    onClick={() => updateSettings({ advanceBookingHours: hours })}
                    className={`h-10 rounded-lg border px-3 text-xs font-black transition ${
                      settings.advanceBookingHours === hours
                        ? 'border-cyan-700 bg-cyan-700 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-cyan-400 hover:text-cyan-800'
                    } disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400`}
                  >
                    {hours}h
                  </button>
                ))}
              </div>
            </div>
          </div>
        </BookingSettingCard>

        <BookingSettingCard
          title="Minimum Rental Days"
          description="Sets the shortest rental period customers may search and book."
        >
          <TextField
            label="Minimum rental days"
            value={settings.minimumRentalDays}
            placeholder="3"
            type="number"
            onChange={(minimumRentalDays) => updateSettings({ minimumRentalDays })}
          />
          <p className="mt-2 text-xs font-semibold text-slate-500">
            Return dates in Public Booking Preview are automatically corrected to this minimum.
          </p>
        </BookingSettingCard>

        <BookingSettingCard
          title="Default Language"
          description="Initial language used by the future public booking experience."
        >
          <label className="block">
            <FieldLabel>Language</FieldLabel>
            <select
              value={settings.defaultLanguage}
              onChange={(event) =>
                updateSettings({ defaultLanguage: event.target.value as BookingDefaultLanguage })
              }
              className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            >
              {['English', 'Italian', 'French', 'German', 'Czech', 'Greek'].map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </label>
        </BookingSettingCard>

        <BookingSettingCard
          title="Reservation Status Defaults"
          description="Default operational status assigned to a newly received reservation."
        >
          <label className="block">
            <FieldLabel>New reservation default status</FieldLabel>
            <select
              value={settings.newReservationStatus}
              onChange={(event) =>
                updateSettings({
                  newReservationStatus: event.target.value as NewReservationStatus,
                })
              }
              className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            >
              <option value="Pending">Pending</option>
              <option value="Accepted">Accepted</option>
              <option value="On Request">On Request</option>
            </select>
          </label>
        </BookingSettingCard>

        <BookingSettingCard
          title="Terms / Consent"
          description="Customer acknowledgements displayed in the future booking form."
        >
          <div className="space-y-2.5">
            <BookingSettingToggle
              label="Rental terms"
              description="Customer must accept rental terms"
              active={settings.requireRentalTerms}
              onToggle={(requireRentalTerms) => updateSettings({ requireRentalTerms })}
            />
            <BookingSettingToggle
              label="Marketing consent"
              description="Show optional marketing consent checkbox"
              active={settings.showMarketingConsent}
              onToggle={(showMarketingConsent) => updateSettings({ showMarketingConsent })}
            />
          </div>
          <div className="mt-3">
            <TextField
              label="Terms URL"
              value={settings.termsUrl}
              placeholder="https://..."
              onChange={(termsUrl) => updateSettings({ termsUrl })}
            />
          </div>
        </BookingSettingCard>

        <BookingSettingCard
          title="Admin Email Copy"
          description="Uses the same local admin email settings shown in the Emails tab."
        >
          <BookingSettingToggle
            label="Admin reservation copy"
            description="Send admin email for every reservation"
            active={sendAdminCopy}
            onToggle={onSendAdminCopyChange}
          />
          <div className="mt-3">
            <TextField
              label="Admin email address"
              value={adminEmail}
              placeholder="reservations@example.com"
              onChange={onAdminEmailChange}
            />
          </div>
        </BookingSettingCard>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-xs text-slate-500">
          Booking settings are stored per Booking Engine site.
        </p>
        {loading && (
          <span className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-800">
            Loading booking settings...
          </span>
        )}
        {error && (
          <span className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-800">
            {error}
          </span>
        )}
        {savedMessage && (
          <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
            {savedMessage}
          </span>
        )}
      </div>
    </section>
  );
}

function CheckoutFieldsPanel({
  fields,
  savedMessage,
  loading,
  error,
  onFieldsChange,
  onDeleteField,
  onSave,
}: {
  fields: CheckoutFieldSetting[];
  savedMessage: string;
  loading: boolean;
  error: string;
  onFieldsChange: (fields: CheckoutFieldSetting[]) => void;
  onDeleteField: (field: CheckoutFieldSetting) => void;
  onSave: () => void;
}) {
  const updateField = (id: string, patch: Partial<CheckoutFieldSetting>) => {
    onFieldsChange(fields.map((field) => (field.id === id ? { ...field, ...patch } : field)));
  };
  const addCustomField = () => {
    const id = localId('checkout-field');
    onFieldsChange([
      ...fields,
      {
        id,
        name: 'Custom Field',
        fieldType: 'Text',
        enabled: true,
        required: false,
        label: 'Custom Field',
        options: [],
        builtIn: false,
      },
    ]);
  };
  const deleteCustomField = (id: string) => {
    const field = fields.find((item) => item.id === id);
    if (field) onDeleteField(field);
  };

  return (
    <section className="min-w-[760px]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-950">Checkout fields</h3>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Configure the customer information requested by the future public booking checkout.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={addCustomField}
            className="rounded-lg border border-cyan-700 bg-white px-4 py-2.5 text-sm font-black text-cyan-800 transition hover:bg-cyan-50"
          >
            + Add Custom Field
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-cyan-800"
          >
            Save fields
          </button>
        </div>
      </div>

      {loading && (
        <div className="mb-3 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-black text-cyan-900">
          Loading checkout fields...
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-800">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[minmax(150px,0.8fr)_88px_92px_minmax(210px,1.1fr)_140px_82px] gap-2.5 border-b border-slate-200 bg-slate-50 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.06em] text-slate-600">
          <span>Customer field</span>
          <span>Enabled</span>
          <span>Required</span>
          <span>Custom label</span>
          <span>Type</span>
          <span className="text-right">Actions</span>
        </div>
        <div className="divide-y divide-slate-200">
          {fields.map((field) => (
            <Fragment key={field.id}>
              <div className="grid grid-cols-[minmax(150px,0.8fr)_88px_92px_minmax(210px,1.1fr)_140px_82px] items-center gap-2.5 px-3.5 py-2">
                <div>
                  <p className="text-xs font-black text-slate-950">{field.name}</p>
                  <p className="mt-0.5 truncate font-mono text-[9px] text-slate-500">
                    {field.id}
                  </p>
                </div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={field.enabled}
                    onChange={(event) => {
                      const enabled = event.target.checked;
                      updateField(field.id, {
                        enabled,
                        required: enabled ? field.required : false,
                      });
                    }}
                    className="h-4 w-4 accent-cyan-700"
                  />
                  Show
                </label>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={field.required}
                    disabled={!field.enabled}
                    onChange={(event) => updateField(field.id, { required: event.target.checked })}
                    className="h-4 w-4 accent-cyan-700 disabled:opacity-40"
                  />
                  Required
                </label>
                <input
                  value={field.label}
                  onChange={(event) =>
                    updateField(field.id, {
                      label: event.target.value,
                      name: field.builtIn ? field.name : event.target.value || 'Custom Field',
                    })
                  }
                  className="h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
                <select
                  value={field.fieldType}
                  disabled={Boolean(field.builtIn)}
                  title={field.builtIn ? 'Core field type is fixed for checkout matching.' : 'Change field type'}
                  onChange={(event) =>
                    updateField(field.id, {
                      fieldType: event.target.value as CheckoutFieldType,
                      options: event.target.value === 'Select' ? field.options || [] : [],
                    })
                  }
                  className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-bold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  {['Text', 'Textarea', 'Number', 'Email', 'Phone', 'Select'].map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => deleteCustomField(field.id)}
                    className="h-8 rounded-md border border-rose-600 bg-rose-600 px-2.5 text-[10px] font-black text-white transition hover:bg-rose-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {field.fieldType === 'Select' && field.id !== 'country' && (
                <div className="bg-slate-50 px-3.5 pb-2.5 pt-1">
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Options</span>
                      <input
                        value={(field.options || []).join(', ')}
                        onChange={(event) =>
                          updateField(field.id, {
                            options: event.target.value
                              .split(',')
                              .map((option) => option.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="Option 1, Option 2, Option 3"
                        className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                      />
                    </label>
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-xs text-slate-500">
          Checkout fields are stored per Booking Engine site.
        </p>
        {savedMessage && (
          <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
            {savedMessage}
          </span>
        )}
      </div>
    </section>
  );
}

function SiteSettingsPanel({
  settings,
  savedMessage,
  loading,
  error,
  onSettingsChange,
  onSave,
}: {
  settings: SiteSettings;
  savedMessage: string;
  loading: boolean;
  error: string;
  onSettingsChange: (settings: SiteSettings) => void;
  onSave: () => void | Promise<void>;
}) {
  const updateSettings = (patch: Partial<SiteSettings>) => {
    onSettingsChange({ ...settings, ...patch });
  };

  return (
    <section className="min-w-[820px]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-950">Site settings</h3>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Local identity and configuration for future multi-site booking engine deployments.
          </p>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={loading}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-cyan-700 bg-cyan-700 px-4 text-sm font-black text-white shadow-sm transition hover:border-cyan-800 hover:bg-cyan-800"
        >
          <Check className="h-4 w-4" />
          {loading ? 'Loading...' : 'Save settings'}
        </button>
      </div>
      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <BookingSettingCard
          title="Site Identity"
          description="Company identity and the domain assigned to this booking engine instance."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Site / Company Name"
              value={settings.companyName}
              placeholder="Booking Site"
              onChange={(companyName) => updateSettings({ companyName })}
            />
            <TextField
              label="Domain"
              value={settings.domain}
              placeholder="https://example.com"
              onChange={(domain) => updateSettings({ domain })}
            />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <TextField
              label="Primary Color"
              value={settings.primaryColor}
              placeholder="#073f5d"
              onChange={(primaryColor) => updateSettings({ primaryColor })}
            />
            <TextField
              label="Secondary Color"
              value={settings.secondaryColor}
              placeholder="#059669"
              onChange={(secondaryColor) => updateSettings({ secondaryColor })}
            />
            <TextField
              label="Website URL"
              value={settings.websiteUrl}
              placeholder="https://example.com"
              onChange={(websiteUrl) => updateSettings({ websiteUrl })}
            />
            <TextField
              label="Email Header Image"
              value={settings.emailHeaderImage}
              placeholder="https://example.com/header.jpg"
              onChange={(emailHeaderImage) => updateSettings({ emailHeaderImage })}
            />
          </div>
          <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white text-cyan-700">
                {settings.logoImage ? (
                  <img src={settings.logoImage} alt="Site logo" className="h-full w-full object-contain p-1" />
                ) : (
                  <ImagePlus className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-900">Logo upload</p>
                <p className="mt-0.5 text-xs text-slate-500">Saved locally as JPG, PNG or WEBP base64.</p>
              </div>
              <label className="flex h-9 cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-cyan-500 hover:text-cyan-800">
                Choose logo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      readImageFileAsDataUrl(file, (logoImage) => updateSettings({ logoImage }));
                    }
                    event.target.value = '';
                  }}
                />
              </label>
              {settings.logoImage && (
                <button
                  type="button"
                  onClick={() => updateSettings({ logoImage: '' })}
                  className="h-9 rounded-lg border border-rose-200 bg-white px-3 text-xs font-black text-rose-600 transition hover:bg-rose-50"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </BookingSettingCard>

        <BookingSettingCard
          title="Contact & Notifications"
          description="Administrative contacts used by the future site and reservation workflow."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Admin Email"
              value={settings.adminEmail}
              placeholder="admin@example.com"
              onChange={(adminEmail) => updateSettings({ adminEmail })}
            />
            <TextField
              label="Booking Notification Email"
              value={settings.bookingNotificationEmail}
              placeholder="reservations@example.com"
              onChange={(bookingNotificationEmail) => updateSettings({ bookingNotificationEmail })}
            />
            <TextField
              label="Support Email"
              value={settings.supportEmail}
              placeholder="support@example.com"
              onChange={(supportEmail) => updateSettings({ supportEmail })}
            />
            <TextField
              label="Phone"
              value={settings.phone}
              placeholder="+30..."
              onChange={(phone) => updateSettings({ phone })}
            />
            <TextField
              label="WhatsApp Number"
              value={settings.whatsappNumber}
              placeholder="+30..."
              onChange={(whatsappNumber) => updateSettings({ whatsappNumber })}
            />
            <TextField
              label="White-label WhatsApp"
              value={settings.whatsapp}
              placeholder="+30..."
              onChange={(whatsapp) => updateSettings({ whatsapp })}
            />
            <TextField
              label="Google Review URL"
              value={settings.googleReviewUrl}
              placeholder="https://g.page/..."
              onChange={(googleReviewUrl) => updateSettings({ googleReviewUrl })}
              className="sm:col-span-2"
            />
          </div>
        </BookingSettingCard>

        <BookingSettingCard
          title="Regional Defaults"
          description="Currency, timezone and language defaults for this site."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <FieldLabel>Currency</FieldLabel>
              <select
                value={settings.currency}
                onChange={(event) => updateSettings({ currency: event.target.value })}
                className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              >
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - Pound</option>
                <option value="USD">USD - Dollar</option>
              </select>
            </label>
            <label className="block">
              <FieldLabel>Timezone</FieldLabel>
              <select
                value={settings.timezone}
                onChange={(event) => updateSettings({ timezone: event.target.value })}
                className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              >
                <option value="Europe/Athens">Europe/Athens</option>
                <option value="Europe/Rome">Europe/Rome</option>
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="Europe/Berlin">Europe/Berlin</option>
                <option value="Europe/Prague">Europe/Prague</option>
                <option value="UTC">UTC</option>
              </select>
            </label>
            <label className="block">
              <FieldLabel>Default Language</FieldLabel>
              <select
                value={settings.defaultLanguage}
                onChange={(event) =>
                  updateSettings({ defaultLanguage: event.target.value as BookingDefaultLanguage })
                }
                className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              >
                {['English', 'Italian', 'French', 'German', 'Czech', 'Greek'].map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </BookingSettingCard>

        <BookingSettingCard
          title="Booking Defaults"
          description="Default times and reservation routing for this Booking Engine site."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Default Pickup Time"
              value={settings.defaultPickupTime}
              placeholder="10:00"
              onChange={(defaultPickupTime) => updateSettings({ defaultPickupTime })}
            />
            <TextField
              label="Default Return Time"
              value={settings.defaultReturnTime}
              placeholder="10:00"
              onChange={(defaultReturnTime) => updateSettings({ defaultReturnTime })}
            />
            <label className="block sm:col-span-2">
              <FieldLabel>Reservation Destination</FieldLabel>
              <select
                value={settings.reservationDestination}
                onChange={(event) => updateSettings({ reservationDestination: event.target.value })}
                className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              >
                <option value="main_board">Main reservations board</option>
                <option value="separate_board">Separate board (future)</option>
                <option value="external_api">External API (future)</option>
              </select>
            </label>
          </div>
        </BookingSettingCard>

        <BookingSettingCard
          title="Review Automation"
          description="Per-site post-rental review timing and Google Review settings."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <input
                type="checkbox"
                checked={settings.reviewEnabled}
                onChange={(event) => updateSettings({ reviewEnabled: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-500"
              />
              <span className="text-sm font-black text-slate-800">Review Enabled</span>
            </label>
            <TextField
              label="Review Delay (days)"
              value={settings.reviewDelayDays}
              placeholder="1"
              onChange={(reviewDelayDays) => updateSettings({ reviewDelayDays })}
            />
            <TextField
              label="Google Review URL"
              value={settings.googleReviewUrl}
              placeholder="https://g.page/..."
              onChange={(googleReviewUrl) => updateSettings({ googleReviewUrl })}
              className="sm:col-span-2"
            />
          </div>
        </BookingSettingCard>

        <BookingSettingCard
          title="Theme / Layout"
          description="Layout mode and custom CSS scoped only to this site."
        >
          <div className="grid gap-3">
            <label className="block">
              <FieldLabel>Theme / Layout</FieldLabel>
              <select
                value={settings.themeLayout}
                onChange={(event) => updateSettings({ themeLayout: event.target.value })}
                className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              >
                {['Default', 'Compact', 'Horizontal', 'Vertical', 'Premium'].map((layout) => (
                  <option key={layout} value={layout}>{layout}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <FieldLabel>Custom CSS</FieldLabel>
              <textarea
                value={settings.customCss}
                onChange={(event) => updateSettings({ customCss: event.target.value })}
                rows={4}
                placeholder="/* CSS scoped to this Booking Engine site */"
                className="mt-2 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-mono text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
          </div>
        </BookingSettingCard>

        <BookingSettingCard
          title="Legal & Site Status"
          description="Public policy links and internal activation state for this site."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Terms URL"
              value={settings.termsUrl}
              placeholder="https://example.com/terms"
              onChange={(termsUrl) => updateSettings({ termsUrl })}
            />
            <TextField
              label="Privacy Policy URL"
              value={settings.privacyPolicyUrl}
              placeholder="https://example.com/privacy"
              onChange={(privacyPolicyUrl) => updateSettings({ privacyPolicyUrl })}
            />
            <TextField
              label="Email Footer Text"
              value={settings.emailFooterText}
              placeholder="For urgent changes, contact us..."
              onChange={(emailFooterText) => updateSettings({ emailFooterText })}
              className="sm:col-span-2"
            />
            <label className="block sm:col-span-2">
              <FieldLabel>Site Status</FieldLabel>
              <select
                value={settings.status}
                onChange={(event) => updateSettings({ status: event.target.value as SeasonStatus })}
                className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>
          </div>
        </BookingSettingCard>

        <BookingSettingCard
          title="Internal Notes"
          description="Private context for staff managing this future site connection."
        >
          <label className="block">
            <FieldLabel>Notes</FieldLabel>
            <textarea
              value={settings.internalNotes}
              onChange={(event) => updateSettings({ internalNotes: event.target.value })}
              rows={4}
              placeholder="Internal setup notes, rollout details or domain-specific requirements..."
              className="mt-2 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
        </BookingSettingCard>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm xl:col-span-2">
          <p className="text-xs text-slate-500">
            Site settings are loaded from public.be_sites for the current Booking Engine site.
          </p>
          {savedMessage && (
            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
              {savedMessage}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

function EmailsPanel({
  settings,
  siteSettings,
  savedMessage,
  loading,
  error,
  onSettingsChange,
  onSave,
}: {
  settings: BookingEmailSettings;
  siteSettings: SiteSettings;
  savedMessage: string;
  loading: boolean;
  error: string;
  onSettingsChange: (settings: BookingEmailSettings) => void;
  onSave: () => void | Promise<void>;
}) {
  const templateElementsRef = useRef<
    Partial<Record<EmailTemplateFieldKey, HTMLInputElement | HTMLTextAreaElement>>
  >({});
  const focusedTemplateFieldRef = useRef<EmailTemplateFieldKey | null>(null);
  const activeMessageFieldRef = useRef<EmailTemplateFieldKey>('admin_new_confirmed_reservation:message');
  const [manualPreviewMessage, setManualPreviewMessage] = useState('');
  const [previewTemplateId, setPreviewTemplateId] =
    useState<BookingEngineEmailTemplateId | null>(null);
  const [openTemplateId, setOpenTemplateId] = useState<BookingEngineEmailTemplateId | null>(null);
  const templateOrder: BookingEngineEmailTemplateId[] = [
    'admin_new_confirmed_reservation',
    'customer_confirmed_reservation',
    'admin_new_onrequest_reservation',
    'customer_onrequest_received',
    'customer_confirmed_after_review',
    'customer_payment_request',
    'customer_reminder',
    'customer_cancellation',
    'customEmail',
  ];
  const templateMeta: Record<
    BookingEngineEmailTemplateId,
    { purpose: string; badge: string; icon: LucideIcon }
  > = {
    admin_new_confirmed_reservation: {
      purpose: 'Admin receives every new confirmed website reservation.',
      badge: 'Automatic',
      icon: Mail,
    },
    customer_confirmed_reservation: {
      purpose: 'Customer receives this automatically for OPEN cars.',
      badge: 'Automatic',
      icon: Check,
    },
    admin_new_onrequest_reservation: {
      purpose: 'Admin receives every new ON REQUEST website reservation.',
      badge: 'Automatic',
      icon: Mail,
    },
    customer_onrequest_received: {
      purpose: 'Customer receives this automatically for ON REQUEST cars.',
      badge: 'Automatic',
      icon: CalendarRange,
    },
    customer_confirmed_after_review: {
      purpose: 'Sent when admin confirms an ON REQUEST reservation.',
      badge: 'Confirm action',
      icon: Check,
    },
    customer_payment_request: {
      purpose: 'Manual payment link/request template.',
      badge: 'Manual',
      icon: CreditCard,
    },
    customer_reminder: {
      purpose: 'Manual post-rental Google review request.',
      badge: 'Manual',
      icon: Mail,
    },
    customer_cancellation: {
      purpose: 'Manual action template for cancelled reservations.',
      badge: 'Manual Action',
      icon: Mail,
    },
    customEmail: {
      purpose: 'Manual reusable message for special cases.',
      badge: 'Manual',
      icon: Mail,
    },
  };

  const updateSettings = (patch: Partial<BookingEmailSettings>) => {
    onSettingsChange({ ...settings, ...patch });
  };

  const updateTemplate = (
    templateId: BookingEngineEmailTemplateId,
    patch: Partial<BookingEmailSettings['templates'][BookingEngineEmailTemplateId]>,
  ) => {
    onSettingsChange({
      ...settings,
      templates: {
        ...settings.templates,
        [templateId]: {
          ...settings.templates[templateId],
          ...patch,
        },
      },
    });
  };

  const handleTemplateFocus = (
    field: EmailTemplateFieldKey,
    element: HTMLInputElement | HTMLTextAreaElement,
  ) => {
    focusedTemplateFieldRef.current = field;
    templateElementsRef.current[field] = element;
    if (field.endsWith(':message')) activeMessageFieldRef.current = field;
  };

  const insertTemplateVariable = (variable: string) => {
    const field = focusedTemplateFieldRef.current || activeMessageFieldRef.current;
    const element = templateElementsRef.current[field];
    const [templateId, fieldName] = field.split(':') as [
      BookingEngineEmailTemplateId,
      'subject' | 'message',
    ];
    const currentValue = settings.templates[templateId][fieldName];
    const selectionStart = element?.selectionStart ?? currentValue.length;
    const selectionEnd = element?.selectionEnd ?? selectionStart;
    const nextValue =
      currentValue.slice(0, selectionStart) + variable + currentValue.slice(selectionEnd);
    const nextCaretPosition = selectionStart + variable.length;

    updateTemplate(templateId, { [fieldName]: nextValue });
    requestAnimationFrame(() => {
      const target = templateElementsRef.current[field];
      target?.focus();
      target?.setSelectionRange(nextCaretPosition, nextCaretPosition);
    });
  };

  const showManualPreview = (label: string) => {
    setManualPreviewMessage(`${label}: manual preview only - live sends run from reservation events.`);
  };

  return (
    <section className="min-w-[820px]">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black text-slate-950">Email templates</h3>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-800">
              Supabase
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Templates are saved in Supabase. Live sends use the internal SMTP endpoint.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="min-w-[260px]">
            <span className="sr-only">Admin email address</span>
            <input
              type="email"
              value={settings.adminEmail}
              placeholder="Admin email address"
              onChange={(event) => updateSettings({ adminEmail: event.target.value })}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
          <button
            type="button"
            onClick={onSave}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-cyan-700 bg-cyan-700 px-4 text-sm font-black text-white shadow-sm transition hover:border-cyan-800 hover:bg-cyan-800"
          >
            <Check className="h-4 w-4" />
            {loading ? 'Loading...' : 'Save settings'}
          </button>
        </div>
      </div>
      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-2.5">
          {templateOrder.map((templateId) => {
            const template = settings.templates[templateId];
            if (!template) return null;
            const subjectKey: EmailTemplateFieldKey = `${templateId}:subject`;
            const messageKey: EmailTemplateFieldKey = `${templateId}:message`;
            const meta = templateMeta[templateId];
            const Icon = meta.icon;
            const isOpen = openTemplateId === templateId;

            return (
              <section
                key={templateId}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setOpenTemplateId(isOpen ? null : templateId)}
                  className="flex w-full items-center justify-between gap-2.5 px-3 py-2.5 text-left transition hover:bg-slate-50"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-black text-slate-950">{template.label}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                            meta.badge.includes('Manual')
                              ? 'border border-blue-200 bg-blue-50 text-blue-800'
                              : 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {meta.badge}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
                        {meta.purpose}
                      </span>
                    </span>
                  </span>
                  <span className="flex flex-shrink-0 items-center gap-2">
                    <span
                      role="switch"
                      aria-checked={template.active}
                      onClick={(event) => {
                        event.stopPropagation();
                        updateTemplate(templateId, { active: !template.active });
                      }}
                      className={`inline-flex h-7 items-center rounded-md border px-2 text-[11px] font-black transition ${
                        template.active
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 bg-white text-slate-600'
                      }`}
                    >
                      {template.active ? 'Active' : 'Inactive'}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-500 transition ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-200 bg-slate-50/70 px-3 py-2.5">
                    <div className="grid gap-2.5">
                      <EmailTemplateField
                        fieldKey={subjectKey}
                        label="Subject template"
                        value={template.subject}
                        onElement={(element) => {
                          templateElementsRef.current[subjectKey] = element;
                        }}
                        onFocus={handleTemplateFocus}
                        onChange={(subject) => updateTemplate(templateId, { subject })}
                      />
                      <EmailTemplateField
                        fieldKey={messageKey}
                        label="Message template"
                        value={template.message}
                        multiline
                        onElement={(element) => {
                          templateElementsRef.current[messageKey] = element;
                        }}
                        onFocus={handleTemplateFocus}
                        onChange={(message) => updateTemplate(templateId, { message })}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewTemplateId(templateId);
                          setManualPreviewMessage('');
                        }}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-cyan-700 bg-cyan-700 px-3.5 text-xs font-black text-white shadow-sm transition hover:border-cyan-800 hover:bg-cyan-800"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Manual preview
                      </button>
                      <button
                        type="button"
                        onClick={onSave}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-black text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-100"
                      >
                        <Save className="h-3.5 w-3.5" />
                        Save
                      </button>
                      <span className="text-[11px] font-semibold text-slate-500">
                        Manual preview only - live sends run through internal SMTP events.
                      </span>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-3 shadow-sm xl:sticky xl:top-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700">
              <Settings2 className="h-4 w-4" />
            </span>
            <div>
              <h4 className="text-sm font-black text-slate-950">Template variables</h4>
              <p className="mt-0.5 text-xs text-slate-500">Available in subjects and messages.</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {emailTemplateVariables.map((variable) => (
              <button
                key={variable}
                type="button"
                onClick={() => insertTemplateVariable(variable)}
                title={`Insert ${variable}`}
                className="rounded-md border border-cyan-300 bg-cyan-50 px-2 py-1 font-mono text-[11px] font-bold text-cyan-800 transition hover:border-cyan-500 hover:bg-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              >
                {variable}
              </button>
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="text-xs font-bold text-amber-900">Supabase templates + internal SMTP</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-600">
              Templates are stored in Supabase. Reservation events send through the internal SMTP endpoint.
            </p>
          </div>
          {loading && (
            <p className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-xs font-bold text-cyan-800">
              Loading email templates...
            </p>
          )}
          {savedMessage && (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-800">
              {savedMessage}
            </p>
          )}
          {manualPreviewMessage && (
            <p className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-xs font-bold leading-5 text-cyan-800">
              {manualPreviewMessage}
            </p>
          )}
        </aside>
      </div>

      {previewTemplateId && (
        <EmailTemplatePreviewModal
          template={settings.templates[previewTemplateId]}
          adminEmail={settings.adminEmail}
          siteName={siteSettings.companyName || 'Booking site'}
          logoImage={siteSettings.logoImage}
          websiteUrl={siteSettings.websiteUrl}
          domain={siteSettings.domain}
          secondaryColor={siteSettings.secondaryColor}
          onClose={() => setPreviewTemplateId(null)}
          onSave={(subject, message) => {
            updateTemplate(previewTemplateId, { subject, message });
            setManualPreviewMessage(`${settings.templates[previewTemplateId].label}: changes staged. Click Save settings to persist.`);
            setPreviewTemplateId(null);
          }}
        />
      )}
    </section>
  );
}

const sampleEmailReservation = {
  customerName: 'Maria Demo',
  reservationId: 'ACR-DEMO-0001',
  carName: 'Peugeot 108 or Similar',
  group: 'A',
  pickupDate: '20/06/2026',
  pickupTime: '10:00',
  returnDate: '27/06/2026',
  returnTime: '10:00',
  pickupLocation: 'Rhodes Airport',
  returnLocation: 'Rhodes Airport',
  rentalTotal: '€262.00',
  totalPrice: '€280.00',
  paymentMethod: 'Pay on Arrival',
  paymentLink: 'https://pay.example.com/ACR-DEMO-0001',
  extras: [
    { name: 'Baby Seat', quantity: 1, unitPrice: 10, total: 10 },
    { name: 'Booster Seat', quantity: 1, unitPrice: 8, total: 8 },
  ],
};

const sampleEmailContext = {
  ...sampleEmailReservation,
  email: 'maria.demo@example.com',
  phone: '+30 690 000 0000',
  country: 'Greece',
  countryCode: '+30',
  dateOfBirth: '12/04/1990',
  accommodationName: 'Rhodes Bay Hotel',
  flightNumber: 'A3 218',
  notes: '',
};

const renderSampleTemplate = (template: string) =>
  renderBookingEmailTemplate(template, sampleEmailContext);

const adminManualPreviewTemplateIds = new Set<BookingEngineEmailTemplateId>([
  'customer_payment_request',
  'customer_reminder',
  'customer_cancellation',
  'customEmail',
]);

function EmailTemplatePreviewModal({
  template,
  adminEmail,
  siteName,
  logoImage,
  websiteUrl,
  domain,
  secondaryColor,
  onClose,
  onSave,
}: {
  template: BookingEmailSettings['templates'][BookingEngineEmailTemplateId];
  adminEmail: string;
  siteName: string;
  logoImage: string;
  websiteUrl: string;
  domain: string;
  secondaryColor: string;
  onClose: () => void;
  onSave: (subject: string, message: string) => void;
}) {
  const [subject, setSubject] = useState(renderSampleTemplate(template.subject));
  const [message, setMessage] = useState(renderSampleTemplate(template.message));
  const renderedPreviewMessage = renderBookingEmailTemplate(message, sampleEmailContext);
  const usesManualBody = adminManualPreviewTemplateIds.has(template.id);
  const recipient =
    template.id === 'admin_new_confirmed_reservation' || template.id === 'admin_new_onrequest_reservation'
      ? adminEmail || 'reservations@example.com'
      : 'maria.demo@example.com';
  const previewHtml = buildBookingEmailHtml({
    site: {
      siteId: 'preview',
      siteName,
      adminEmail,
      logoImage,
      websiteUrl,
      domain,
      secondaryColor,
    },
    reservation: sampleEmailContext,
    intro: getBookingEmailIntro(template.id),
    templateId: template.id,
    manualMessage: usesManualBody ? renderedPreviewMessage : undefined,
  });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-5 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-700">
              Manual preview
            </p>
            <h3 className="mt-1 text-xl font-black text-slate-950">{template.label}</h3>
            <p className="mt-1 text-sm text-slate-600">Rendered with sample reservation data.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100"
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-[#f8fafc] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-[#073f5d] text-sm font-black text-white">
                  {logoImage ? (
                    <img src={logoImage} alt={siteName} className="h-full w-full object-contain bg-white p-1" />
                  ) : (
                    <span>AC</span>
                  )}
                </div>
                <div>
                  <p className="text-lg font-black text-slate-950">{siteName}</p>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-cyan-700">
                    Car rental
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <label className="block">
                <FieldLabel>To</FieldLabel>
                <input
                  value={recipient}
                  readOnly
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 text-sm font-bold text-slate-700"
                />
              </label>
              <label className="block">
                <FieldLabel>Subject</FieldLabel>
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
              </label>
              <label className="block">
                <FieldLabel>Message</FieldLabel>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={10}
                  className="mt-1.5 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
              </label>
              <div>
                <FieldLabel>Final email preview</FieldLabel>
                <iframe
                  title={`${template.label} final email preview`}
                  srcDoc={previewHtml}
                  className="mt-1.5 h-[520px] w-full rounded-xl border border-slate-300 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => onSave(subject, message)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-cyan-700 bg-cyan-700 px-4 text-sm font-black text-white transition hover:bg-cyan-800"
          >
            <Save className="h-4 w-4" />
            Save changes
          </button>
        </footer>
      </div>
    </div>
  );
}

function GroupModal({
  draft,
  editing,
  groups,
  editingGroupId,
  onDraftChange,
  onClose,
  onSave,
}: {
  draft: GroupDraft;
  editing: boolean;
  groups: BookingGroup[];
  editingGroupId: string | null;
  onDraftChange: (draft: GroupDraft | ((current: GroupDraft) => GroupDraft)) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const normalizedCode = draft.code.trim().toLowerCase();
  const duplicateCode = Boolean(
    normalizedCode &&
      groups.some((group) => group.id !== editingGroupId && group.code.toLowerCase() === normalizedCode),
  );

  return (
    <ModalShell
      eyebrow="Vehicle groups"
      title={editing ? 'Edit Group' : 'Add Group'}
      onClose={onClose}
      maxWidth="max-w-xl"
      footer={
        <ModalActions
          note="Active groups feed Cars and Pricing / Seasons immediately."
          onClose={onClose}
          onSave={onSave}
          saveLabel={editing ? 'Save changes' : 'Add group'}
          disabled={!draft.code.trim() || !draft.name.trim() || duplicateCode}
        />
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Group code"
          value={draft.code}
          placeholder="A, B, C, D1..."
          onChange={(code) => onDraftChange((current) => ({ ...current, code }))}
        />
        <TextField
          label="Group name"
          value={draft.name}
          placeholder="e.g. Small Economy"
          onChange={(name) => onDraftChange((current) => ({ ...current, name }))}
        />
        <label className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-3 sm:col-span-2">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(event) => onDraftChange((current) => ({ ...current, active: event.target.checked }))}
            className="h-4 w-4 accent-cyan-400"
          />
          <span>
            <span className="block text-xs font-bold text-zinc-200">Active group</span>
            <span className="mt-0.5 block text-[11px] text-zinc-600">
              Available in Cars and Pricing / Seasons selectors.
            </span>
          </span>
        </label>
        <label className="block sm:col-span-2">
          <FieldLabel>Notes optional</FieldLabel>
          <textarea
            value={draft.notes}
            onChange={(event) => onDraftChange((current) => ({ ...current, notes: event.target.value }))}
            rows={3}
            placeholder="Internal group note"
            className="mt-2 w-full resize-none rounded-lg border border-white/[0.1] bg-black/25 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-cyan-300/35"
          />
        </label>
        {duplicateCode && (
          <p className="sm:col-span-2 rounded-lg border border-rose-300/20 bg-rose-300/[0.06] px-3 py-2 text-xs font-bold text-rose-200">
            This group code already exists.
          </p>
        )}
      </div>
    </ModalShell>
  );
}

function CarModal({
  draft,
  editing,
  saving,
  activeGroups,
  activeLocations,
  features,
  onDraftChange,
  onToggleLocation,
  onToggleFeature,
  onToggleIncludedBenefit,
  onTogglePromoBadge,
  onClose,
  onSave,
}: {
  draft: CarDraft;
  editing: boolean;
  saving: boolean;
  activeGroups: BookingGroup[];
  activeLocations: BookingLocation[];
  features: BookingFeature[];
  onDraftChange: (draft: CarDraft | ((current: CarDraft) => CarDraft)) => void;
  onToggleLocation: (id: string) => void;
  onToggleFeature: (id: string) => void;
  onToggleIncludedBenefit: (id: string) => void;
  onTogglePromoBadge: (id: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <ModalShell
      eyebrow="Cars catalogue"
      title={editing ? 'Edit Car / Category' : 'Add Car / Category'}
      onClose={onClose}
      footer={
        <ModalActions
          note="Saved live to Supabase vehicle categories."
          onClose={onClose}
          onSave={onSave}
          saveLabel={saving ? 'Saving...' : editing ? 'Save changes' : 'Add record'}
          disabled={saving || !draft.name.trim() || !draft.groupCode.trim()}
        />
      }
    >
      <div className="grid gap-5 md:grid-cols-[190px_1fr]">
        <div>
          <FieldLabel>Photo</FieldLabel>
          <div className="mt-2 overflow-hidden rounded-xl border border-dashed border-white/[0.14] bg-white/[0.025]">
            <div className="flex aspect-[4/3] w-full flex-col items-center justify-center text-zinc-500">
              {draft.imageUrl ? (
                <img src={draft.imageUrl} alt={draft.name || 'Car preview'} className="h-full w-full object-cover" />
              ) : (
                <>
                  <ImagePlus className="h-7 w-7" strokeWidth={1.5} />
                  <span className="mt-2 text-xs font-bold">Image placeholder</span>
                  <span className="mt-1 text-[10px] text-zinc-600">JPG, PNG or WEBP</span>
                </>
              )}
            </div>
          </div>
          <label className="mt-3 flex h-10 cursor-pointer items-center justify-center rounded-lg border border-cyan-700 bg-cyan-700 px-3 text-xs font-black text-white transition hover:bg-cyan-800">
            Upload Image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  readImageFileAsDataUrl(file, (imageUrl) =>
                    onDraftChange((current) => ({ ...current, imageUrl })),
                  );
                }
                event.target.value = '';
              }}
            />
          </label>
          {draft.imageUrl && (
            <button
              type="button"
              onClick={() => onDraftChange((current) => ({ ...current, imageUrl: '' }))}
              className="mt-2 h-8 w-full rounded-lg border border-white/[0.1] text-xs font-bold text-zinc-400 transition hover:border-rose-300/40 hover:text-rose-200"
            >
              Remove image
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Car/category name"
            value={draft.name}
            placeholder="e.g. Peugeot 108 or similar"
            className="sm:col-span-2"
            onChange={(name) => onDraftChange((current) => ({ ...current, name }))}
          />
          <label className="block">
            <FieldLabel>Category / Group</FieldLabel>
            <select
              value={draft.groupCode}
              onChange={(event) => onDraftChange((current) => ({ ...current, groupCode: event.target.value }))}
              className="mt-2 h-10 w-full rounded-lg border border-white/[0.1] bg-[#090f18] px-3 text-sm font-bold text-zinc-100 outline-none focus:border-cyan-300/35"
            >
              <option value="">Select active group</option>
              {activeGroups.map((group) => (
                <option key={group.id} value={group.code}>
                  {group.code} - {group.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <FieldLabel>Status</FieldLabel>
            <select
              value={draft.status}
              onChange={(event) => onDraftChange((current) => ({ ...current, status: event.target.value as CarStatus }))}
              className="mt-2 h-10 w-full rounded-lg border border-white/[0.1] bg-[#090f18] px-3 text-sm font-bold text-zinc-100 outline-none focus:border-cyan-300/35"
            >
              <option value="Open">Open</option>
              <option value="On Request">On Request</option>
              <option value="Hidden">Hidden</option>
            </select>
          </label>
          <TextField
            label="Display Priority"
            value={draft.displayPriority}
            placeholder="0"
            type="number"
            onChange={(displayPriority) => onDraftChange((current) => ({ ...current, displayPriority }))}
          />
          <label className="block sm:col-span-2">
            <FieldLabel>Description</FieldLabel>
            <textarea
              value={draft.description}
              onChange={(event) => onDraftChange((current) => ({ ...current, description: event.target.value }))}
              rows={3}
              placeholder="Short website description"
              className="mt-2 w-full resize-none rounded-lg border border-white/[0.1] bg-black/25 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-cyan-300/35"
            />
          </label>
        </div>
      </div>

      <CheckboxSection
        title="Included features"
        description="Managed from the Features tab."
        items={features}
        selectedIds={draft.featureIds}
        emptyLabel="Add features in the Features tab first."
        onToggle={onToggleFeature}
      />

      <ManagedBenefitSection
        title="Included in price"
        description="Benefits displayed automatically on the Choose Car card."
        items={includedBenefitOptions}
        selectedBenefits={draft.includedBenefits}
        emptyLabel="No benefit options configured."
        onToggle={onToggleIncludedBenefit}
        customPlaceholder="Add custom included benefit"
        onAddCustom={(value) =>
          onDraftChange((current) => ({
            ...current,
            includedBenefits: current.includedBenefits.some((benefit) => benefit.label === value)
              ? current.includedBenefits
              : [...current.includedBenefits, { label: value, tooltip: '' }],
          }))
        }
        onRemoveCustom={(value) =>
          onDraftChange((current) => ({
            ...current,
            includedBenefits: current.includedBenefits.filter((item) => item.label !== value),
          }))
        }
        onTooltipChange={(label, tooltip) =>
          onDraftChange((current) => ({
            ...current,
            includedBenefits: current.includedBenefits.map((benefit) =>
              benefit.label === label ? { ...benefit, tooltip } : benefit,
            ),
          }))
        }
      />

      <ManagedOptionSection
        title="Marketing badges / promo labels"
        description="Optional labels shown on the Choose Car card."
        items={promoBadgeOptions}
        selectedIds={draft.promoBadges}
        emptyLabel="No promo badge options configured."
        onToggle={onTogglePromoBadge}
        customPlaceholder="Add custom promo badge"
        onAddCustom={(value) =>
          onDraftChange((current) => ({
            ...current,
            promoBadges: current.promoBadges.includes(value)
              ? current.promoBadges
              : [...current.promoBadges, value],
          }))
        }
        onRemoveCustom={(value) =>
          onDraftChange((current) => ({
            ...current,
            promoBadges: current.promoBadges.filter((item) => item !== value),
          }))
        }
      />

      <MarketingMessageField
        value={draft.marketingMessage}
        onChange={(marketingMessage) => onDraftChange((current) => ({ ...current, marketingMessage }))}
      />

      <CheckboxSection
        title="Display locations"
        description="Only active locations from the Locations tab are available."
        items={activeLocations}
        selectedIds={draft.locationIds}
        emptyLabel="No active locations. Add or activate one in the Locations tab."
        onToggle={onToggleLocation}
      />
    </ModalShell>
  );
}

function SeasonPriceModal({
  draft,
  editing,
  activeGroups,
  onDraftChange,
  onClose,
  onSave,
}: {
  draft: SeasonPriceDraft;
  editing: boolean;
  activeGroups: BookingGroup[];
  onDraftChange: (draft: SeasonPriceDraft | ((current: SeasonPriceDraft) => SeasonPriceDraft)) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const invalidDateRange = Boolean(draft.fromDate && draft.toDate && draft.toDate < draft.fromDate);
  const invalidTiers = draft.tiers.some(
    (tier) =>
      !tier.fromDays ||
      !tier.toDays ||
      !tier.pricePerDay ||
      Number(tier.fromDays) < 1 ||
      Number(tier.toDays) < Number(tier.fromDays) ||
      Number(tier.pricePerDay) <= 0,
  );
  const saveDisabled =
    !draft.groupCode ||
    !draft.seasonName.trim() ||
    !draft.fromDate ||
    !draft.toDate ||
    draft.tiers.length === 0 ||
    invalidTiers ||
    invalidDateRange;

  const updateTier = (tierId: string, patch: Partial<PricingTier>) => {
    onDraftChange((current) => ({
      ...current,
      tiers: current.tiers.map((tier) => (tier.id === tierId ? { ...tier, ...patch } : tier)),
    }));
  };

  const addTier = () => {
    onDraftChange((current) => ({
      ...current,
      tiers: [
        ...current.tiers,
        { id: localId('pricing-tier'), fromDays: '', toDays: '', pricePerDay: '' },
      ],
    }));
  };

  const deleteTier = (tierId: string) => {
    onDraftChange((current) => ({
      ...current,
      tiers: current.tiers.filter((tier) => tier.id !== tierId),
    }));
  };

  return (
    <ModalShell
      eyebrow="Pricing / Seasons"
      title={editing ? 'Edit Season Price' : 'Add Season Price'}
      onClose={onClose}
      maxWidth="max-w-3xl"
      footer={
        <ModalActions
          note="Local category pricing only. No availability or booking calculation is connected."
          onClose={onClose}
          onSave={onSave}
          saveLabel={editing ? 'Save changes' : 'Add season price'}
          disabled={saveDisabled}
        />
      }
    >
      {activeGroups.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <FieldLabel>Category / Group</FieldLabel>
            <select
              value={draft.groupCode}
              onChange={(event) => onDraftChange((current) => ({ ...current, groupCode: event.target.value }))}
              className="mt-2 h-10 w-full rounded-lg border border-white/[0.1] bg-[#090f18] px-3 text-sm font-bold text-zinc-100 outline-none focus:border-cyan-300/35"
            >
              <option value="">Select group</option>
              {activeGroups.map((group) => (
                <option key={group.id} value={group.code}>
                  {group.code} - {group.name}
                </option>
              ))}
            </select>
          </label>
          <TextField
            label="Season name"
            value={draft.seasonName}
            placeholder="e.g. Peak Season"
            onChange={(seasonName) => onDraftChange((current) => ({ ...current, seasonName }))}
          />
          <TextField
            label="From date"
            value={draft.fromDate}
            placeholder=""
            type="date"
            onChange={(fromDate) => onDraftChange((current) => ({ ...current, fromDate }))}
          />
          <TextField
            label="To date"
            value={draft.toDate}
            placeholder=""
            type="date"
            onChange={(toDate) => onDraftChange((current) => ({ ...current, toDate }))}
          />
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.018] p-4 sm:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <FieldLabel>Pricing tiers</FieldLabel>
                <p className="mt-1 text-[11px] text-zinc-600">
                  Define each rental-day range and its price per day.
                </p>
              </div>
              <button
                type="button"
                onClick={addTier}
                className="inline-flex h-9 flex-shrink-0 items-center gap-1.5 rounded-lg border border-cyan-700 bg-cyan-700 px-3 text-xs font-black text-white transition hover:border-cyan-800 hover:bg-cyan-800"
              >
                <Plus className="h-3.5 w-3.5" />
                Add pricing tier
              </button>
            </div>
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-[1fr_1fr_1.2fr_40px] gap-2 px-1 text-[10px] font-black uppercase tracking-[0.06em] text-slate-500">
                <span>From rental days</span>
                <span>To rental days</span>
                <span>Price per day</span>
                <span />
              </div>
              {draft.tiers.map((tier) => (
                <div
                  key={tier.id}
                  className="grid grid-cols-[1fr_1fr_1.2fr_40px] items-center gap-2 rounded-lg border border-slate-200 bg-white p-2"
                >
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={tier.fromDays}
                    onChange={(event) => updateTier(tier.id, { fromDays: event.target.value })}
                    placeholder="1"
                    aria-label="From rental days"
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-cyan-500"
                  />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={tier.toDays}
                    onChange={(event) => updateTier(tier.id, { toDays: event.target.value })}
                    placeholder="7"
                    aria-label="To rental days"
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-cyan-500"
                  />
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                      €
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={tier.pricePerDay}
                      onChange={(event) => updateTier(tier.id, { pricePerDay: event.target.value })}
                      placeholder="0.00"
                      aria-label="Price per day"
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-7 pr-3 text-sm font-bold text-slate-900 outline-none focus:border-cyan-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteTier(tier.id)}
                    title="Delete pricing tier"
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 transition hover:border-rose-300 hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {draft.tiers.length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-500">
                  Add at least one pricing tier.
                </p>
              )}
            </div>
          </div>
          <label className="block">
            <FieldLabel>Website Booking Mode</FieldLabel>
            <select
              value={draft.websiteMode}
              onChange={(event) =>
                onDraftChange((current) => ({
                  ...current,
                  websiteMode: event.target.value as CarStatus,
                }))
              }
              className="mt-2 h-10 w-full rounded-lg border border-white/[0.1] bg-[#090f18] px-3 text-sm font-bold text-zinc-100 outline-none focus:border-cyan-300/35"
            >
              <option value="Open">Open</option>
              <option value="On Request">On Request</option>
              <option value="Hidden">Hidden</option>
            </select>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              Controls how this group appears on the website for this date range.
            </p>
          </label>
          <label className="block sm:col-span-2">
            <FieldLabel>Notes optional</FieldLabel>
            <textarea
              value={draft.notes}
              onChange={(event) => onDraftChange((current) => ({ ...current, notes: event.target.value }))}
              rows={3}
              placeholder="Internal pricing note"
              className="mt-2 w-full resize-none rounded-lg border border-white/[0.1] bg-black/25 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-cyan-300/35"
            />
          </label>
          {invalidDateRange && (
            <p className="sm:col-span-2 rounded-lg border border-rose-300/20 bg-rose-300/[0.06] px-3 py-2 text-xs font-bold text-rose-200">
              To Date cannot be before From Date.
            </p>
          )}
          {invalidTiers && draft.tiers.length > 0 && (
            <p className="sm:col-span-2 rounded-lg border border-rose-300/20 bg-rose-300/[0.06] px-3 py-2 text-xs font-bold text-rose-700">
              Each tier needs a valid day range and a price greater than zero.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.055] p-4">
          <p className="text-sm font-bold text-amber-100">No car groups are available.</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">Add a car/category in the Cars tab before creating season pricing.</p>
        </div>
      )}
    </ModalShell>
  );
}

function LocationModal({
  draft,
  editing,
  onDraftChange,
  onClose,
  onSave,
}: {
  draft: LocationDraft;
  editing: boolean;
  onDraftChange: (draft: LocationDraft | ((current: LocationDraft) => LocationDraft)) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <ModalShell
      eyebrow="Locations"
      title={editing ? 'Edit Location' : 'Add Location'}
      onClose={onClose}
      maxWidth="max-w-xl"
      footer={
        <ModalActions
          note="Active locations feed the Cars tab immediately."
          onClose={onClose}
          onSave={onSave}
          saveLabel={editing ? 'Save changes' : 'Add location'}
          disabled={!draft.name.trim()}
        />
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Location name"
          value={draft.name}
          placeholder="e.g. Rhodes Port"
          className="sm:col-span-2"
          onChange={(name) => onDraftChange((current) => ({ ...current, name }))}
        />
        <label className="block">
          <FieldLabel>Type</FieldLabel>
          <select
            value={draft.type}
            onChange={(event) => onDraftChange((current) => ({ ...current, type: event.target.value as LocationType }))}
            className="mt-2 h-10 w-full rounded-lg border border-white/[0.1] bg-[#090f18] px-3 text-sm font-bold text-zinc-100 outline-none focus:border-cyan-300/35"
          >
            <option value="airport">Airport</option>
            <option value="town">Town</option>
            <option value="hotel">Hotel</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <TextField
          label="Optional fee"
          value={draft.fee}
          placeholder="0.00"
          type="number"
          onChange={(fee) => onDraftChange((current) => ({ ...current, fee }))}
        />
        <label className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-3 sm:col-span-2">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(event) => onDraftChange((current) => ({ ...current, active: event.target.checked }))}
            className="h-4 w-4 accent-cyan-400"
          />
          <span>
            <span className="block text-xs font-bold text-zinc-200">Active location</span>
            <span className="mt-0.5 block text-[11px] text-zinc-600">Available as a checkbox in the Cars editor.</span>
          </span>
        </label>
      </div>
    </ModalShell>
  );
}

function FeatureModal({
  draft,
  editing,
  onDraftChange,
  onClose,
  onSave,
}: {
  draft: FeatureDraft;
  editing: boolean;
  onDraftChange: (draft: FeatureDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <ModalShell
      eyebrow="Included features"
      title={editing ? 'Edit Feature' : 'Add Feature'}
      onClose={onClose}
      maxWidth="max-w-lg"
      footer={
        <ModalActions
          note="Feature options feed the Cars editor immediately."
          onClose={onClose}
          onSave={onSave}
          saveLabel={editing ? 'Save changes' : 'Add feature'}
          disabled={!draft.name.trim()}
        />
      }
    >
      <TextField
        label="Feature name"
        value={draft.name}
        placeholder="e.g. Bluetooth"
        onChange={(name) => onDraftChange({ name })}
      />
    </ModalShell>
  );
}

function ExtraModal({
  draft,
  editing,
  onDraftChange,
  onClose,
  onSave,
}: {
  draft: ExtraDraft;
  editing: boolean;
  onDraftChange: (draft: ExtraDraft | ((current: ExtraDraft) => ExtraDraft)) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const priceRequired = draft.pricingMode !== 'Free';

  return (
    <ModalShell
      eyebrow="Booking extras"
      title={editing ? 'Edit Extra' : 'Add Extra'}
      onClose={onClose}
      maxWidth="max-w-2xl"
      footer={
        <ModalActions
          note="Local UI only. No booking calculation or website connection is active."
          onClose={onClose}
          onSave={onSave}
          saveLabel={editing ? 'Save changes' : 'Add extra'}
          disabled={!draft.name.trim() || (priceRequired && !draft.price)}
        />
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FieldLabel>Image optional</FieldLabel>
          <div className="mt-2 flex items-center gap-3 rounded-xl border border-white/[0.1] bg-white/[0.025] p-3">
            <div className="flex h-20 w-28 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/[0.08] bg-black/20 text-zinc-600">
              {draft.imageUrl ? (
                <img src={draft.imageUrl} alt={draft.name || 'Extra preview'} className="h-full w-full object-cover" />
              ) : (
                <ImagePlus className="h-6 w-6" strokeWidth={1.5} />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap gap-2">
              <label className="flex h-9 cursor-pointer items-center rounded-lg border border-cyan-700 bg-cyan-700 px-3 text-xs font-black text-white transition hover:bg-cyan-800">
                Upload Image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      readImageFileAsDataUrl(file, (imageUrl) =>
                        onDraftChange((current) => ({ ...current, imageUrl })),
                      );
                    }
                    event.target.value = '';
                  }}
                />
              </label>
              {draft.imageUrl && (
                <button
                  type="button"
                  onClick={() => onDraftChange((current) => ({ ...current, imageUrl: '' }))}
                  className="h-9 rounded-lg border border-white/[0.1] px-3 text-xs font-bold text-zinc-400 transition hover:border-rose-300/40 hover:text-rose-200"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
        <TextField
          label="Name"
          value={draft.name}
          placeholder="e.g. Baby Seat"
          className="sm:col-span-2"
          onChange={(name) => onDraftChange((current) => ({ ...current, name }))}
        />
        <label className="block sm:col-span-2">
          <FieldLabel>Description</FieldLabel>
          <textarea
            value={draft.description}
            onChange={(event) => onDraftChange((current) => ({ ...current, description: event.target.value }))}
            rows={3}
            placeholder="Short customer-facing description"
            className="mt-2 w-full resize-none rounded-lg border border-white/[0.1] bg-black/25 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-cyan-300/35"
          />
        </label>
        <label className="block">
          <FieldLabel>Pricing Mode</FieldLabel>
          <select
            value={draft.pricingMode}
            onChange={(event) => {
              const pricingMode = event.target.value as ExtraPricingMode;
              onDraftChange((current) => ({
                ...current,
                pricingMode,
                price: pricingMode === 'Free' ? '0' : current.price === '0' ? '' : current.price,
              }));
            }}
            className="mt-2 h-10 w-full rounded-lg border border-white/[0.1] bg-[#090f18] px-3 text-sm font-bold text-zinc-100 outline-none focus:border-cyan-300/35"
          >
            <option value="Per Day">Per Day</option>
            <option value="Per Booking">Per Booking</option>
            <option value="Free">Free</option>
          </select>
        </label>
        <TextField
          label="Price"
          value={draft.pricingMode === 'Free' ? '0' : draft.price}
          placeholder="0.00"
          type="number"
          onChange={(price) => onDraftChange((current) => ({ ...current, price }))}
          disabled={draft.pricingMode === 'Free'}
        />
        <label className="block">
          <FieldLabel>Status</FieldLabel>
          <select
            value={draft.status}
            onChange={(event) =>
              onDraftChange((current) => ({ ...current, status: event.target.value as SeasonStatus }))
            }
            className="mt-2 h-10 w-full rounded-lg border border-white/[0.1] bg-[#090f18] px-3 text-sm font-bold text-zinc-100 outline-none focus:border-cyan-300/35"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </label>
        <TextField
          label="Maximum quantity optional"
          value={draft.maximumQuantity}
          placeholder="No limit"
          type="number"
          onChange={(maximumQuantity) => onDraftChange((current) => ({ ...current, maximumQuantity }))}
        />
      </div>
    </ModalShell>
  );
}

function CouponModal({
  draft,
  editing,
  coupons,
  editingCouponId,
  activeGroups,
  onDraftChange,
  onToggleGroup,
  onClose,
  onSave,
}: {
  draft: CouponDraft;
  editing: boolean;
  coupons: BookingCoupon[];
  editingCouponId: string | null;
  activeGroups: BookingGroup[];
  onDraftChange: (draft: CouponDraft | ((current: CouponDraft) => CouponDraft)) => void;
  onToggleGroup: (groupCode: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const normalizedCode = draft.code.trim().toLowerCase();
  const duplicateCode = Boolean(
    normalizedCode &&
      coupons.some(
        (coupon) => coupon.id !== editingCouponId && coupon.code.toLowerCase() === normalizedCode,
      ),
  );
  const invalidDateRange = Boolean(draft.validFrom && draft.validTo && draft.validTo < draft.validFrom);
  const invalidValue = !draft.discountValue || Number(draft.discountValue) <= 0;
  const saveDisabled =
    !draft.code.trim() ||
    invalidValue ||
    !draft.validFrom ||
    !draft.validTo ||
    invalidDateRange ||
    duplicateCode;

  return (
    <ModalShell
      eyebrow="Coupons"
      title={editing ? 'Edit Coupon' : 'Add Coupon'}
      onClose={onClose}
      maxWidth="max-w-3xl"
      footer={
        <ModalActions
          note="Local UI only. No price calculation or website integration is connected."
          onClose={onClose}
          onSave={onSave}
          saveLabel={editing ? 'Save changes' : 'Add coupon'}
          disabled={saveDisabled}
        />
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Coupon code"
          value={draft.code}
          placeholder="e.g. SUMMER10"
          onChange={(code) => onDraftChange((current) => ({ ...current, code: code.toUpperCase() }))}
        />
        <label className="block">
          <FieldLabel>Discount type</FieldLabel>
          <select
            value={draft.discountType}
            onChange={(event) =>
              onDraftChange((current) => ({
                ...current,
                discountType: event.target.value as CouponDiscountType,
              }))
            }
            className="mt-2 h-10 w-full rounded-lg border border-white/[0.1] bg-[#090f18] px-3 text-sm font-bold text-zinc-100 outline-none focus:border-cyan-300/35"
          >
            <option value="Percentage">Percentage</option>
            <option value="Fixed Amount">Fixed Amount</option>
          </select>
        </label>
        <TextField
          label={draft.discountType === 'Percentage' ? 'Discount value (%)' : 'Discount value (€)'}
          value={draft.discountValue}
          placeholder="0.00"
          type="number"
          onChange={(discountValue) => onDraftChange((current) => ({ ...current, discountValue }))}
        />
        <label className="block">
          <FieldLabel>Status</FieldLabel>
          <select
            value={draft.status}
            onChange={(event) =>
              onDraftChange((current) => ({ ...current, status: event.target.value as SeasonStatus }))
            }
            className="mt-2 h-10 w-full rounded-lg border border-white/[0.1] bg-[#090f18] px-3 text-sm font-bold text-zinc-100 outline-none focus:border-cyan-300/35"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </label>
        <TextField
          label="Valid from"
          value={draft.validFrom}
          placeholder=""
          type="date"
          onChange={(validFrom) => onDraftChange((current) => ({ ...current, validFrom }))}
        />
        <TextField
          label="Valid to"
          value={draft.validTo}
          placeholder=""
          type="date"
          onChange={(validTo) => onDraftChange((current) => ({ ...current, validTo }))}
        />
        <label className="block">
          <FieldLabel>Minimum rental days optional</FieldLabel>
          <input
            type="number"
            min="1"
            step="1"
            value={draft.minimumDays}
            onChange={(event) =>
              onDraftChange((current) => ({ ...current, minimumDays: event.target.value }))
            }
            placeholder="No minimum"
            className="mt-2 h-10 w-full rounded-lg border border-white/[0.1] bg-black/25 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-cyan-300/35"
          />
        </label>
        <label className="block">
          <FieldLabel>Usage limit optional</FieldLabel>
          <input
            type="number"
            min="1"
            step="1"
            value={draft.usageLimit}
            onChange={(event) =>
              onDraftChange((current) => ({ ...current, usageLimit: event.target.value }))
            }
            placeholder="Unlimited"
            className="mt-2 h-10 w-full rounded-lg border border-white/[0.1] bg-black/25 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-cyan-300/35"
          />
        </label>
      </div>

      <div className="mt-5 border-t border-white/[0.07] pt-4">
        <FieldLabel>Allowed groups</FieldLabel>
        <p className="mt-1 text-[11px] text-zinc-600">
          Leave every group unchecked to allow this coupon for all active groups.
        </p>
        {activeGroups.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {activeGroups.map((group) => {
              const selected = draft.allowedGroupCodes.includes(group.code);
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => onToggleGroup(group.code)}
                  className={`flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-bold transition ${
                    selected
                      ? 'border-cyan-300 bg-cyan-50 text-cyan-900'
                      : 'border-white/[0.08] bg-white/[0.025] text-zinc-500 hover:text-zinc-200'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                      selected ? 'border-cyan-500 bg-cyan-100 text-cyan-800' : 'border-slate-400'
                    }`}
                  >
                    {selected && <Check className="h-3 w-3" />}
                  </span>
                  <span>
                    <span className="block">{group.code}</span>
                    <span className="mt-0.5 block font-medium text-slate-500">{group.name}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-dashed border-white/[0.08] px-3 py-4 text-xs text-zinc-600">
            No active groups are available. The coupon will apply to all groups.
          </p>
        )}
      </div>

      {(duplicateCode || invalidDateRange) && (
        <div className="mt-4 space-y-2">
          {duplicateCode && (
            <p className="rounded-lg border border-rose-300/20 bg-rose-300/[0.06] px-3 py-2 text-xs font-bold text-rose-200">
              This coupon code already exists.
            </p>
          )}
          {invalidDateRange && (
            <p className="rounded-lg border border-rose-300/20 bg-rose-300/[0.06] px-3 py-2 text-xs font-bold text-rose-200">
              Valid To cannot be before Valid From.
            </p>
          )}
        </div>
      )}
    </ModalShell>
  );
}

function PaymentMethodModal({
  draft,
  editing,
  saving,
  onDraftChange,
  onClose,
  onSave,
}: {
  draft: PaymentMethodDraft;
  editing: boolean;
  saving: boolean;
  onDraftChange: (
    draft: PaymentMethodDraft | ((current: PaymentMethodDraft) => PaymentMethodDraft)
  ) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const saveDisabled = !draft.name.trim();

  return (
    <ModalShell
      eyebrow="Payment Methods"
      title={editing ? 'Edit Payment Method' : 'Add Payment Method'}
      onClose={onClose}
      maxWidth="max-w-2xl"
      footer={
        <ModalActions
          note="Saved to Supabase and shown in the public checkout when active."
          onClose={onClose}
          onSave={onSave}
          saveLabel={saving ? 'Saving...' : editing ? 'Save changes' : 'Add payment method'}
          disabled={saveDisabled || saving}
        />
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Name"
          value={draft.name}
          placeholder="e.g. Pay on Arrival"
          onChange={(name) => onDraftChange((current) => ({ ...current, name }))}
        />
        <label className="block">
          <FieldLabel>Type</FieldLabel>
          <select
            value={draft.type}
            onChange={(event) =>
              onDraftChange((current) => ({
                ...current,
                type: event.target.value as PaymentMethodType,
              }))
            }
            className="mt-2 h-10 w-full rounded-lg border border-white/[0.1] bg-[#090f18] px-3 text-sm font-bold text-zinc-100 outline-none focus:border-cyan-300/35"
          >
            <option value="Pay on Arrival">Pay on Arrival</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Payment Link">Payment Link</option>
            <option value="Card">Card</option>
            <option value="Custom">Custom</option>
          </select>
        </label>

        <label className="block sm:col-span-2">
          <FieldLabel>Description</FieldLabel>
          <textarea
            value={draft.description}
            onChange={(event) =>
              onDraftChange((current) => ({ ...current, description: event.target.value }))
            }
            rows={3}
            placeholder="Short customer-facing payment description"
            className="mt-2 w-full resize-none rounded-lg border border-white/[0.1] bg-black/25 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-cyan-300/35"
          />
        </label>

        <label className="block">
          <FieldLabel>Deposit required</FieldLabel>
          <select
            value={draft.depositRequired ? 'yes' : 'no'}
            onChange={(event) => {
              const depositRequired = event.target.value === 'yes';
              onDraftChange((current) => ({
                ...current,
                depositRequired,
                depositAmount: depositRequired ? current.depositAmount : '',
              }));
            }}
            className="mt-2 h-10 w-full rounded-lg border border-white/[0.1] bg-[#090f18] px-3 text-sm font-bold text-zinc-100 outline-none focus:border-cyan-300/35"
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </label>

        <TextField
          label="Deposit amount optional"
          value={draft.depositAmount}
          placeholder={draft.depositRequired ? '0.00' : 'No deposit'}
          type="number"
          disabled={!draft.depositRequired}
          onChange={(depositAmount) =>
            onDraftChange((current) => ({ ...current, depositAmount }))
          }
        />

        <label className="block">
          <FieldLabel>Status</FieldLabel>
          <select
            value={draft.status}
            onChange={(event) =>
              onDraftChange((current) => ({
                ...current,
                status: event.target.value as SeasonStatus,
              }))
            }
            className="mt-2 h-10 w-full rounded-lg border border-white/[0.1] bg-[#090f18] px-3 text-sm font-bold text-zinc-100 outline-none focus:border-cyan-300/35"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </label>
      </div>
    </ModalShell>
  );
}

function BookingSettingCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 border-b border-slate-200 pb-3">
        <h4 className="text-base font-black text-slate-950">{title}</h4>
        <p className="mt-1 text-sm leading-5 text-slate-600">{description}</p>
      </div>
      {children}
    </section>
  );
}

function BookingSettingToggle({
  label,
  description,
  active,
  onToggle,
}: {
  label: string;
  description: string;
  active: boolean;
  onToggle: (active: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={() => onToggle(!active)}
      className="flex w-full items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition hover:border-slate-300 hover:bg-slate-100"
    >
      <span>
        <span className="block text-sm font-bold text-slate-900">{label}</span>
        <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
      </span>
      <span
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${
          active ? 'bg-emerald-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
            active ? 'left-6' : 'left-1'
          }`}
        />
      </span>
    </button>
  );
}

function EmailSettingsCard({
  icon: Icon,
  title,
  description,
  active,
  toggleLabel,
  onToggle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  active: boolean;
  toggleLabel: string;
  onToggle: (active: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h4 className="text-base font-black text-slate-950">{title}</h4>
            <p className="mt-1 text-sm leading-5 text-slate-600">{description}</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          onClick={() => onToggle(!active)}
          className={`flex min-h-10 flex-shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-black transition ${
            active
              ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
              : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50'
          }`}
        >
          <span
            className={`relative h-5 w-9 rounded-full transition ${
              active ? 'bg-white/30' : 'bg-slate-200'
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                active ? 'left-[18px]' : 'left-0.5'
              }`}
            />
          </span>
          {toggleLabel}
        </button>
      </div>
      <div className="pt-3">{children}</div>
    </section>
  );
}

function ManualEmailButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-cyan-700 bg-cyan-700 px-3.5 text-xs font-black text-white shadow-sm transition hover:border-cyan-800 hover:bg-cyan-800"
      >
        <Mail className="h-3.5 w-3.5" />
        {label}
      </button>
      <span className="text-[11px] font-semibold text-slate-500">Manual preview only · SMTP sends from reservation events</span>
    </div>
  );
}

function EmailTemplateField({
  fieldKey,
  label,
  value,
  onChange,
  onElement,
  onFocus,
  multiline = false,
  disabled = false,
}: {
  fieldKey: EmailTemplateFieldKey;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onElement: (element: HTMLInputElement | HTMLTextAreaElement) => void;
  onFocus: (
    field: EmailTemplateFieldKey,
    element: HTMLInputElement | HTMLTextAreaElement,
  ) => void;
  multiline?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className={`block ${multiline ? 'sm:col-span-2' : ''}`}>
      <FieldLabel>{label}</FieldLabel>
      {multiline ? (
        <textarea
          ref={(element) => {
            if (element) onElement(element);
          }}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={(event) => onFocus(fieldKey, event.currentTarget)}
          disabled={disabled}
          rows={4}
          className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-5 text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        />
      ) : (
        <input
          ref={(element) => {
            if (element) onElement(element);
          }}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={(event) => onFocus(fieldKey, event.currentTarget)}
          disabled={disabled}
          className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        />
      )}
    </label>
  );
}

function ModalShell({
  eyebrow,
  title,
  children,
  footer,
  onClose,
  maxWidth = 'max-w-3xl',
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[calc(100%-40px)] w-full ${maxWidth} flex-col overflow-hidden rounded-2xl border border-white/[0.11] bg-[#0a111b] shadow-2xl shadow-black/60`}
      >
        <header className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-700">{eyebrow}</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-zinc-400 transition hover:bg-white/[0.05] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        <footer className="border-t border-white/[0.08] bg-black/15 px-5 py-4">{footer}</footer>
      </div>
    </div>
  );
}

function ModalActions({
  note,
  onClose,
  onSave,
  saveLabel,
  disabled,
}: {
  note: string;
  onClose: () => void;
  onSave: () => void;
  saveLabel: string;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-slate-600">{note}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={disabled}
          className="h-11 rounded-lg border border-cyan-700 bg-cyan-700 px-5 text-sm font-black text-white transition hover:border-cyan-800 hover:bg-cyan-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

function CheckboxSection<T extends { id: string; name: string }>({
  title,
  description,
  items,
  selectedIds,
  emptyLabel,
  onToggle,
}: {
  title: string;
  description: string;
  items: T[];
  selectedIds: string[];
  emptyLabel: string;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="mt-5 border-t border-white/[0.07] pt-4">
      <FieldLabel>{title}</FieldLabel>
      <p className="mt-1 text-[11px] text-zinc-600">{description}</p>
      {items.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {items.map((item) => {
            const selected = selectedIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggle(item.id)}
                className={`flex min-h-9 items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-bold transition ${
                  selected
                    ? 'border-cyan-300 bg-cyan-50 text-cyan-900'
                    : 'border-white/[0.08] bg-white/[0.025] text-zinc-500 hover:text-zinc-200'
                }`}
              >
                <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${selected ? 'border-cyan-500 bg-cyan-100 text-cyan-800' : 'border-slate-400'}`}>
                  {selected && <Check className="h-3 w-3" />}
                </span>
                {item.name}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-white/[0.08] px-3 py-4 text-xs text-zinc-600">{emptyLabel}</p>
      )}
    </div>
  );
}

function ManagedOptionSection<T extends { id: string; name: string }>({
  title,
  description,
  items,
  selectedIds,
  emptyLabel,
  customPlaceholder,
  onToggle,
  onAddCustom,
  onRemoveCustom,
}: {
  title: string;
  description: string;
  items: T[];
  selectedIds: string[];
  emptyLabel: string;
  customPlaceholder: string;
  onToggle: (id: string) => void;
  onAddCustom: (value: string) => void;
  onRemoveCustom: (value: string) => void;
}) {
  const [customValue, setCustomValue] = useState('');
  const defaultIds = items.map((item) => item.id);
  const customSelectedValues = selectedIds.filter((item) => !defaultIds.includes(item));

  const addCustomValue = () => {
    const nextValue = customValue.trim();
    if (!nextValue) return;
    onAddCustom(nextValue);
    setCustomValue('');
  };

  return (
    <div className="mt-5 border-t border-white/[0.07] pt-4">
      <FieldLabel>{title}</FieldLabel>
      <p className="mt-1 text-[11px] text-zinc-600">{description}</p>
      {items.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {items.map((item) => {
            const selected = selectedIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggle(item.id)}
                className={`flex min-h-9 items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-bold transition ${
                  selected
                    ? 'border-cyan-300 bg-cyan-50 text-cyan-900'
                    : 'border-white/[0.08] bg-white/[0.025] text-zinc-500 hover:text-zinc-200'
                }`}
              >
                <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${selected ? 'border-cyan-500 bg-cyan-100 text-cyan-800' : 'border-slate-400'}`}>
                  {selected && <Check className="h-3 w-3" />}
                </span>
                {item.name}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-white/[0.08] px-3 py-4 text-xs text-zinc-600">{emptyLabel}</p>
      )}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={customValue}
          onChange={(event) => setCustomValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addCustomValue();
            }
          }}
          placeholder={customPlaceholder}
          className="h-10 flex-1 rounded-lg border border-white/[0.1] bg-black/25 px-3 text-sm font-bold text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-cyan-300/35"
        />
        <button
          type="button"
          onClick={addCustomValue}
          className="h-10 rounded-lg border border-cyan-700 bg-cyan-700 px-4 text-xs font-black text-white transition hover:bg-cyan-800"
        >
          Add custom
        </button>
      </div>
      {customSelectedValues.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {customSelectedValues.map((value) => (
            <span key={value} className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-900">
              {value}
              <button
                type="button"
                onClick={() => onRemoveCustom(value)}
                className="rounded-full text-emerald-700 transition hover:text-rose-600"
                aria-label={`Remove ${value}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function MarketingMessageField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const isPreset = marketingMessageOptions.includes(value);
  const selectValue = isPreset ? value : value ? 'custom' : '';

  return (
    <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
      <FieldLabel>Marketing Message</FieldLabel>
      <p className="mt-1 text-[11px] text-zinc-600">Optional message shown near the price area. Pricing remains unchanged.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[220px_minmax(0,1fr)]">
        <select
          value={selectValue}
          onChange={(event) => {
            const nextValue = event.target.value;
            onChange(nextValue === 'custom' ? value : nextValue);
          }}
          className="h-10 rounded-lg border border-white/[0.1] bg-[#090f18] px-3 text-sm font-bold text-zinc-100 outline-none focus:border-cyan-300/35"
        >
          <option value="">none</option>
          <option value="🔥 SAVE 30%">🔥 SAVE 30%</option>
          <option value="SPECIAL OFFER">SPECIAL OFFER</option>
          <option value="LIMITED OFFER">LIMITED OFFER</option>
          <option value="custom">custom text</option>
        </select>
        {selectValue === 'custom' && (
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Enter custom marketing message"
            className="h-10 rounded-lg border border-white/[0.1] bg-black/25 px-3 text-sm font-bold text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-cyan-300/35"
          />
        )}
      </div>
    </div>
  );
}

function ManagedBenefitSection<T extends { id: string; name: string }>({
  title,
  description,
  items,
  selectedBenefits,
  emptyLabel,
  customPlaceholder,
  onToggle,
  onAddCustom,
  onRemoveCustom,
  onTooltipChange,
}: {
  title: string;
  description: string;
  items: T[];
  selectedBenefits: IncludedBenefit[];
  emptyLabel: string;
  customPlaceholder: string;
  onToggle: (id: string) => void;
  onAddCustom: (value: string) => void;
  onRemoveCustom: (value: string) => void;
  onTooltipChange: (label: string, tooltip: string) => void;
}) {
  const [customValue, setCustomValue] = useState('');
  const defaultIds = items.map((item) => item.id);
  const selectedLabels = selectedBenefits.map((benefit) => benefit.label);
  const customSelectedValues = selectedBenefits.filter((benefit) => !defaultIds.includes(benefit.label));

  const addCustomValue = () => {
    const nextValue = customValue.trim();
    if (!nextValue) return;
    onAddCustom(nextValue);
    setCustomValue('');
  };

  return (
    <div className="mt-5 border-t border-white/[0.07] pt-4">
      <FieldLabel>{title}</FieldLabel>
      <p className="mt-1 text-[11px] text-zinc-600">{description}</p>
      {items.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {items.map((item) => {
            const selected = selectedLabels.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggle(item.id)}
                className={`flex min-h-9 items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-bold transition ${
                  selected
                    ? 'border-cyan-300 bg-cyan-50 text-cyan-900'
                    : 'border-white/[0.08] bg-white/[0.025] text-zinc-500 hover:text-zinc-200'
                }`}
              >
                <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${selected ? 'border-cyan-500 bg-cyan-100 text-cyan-800' : 'border-slate-400'}`}>
                  {selected && <Check className="h-3 w-3" />}
                </span>
                {item.name}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-white/[0.08] px-3 py-4 text-xs text-zinc-600">{emptyLabel}</p>
      )}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={customValue}
          onChange={(event) => setCustomValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addCustomValue();
            }
          }}
          placeholder={customPlaceholder}
          className="h-10 flex-1 rounded-lg border border-white/[0.1] bg-black/25 px-3 text-sm font-bold text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-cyan-300/35"
        />
        <button
          type="button"
          onClick={addCustomValue}
          className="h-10 rounded-lg border border-cyan-700 bg-cyan-700 px-4 text-xs font-black text-white transition hover:bg-cyan-800"
        >
          Add custom
        </button>
      </div>
      {selectedBenefits.length > 0 && (
        <div className="mt-3 grid gap-2">
          {selectedBenefits.map((benefit, index) => {
            const isCustom = customSelectedValues.some((item) => item.label === benefit.label);
            return (
              <div key={`${isCustom ? 'custom' : 'default'}-${benefit.label}-${index}`} className="grid gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-center">
                <span className="text-xs font-black text-zinc-200">{benefit.label}</span>
                <input
                  value={benefit.tooltip}
                  onChange={(event) => onTooltipChange(benefit.label, event.target.value)}
                  placeholder="Optional tooltip shown beside this benefit"
                  className="h-9 rounded-lg border border-white/[0.1] bg-black/25 px-3 text-xs font-bold text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-cyan-300/35"
                />
                {isCustom && (
                  <button
                    type="button"
                    onClick={() => onRemoveCustom(benefit.label)}
                    className="h-8 rounded-lg border border-rose-400/30 px-3 text-xs font-black text-rose-200 transition hover:bg-rose-500/10"
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PanelHeading({
  title,
  description,
  buttonLabel,
  onAdd,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  onAdd: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <div>
        <h3 className="text-lg font-black text-slate-950">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex h-11 items-center gap-2 rounded-lg border border-cyan-700 bg-cyan-700 px-5 text-sm font-black text-white shadow-sm transition hover:border-cyan-800 hover:bg-cyan-800"
      >
        <Plus className="h-4 w-4" />
        {buttonLabel}
      </button>
    </div>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
  className = '',
  type = 'text',
  disabled = false,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
  type?: 'text' | 'number' | 'date';
  disabled?: boolean;
}) {
  return (
    <label className={`block ${className}`}>
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        min={type === 'number' ? '0' : undefined}
        step={type === 'number' ? '0.01' : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="mt-2 h-10 w-full rounded-lg border border-white/[0.1] bg-black/25 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-cyan-300/35 disabled:cursor-not-allowed disabled:bg-zinc-900 disabled:text-zinc-600"
      />
    </label>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-black uppercase tracking-[0.07em] text-slate-600">{children}</span>;
}

function TierPrice({ days, price }: { days: string; price: string }) {
  return (
    <span className="font-black text-zinc-100">
      <span className="text-xs text-cyan-700">{days}</span> €{Number(price).toFixed(2)}
      <span className="ml-0.5 text-[11px] font-medium text-slate-500">/day</span>
    </span>
  );
}

function PillList({ values, emptyLabel, tone = 'zinc' }: { values: string[]; emptyLabel: string; tone?: 'zinc' | 'cyan' }) {
  return (
    <div className="flex flex-wrap gap-1 pr-3">
      {values.length > 0 ? (
        <>
          {values.slice(0, 3).map((value) => (
            <span
              key={value}
              className={`rounded-md border px-1.5 py-0.5 text-[10px] ${
                tone === 'cyan'
                  ? 'border-cyan-200 bg-cyan-50 text-cyan-800'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              {value}
            </span>
          ))}
          {values.length > 3 && <span className="px-1 py-0.5 text-[10px] font-bold text-zinc-600">+{values.length - 3}</span>}
        </>
      ) : (
        <span className="text-[11px] text-zinc-600">{emptyLabel}</span>
      )}
    </div>
  );
}

function ActionButtons({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex justify-end gap-1">
      <button
        type="button"
        onClick={onEdit}
        title="Edit"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400 transition hover:border-cyan-300/25 hover:text-cyan-200"
      >
        <Edit3 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        title="Delete local record"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-500 transition hover:border-rose-300/25 hover:text-rose-300"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function EmptyAdminPanel({ tab, icon: Icon }: { tab: AdminTab; icon: LucideIcon }) {
  return (
    <section className="flex min-h-[430px] items-center justify-center rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.015]">
      <div className="max-w-md px-6 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035] text-zinc-500">
          <Icon className="h-6 w-6" strokeWidth={1.5} />
        </span>
        <h3 className="mt-4 text-base font-black text-zinc-200">{tab.label}</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-500">{tab.description}</p>
        <p className="mt-3 text-xs text-zinc-600">Configuration controls will be added here in a future implementation.</p>
      </div>
    </section>
  );
}

function TableEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-64 items-center justify-center px-6 text-center">
      <div>
        <Icon className="mx-auto h-8 w-8 text-zinc-700" strokeWidth={1.5} />
        <p className="mt-3 text-sm font-bold text-zinc-400">{title}</p>
        <p className="mt-1 text-xs text-zinc-600">{description}</p>
      </div>
    </div>
  );
}
