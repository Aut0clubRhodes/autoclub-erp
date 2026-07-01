'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Eye,
  Globe2,
  Mail,
  Pencil,
  Printer,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import {
  type BookingEngineReservationStatus,
  type BookingEngineWebsiteReservation,
} from '@/lib/bookingEngineReservationsStore';
import {
  loadBookingEngineConfig,
  type BookingEngineEmailTemplateId,
} from '@/lib/bookingEngineLocalConfig';
import {
  buildBookingEmailEventPayload,
  buildBookingEmailHtml,
  getBookingEmailIntro,
  normalizeSupabaseEmailTemplates,
  renderBookingEmailTemplate,
  renderBookingExtrasHtml,
  renderBookingExtrasSummary,
  sendBookingEngineEmailEvent,
  type BookingEngineEmailEventType,
  type BookingEngineEmailTemplateRow,
} from '@/lib/bookingEngineEmailEngine';
import { supabase } from '@/lib/supabaseClient';

type ReservationStatus = BookingEngineReservationStatus;
type EmailTemplateId = BookingEngineEmailTemplateId;
type EmailField = 'subject' | 'message';
type ReservationSortKey =
  | 'id'
  | 'customer'
  | 'phone'
  | 'car'
  | 'pickup'
  | 'return'
  | 'total'
  | 'payment'
  | 'status';
type ReservationSortState = {
  key: ReservationSortKey;
  direction: 'asc' | 'desc';
};

type WebsiteReservation = BookingEngineWebsiteReservation & {
  supabaseId: string;
  rawStatus: string;
  paymentLink?: string;
  sourceSiteId?: string;
  sourceSiteName?: string;
};

type BeReservationRow = {
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
  extras?: BookingEngineWebsiteReservation['extras'] | null;
  coupon?: { code?: string; discount?: number } | null;
  payment_method?: string | null;
  payment_link?: string | null;
  total_price?: string | number | null;
  driver_age_confirmed?: boolean | null;
  licence_front_url?: string | null;
  licence_back_url?: string | null;
  licence_number?: string | null;
  licence_issue_date?: string | null;
  licence_expiry_date?: string | null;
  licence_uploaded_at?: string | null;
  cancellation_requested?: boolean | null;
  status?: string | null;
  notes?: string | null;
  flight_number?: string | null;
  hotel_villa_apartment?: string | null;
  created_at?: string | null;
};

const statusStyles: Record<ReservationStatus, string> = {
  'New Request': 'border-sky-200 bg-sky-50 text-sky-800',
  'Under Review': 'border-amber-200 bg-amber-50 text-amber-800',
  Ready: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Cancelled: 'border-rose-200 bg-rose-50 text-rose-700',
};

const DRIVER_LICENCE_STORAGE_BUCKET = 'be-licences';

const emailVariables = [
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

const formatDate = (value: string) => {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(value);

const escapePrintHtml = (value: string | number | null | undefined) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const printReservationDetails = (reservation: WebsiteReservation) => {
  const extrasRows = reservation.extras.length
    ? reservation.extras
        .map(
          (extra) =>
            `<tr><td>${escapePrintHtml(extra.name)} x${escapePrintHtml(extra.quantity)}</td><td>${formatMoney(extra.total)}</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="2">No extras selected</td></tr>';
  const rows = [
    ['Reservation ID', reservation.id],
    ['Customer', reservation.customerName],
    ['Email', reservation.email],
    ['Phone', reservation.fullPhone || reservation.phone],
    ['Country', reservation.country || ''],
    ['Date of Birth', reservation.dateOfBirth || ''],
    ['Flight Number', reservation.flightNumber || ''],
    ['Hotel / Villa / Apartment', reservation.accommodationName || reservation.hotelVillaApartment || reservation.hotelRoom],
    ['Car / Group', `${reservation.carName} / ${reservation.groupCode}`],
    ['Pickup', `${formatDate(reservation.pickupDate)} ${reservation.pickupTime} - ${reservation.pickupLocation}`],
    ['Return', `${formatDate(reservation.returnDate)} ${reservation.returnTime} - ${reservation.returnLocation}`],
    ['Status', reservation.status],
    ['Payment method', reservation.paymentMethod],
    ['Total', formatMoney(reservation.total)],
    ['Notes', reservation.notes || ''],
  ];
  const printWindow = window.open('', '_blank', 'width=900,height=720');
  if (!printWindow) return;

  printWindow.document.write(`<!doctype html>
    <html>
      <head>
        <title>${escapePrintHtml(reservation.id)} - ${escapePrintHtml(reservation.sourceSiteName || 'Booking site')}</title>
        <style>
          body { margin: 0; padding: 32px; background: #f8fafc; color: #102033; font-family: Arial, sans-serif; }
          .sheet { max-width: 820px; margin: 0 auto; background: #fff; border: 1px solid #cbd5e1; border-radius: 16px; padding: 28px; }
          h1 { margin: 0; font-size: 24px; color: #073f5d; }
          .code { margin: 6px 0 20px; font-family: monospace; font-weight: 800; color: #0e7490; }
          table { width: 100%; border-collapse: collapse; margin-top: 14px; }
          th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #53657a; padding: 10px; background: #f1f5f9; border: 1px solid #d8e0ea; }
          td { padding: 10px; border: 1px solid #d8e0ea; font-size: 14px; vertical-align: top; }
          td:first-child { width: 34%; font-weight: 800; color: #26384d; background: #f8fafc; }
          .section { margin-top: 20px; font-size: 14px; font-weight: 900; color: #073f5d; }
          @media print { body { background: #fff; padding: 0; } .sheet { border: 0; border-radius: 0; } }
        </style>
      </head>
      <body>
        <main class="sheet">
          <h1>${escapePrintHtml(reservation.sourceSiteName || 'Booking site')} Reservation</h1>
          <p class="code">${escapePrintHtml(reservation.id)}</p>
          <table><tbody>
            ${rows.map(([label, value]) => `<tr><td>${escapePrintHtml(label)}</td><td>${escapePrintHtml(value)}</td></tr>`).join('')}
          </tbody></table>
          <p class="section">Extras</p>
          <table><tbody>${extrasRows}</tbody></table>
        </main>
      </body>
    </html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

const mapDbStatusToBoardStatus = (status?: string | null): ReservationStatus => {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'CANCELLED') return 'Cancelled';
  if (normalized === 'PROCESSED' || normalized === 'READY' || normalized === 'CONFIRMED') {
    return 'Ready';
  }
  if (normalized === 'ON_REQUEST' || normalized === 'UNDER_REVIEW') return 'Under Review';
  return 'New Request';
};

const mapBoardStatusToDbStatus = (status: ReservationStatus, processed: boolean) => {
  if (status === 'Cancelled') return 'CANCELLED';
  if (processed || status === 'Ready') return 'PROCESSED';
  if (status === 'Under Review') return 'ON_REQUEST';
  return 'PENDING';
};

const isProcessedDbStatus = (status?: string | null) => {
  const normalized = (status || '').toUpperCase();
  return normalized === 'PROCESSED' || normalized === 'READY' || normalized === 'CONFIRMED' || normalized === 'CANCELLED';
};

const isOnRequestReservation = (reservation: WebsiteReservation) => {
  const rawStatus = reservation.rawStatus.toUpperCase();
  return rawStatus === 'ON_REQUEST' || rawStatus === 'UNDER_REVIEW' || reservation.status === 'Under Review';
};

const parseVehicleCategory = (value?: string | null) => {
  const text = value || '';
  const [carName, groupPart] = text.split(' / Group ');
  return {
    carName: (carName || text).trim(),
    groupCode: (groupPart || '').trim(),
  };
};

const reservationPayload = (reservation: WebsiteReservation, status = reservation.rawStatus) => ({
  reservation_id: reservation.id,
  customer_name: reservation.customerName.trim(),
  email: reservation.email.trim(),
  phone: (reservation.fullPhone || reservation.phone).trim(),
  country: reservation.country?.trim() || '',
  country_code: reservation.countryCode.trim(),
  date_of_birth: reservation.dateOfBirth || null,
  accommodation_name: reservation.accommodationName?.trim() || '',
  pickup_location: reservation.pickupLocation.trim(),
  return_location: reservation.returnLocation.trim(),
  pickup_date: reservation.pickupDate,
  pickup_time: reservation.pickupTime,
  return_date: reservation.returnDate,
  return_time: reservation.returnTime,
  vehicle_category: `${reservation.carName.trim()} / Group ${reservation.groupCode.trim().toUpperCase()}`,
  extras: reservation.extras,
  coupon: reservation.couponCode
    ? { code: reservation.couponCode, discount: reservation.couponDiscount }
    : null,
  payment_method: reservation.paymentMethod.trim(),
  total_price: reservation.total,
  status,
  notes: reservation.notes.trim(),
  flight_number: reservation.flightNumber.trim(),
  hotel_villa_apartment: (
    reservation.accommodationName || reservation.hotelVillaApartment || reservation.hotelRoom
  ).trim(),
});

const mapBeReservation = (row: BeReservationRow, siteName = ''): WebsiteReservation => {
  const status = row.status || 'PENDING';
  const boardStatus = mapDbStatusToBoardStatus(status);
  const processed = isProcessedDbStatus(status);
  const vehicle = parseVehicleCategory(row.vehicle_category);
  const extras = Array.isArray(row.extras) ? row.extras : [];
  const coupon = row.coupon || null;

  return {
    supabaseId: row.id,
    sourceSiteId: row.site_id,
    sourceSiteName: siteName || 'Unknown site',
    rawStatus: status,
    id: row.reservation_id || row.reservation_code || row.id,
    customerName: row.customer_name || '',
    country: row.country || '',
    phone: row.phone || '',
    countryCode: row.country_code || '',
    fullPhone: row.phone || '',
    email: row.email || '',
    dateOfBirth: row.date_of_birth || '',
    accommodationName: row.accommodation_name || row.hotel_villa_apartment || '',
    hotelRoom: row.hotel_villa_apartment || '',
    hotelVillaApartment: row.hotel_villa_apartment || '',
    flightNumber: row.flight_number || '',
    notes: row.notes || '',
    pickupLocation: row.pickup_location || '',
    returnLocation: row.return_location || '',
    pickupDate: row.pickup_date || '',
    pickupTime: row.pickup_time || '',
    returnDate: row.return_date || '',
    returnTime: row.return_time || '',
    carName: vehicle.carName,
    groupCode: vehicle.groupCode,
    rentalDays: 1,
    rentalAmount: Number(row.total_price || 0),
    extras,
    couponCode: coupon?.code || '',
    couponDiscount: Number(coupon?.discount || 0),
    customFields: [],
    paymentMethod: row.payment_method || '',
    paymentLink: row.payment_link || '',
    total: Number(row.total_price || 0),
    driverAgeConfirmed: Boolean(row.driver_age_confirmed),
    licenceFrontUrl: row.licence_front_url || '',
    licenceBackUrl: row.licence_back_url || '',
    licenceNumber: row.licence_number || '',
    licenceIssueDate: row.licence_issue_date || '',
    licenceExpiryDate: row.licence_expiry_date || '',
    licenceUploadedAt: row.licence_uploaded_at || '',
    cancellationRequested: Boolean(row.cancellation_requested),
    status: boardStatus,
    createdAt: row.created_at || new Date().toISOString(),
    processed,
    customerEmailTemplateId:
      boardStatus === 'Under Review' ? 'customer_onrequest_received' : 'customer_confirmed_reservation',
    customerEmailTemplateLabel:
      boardStatus === 'Under Review' ? 'Customer On Request Received' : 'Customer Booking Confirmed',
    adminEmailPreviewCreated: true,
    customerEmailPreviewCreated: true,
    emailStatus: 'Preview only / Not sent',
  };
};

const toEmailReservationContext = (reservation: WebsiteReservation) => ({
  reservationId: reservation.id,
  customerName: reservation.customerName,
  email: reservation.email,
  phone: reservation.fullPhone || reservation.phone,
  country: reservation.country || '',
  countryCode: reservation.countryCode || '',
  dateOfBirth: reservation.dateOfBirth || '',
  accommodationName:
    reservation.accommodationName || reservation.hotelVillaApartment || reservation.hotelRoom,
  flightNumber: reservation.flightNumber,
  notes: reservation.notes,
  carName: reservation.carName,
  group: reservation.groupCode,
  pickupDate: formatDate(reservation.pickupDate),
  pickupTime: reservation.pickupTime,
  returnDate: formatDate(reservation.returnDate),
  returnTime: reservation.returnTime,
  pickupLocation: reservation.pickupLocation,
  returnLocation: reservation.returnLocation,
  rentalTotal: formatMoney(
    Math.max(
      0,
      reservation.total - reservation.extras.reduce((sum, extra) => sum + Number(extra.total || 0), 0),
    ),
  ),
  totalPrice: formatMoney(reservation.total),
  paymentMethod: reservation.paymentMethod,
  paymentLink: reservation.paymentLink || '',
  extras: reservation.extras,
});

const replaceEmailVariables = (
  template: string,
  reservation: WebsiteReservation,
  appendExtrasFallback = false,
) => {
  const context = toEmailReservationContext(reservation);
  const renderedTemplate = renderBookingEmailTemplate(template, context);
  if (
    !appendExtrasFallback ||
    !context.extras?.length ||
    template.includes('{{extras_summary}}') ||
    template.includes('{extras_summary}')
  ) {
    return renderedTemplate;
  }

  return `${renderedTemplate}\n\nExtras:\n${renderBookingExtrasSummary(context.extras)}`;
};

const ensurePaymentReminderDetails = (
  message: string,
  context: ReturnType<typeof toEmailReservationContext>,
) => {
  const requiredValues = [
    context.customerName,
    context.reservationId,
    context.carName,
    context.pickupDate,
    context.returnDate,
    context.totalPrice,
    context.paymentLink || '',
  ].filter(Boolean);

  if (requiredValues.every((value) => message.includes(value))) {
    return message;
  }

  return `${message.trim()}\n\nPayment details:\nCustomer: ${context.customerName}\nReservation: ${context.reservationId}\nCar: ${context.carName} (Group ${context.group})\nPickup: ${context.pickupDate} ${context.pickupTime}, ${context.pickupLocation}\nReturn: ${context.returnDate} ${context.returnTime}, ${context.returnLocation}\nFinal total: ${context.totalPrice}\nPayment link: ${context.paymentLink || ''}`.trim();
};

const getReservationSortValue = (
  reservation: WebsiteReservation,
  key: ReservationSortKey,
) => {
  switch (key) {
    case 'id':
      return reservation.id;
    case 'customer':
      return reservation.customerName;
    case 'phone':
      return reservation.fullPhone || reservation.phone;
    case 'car':
      return `${reservation.carName} ${reservation.groupCode}`;
    case 'pickup':
      return `${reservation.pickupDate} ${reservation.pickupTime}`;
    case 'return':
      return `${reservation.returnDate} ${reservation.returnTime}`;
    case 'total':
      return reservation.total;
    case 'payment':
      return reservation.paymentMethod;
    case 'status':
      return reservation.status;
  }
};

const sortReservations = (
  reservations: WebsiteReservation[],
  sort: ReservationSortState,
) =>
  reservations.slice().sort((left, right) => {
    const leftValue = getReservationSortValue(left, sort.key);
    const rightValue = getReservationSortValue(right, sort.key);
    const comparison =
      typeof leftValue === 'number' && typeof rightValue === 'number'
        ? leftValue - rightValue
        : String(leftValue).localeCompare(String(rightValue), undefined, {
            numeric: true,
            sensitivity: 'base',
          });

    return sort.direction === 'asc' ? comparison : -comparison;
  });

const getEmailEventTypeForTemplate = (
  templateId: EmailTemplateId,
): BookingEngineEmailEventType => {
  if (templateId === 'customer_payment_request') return 'payment_request';
  if (templateId === 'customer_reminder') return 'review_request';
  if (templateId === 'customer_cancellation') return 'cancellation';
  if (templateId === 'customEmail') return 'custom_email';
  if (templateId === 'customer_onrequest_received') return 'reservation_onrequest';
  return 'reservation_confirmed_customer';
};

export default function AutoClubRhodesReservationsBoard() {
  const [reservations, setReservations] = useState<WebsiteReservation[]>([]);
  const [beSiteId, setBeSiteId] = useState('');
  const [reservationsLoading, setReservationsLoading] = useState(true);
  const [reservationsError, setReservationsError] = useState('');
  const [editingReservationId, setEditingReservationId] = useState<string | null>(null);
  const [reservationDraft, setReservationDraft] = useState<WebsiteReservation | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null);
  const [emailFeedback, setEmailFeedback] = useState('');
  const [emailReservationId, setEmailReservationId] = useState<string | null>(null);
  const [confirmingReservationId, setConfirmingReservationId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState('All');
  const [reservationSearch, setReservationSearch] = useState('');
  const [emailInitialTemplate, setEmailInitialTemplate] =
    useState<EmailTemplateId>('customer_confirmed_reservation');
  const [bookingEngineConfig, setBookingEngineConfig] = useState(() => loadBookingEngineConfig());
  const [newRequestsSort, setNewRequestsSort] = useState<ReservationSortState>({
    key: 'customer',
    direction: 'asc',
  });
  const [processedSort, setProcessedSort] = useState<ReservationSortState>({
    key: 'id',
    direction: 'desc',
  });

  const loadSupabaseReservations = async () => {
    setReservationsLoading(true);
    setReservationsError('');

    const { data: sites, error: siteError } = await supabase
      .from('be_sites')
      .select('*')
      .order('domain', { ascending: true });

    if (siteError) {
      console.error('Website reservations site load failed:', {
        message: siteError.message,
        code: siteError.code,
        details: siteError.details,
        hint: siteError.hint,
      });
      setReservationsError('Failed to load Booking Engine site from Supabase.');
      setReservationsLoading(false);
      return;
    }

    const siteRows = (sites || []) as Array<Record<string, string | null>>;
    const siteById = new Map(siteRows.map((item) => [String(item.id), item.name || item.domain || 'Unknown site']));
    const site = siteRows[0];

    if (!site?.id) {
      setReservationsError('No Booking Engine site found.');
      setReservationsLoading(false);
      return;
    }

    setBeSiteId(site.id);

    const { data: emailRows, error: emailError } = await supabase
      .from('be_email_templates')
      .select('*')
      .eq('site_id', site.id)
      .order('template_key', { ascending: true });

    if (emailError) {
      console.error('Website reservations email templates load failed:', {
        message: emailError.message,
        code: emailError.code,
        details: emailError.details,
        hint: emailError.hint,
      });
    } else {
      setBookingEngineConfig((current) => ({
        ...current,
        siteSettings: {
          ...current.siteSettings,
          companyName: site.name || current.siteSettings.companyName || 'Booking site',
          domain: site.domain || current.siteSettings.domain || '',
          adminEmail: site.admin_email || '',
          bookingNotificationEmail: site.booking_notification_email || site.admin_email || '',
          logoImage: site.logo_image || '',
          whatsappNumber: site.whatsapp_number || '',
          primaryColor: site.primary_color || current.siteSettings.primaryColor,
          secondaryColor: site.secondary_color || current.siteSettings.secondaryColor,
          supportEmail: site.support_email || site.admin_email || '',
          phone: site.phone || '',
          whatsapp: site.whatsapp || site.whatsapp_number || '',
          websiteUrl: site.website_url || '',
          googleReviewUrl: site.google_review_url || current.siteSettings.googleReviewUrl,
          emailHeaderImage: site.email_header_image || '',
          emailFooterText: site.email_footer_text || current.siteSettings.emailFooterText,
        },
        emailSettings: normalizeSupabaseEmailTemplates(
          (emailRows || []) as BookingEngineEmailTemplateRow[],
          site.booking_notification_email || site.admin_email || '',
        ),
      }));
    }

    const { data, error } = await supabase
      .from('be_reservations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Website reservations load failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setReservationsError('Failed to load reservations from Supabase.');
      setReservationsLoading(false);
      return;
    }

    setReservations(((data || []) as BeReservationRow[]).map((row) => mapBeReservation(row, siteById.get(String(row.site_id)) || 'Unknown site')));
    setReservationsLoading(false);
  };

  useEffect(() => {
    void loadSupabaseReservations();
  }, []);

  const sourceOptions = useMemo(
    () => ['All', ...Array.from(new Set(reservations.map((reservation) => reservation.sourceSiteName || 'Unknown site'))).sort()],
    [reservations],
  );
  const sourceFilteredReservations = useMemo(
    () =>
      sourceFilter === 'All'
        ? reservations
        : reservations.filter((reservation) => (reservation.sourceSiteName || 'Unknown site') === sourceFilter),
    [reservations, sourceFilter],
  );
  const filteredReservations = useMemo(() => {
    const query = reservationSearch.trim().toLowerCase();
    if (!query) return sourceFilteredReservations;

    return sourceFilteredReservations.filter((reservation) =>
      [
        reservation.id,
        reservation.customerName,
        reservation.phone,
        reservation.fullPhone,
        reservation.email,
        reservation.carName,
        reservation.pickupLocation,
        reservation.returnLocation,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [reservationSearch, sourceFilteredReservations]);

  const newReservations = useMemo(
    () =>
      sortReservations(
        filteredReservations.filter((reservation) => !reservation.processed),
        newRequestsSort,
      ),
    [filteredReservations, newRequestsSort],
  );
  const processedReservations = useMemo(
    () =>
      sortReservations(
        filteredReservations.filter((reservation) => reservation.processed),
        processedSort,
      ),
    [filteredReservations, processedSort],
  );

  const summary = {
    newRequests: newReservations.filter((reservation) => reservation.status === 'New Request').length,
    underReview: newReservations.filter((reservation) => reservation.status === 'Under Review').length,
    processed: processedReservations.length,
    cancelled: reservations.filter((reservation) => reservation.status === 'Cancelled').length,
  };

  const sendReservationEmailEvent = async (
    reservation: WebsiteReservation,
    eventType: BookingEngineEmailEventType,
  ) => {
    if (!beSiteId) return;

    const payload = buildBookingEmailEventPayload({
      eventType,
      templates: bookingEngineConfig.emailSettings.templates,
      site: {
        siteId: beSiteId,
        siteName: bookingEngineConfig.siteSettings.companyName || 'Booking site',
        domain: bookingEngineConfig.siteSettings.domain,
        adminEmail:
          bookingEngineConfig.siteSettings.bookingNotificationEmail ||
          bookingEngineConfig.siteSettings.adminEmail ||
          bookingEngineConfig.emailSettings.adminEmail,
        logoImage: bookingEngineConfig.siteSettings.logoImage,
        whatsappNumber: bookingEngineConfig.siteSettings.whatsappNumber,
        primaryColor: bookingEngineConfig.siteSettings.primaryColor,
        secondaryColor: bookingEngineConfig.siteSettings.secondaryColor,
        supportEmail: bookingEngineConfig.siteSettings.supportEmail,
        phone: bookingEngineConfig.siteSettings.phone,
        websiteUrl: bookingEngineConfig.siteSettings.websiteUrl,
        googleReviewUrl: bookingEngineConfig.siteSettings.googleReviewUrl,
        emailHeaderImage: bookingEngineConfig.siteSettings.emailHeaderImage,
        emailFooterText: bookingEngineConfig.siteSettings.emailFooterText,
        currency: bookingEngineConfig.siteSettings.currency,
      },
      reservation: toEmailReservationContext(reservation),
    });

    return sendBookingEngineEmailEvent(payload);
  };

  const updateReservation = async (
    reservationId: string,
    patch: Partial<Pick<WebsiteReservation, 'status' | 'processed'>>,
  ) => {
    const reservation = reservations.find((item) => item.id === reservationId);
    if (!reservation || !beSiteId) return;

    const nextStatus = patch.status || reservation.status;
    const nextProcessed = patch.processed ?? reservation.processed;
    const dbStatus = mapBoardStatusToDbStatus(nextStatus, nextProcessed);

    const { error } = await supabase
      .from('be_reservations')
      .update({ status: dbStatus })
      .eq('id', reservation.supabaseId)
      .eq('site_id', beSiteId);

    if (error) {
      console.error('Website reservation status update failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setReservationsError('Failed to update reservation in Supabase.');
      return;
    }

    if (
      isOnRequestReservation(reservation) &&
      nextProcessed &&
      nextStatus === 'Ready'
    ) {
      await sendReservationEmailEvent(reservation, 'reservation_confirmed_customer');
    }

    await loadSupabaseReservations();
  };

  const confirmOnRequestReservation = async (reservationId: string) => {
    if (confirmingReservationId) return;
    setConfirmingReservationId(reservationId);
    try {
      await updateReservation(reservationId, { status: 'Ready', processed: true });
    } finally {
      setConfirmingReservationId(null);
    }
  };

  const openEditor = (reservation: WebsiteReservation) => {
    setEditingReservationId(reservation.id);
    setReservationDraft({ ...reservation });
  };

  const openLicenceEditor = (reservation: WebsiteReservation) => {
    openEditor(reservation);
    window.setTimeout(() => {
      document.getElementById('driver-licence-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  };

  const closeEditor = () => {
    setEditingReservationId(null);
    setReservationDraft(null);
  };

  const saveEditedReservation = async () => {
    if (!editingReservationId || !reservationDraft?.customerName.trim() || !beSiteId) return;

    const originalReservation = reservations.find((item) => item.id === editingReservationId);
    if (
      originalReservation?.status !== 'Cancelled' &&
      reservationDraft.status === 'Cancelled'
    ) {
      setPendingCancelId(reservationDraft.id);
      return;
    }

    const dbStatus = mapBoardStatusToDbStatus(reservationDraft.status, reservationDraft.processed);
    const payload = reservationPayload(
      {
        ...reservationDraft,
        customerName: reservationDraft.customerName.trim(),
        country: reservationDraft.country?.trim() || '',
        phone: reservationDraft.phone.trim(),
        fullPhone: reservationDraft.fullPhone?.trim() || reservationDraft.phone.trim(),
        countryCode: reservationDraft.countryCode?.trim() || '',
        email: reservationDraft.email.trim(),
        dateOfBirth: reservationDraft.dateOfBirth?.trim() || '',
        accommodationName:
          reservationDraft.accommodationName?.trim() ||
          reservationDraft.hotelVillaApartment?.trim() ||
          reservationDraft.hotelRoom.trim(),
        hotelVillaApartment:
          reservationDraft.accommodationName?.trim() ||
          reservationDraft.hotelVillaApartment?.trim() ||
          reservationDraft.hotelRoom.trim(),
        hotelRoom: reservationDraft.hotelRoom.trim(),
        carName: reservationDraft.carName.trim(),
        groupCode: reservationDraft.groupCode.trim().toUpperCase(),
        pickupLocation: reservationDraft.pickupLocation.trim(),
        returnLocation: reservationDraft.returnLocation.trim(),
        paymentMethod: reservationDraft.paymentMethod.trim(),
        notes: reservationDraft.notes.trim(),
      },
      dbStatus,
    );

    const { error } = await supabase
      .from('be_reservations')
      .update(payload)
      .eq('id', reservationDraft.supabaseId)
      .eq('site_id', beSiteId);

    if (error) {
      console.error('Website reservation save failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setReservationsError('Failed to save reservation to Supabase.');
      return;
    }

    await loadSupabaseReservations();
    closeEditor();
  };

  const cancelReservation = async (reservationId: string, sendEmail: boolean) => {
    const reservation = reservations.find((item) => item.id === reservationId);
    if (!reservation || !beSiteId) return;

    const { error } = await supabase
      .from('be_reservations')
      .update({ status: 'CANCELLED' })
      .eq('id', reservation.supabaseId)
      .eq('site_id', beSiteId);

    if (error) {
      console.error('Website reservation cancellation failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setReservationsError('Failed to cancel reservation in Supabase.');
      return;
    }

    if (sendEmail) {
      const sendResult = await sendReservationEmailEvent(
        {
          ...reservation,
          status: 'Cancelled',
          rawStatus: 'CANCELLED',
          processed: true,
        },
        'cancellation',
      );
      setEmailFeedback(
        sendResult?.success === false
          ? 'Reservation cancelled, but cancellation email failed. Check console for SMTP details.'
          : 'Cancellation email sent through internal SMTP.',
      );
    } else {
      setEmailFeedback('Reservation cancelled without email.');
    }

    await loadSupabaseReservations();
    closeEditor();
    setPendingCancelId(null);
  };

  const deleteReservation = async (reservationId: string) => {
    const reservation = reservations.find((item) => item.id === reservationId);
    if (!reservation || !beSiteId) return;

    const { error } = await supabase
      .from('be_reservations')
      .delete()
      .eq('id', reservation.supabaseId)
      .eq('site_id', beSiteId);

    if (error) {
      console.error('Website reservation delete failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setReservationsError('Failed to delete reservation from Supabase.');
      return;
    }

    await loadSupabaseReservations();
    closeEditor();
    setPendingDeleteId(null);
  };

  const openEmailComposer = (
    reservationId: string,
    template?: EmailTemplateId,
  ) => {
    const reservation = reservations.find((item) => item.id === reservationId);
    setEmailReservationId(reservationId);
    setEmailInitialTemplate(template || reservation?.customerEmailTemplateId || 'customer_confirmed_reservation');
    setEmailFeedback('');
  };

  const emailReservation =
    reservations.find((reservation) => reservation.id === emailReservationId) || null;

  const toggleSort = (
    key: ReservationSortKey,
    setSort: React.Dispatch<React.SetStateAction<ReservationSortState>>,
  ) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return (
    <div className="relative flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden bg-slate-100 text-slate-900">
      <header className="flex flex-shrink-0 flex-col items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2 xl:flex-row xl:items-center">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-cyan-700">
            <Globe2 className="h-3.5 w-3.5" />
            BOOKING ENGINE
          </div>
          <h2 className="text-lg font-black text-slate-950">Website reservations</h2>
        </div>
        <div className="flex w-full flex-wrap items-center justify-start gap-2 xl:w-auto xl:justify-end">
          <label className="flex shrink-0 items-center gap-2 rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-emerald-900 shadow-sm">
            Source
            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
              className="h-8 rounded-lg border border-emerald-300 bg-white px-2 text-xs font-black normal-case tracking-normal text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              {sourceOptions.map((source) => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </label>
          <input
            value={reservationSearch}
            onChange={(event) => setReservationSearch(event.target.value)}
            placeholder="Search reservations..."
            className="h-8 min-w-[220px] flex-1 rounded-lg border border-cyan-200 bg-white px-3 text-xs font-bold text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 sm:flex-none sm:w-[280px]"
          />
          <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-cyan-800">
            Supabase live
          </span>
        </div>
      </header>

      <div className="grid flex-shrink-0 grid-cols-4 gap-1.5 border-b border-slate-200 bg-slate-50 px-4 py-1.5">
        <SummaryCard label="New Requests" value={summary.newRequests} tone="sky" />
        <SummaryCard label="Under Review" value={summary.underReview} tone="amber" />
        <SummaryCard label="Processed" value={summary.processed} tone="emerald" />
        <SummaryCard label="Cancelled" value={summary.cancelled} tone="rose" />
      </div>

      {emailFeedback && (
        <div className="flex flex-shrink-0 items-center justify-between border-b border-cyan-200 bg-cyan-50 px-5 py-2 text-xs font-bold text-cyan-900">
          <span>{emailFeedback}</span>
          <button
            type="button"
            onClick={() => setEmailFeedback('')}
            className="rounded-md p-1 text-cyan-700 hover:bg-cyan-100"
            aria-label="Dismiss email message"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
        {reservationsLoading && (
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-black text-cyan-900">
            Loading website reservations from Supabase...
          </div>
        )}
        {reservationsError && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-800">
            <span>{reservationsError}</span>
            <button
              type="button"
              onClick={() => {
                setReservationsError('');
                void loadSupabaseReservations();
              }}
              className="rounded-lg border border-rose-300 bg-white px-3 py-1 text-xs font-black text-rose-700"
            >
              Retry
            </button>
          </div>
        )}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <SectionHeading
            title="Νέες κρατήσεις από website"
            description="Incoming requests waiting to be reviewed or passed into the future ERP workflow."
            count={newReservations.length}
          />

          <div className="overflow-x-auto">
            <div className="min-w-[1620px]">
              <div className="grid grid-cols-[170px_120px_135px_210px_145px_145px_130px_130px_430px] border-y border-slate-200 bg-slate-100 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.05em] text-slate-600">
                <SortHeader label="Customer" sortKey="customer" sort={newRequestsSort} onSort={(key) => toggleSort(key, setNewRequestsSort)} />
                <span>Source</span>
                <SortHeader label="Phone" sortKey="phone" sort={newRequestsSort} onSort={(key) => toggleSort(key, setNewRequestsSort)} />
                <SortHeader label="Car / Group" sortKey="car" sort={newRequestsSort} onSort={(key) => toggleSort(key, setNewRequestsSort)} />
                <SortHeader label="Pickup" sortKey="pickup" sort={newRequestsSort} onSort={(key) => toggleSort(key, setNewRequestsSort)} />
                <SortHeader label="Return" sortKey="return" sort={newRequestsSort} onSort={(key) => toggleSort(key, setNewRequestsSort)} />
                <SortHeader label="Status" sortKey="status" sort={newRequestsSort} onSort={(key) => toggleSort(key, setNewRequestsSort)} />
                <SortHeader label="Total" sortKey="total" sort={newRequestsSort} onSort={(key) => toggleSort(key, setNewRequestsSort)} />
                <span className="justify-self-end text-right">Actions</span>
              </div>
              {newReservations.length > 0 ? (
                newReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="grid grid-cols-[170px_120px_135px_210px_145px_145px_130px_130px_430px] items-center border-b border-slate-200 px-3 py-1.5 text-sm last:border-b-0 hover:bg-slate-50"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="truncate font-black text-slate-900">{reservation.customerName}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-400">{reservation.id}</p>
                      <LicenceStatusBadge reservation={reservation} />
                      <CancellationStatusBadge reservation={reservation} />
                    </div>
                    <SourceCell reservation={reservation} />
                    <span className="truncate pr-3 text-xs font-semibold text-slate-700">
                      {reservation.fullPhone || reservation.phone}
                    </span>
                    <CarCell reservation={reservation} />
                    <DateCell date={reservation.pickupDate} time={reservation.pickupTime} />
                    <DateCell date={reservation.returnDate} time={reservation.returnTime} />
                    <StatusBadge status={reservation.status} />
                    <span className="min-w-[130px] pr-4 font-black text-slate-900">{formatMoney(reservation.total)}</span>
                    <div className="actions-cell flex min-w-[430px] w-full flex-nowrap items-center justify-end gap-2 justify-self-end whitespace-nowrap">
                      <TextAction
                        label="View"
                        icon={Eye}
                        tone="secondary"
                        onClick={() => openEditor(reservation)}
                      />
                      {(reservation.licenceFrontUrl || reservation.licenceBackUrl) && (
                        <TextAction
                          label="View licence"
                          icon={Eye}
                          tone="success"
                          onClick={() => openLicenceEditor(reservation)}
                        />
                      )}
                      {isOnRequestReservation(reservation) ? (
                        <button
                          type="button"
                          disabled={Boolean(confirmingReservationId)}
                          onClick={() => confirmOnRequestReservation(reservation.id)}
                          className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-md border border-emerald-700 bg-emerald-700 px-2 text-[8.5px] font-black text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
                        >
                          <Check className="h-3 w-3" />
                          {confirmingReservationId === reservation.id
                            ? 'Confirming...'
                            : 'Confirm reservation'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            updateReservation(reservation.id, { status: 'Ready', processed: true })
                          }
                          className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-md border border-emerald-600 bg-emerald-600 px-2 text-[8.5px] font-black text-white transition hover:bg-emerald-700"
                        >
                          <Check className="h-3 w-3" />
                          OK / Πέρασμα
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyRow message="Δεν υπάρχουν νέες κρατήσεις από website." />
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <SectionHeading
            title="Περασμένες κρατήσεις"
            description="Reservations already accepted, processed or cancelled in Supabase."
            count={processedReservations.length}
          />

          <div className="overflow-x-auto">
            <div className="min-w-[1760px]">
              <div className="grid grid-cols-[135px_170px_120px_135px_210px_145px_145px_130px_130px_430px] border-y border-slate-200 bg-slate-100 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.05em] text-slate-600">
                <SortHeader label="ID" sortKey="id" sort={processedSort} onSort={(key) => toggleSort(key, setProcessedSort)} />
                <SortHeader label="Customer" sortKey="customer" sort={processedSort} onSort={(key) => toggleSort(key, setProcessedSort)} />
                <span>Source</span>
                <SortHeader label="Phone" sortKey="phone" sort={processedSort} onSort={(key) => toggleSort(key, setProcessedSort)} />
                <SortHeader label="Car / Group" sortKey="car" sort={processedSort} onSort={(key) => toggleSort(key, setProcessedSort)} />
                <SortHeader label="Pickup" sortKey="pickup" sort={processedSort} onSort={(key) => toggleSort(key, setProcessedSort)} />
                <SortHeader label="Return" sortKey="return" sort={processedSort} onSort={(key) => toggleSort(key, setProcessedSort)} />
                <SortHeader label="Status" sortKey="status" sort={processedSort} onSort={(key) => toggleSort(key, setProcessedSort)} />
                <SortHeader label="Total" sortKey="total" sort={processedSort} onSort={(key) => toggleSort(key, setProcessedSort)} />
                <span className="justify-self-end text-right">Actions</span>
              </div>
              {processedReservations.length > 0 ? (
                processedReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="grid grid-cols-[135px_170px_120px_135px_210px_145px_145px_130px_130px_430px] items-center border-b border-slate-200 px-3 py-1.5 text-sm last:border-b-0 hover:bg-slate-50"
                  >
                    <span className="font-mono text-[11px] font-black text-cyan-700">
                      {reservation.id}
                    </span>
                    <span className="truncate pr-3 font-black text-slate-900">
                      {reservation.customerName}
                      <LicenceStatusBadge reservation={reservation} />
                      <CancellationStatusBadge reservation={reservation} />
                    </span>
                    <SourceCell reservation={reservation} />
                    <span className="truncate pr-3 text-xs font-semibold text-slate-700">
                      {reservation.fullPhone || reservation.phone}
                    </span>
                    <CarCell reservation={reservation} />
                    <DateCell date={reservation.pickupDate} time={reservation.pickupTime} />
                    <DateCell date={reservation.returnDate} time={reservation.returnTime} />
                    <StatusBadge status={reservation.status} />
                    <span className="min-w-[130px] pr-4 font-black text-slate-900">{formatMoney(reservation.total)}</span>
                    <div className="actions-cell flex min-w-[430px] w-full flex-nowrap items-center justify-end gap-2 justify-self-end whitespace-nowrap">
                      <TextAction
                        label="View"
                        icon={Eye}
                        tone="secondary"
                        onClick={() => openEditor(reservation)}
                      />
                      {(reservation.licenceFrontUrl || reservation.licenceBackUrl) && (
                        <TextAction
                          label="View licence"
                          icon={Eye}
                          tone="success"
                          onClick={() => openLicenceEditor(reservation)}
                        />
                      )}
                      <TextAction
                        label="Move back to New Requests"
                        icon={RotateCcw}
                        tone="warning"
                        onClick={() =>
                          updateReservation(reservation.id, {
                            processed: false,
                            status: 'New Request',
                          })
                        }
                      />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyRow message="Δεν υπάρχουν περασμένες κρατήσεις." />
              )}
            </div>
          </div>
        </section>
      </div>

      {reservationDraft && (
        <ReservationEditor
          draft={reservationDraft}
          onDraftChange={setReservationDraft}
          onClose={closeEditor}
          onSave={saveEditedReservation}
          onDelete={() => setPendingDeleteId(reservationDraft.id)}
          onCancelReservation={() => setPendingCancelId(reservationDraft.id)}
          onEmail={(template) => openEmailComposer(reservationDraft.id, template)}
        />
      )}

      {emailReservation && (
        <EmailComposerModal
          key={`${emailReservation.id}-${emailInitialTemplate}`}
          reservation={emailReservation}
          initialTemplate={emailInitialTemplate}
          templates={bookingEngineConfig.emailSettings.templates}
          siteName={bookingEngineConfig.siteSettings.companyName || 'Booking site'}
          logoImage={bookingEngineConfig.siteSettings.logoImage}
          websiteUrl={bookingEngineConfig.siteSettings.websiteUrl}
          domain={bookingEngineConfig.siteSettings.domain}
          secondaryColor={bookingEngineConfig.siteSettings.secondaryColor}
          onClose={() => setEmailReservationId(null)}
          onSend={async ({ recipient, subject, message, templateId, paymentLink }) => {
            const eventType = getEmailEventTypeForTemplate(templateId);
            const emailContext = {
              ...toEmailReservationContext(emailReservation),
              paymentLink: paymentLink.trim(),
            };
            const siteContext = {
              siteId: beSiteId,
              siteName: bookingEngineConfig.siteSettings.companyName || 'Booking site',
              domain: bookingEngineConfig.siteSettings.domain,
              adminEmail:
                bookingEngineConfig.siteSettings.bookingNotificationEmail ||
                bookingEngineConfig.siteSettings.adminEmail ||
                bookingEngineConfig.emailSettings.adminEmail,
              logoImage: bookingEngineConfig.siteSettings.logoImage,
              whatsappNumber: bookingEngineConfig.siteSettings.whatsappNumber,
              primaryColor: bookingEngineConfig.siteSettings.primaryColor,
              secondaryColor: bookingEngineConfig.siteSettings.secondaryColor,
              supportEmail: bookingEngineConfig.siteSettings.supportEmail,
              phone: bookingEngineConfig.siteSettings.phone,
              websiteUrl: bookingEngineConfig.siteSettings.websiteUrl,
              googleReviewUrl: bookingEngineConfig.siteSettings.googleReviewUrl,
              emailHeaderImage: bookingEngineConfig.siteSettings.emailHeaderImage,
              emailFooterText: bookingEngineConfig.siteSettings.emailFooterText,
              currency: bookingEngineConfig.siteSettings.currency,
            };
            const renderedSubject = renderBookingEmailTemplate(subject, emailContext);
            const renderedMessage = renderBookingEmailTemplate(message, emailContext);
            const paymentSafeMessage =
              templateId === 'customer_payment_request'
                ? ensurePaymentReminderDetails(renderedMessage, emailContext)
                : renderedMessage;
            const manualMessage =
              templateId === 'customer_payment_request' &&
              paymentLink.trim() &&
              !paymentSafeMessage.includes(paymentLink.trim())
                ? `${paymentSafeMessage}\n\nPayment link: ${paymentLink.trim()}`
                : paymentSafeMessage;

            const sendResult = await sendBookingEngineEmailEvent({
              event_type: eventType,
              reservation_id: emailContext.reservationId,
              site_id: beSiteId,
              full_name: emailContext.customerName,
              customer_name: emailContext.customerName,
              email: emailContext.email,
              phone: emailContext.phone,
              country: emailContext.country || '',
              country_code: emailContext.countryCode || '',
              date_of_birth: emailContext.dateOfBirth || '',
              accommodation_name: emailContext.accommodationName || '',
              flight_number: emailContext.flightNumber || '',
              notes: emailContext.notes || '',
              payment_link: emailContext.paymentLink || '',
              extras: emailContext.extras || [],
              extras_summary: renderBookingExtrasSummary(emailContext.extras),
              extras_summary_html: renderBookingExtrasHtml(emailContext.extras),
              extras_total: (emailContext.extras || []).reduce(
                (sum, extra) => sum + Number(extra.total ?? Number(extra.unitPrice || 0) * extra.quantity),
                0,
              ),
              to: recipient,
              subject: renderedSubject,
              html_body: buildBookingEmailHtml({
                site: siteContext,
                reservation: emailContext,
                intro: getBookingEmailIntro(templateId),
                templateId,
                manualMessage,
              }),
              emails: [
                {
                  to: recipient,
                  subject: renderedSubject,
                  html_body: buildBookingEmailHtml({
                    site: siteContext,
                    reservation: emailContext,
                    intro: getBookingEmailIntro(templateId),
                    templateId,
                    manualMessage,
                  }),
                  text_body: manualMessage,
                  template_key: templateId,
                  template_label: bookingEngineConfig.emailSettings.templates[templateId]?.label || templateId,
                  recipient_type: 'customer',
                },
              ],
              reservation: emailContext,
            });
            setEmailFeedback(
              sendResult?.success === false
                ? 'Email send failed. Check console for SMTP details.'
                : 'Email sent through internal SMTP.',
            );
            setEmailReservationId(null);
          }}
          onFeedback={(message) => {
            setEmailFeedback(message);
            setEmailReservationId(null);
          }}
        />
      )}

      {pendingCancelId && (
        <CancelReservationConfirmation
          onClose={() => setPendingCancelId(null)}
          onCancelWithoutEmail={() => cancelReservation(pendingCancelId, false)}
          onCancelAndSendEmail={() => cancelReservation(pendingCancelId, true)}
        />
      )}

      {pendingDeleteId && (
        <DeleteConfirmation
          onCancel={() => setPendingDeleteId(null)}
          onConfirm={() => deleteReservation(pendingDeleteId)}
        />
      )}
    </div>
  );
}

function ReservationEditor({
  draft,
  onDraftChange,
  onClose,
  onSave,
  onDelete,
  onCancelReservation,
  onEmail,
}: {
  draft: WebsiteReservation;
  onDraftChange: (draft: WebsiteReservation) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  onCancelReservation: () => void;
  onEmail: (template: EmailTemplateId) => void;
}) {
  const updateDraft = (patch: Partial<WebsiteReservation>) => {
    onDraftChange({ ...draft, ...patch });
  };

  const openLicenceFiles = async () => {
    const urls = [draft.licenceFrontUrl, draft.licenceBackUrl].filter(Boolean) as string[];
    const resolvedUrls = await Promise.all(urls.map(resolveLicencePreviewUrl));
    resolvedUrls.forEach((resolvedUrl) => window.open(resolvedUrl, '_blank', 'noopener,noreferrer'));
  };

  const actionButtonClass =
    'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-black transition';

  return (
    <aside className="absolute inset-y-0 right-0 z-30 flex w-full max-w-[980px] flex-col border-l border-slate-200 bg-white shadow-[-24px_0_70px_rgba(15,23,42,0.2)]">
      <header className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-xs font-black text-cyan-700">{draft.id}</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">View / Edit reservation</h3>
          <p className="mt-1 text-xs text-slate-500">Loaded from Supabase.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100"
            aria-label="Close editor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => printReservationDetails(draft)}
            className={`${actionButtonClass} border-slate-300 bg-white text-slate-700 hover:bg-slate-100`}
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
          {(draft.licenceFrontUrl || draft.licenceBackUrl) && (
            <button
              type="button"
              onClick={openLicenceFiles}
              className={`${actionButtonClass} border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800`}
            >
              <Eye className="h-3.5 w-3.5" />
              View Licence
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const firstInput = document.querySelector('aside input') as HTMLElement | null;
              firstInput?.focus();
            }}
            className={`${actionButtonClass} border-cyan-700 bg-cyan-700 text-white hover:bg-cyan-800`}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Reservation
          </button>
          <button
            type="button"
            onClick={() => onEmail(draft.customerEmailTemplateId || 'customer_confirmed_reservation')}
            className={`${actionButtonClass} border-cyan-700 bg-white text-cyan-800 hover:bg-cyan-50`}
          >
            <Mail className="h-3.5 w-3.5" />
            Send Email
          </button>
          {draft.status !== 'Cancelled' && (
            <button
              type="button"
              onClick={onCancelReservation}
              className={`${actionButtonClass} border-amber-600 bg-amber-600 text-white hover:bg-amber-700`}
            >
              <X className="h-3.5 w-3.5" />
              Cancel Reservation
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className={`${actionButtonClass} border-rose-600 bg-rose-600 text-white hover:bg-rose-700`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Reservation
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="grid gap-3 lg:grid-cols-3">
          <EditorSection title="Customer details">
            <div className="grid gap-2 sm:grid-cols-2">
              <EditorField
                label="Customer name"
                value={draft.customerName}
                onChange={(customerName) => updateDraft({ customerName })}
                className="sm:col-span-2"
              />
              <EditorField
                label="Country"
                value={draft.country || ''}
                onChange={(country) => updateDraft({ country })}
              />
              <EditorField
                label="Country code"
                value={draft.countryCode || ''}
                onChange={(countryCode) =>
                  updateDraft({
                    countryCode,
                    fullPhone: `${countryCode} ${draft.phone}`.trim(),
                  })
                }
              />
              <EditorField
                label="Phone"
                value={draft.phone}
                onChange={(phone) => updateDraft({ phone, fullPhone: `${draft.countryCode || ''} ${phone}`.trim() })}
              />
              <EditorField
                label="Full phone"
                value={draft.fullPhone || draft.phone}
                onChange={(fullPhone) => updateDraft({ fullPhone })}
              />
              <EditorField
                label="Email"
                value={draft.email}
                onChange={(email) => updateDraft({ email })}
                className="sm:col-span-2"
              />
              <EditorField
                label="Date of Birth"
                type="date"
                value={draft.dateOfBirth || ''}
                onChange={(dateOfBirth) => updateDraft({ dateOfBirth })}
              />
              <EditorField
                label="Flight Number"
                value={draft.flightNumber}
                onChange={(flightNumber) => updateDraft({ flightNumber })}
              />
              <EditorField
                label="Hotel / Villa / Apartment"
                value={draft.accommodationName || draft.hotelVillaApartment || draft.hotelRoom}
                onChange={(accommodationName) =>
                  updateDraft({
                    accommodationName,
                    hotelVillaApartment: accommodationName,
                    hotelRoom: accommodationName,
                  })
                }
                className="sm:col-span-2"
              />
            </div>
          </EditorSection>
          <EditorSection title="Booking details" className="lg:col-span-2">
            <div className="grid gap-2 md:grid-cols-3">
          <EditorField
            label="Car"
            value={draft.carName}
            onChange={(carName) => updateDraft({ carName })}
          />
          <EditorField
            label="Group"
            value={draft.groupCode}
            onChange={(groupCode) => updateDraft({ groupCode })}
          />
          <EditorField
            label="Pickup date"
            type="date"
            value={draft.pickupDate}
            onChange={(pickupDate) => updateDraft({ pickupDate })}
          />
          <EditorField
            label="Pickup time"
            type="time"
            value={draft.pickupTime}
            onChange={(pickupTime) => updateDraft({ pickupTime })}
          />
          <EditorField
            label="Pickup location"
            value={draft.pickupLocation}
            onChange={(pickupLocation) => updateDraft({ pickupLocation })}
            className="md:col-span-2"
          />
          <EditorField
            label="Return date"
            type="date"
            value={draft.returnDate}
            onChange={(returnDate) => updateDraft({ returnDate })}
          />
          <EditorField
            label="Return time"
            type="time"
            value={draft.returnTime}
            onChange={(returnTime) => updateDraft({ returnTime })}
          />
          <EditorField
            label="Return location"
            value={draft.returnLocation}
            onChange={(returnLocation) => updateDraft({ returnLocation })}
            className="md:col-span-2"
          />
          <EditorField
            label="Total price"
            type="number"
            value={String(draft.total)}
            onChange={(total) => updateDraft({ total: Number(total) || 0 })}
          />
          <EditorField
            label="Rental days"
            type="number"
            value={String(draft.rentalDays)}
            onChange={(rentalDays) => updateDraft({ rentalDays: Number(rentalDays) || 1 })}
          />
          <EditorField
            label="Rental amount"
            type="number"
            value={String(draft.rentalAmount)}
            onChange={(rentalAmount) => updateDraft({ rentalAmount: Number(rentalAmount) || 0 })}
          />
          <EditorField
            label="Coupon"
            value={draft.couponCode}
            onChange={(couponCode) => updateDraft({ couponCode })}
          />
          <EditorField
            label="Coupon discount"
            type="number"
            value={String(draft.couponDiscount)}
            onChange={(couponDiscount) => updateDraft({ couponDiscount: Number(couponDiscount) || 0 })}
          />
          <EditorField
            label="Payment method"
            value={draft.paymentMethod}
            onChange={(paymentMethod) => updateDraft({ paymentMethod })}
          />
          <EditorField
            label="Created at"
            value={new Date(draft.createdAt).toLocaleString('en-GB')}
            onChange={() => undefined}
          />
          <label className="block md:col-span-2">
            <EditorLabel>Status</EditorLabel>
            <select
              value={draft.status}
              onChange={(event) =>
                updateDraft({ status: event.target.value as ReservationStatus })
              }
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            >
              <option value="New Request">New Request</option>
              <option value="Under Review">Under Review</option>
              <option value="Ready">Ready</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </label>
            </div>
          </EditorSection>
          <EditorSection title="Notes">
            <textarea
              value={draft.notes}
              onChange={(event) => updateDraft({ notes: event.target.value })}
              rows={5}
              placeholder="Internal reservation notes"
              className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </EditorSection>
          <section id="driver-licence-section" className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-900">Driver licence</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {draft.licenceUploadedAt
                    ? `Uploaded ${new Date(draft.licenceUploadedAt).toLocaleString('en-GB')}`
                    : 'No licence uploaded yet.'}
                </p>
              </div>
              <LicenceStatusBadge reservation={draft} />
              <CancellationStatusBadge reservation={draft} />
            </div>
            {(draft.licenceFrontUrl || draft.licenceBackUrl || draft.licenceNumber || draft.licenceIssueDate || draft.licenceExpiryDate) ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-emerald-100 bg-white px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.07em] text-slate-500">Licence number</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{draft.licenceNumber || '-'}</p>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-white px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.07em] text-slate-500">Licence issue</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{draft.licenceIssueDate || '-'}</p>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-white px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.07em] text-slate-500">Licence expiry</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{draft.licenceExpiryDate || '-'}</p>
                </div>
                {draft.licenceFrontUrl && (
                  <LicencePreview label="Front" url={draft.licenceFrontUrl} />
                )}
                {draft.licenceBackUrl && (
                  <LicencePreview label="Back" url={draft.licenceBackUrl} />
                )}
              </div>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed border-emerald-200 bg-white px-3 py-3 text-xs font-semibold text-slate-500">
                The customer has not uploaded driver licence files.
              </p>
            )}
          </section>
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-900">Submitted extras</p>
                <p className="mt-0.5 text-xs text-slate-500">Stored with the Supabase website reservation.</p>
              </div>
              <span className="text-sm font-black text-slate-900">
                {formatMoney(draft.extras.reduce((sum, extra) => sum + extra.total, 0))}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {draft.extras.length > 0 ? (
                draft.extras.map((extra) => (
                  <div key={extra.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                    <span className="font-bold text-slate-800">
                      {extra.name} x {extra.quantity}
                    </span>
                    <span className="font-black text-slate-900">{formatMoney(extra.total)}</span>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-xs font-semibold text-slate-500">
                  No extras selected.
                </p>
              )}
            </div>
          </section>
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-3 lg:col-span-2">
            <div>
              <p className="text-sm font-black text-slate-900">Custom checkout fields</p>
              <p className="mt-0.5 text-xs text-slate-500">Values submitted from Public Booking Preview.</p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {draft.customFields.length > 0 ? (
                draft.customFields.map((field) => (
                  <div key={field.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.07em] text-slate-500">
                      {field.label}
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{field.value || '-'}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-xs font-semibold text-slate-500 sm:col-span-2">
                  No custom checkout fields submitted.
                </p>
              )}
            </div>
          </section>
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-3 lg:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-900">Email preview flow</p>
                <p className="mt-0.5 text-xs text-slate-500">Supabase templates. Sends run through internal SMTP.</p>
              </div>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
                {draft.emailStatus}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.07em] text-slate-500">
                  Customer email template used
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {draft.customerEmailTemplateLabel || 'Customer Reservation Received'}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.07em] text-slate-500">
                  Admin notification preview exists
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {draft.adminEmailPreviewCreated ? 'Yes' : 'No'}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.07em] text-slate-500">
                  Customer email preview exists
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {draft.customerEmailPreviewCreated ? 'Yes' : 'No'}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.07em] text-slate-500">
                  Email status
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {draft.emailStatus === 'Preview only / Not sent' ? 'Not sent / Preview only' : draft.emailStatus}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.07em] text-slate-500">
                  Last selected template
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {draft.customerEmailTemplateLabel || 'Customer Reservation Received'}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <footer className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 p-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!draft.customerName.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-cyan-700 bg-cyan-700 px-4 text-sm font-black text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
          >
            <Save className="h-4 w-4" />
            Save changes
          </button>
        </div>
      </footer>
    </aside>
  );
}

function EditorSection({
  title,
  className = '',
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-slate-50 p-3 ${className}`}>
      <p className="mb-2 text-sm font-black text-slate-900">{title}</p>
      {children}
    </section>
  );
}

function EditorField({
  label,
  value,
  type = 'text',
  className = '',
  onChange,
}: {
  label: string;
  value: string;
  type?: 'text' | 'number' | 'date' | 'time';
  className?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={`block ${className}`}>
      <EditorLabel>{label}</EditorLabel>
      <input
        type={type}
        min={type === 'number' ? '0' : undefined}
        step={type === 'number' ? '0.01' : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
      />
    </label>
  );
}

function EditorLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-black uppercase tracking-[0.07em] text-slate-500">
      {children}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'sky' | 'amber' | 'emerald' | 'rose';
}) {
  const styles = {
    sky: 'border-sky-200 bg-sky-50 text-sky-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
  };

  return (
    <div className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 ${styles[tone]}`}>
      <span className="text-[9px] font-black uppercase tracking-[0.05em]">{label}</span>
      <span className="text-base font-black">{value}</span>
    </div>
  );
}

function SectionHeading({
  title,
  description,
  count,
}: {
  title: string;
  description: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2">
      <div>
        <h3 className="text-sm font-black text-slate-950">{title}</h3>
        <p className="mt-0.5 text-[11px] text-slate-500">{description}</p>
      </div>
      <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-700">
        {count}
      </span>
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: ReservationSortKey;
  sort: ReservationSortState;
  onSort: (key: ReservationSortKey) => void;
}) {
  const isActive = sort.key === sortKey;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`flex min-w-0 items-center gap-1 text-left transition ${
        isActive ? 'text-cyan-800' : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      <span className="truncate">{label}</span>
      <span className={`text-[9px] ${isActive ? 'opacity-100' : 'opacity-25'}`}>
        {isActive ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </button>
  );
}

function CarCell({ reservation }: { reservation: WebsiteReservation }) {
  return (
    <div className="min-w-0 pr-3">
      <p className="truncate text-xs font-bold text-slate-800">{reservation.carName}</p>
      <span className="mt-0.5 inline-flex rounded border border-cyan-200 bg-cyan-50 px-1.5 py-0.5 text-[9px] font-black text-cyan-800">
        GROUP {reservation.groupCode}
      </span>
    </div>
  );
}

function SourceCell({ reservation }: { reservation: WebsiteReservation }) {
  return (
    <span className="mr-3 w-fit truncate rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-black text-cyan-800">
      {reservation.sourceSiteName || 'Unknown site'}
    </span>
  );
}

function LicenceStatusBadge({ reservation }: { reservation: WebsiteReservation }) {
  const uploaded = Boolean(reservation.licenceFrontUrl || reservation.licenceBackUrl || reservation.licenceUploadedAt);
  return (
    <span
      className={`mt-1 inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] ${
        uploaded
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-slate-200 bg-slate-50 text-slate-500'
      }`}
    >
      {uploaded ? 'Licence uploaded' : 'No licence'}
    </span>
  );
}

function CancellationStatusBadge({ reservation }: { reservation: WebsiteReservation }) {
  if (!reservation.cancellationRequested) return null;
  return (
    <span className="mt-1 inline-flex w-fit items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-rose-700">
      Cancellation requested
    </span>
  );
}

const extractLicenceStoragePath = (url: string) => {
  const cleanUrl = url.trim();
  const bucketMarker = `${DRIVER_LICENCE_STORAGE_BUCKET}/`;

  try {
    const parsedUrl = new URL(cleanUrl);
    const publicMarker = `/storage/v1/object/public/${bucketMarker}`;
    const signedMarker = `/storage/v1/object/sign/${bucketMarker}`;
    const rawMarker = `/storage/v1/object/${bucketMarker}`;
    const matchingMarker = [publicMarker, signedMarker, rawMarker].find((marker) =>
      parsedUrl.pathname.includes(marker),
    );

    if (matchingMarker) {
      return decodeURIComponent(parsedUrl.pathname.split(matchingMarker)[1] || '');
    }
  } catch {
    // Stored value may already be a bucket-relative object path.
  }

  return cleanUrl
    .replace(/^\/+/, '')
    .replace(/^public\//, '')
    .replace(new RegExp(`^${DRIVER_LICENCE_STORAGE_BUCKET}/`), '')
    .replace(new RegExp(`^storage/v1/object/public/${DRIVER_LICENCE_STORAGE_BUCKET}/`), '');
};

const resolveLicencePreviewUrl = async (url: string) => {
  const storagePath = extractLicenceStoragePath(url);
  if (!storagePath) return url;

  const { data, error } = await supabase.storage
    .from(DRIVER_LICENCE_STORAGE_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (!error && data?.signedUrl) {
    return data.signedUrl;
  }

  console.warn('Licence preview signed URL warning', {
    bucket: DRIVER_LICENCE_STORAGE_BUCKET,
    storagePath,
    error,
  });

  return url.startsWith('http')
    ? url
    : supabase.storage.from(DRIVER_LICENCE_STORAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
};

function LicencePreview({ label, url }: { label: string; url: string }) {
  const [previewUrl, setPreviewUrl] = useState(url);
  const [previewFailed, setPreviewFailed] = useState(false);
  const storagePath = extractLicenceStoragePath(url);
  const isPdf = storagePath.toLowerCase().endsWith('.pdf') || url.toLowerCase().includes('.pdf');
  const isImage = /\.(png|jpe?g|webp|gif|bmp)$/i.test(storagePath.split('?')[0] || url.split('?')[0]);

  useEffect(() => {
    let cancelled = false;

    void resolveLicencePreviewUrl(url).then((resolvedUrl) => {
      if (!cancelled) setPreviewUrl(resolvedUrl);
    });

    return () => {
      cancelled = true;
    };
  }, [storagePath, url]);

  return (
    <div className="rounded-lg border border-emerald-100 bg-white p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.07em] text-slate-500">Licence {label}</p>
        <a href={previewUrl || url} target="_blank" rel="noreferrer" className="text-xs font-black text-emerald-700 underline">
          Open
        </a>
      </div>
      {isPdf ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs font-bold text-slate-500">
          PDF uploaded
        </div>
      ) : isImage && !previewFailed ? (
        <img
          src={previewUrl || url}
          alt={`Licence ${label}`}
          onError={() => setPreviewFailed(true)}
          className="h-36 w-full rounded-lg border border-slate-100 object-contain"
        />
      ) : (
        <div className="flex h-36 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 text-center text-xs font-bold text-slate-500">
          <span>Preview unavailable</span>
          <span className="mt-1 text-[10px] font-semibold text-slate-400">Use Open to view the uploaded file.</span>
        </div>
      )}
    </div>
  );
}

function DateCell({ date, time }: { date: string; time: string }) {
  return (
    <div>
      <p className="text-[11px] font-black text-slate-800">{formatDate(date)}</p>
      <p className="text-[10px] font-bold text-cyan-700">{time}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <span className={`w-fit rounded-full border px-1.5 py-0.5 text-[9px] font-black ${statusStyles[status]}`}>
      {status}
    </span>
  );
}

function TextAction({
  label,
  icon: Icon,
  tone,
  onClick,
}: {
  label: string;
  icon: typeof Eye;
  tone: 'secondary' | 'primary' | 'warning' | 'danger' | 'success';
  onClick: () => void;
}) {
  const styles = {
    secondary: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100',
    primary: 'border-cyan-700 bg-cyan-700 text-white hover:bg-cyan-800',
    success: 'border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800',
    warning: 'border-amber-500 bg-amber-500 text-white hover:bg-amber-600',
    danger: 'border-rose-600 bg-rose-600 text-white hover:bg-rose-700',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex h-7 items-center justify-center gap-1 whitespace-nowrap rounded-md border px-2 text-[8.5px] font-black transition ${styles[tone]}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

function EmailComposerModal({
  reservation,
  initialTemplate,
  templates,
  siteName,
  logoImage,
  websiteUrl,
  domain,
  secondaryColor,
  onClose,
  onSend,
  onFeedback,
}: {
  reservation: WebsiteReservation;
  initialTemplate: EmailTemplateId;
  templates: ReturnType<typeof loadBookingEngineConfig>['emailSettings']['templates'];
  siteName: string;
  logoImage: string;
  websiteUrl: string;
  domain: string;
  secondaryColor: string;
  onClose: () => void;
  onSend: (payload: {
    recipient: string;
    subject: string;
    message: string;
    templateId: EmailTemplateId;
    paymentLink: string;
  }) => void | Promise<void>;
  onFeedback: (message: string) => void;
}) {
  const customerTemplateOrder: EmailTemplateId[] = [
    'customer_confirmed_reservation',
    'customer_onrequest_received',
    'customer_confirmed_after_review',
    'customer_payment_request',
    'customer_reminder',
    'customer_cancellation',
    'customEmail',
  ];
  const templateModeLabels: Partial<Record<EmailTemplateId, string>> = {
    customer_payment_request: 'Manual',
    customer_reminder: 'Manual',
    customer_cancellation: 'Manual Action',
    customEmail: 'Manual',
  };
  const getComposerMessage = (nextTemplateId: EmailTemplateId) => {
    const baseMessage = templates[nextTemplateId]?.message || '';
    if (
      nextTemplateId === 'customer_reminder' &&
      !baseMessage.includes('https://g.page/r/CYOr9zt3_-KVEBM/review')
    ) {
      return `${baseMessage}\n\nReview link: https://g.page/r/CYOr9zt3_-KVEBM/review`;
    }
    return baseMessage;
  };
  const safeInitialTemplate = customerTemplateOrder.includes(initialTemplate)
    ? initialTemplate
    : 'customer_confirmed_reservation';
  const initialContent = templates[safeInitialTemplate];
  const initialPaymentLink = reservation.paymentLink || '';
  const [templateId, setTemplateId] = useState<EmailTemplateId>(safeInitialTemplate);
  const [recipient, setRecipient] = useState(reservation.email);
  const [subject, setSubject] = useState(replaceEmailVariables(initialContent.subject, reservation));
  const [message, setMessage] = useState(replaceEmailVariables(getComposerMessage(safeInitialTemplate), reservation));
  const [paymentLink, setPaymentLink] = useState(initialPaymentLink);
  const [composerWarning, setComposerWarning] = useState('');
  const [activeField, setActiveField] = useState<EmailField>('message');
  const subjectRef = useRef<HTMLInputElement | null>(null);
  const messageRef = useRef<HTMLTextAreaElement | null>(null);
  const emailContext = {
    ...toEmailReservationContext(reservation),
    paymentLink: paymentLink.trim(),
  };
  const renderedPreviewMessage = renderBookingEmailTemplate(message, emailContext);
  const paymentSafePreviewMessage =
    templateId === 'customer_payment_request'
      ? ensurePaymentReminderDetails(renderedPreviewMessage, emailContext)
      : renderedPreviewMessage;
  const manualPreviewMessage =
    templateId === 'customer_payment_request' &&
    paymentLink.trim() &&
    !paymentSafePreviewMessage.includes(paymentLink.trim())
      ? `${paymentSafePreviewMessage}\n\nPayment link: ${paymentLink.trim()}`
      : paymentSafePreviewMessage;
  const previewHtml = buildBookingEmailHtml({
    site: {
      siteId: 'preview',
      siteName,
      adminEmail: '',
      logoImage,
      websiteUrl,
      domain,
      secondaryColor,
    },
    reservation: emailContext,
    intro: getBookingEmailIntro(templateId),
    templateId,
    manualMessage: manualPreviewMessage,
  });

  const applyTemplate = (nextTemplateId: EmailTemplateId) => {
    const template = templates[nextTemplateId];
    setTemplateId(nextTemplateId);
    setRecipient(reservation.email);
    setSubject(replaceEmailVariables(template.subject, reservation));
    setMessage(replaceEmailVariables(getComposerMessage(nextTemplateId), reservation));
    setPaymentLink(reservation.paymentLink || '');
    setComposerWarning('');
    setActiveField('message');
  };

  const insertVariable = (variable: string) => {
    const field = activeField || 'message';
    const element = field === 'subject' ? subjectRef.current : messageRef.current;
    const value = field === 'subject' ? subject : message;
    const start = element?.selectionStart ?? value.length;
    const end = element?.selectionEnd ?? value.length;
    const nextValue = `${value.slice(0, start)}${variable}${value.slice(end)}`;

    if (field === 'subject') {
      setSubject(nextValue);
    } else {
      setMessage(nextValue);
    }

    window.requestAnimationFrame(() => {
      const nextElement = field === 'subject' ? subjectRef.current : messageRef.current;
      const caret = start + variable.length;
      nextElement?.focus();
      nextElement?.setSelectionRange(caret, caret);
    });
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[90%] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-[#073f5d] text-sm font-black text-white">
              {logoImage ? (
                <img src={logoImage} alt={siteName} className="h-full w-full object-contain bg-white p-1" />
              ) : (
                <span>AC</span>
              )}
            </div>
            <div>
              <p className="font-mono text-xs font-black text-cyan-700">{reservation.id}</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">Email composer</h3>
              <p className="mt-1 text-xs text-slate-500">
                {siteName} - Car rental - Internal SMTP
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100"
            aria-label="Close email composer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4 p-5">
            <label className="block">
              <EditorLabel>Template</EditorLabel>
              <select
                value={templateId}
                onChange={(event) => applyTemplate(event.target.value as EmailTemplateId)}
                className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              >
                {customerTemplateOrder.map((id) => {
                  const template = templates[id];
                  return (
                  <option key={id} value={id}>
                    {template.label}{templateModeLabels[id] ? ` - ${templateModeLabels[id]}` : ''}
                  </option>
                  );
                })}
              </select>
            </label>

            {templateId === 'customer_payment_request' && (
              <label className="block rounded-xl border border-amber-200 bg-amber-50 p-3">
                <EditorLabel>Payment link</EditorLabel>
                <input
                  type="url"
                  value={paymentLink}
                  onChange={(event) => {
                    setPaymentLink(event.target.value);
                    setComposerWarning('');
                  }}
                  placeholder="https://..."
                  className="mt-1.5 h-10 w-full rounded-lg border border-amber-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                />
                <p className="mt-1.5 text-xs font-semibold text-amber-900">
                  Required before sending a Payment Reminder.
                </p>
              </label>
            )}

            <label className="block">
              <EditorLabel>To</EditorLabel>
              <input
                type="email"
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </label>

            <label className="block">
              <EditorLabel>Subject</EditorLabel>
              <input
                ref={subjectRef}
                value={subject}
                onFocus={() => setActiveField('subject')}
                onChange={(event) => setSubject(event.target.value)}
                className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </label>

            <label className="block">
              <EditorLabel>Message</EditorLabel>
              <textarea
                ref={messageRef}
                value={message}
                onFocus={() => setActiveField('message')}
                onChange={(event) => setMessage(event.target.value)}
                rows={12}
                className="mt-1.5 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
            {templateId === 'customer_reminder' && !message.includes('https://g.page/r/CYOr9zt3_-KVEBM/review') && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
                Review Request should include: https://g.page/r/CYOr9zt3_-KVEBM/review
              </p>
            )}
            {composerWarning && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                {composerWarning}
              </p>
            )}
          </div>

          <aside className="border-t border-slate-200 bg-slate-50 p-5 lg:border-l lg:border-t-0">
            <h4 className="text-sm font-black text-slate-950">Template variables</h4>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Click to insert into the focused subject or message field.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {emailVariables.map((variable) => (
                <button
                  key={variable}
                  type="button"
                  onClick={() => insertVariable(variable)}
                  className="rounded-lg border border-cyan-200 bg-white px-2.5 py-1.5 font-mono text-[11px] font-bold text-cyan-800 transition hover:border-cyan-400 hover:bg-cyan-50"
                >
                  {variable}
                </button>
              ))}
            </div>
            <div className="mt-5 border-t border-slate-200 pt-5">
              <h4 className="text-sm font-black text-slate-950">Final email preview</h4>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                This is the cleaned HTML body sent through internal SMTP.
              </p>
              <iframe
                title="Final reservation email preview"
                srcDoc={previewHtml}
                className="mt-3 h-[430px] w-full rounded-xl border border-slate-300 bg-white"
              />
            </div>
          </aside>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onFeedback('Draft saved locally.')}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-700 bg-slate-700 px-4 text-sm font-black text-white transition hover:bg-slate-800"
          >
            <Save className="h-4 w-4" />
            Save draft
          </button>
          <button
            type="button"
            onClick={() => {
              if (templateId === 'customer_payment_request' && !paymentLink.trim()) {
                setComposerWarning('Payment link is required before sending a Payment Reminder.');
                return;
              }
              void onSend({ recipient, subject, message, templateId, paymentLink });
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-cyan-700 bg-cyan-700 px-4 text-sm font-black text-white transition hover:bg-cyan-800"
          >
            <Mail className="h-4 w-4" />
            Send email
          </button>
        </footer>
      </div>
    </div>
  );
}

function DeleteConfirmation({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <Trash2 className="h-5 w-5" />
          </span>
          <h3 className="mt-4 text-lg font-black text-slate-950">
            Are you sure you want to delete this reservation?
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            This removes the Supabase website reservation.
          </p>
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-rose-600 bg-rose-600 px-4 text-sm font-black text-white transition hover:bg-rose-700"
          >
            <Trash2 className="h-4 w-4" />
            Delete reservation
          </button>
        </footer>
      </div>
    </div>
  );
}

function CancelReservationConfirmation({
  onClose,
  onCancelWithoutEmail,
  onCancelAndSendEmail,
}: {
  onClose: () => void;
  onCancelWithoutEmail: () => void;
  onCancelAndSendEmail: () => void;
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <X className="h-5 w-5" />
          </span>
          <h3 className="mt-4 text-lg font-black text-slate-950">
            Cancel reservation and send cancellation email?
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            The reservation status will become CANCELLED. The row stays in Supabase and can still be viewed.
          </p>
        </div>
        <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onCancelWithoutEmail}
            className="h-10 rounded-lg border border-amber-600 bg-amber-600 px-4 text-sm font-black text-white transition hover:bg-amber-700"
          >
            Cancel Without Email
          </button>
          <button
            type="button"
            onClick={onCancelAndSendEmail}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-rose-600 bg-rose-600 px-4 text-sm font-black text-white transition hover:bg-rose-700"
          >
            <Mail className="h-4 w-4" />
            Cancel + Send Email
          </button>
        </footer>
      </div>
    </div>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="px-5 py-8 text-center text-sm font-semibold text-slate-500">
      {message}
    </div>
  );
}
