export type BookingMode = 'Open' | 'On Request' | 'Hidden';
export type ActiveStatus = 'Active' | 'Inactive';
export type LocationType = 'airport' | 'town' | 'hotel' | 'custom';
export type ExtraPricingMode = 'Per Day' | 'Per Booking' | 'Free';
export type PaymentMethodType = 'Pay on Arrival' | 'Bank Transfer' | 'Payment Link' | 'Card' | 'Custom';
export type CheckoutFieldId =
  | 'full_name'
  | 'email'
  | 'country'
  | 'phone'
  | 'date_of_birth'
  | 'accommodation_name'
  | 'flight_number'
  | 'notes'
  | string;
export type CheckoutFieldType = 'Text' | 'Textarea' | 'Number' | 'Email' | 'Phone' | 'Select';
export type BookingEngineEmailTemplateId =
  | 'admin_new_confirmed_reservation'
  | 'customer_confirmed_reservation'
  | 'admin_new_onrequest_reservation'
  | 'customer_onrequest_received'
  | 'customer_confirmed_after_review'
  | 'customer_payment_request'
  | 'customer_reminder'
  | 'customer_cancellation'
  | 'customEmail';

export type BookingEngineEmailTemplate = {
  id: BookingEngineEmailTemplateId;
  label: string;
  active: boolean;
  subject: string;
  message: string;
};

export type BookingEngineEmailSettings = {
  adminEmail: string;
  templates: Record<BookingEngineEmailTemplateId, BookingEngineEmailTemplate>;
};

export type BookingEngineSiteSettings = {
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
  defaultLanguage: string;
  whatsappNumber: string;
  termsUrl: string;
  privacyPolicyUrl: string;
  logoImage: string;
  status: ActiveStatus;
  internalNotes: string;
};

export type BookingEngineGroup = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  notes: string;
};

export type BookingEngineLocation = {
  id: string;
  name: string;
  type: LocationType;
  active: boolean;
  fee: string;
};

export type BookingEngineFeature = {
  id: string;
  name: string;
};

export type BookingEngineIncludedBenefit = {
  label: string;
  tooltip: string;
};

export type BookingEngineCarConfig = {
  id: string;
  name: string;
  groupCode: string;
  description: string;
  imageUrl: string;
  featureIds: string[];
  includedBenefits: BookingEngineIncludedBenefit[];
  promoBadges: string[];
  marketingMessage: string;
  displayPriority: string;
  status: BookingMode;
  locationIds: string[];
};

export type BookingEngineExtra = {
  id: string;
  name: string;
  description: string;
  pricingMode: ExtraPricingMode;
  price: string;
  imageUrl: string;
  status: ActiveStatus;
  maximumQuantity: string;
};

export type BookingEnginePricingTier = {
  id: string;
  fromDays: string;
  toDays: string;
  pricePerDay: string;
};

export type BookingEngineSeasonPrice = {
  id: string;
  groupCode: string;
  seasonName: string;
  fromDate: string;
  toDate: string;
  tiers: BookingEnginePricingTier[];
  websiteMode: BookingMode;
  status: ActiveStatus;
  notes: string;
};

export type BookingEngineCoupon = {
  id: string;
  code: string;
  discountType: 'Percentage' | 'Fixed Amount';
  discountValue: string;
  validFrom: string;
  validTo: string;
  minimumDays: string;
  allowedGroupCodes: string[];
  usageLimit: string;
  status: ActiveStatus;
};

export type BookingEnginePaymentMethod = {
  id: string;
  name: string;
  type: PaymentMethodType;
  description: string;
  depositRequired: boolean;
  depositAmount: string;
  status: ActiveStatus;
};

export type BookingEngineCheckoutField = {
  id: CheckoutFieldId;
  name: string;
  fieldType: CheckoutFieldType;
  enabled: boolean;
  required: boolean;
  label: string;
  options?: string[];
  builtIn?: boolean;
};

export const BOOKING_ENGINE_CORE_CHECKOUT_FIELDS: BookingEngineCheckoutField[] = [
  { id: 'full_name', name: 'Full Name', fieldType: 'Text', enabled: true, required: true, label: 'Full Name', builtIn: true },
  { id: 'email', name: 'Email', fieldType: 'Email', enabled: true, required: true, label: 'Email', builtIn: true },
  { id: 'country', name: 'Country', fieldType: 'Select', enabled: true, required: true, label: 'Country', options: [], builtIn: true },
  { id: 'phone', name: 'WhatsApp Phone', fieldType: 'Phone', enabled: true, required: true, label: 'WhatsApp Phone', builtIn: true },
  { id: 'date_of_birth', name: 'Date of Birth', fieldType: 'Text', enabled: true, required: true, label: 'Date of Birth', builtIn: true },
  { id: 'flight_number', name: 'Flight Number', fieldType: 'Text', enabled: true, required: false, label: 'Flight Number', builtIn: true },
  { id: 'accommodation_name', name: 'Hotel / Villa / Apartment', fieldType: 'Text', enabled: true, required: false, label: 'Hotel / Villa / Apartment', builtIn: true },
  { id: 'notes', name: 'Notes', fieldType: 'Textarea', enabled: true, required: false, label: 'Notes', builtIn: true },
];

const LEGACY_CHECKOUT_FIELD_KEYS: Record<string, CheckoutFieldId> = {
  fullName: 'full_name',
  whatsapp: 'phone',
  dateOfBirth: 'date_of_birth',
  hotelRoom: 'accommodation_name',
  flightNumber: 'flight_number',
};

export const normalizeBookingEngineCheckoutFields = (
  fields: BookingEngineCheckoutField[] = [],
  includeMissingCoreFields = true,
): BookingEngineCheckoutField[] => {
  const savedById = new Map<string, BookingEngineCheckoutField>();
  fields.filter((field) => field.id !== 'accommodation_type').forEach((field) => {
    const normalizedId = LEGACY_CHECKOUT_FIELD_KEYS[field.id] || field.id;
    const existing = savedById.get(normalizedId);
    const usesStableKey = field.id === normalizedId;
    if (!existing || usesStableKey) {
      savedById.set(normalizedId, { ...field, id: normalizedId });
    }
  });
  const coreFields = BOOKING_ENGINE_CORE_CHECKOUT_FIELDS.flatMap((coreField) => {
    const savedField = savedById.get(coreField.id);
    if (!savedField && !includeMissingCoreFields) return [];
    return [{
      ...coreField,
      ...(savedField || {}),
      id: coreField.id,
      name: coreField.name,
      fieldType: coreField.fieldType,
      options: coreField.options,
      builtIn: true,
    }];
  });
  const coreIds = new Set(coreFields.map((field) => field.id));
  const customFields = Array.from(savedById.values()).filter((field) => !coreIds.has(field.id));

  return [...coreFields, ...customFields];
};

export type BookingEngineLocalConfig = {
  siteSettings: BookingEngineSiteSettings;
  groups: BookingEngineGroup[];
  cars: BookingEngineCarConfig[];
  locations: BookingEngineLocation[];
  features: BookingEngineFeature[];
  extras: BookingEngineExtra[];
  coupons: BookingEngineCoupon[];
  paymentMethods: BookingEnginePaymentMethod[];
  checkoutFields: BookingEngineCheckoutField[];
  pricingSeasons: BookingEngineSeasonPrice[];
  emailSettings: BookingEngineEmailSettings;
};

export const bookingEngineLocalConfig: BookingEngineLocalConfig = {
  siteSettings: {
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
    defaultLanguage: 'English',
    whatsappNumber: '',
    termsUrl: '',
    privacyPolicyUrl: '',
    logoImage: '',
    status: 'Active',
    internalNotes: '',
  },
  groups: [
    { id: 'group-a', code: 'A', name: 'Small Economy', active: true, notes: '' },
    { id: 'group-b', code: 'B', name: 'Economy', active: true, notes: '' },
    { id: 'group-c', code: 'C', name: 'Compact', active: true, notes: '' },
    { id: 'group-d1', code: 'D1', name: 'Compact SUV', active: true, notes: '' },
    { id: 'group-cabrio', code: 'Cabrio', name: 'Cabrio', active: true, notes: '' },
  ],
  locations: [
    { id: 'airport', name: 'Rhodes Airport', type: 'airport', active: true, fee: '0' },
    { id: 'rhodes-town', name: 'Rhodes Town', type: 'town', active: true, fee: '0' },
    { id: 'faliraki', name: 'Faliraki', type: 'town', active: true, fee: '12' },
    { id: 'lindos', name: 'Lindos', type: 'town', active: true, fee: '30' },
    { id: 'ixia', name: 'Ixia', type: 'town', active: true, fee: '8' },
    { id: 'kolymbia', name: 'Kolymbia', type: 'town', active: true, fee: '20' },
    { id: 'afandou', name: 'Afandou', type: 'town', active: true, fee: '18' },
    { id: 'pefkos', name: 'Pefkos', type: 'town', active: true, fee: '32' },
  ],
  features: [
    { id: 'full-insurance', name: 'Full Insurance' },
    { id: 'zero-excess', name: 'Zero Excess' },
    { id: 'no-deposit', name: 'No Deposit' },
    { id: 'free-second-driver', name: 'Free Second Driver' },
    { id: 'road-assistance', name: 'Road Assistance' },
    { id: 'air-conditioning', name: 'Air conditioning' },
    { id: 'automatic', name: 'Automatic' },
    { id: 'manual', name: 'Manual' },
    { id: 'five-seats', name: '5 seats' },
    { id: 'four-seats', name: '4 seats' },
    { id: 'two-bags', name: '2 bags' },
    { id: 'three-bags', name: '3 bags' },
  ],
  extras: [
    {
      id: 'extra-baby-seat',
      name: 'Baby Seat',
      description: 'Safety seat for young children.',
      pricingMode: 'Per Day',
      price: '5',
      imageUrl: '',
      status: 'Active',
      maximumQuantity: '2',
    },
    {
      id: 'extra-booster-seat',
      name: 'Booster Seat',
      description: 'For older children.',
      pricingMode: 'Per Day',
      price: '4',
      imageUrl: '',
      status: 'Active',
      maximumQuantity: '2',
    },
    {
      id: 'extra-infant-seat',
      name: 'Infant Seat',
      description: 'Rear-facing infant seat.',
      pricingMode: 'Per Booking',
      price: '18',
      imageUrl: '',
      status: 'Active',
      maximumQuantity: '1',
    },
  ],
  cars: [
    {
      id: 'peugeot-108',
      name: 'Peugeot 108 or Similar',
      groupCode: 'A',
      description: 'Compact, efficient and easy to explore Rhodes with.',
      imageUrl: '',
      featureIds: ['full-insurance', 'zero-excess', 'no-deposit', 'free-second-driver', 'road-assistance', 'manual', 'air-conditioning', 'four-seats', 'two-bags'],
      includedBenefits: ['Full Insurance', 'Zero Excess', 'No Deposit', 'Free Second Driver', '24/7 Road Assistance'].map((label) => ({ label, tooltip: '' })),
      promoBadges: ['Economy'],
      marketingMessage: '',
      displayPriority: '0',
      status: 'Open',
      locationIds: ['airport', 'rhodes-town', 'faliraki', 'ixia'],
    },
    {
      id: 'fiat-panda',
      name: 'Fiat Panda or Similar',
      groupCode: 'A',
      description: 'Comfortable city car with practical luggage space.',
      imageUrl: '',
      featureIds: ['full-insurance', 'zero-excess', 'no-deposit', 'free-second-driver', 'road-assistance', 'manual', 'air-conditioning', 'four-seats', 'two-bags'],
      includedBenefits: ['Full Insurance', 'Zero Excess', 'No Deposit', 'Free Second Driver', '24/7 Road Assistance'].map((label) => ({ label, tooltip: '' })),
      promoBadges: ['Best Value'],
      marketingMessage: '',
      displayPriority: '0',
      status: 'Open',
      locationIds: ['airport', 'rhodes-town', 'faliraki', 'kolymbia', 'afandou'],
    },
    {
      id: 'fiat-500-cabrio',
      name: 'Fiat 500 Cabrio or Similar',
      groupCode: 'Cabrio',
      description: 'Open-top island driving for an unforgettable holiday.',
      imageUrl: '',
      featureIds: ['full-insurance', 'zero-excess', 'no-deposit', 'free-second-driver', 'road-assistance', 'air-conditioning'],
      includedBenefits: ['Full Insurance', 'Zero Excess', '24/7 Road Assistance'].map((label) => ({ label, tooltip: '' })),
      promoBadges: ['Most Popular'],
      marketingMessage: '',
      displayPriority: '0',
      status: 'On Request',
      locationIds: ['airport', 'rhodes-town', 'lindos', 'pefkos'],
    },
  ],
  pricingSeasons: [
    {
      id: 'season-a-june',
      groupCode: 'A',
      seasonName: 'Early Summer',
      fromDate: '2026-06-01',
      toDate: '2026-06-30',
      tiers: [
        { id: 'season-a-tier-1', fromDays: '1', toDays: '1', pricePerDay: '50' },
        { id: 'season-a-tier-2', fromDays: '2', toDays: '3', pricePerDay: '40' },
        { id: 'season-a-tier-3', fromDays: '4', toDays: '7', pricePerDay: '35' },
      ],
      websiteMode: 'Open',
      status: 'Active',
      notes: 'Local UI sample.',
    },
    {
      id: 'season-cabrio-june',
      groupCode: 'Cabrio',
      seasonName: 'Cabrio Summer',
      fromDate: '2026-06-01',
      toDate: '2026-06-30',
      tiers: [
        { id: 'season-cabrio-tier-1', fromDays: '1', toDays: '1', pricePerDay: '85' },
        { id: 'season-cabrio-tier-2', fromDays: '2', toDays: '3', pricePerDay: '78' },
        { id: 'season-cabrio-tier-3', fromDays: '4', toDays: '7', pricePerDay: '75' },
      ],
      websiteMode: 'On Request',
      status: 'Active',
      notes: '',
    },
  ],
  coupons: [
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
    {
      id: 'coupon-vip50',
      code: 'VIP50',
      discountType: 'Fixed Amount',
      discountValue: '50',
      validFrom: '2026-06-01',
      validTo: '2026-09-30',
      minimumDays: '',
      allowedGroupCodes: [],
      usageLimit: '',
      status: 'Active',
    },
  ],
  paymentMethods: [
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
      id: 'payment-bank',
      name: 'Bank Transfer',
      type: 'Bank Transfer',
      description: 'Customer pays by bank transfer.',
      depositRequired: false,
      depositAmount: '',
      status: 'Active',
    },
    {
      id: 'payment-card-delivery',
      name: 'Card on Delivery',
      type: 'Card',
      description: 'Card payment when the vehicle is delivered.',
      depositRequired: false,
      depositAmount: '',
      status: 'Active',
    },
  ],
  checkoutFields: BOOKING_ENGINE_CORE_CHECKOUT_FIELDS,
  emailSettings: {
    adminEmail: '',
    templates: {
      admin_new_confirmed_reservation: {
        id: 'admin_new_confirmed_reservation',
        label: 'Admin New Confirmed Reservation Notification',
        active: true,
        subject: 'New confirmed website reservation {{reservation_id}}',
        message:
          'New confirmed reservation received.\n\nCustomer: {{customer_name}}\nCar: {{car_name}} (Group {{group}})\nPickup: {{pickup_date}} {{pickup_time}} from {{pickup_location}}\nReturn: {{return_date}} {{return_time}} to {{return_location}}\nTotal: {{total_price}}\nPayment: {{payment_method}}',
      },
      customer_confirmed_reservation: {
        id: 'customer_confirmed_reservation',
        label: 'Customer Booking Confirmed',
        active: true,
        subject: 'Your booking is confirmed',
        message:
          'Hello {{customer_name}},\n\nYour booking {{reservation_id}} for {{car_name}} is confirmed.\n\nPickup: {{pickup_date}} at {{pickup_time}}, {{pickup_location}}\nReturn: {{return_date}} at {{return_time}}, {{return_location}}\nTotal: {{total_price}}\nPayment method: {{payment_method}}',
      },
      admin_new_onrequest_reservation: {
        id: 'admin_new_onrequest_reservation',
        label: 'Admin New On Request Reservation Notification',
        active: true,
        subject: 'New on-request website reservation {{reservation_id}}',
        message:
          'New on-request reservation received.\n\nCustomer: {{customer_name}}\nCar: {{car_name}} (Group {{group}})\nPickup: {{pickup_date}} {{pickup_time}} from {{pickup_location}}\nReturn: {{return_date}} {{return_time}} to {{return_location}}\nTotal: {{total_price}}\nPayment: {{payment_method}}',
      },
      customer_onrequest_received: {
        id: 'customer_onrequest_received',
        label: 'Customer On Request Received',
        active: true,
        subject: 'Your reservation request was received',
        message:
          'Hello {{customer_name}},\n\nYour on-request reservation for {{car_name}} (Group {{group}}) has been received.\n\nPickup: {{pickup_date}} at {{pickup_time}}, {{pickup_location}}\nReturn: {{return_date}} at {{return_time}}, {{return_location}}\n\nWe will check availability and contact you shortly.',
      },
      customer_confirmed_after_review: {
        id: 'customer_confirmed_after_review',
        label: 'Customer Confirmed After Review',
        active: true,
        subject: 'Your reservation request is confirmed',
        message:
          'Hello {{customer_name}},\n\nGood news - your request {{reservation_id}} is now confirmed.\n\nCar: {{car_name}} (Group {{group}})\nPickup: {{pickup_date}} at {{pickup_time}}, {{pickup_location}}\nReturn: {{return_date}} at {{return_time}}, {{return_location}}\nTotal: {{total_price}}\nPayment method: {{payment_method}}',
      },
      customer_payment_request: {
        id: 'customer_payment_request',
        label: 'Payment Reminder',
        active: true,
        subject: 'Payment request for reservation {{reservation_id}}',
        message:
          'Hello {{customer_name}},\n\nPlease complete payment for reservation {{reservation_id}}.\n\nCar: {{car_name}} (Group {{group}})\nPickup: {{pickup_date}} at {{pickup_time}}, {{pickup_location}}\nReturn: {{return_date}} at {{return_time}}, {{return_location}}\nFinal total: {{total_price}}\nPayment method: {{payment_method}}\n\nPayment link: {{payment_link}}\n\nThank you',
      },
      customer_reminder: {
        id: 'customer_reminder',
        label: 'Review Request',
        active: true,
        subject: 'How was your rental?',
        message:
          'Hello {{customer_name}},\n\nThank you for choosing us for reservation {{reservation_id}}.\n\nWe hope you enjoyed your rental with {{car_name}}. We would really appreciate your review and feedback:\nhttps://g.page/r/CYOr9zt3_-KVEBM/review',
      },
      customer_cancellation: {
        id: 'customer_cancellation',
        label: 'Cancellation',
        active: true,
        subject: 'Your reservation {{reservation_id}} was cancelled',
        message:
          'Hello {{customer_name}},\n\nYour reservation {{reservation_id}} has been cancelled.\n\nIf this was not expected, please contact us.',
      },
      customEmail: {
        id: 'customEmail',
        label: 'Custom Email',
        active: true,
        subject: '',
        message: '',
      },
    },
  },
};

const CONFIG_STORAGE_KEY = 'autoclub_booking_engine_config_v1';
export const BOOKING_ENGINE_CONFIG_CHANGED = 'autoclub-booking-engine-config-changed';

const isBrowser = () => typeof window !== 'undefined';

const normalizeEmailSettings = (
  settings?: Partial<BookingEngineEmailSettings>,
): BookingEngineEmailSettings => {
  const defaultTemplates = bookingEngineLocalConfig.emailSettings.templates;
  const savedTemplates =
    (settings?.templates || {}) as Partial<BookingEngineEmailSettings['templates']>;

  return {
    adminEmail: settings?.adminEmail || bookingEngineLocalConfig.emailSettings.adminEmail,
    templates: (Object.keys(defaultTemplates) as BookingEngineEmailTemplateId[]).reduce(
      (templates, templateId) => ({
        ...templates,
        [templateId]: {
          ...defaultTemplates[templateId],
          ...(savedTemplates[templateId] || {}),
          id: defaultTemplates[templateId].id,
          label: defaultTemplates[templateId].label,
        },
      }),
      {} as BookingEngineEmailSettings['templates'],
    ),
  };
};

const normalizeBookingEngineConfig = (config: Partial<BookingEngineLocalConfig>): BookingEngineLocalConfig => ({
  siteSettings: { ...bookingEngineLocalConfig.siteSettings, ...(config.siteSettings || {}) },
  groups: Array.isArray(config.groups) ? config.groups : bookingEngineLocalConfig.groups,
  cars: Array.isArray(config.cars)
    ? config.cars.map((car) => ({ ...car, imageUrl: car.imageUrl || '' }))
    : bookingEngineLocalConfig.cars,
  locations: Array.isArray(config.locations) ? config.locations : bookingEngineLocalConfig.locations,
  features: Array.isArray(config.features) ? config.features : bookingEngineLocalConfig.features,
  extras: Array.isArray(config.extras)
    ? config.extras.map((extra) => ({ ...extra, imageUrl: extra.imageUrl || '' }))
    : bookingEngineLocalConfig.extras,
  coupons: Array.isArray(config.coupons) ? config.coupons : bookingEngineLocalConfig.coupons,
  paymentMethods: Array.isArray(config.paymentMethods)
    ? config.paymentMethods
    : bookingEngineLocalConfig.paymentMethods,
  checkoutFields: normalizeBookingEngineCheckoutFields(config.checkoutFields),
  pricingSeasons: Array.isArray(config.pricingSeasons)
    ? config.pricingSeasons.map((season) => ({ ...season, status: season.status || 'Active' }))
    : bookingEngineLocalConfig.pricingSeasons,
  emailSettings: normalizeEmailSettings(config.emailSettings),
});

const emitConfigChange = () => {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(BOOKING_ENGINE_CONFIG_CHANGED));
};

export const loadBookingEngineConfig = () => {
  if (!isBrowser()) return bookingEngineLocalConfig;

  const stored = window.localStorage.getItem(CONFIG_STORAGE_KEY);
  if (!stored) return bookingEngineLocalConfig;

  try {
    return normalizeBookingEngineConfig(JSON.parse(stored));
  } catch {
    return bookingEngineLocalConfig;
  }
};

export const saveBookingEngineConfig = (config: BookingEngineLocalConfig) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(normalizeBookingEngineConfig(config)));
  emitConfigChange();
};

export const resetBookingEngineConfig = () => {
  if (!isBrowser()) return bookingEngineLocalConfig;
  window.localStorage.removeItem(CONFIG_STORAGE_KEY);
  emitConfigChange();
  return bookingEngineLocalConfig;
};

export const subscribeBookingEngineConfig = (listener: () => void) => {
  if (!isBrowser()) return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === CONFIG_STORAGE_KEY) listener();
  };

  window.addEventListener(BOOKING_ENGINE_CONFIG_CHANGED, listener);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(BOOKING_ENGINE_CONFIG_CHANGED, listener);
    window.removeEventListener('storage', handleStorage);
  };
};
