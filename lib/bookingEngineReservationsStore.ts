import type { BookingEngineEmailTemplateId } from './bookingEngineLocalConfig';

export type BookingEngineReservationStatus =
  | 'New Request'
  | 'Under Review'
  | 'Ready'
  | 'Cancelled';

export type BookingEngineReservationExtra = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type BookingEngineReservationCustomField = {
  id: string;
  label: string;
  fieldType: string;
  value: string;
};

export type BookingEngineWebsiteReservation = {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  hotelRoom: string;
  flightNumber: string;
  notes: string;
  pickupLocation: string;
  returnLocation: string;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
  carName: string;
  groupCode: string;
  rentalDays: number;
  rentalAmount: number;
  extras: BookingEngineReservationExtra[];
  couponCode: string;
  couponDiscount: number;
  customFields: BookingEngineReservationCustomField[];
  paymentMethod: string;
  total: number;
  status: BookingEngineReservationStatus;
  createdAt: string;
  processed: boolean;
  customerEmailTemplateId: BookingEngineEmailTemplateId;
  customerEmailTemplateLabel: string;
  adminEmailPreviewCreated: boolean;
  customerEmailPreviewCreated: boolean;
  emailStatus: 'Preview only / Not sent' | 'Not sent / Preview only';
};

export type BookingEngineReservationCreateInput = Omit<
  BookingEngineWebsiteReservation,
  'id' | 'status' | 'createdAt' | 'processed'
>;

const STORAGE_KEY = 'autoclub_booking_engine_reservations_v1';
export const BOOKING_ENGINE_RESERVATIONS_CHANGED = 'autoclub-booking-engine-reservations-changed';

const defaultReservations: BookingEngineWebsiteReservation[] = [
  {
    id: 'ACR-20260615-1047',
    customerName: 'Lucia Rossi',
    phone: '+39 333 870 1220',
    email: 'lucia.rossi@example.com',
    hotelRoom: 'Lindos Bay 204',
    flightNumber: '',
    pickupDate: '2026-06-21',
    pickupTime: '12:00',
    pickupLocation: 'Lindos',
    returnDate: '2026-06-28',
    returnTime: '10:00',
    returnLocation: 'Rhodes Airport',
    carName: 'Fiat Panda or similar',
    groupCode: 'A',
    rentalDays: 7,
    rentalAmount: 280,
    extras: [{ id: 'extra-infant-seat', name: 'Infant Seat', quantity: 1, unitPrice: 7, total: 49 }],
    couponCode: '',
    couponDiscount: 0,
    customFields: [],
    total: 329,
    paymentMethod: 'Bank Transfer',
    status: 'New Request',
    notes: 'Infant seat requested.',
    createdAt: '2026-06-15T10:47:00.000Z',
    processed: false,
    customerEmailTemplateId: 'customerRequestReceived',
    customerEmailTemplateLabel: 'Customer Reservation Received',
    adminEmailPreviewCreated: true,
    customerEmailPreviewCreated: true,
    emailStatus: 'Not sent / Preview only',
  },
  {
    id: 'ACR-20260615-1042',
    customerName: 'Marco Bianchi',
    phone: '+39 347 555 0194',
    email: 'marco.bianchi@example.com',
    hotelRoom: 'Rhodes Town 18',
    flightNumber: 'FR 9821',
    pickupDate: '2026-06-15',
    pickupTime: '10:30',
    pickupLocation: 'Rhodes Airport',
    returnDate: '2026-06-20',
    returnTime: '09:00',
    returnLocation: 'Rhodes Airport',
    carName: 'Peugeot 108 or similar',
    groupCode: 'A',
    rentalDays: 5,
    rentalAmount: 245,
    extras: [],
    couponCode: '',
    couponDiscount: 0,
    customFields: [],
    total: 245,
    paymentMethod: 'Payment Link',
    status: 'New Request',
    notes: 'Flight FR 9821.',
    createdAt: '2026-06-15T10:42:00.000Z',
    processed: false,
    customerEmailTemplateId: 'customerRequestReceived',
    customerEmailTemplateLabel: 'Customer Reservation Received',
    adminEmailPreviewCreated: true,
    customerEmailPreviewCreated: true,
    emailStatus: 'Not sent / Preview only',
  },
  {
    id: 'ACR-20260614-1038',
    customerName: 'Claire Martin',
    phone: '+33 6 44 21 08 77',
    email: 'claire.martin@example.com',
    hotelRoom: 'Old Town Suites',
    flightNumber: '',
    pickupDate: '2026-06-17',
    pickupTime: '14:00',
    pickupLocation: 'Rhodes Town',
    returnDate: '2026-06-24',
    returnTime: '11:00',
    returnLocation: 'Rhodes Town',
    carName: 'Peugeot 208 or similar',
    groupCode: 'C',
    rentalDays: 7,
    rentalAmount: 392,
    extras: [],
    couponCode: '',
    couponDiscount: 0,
    customFields: [],
    total: 392,
    paymentMethod: 'Card',
    status: 'Under Review',
    notes: 'Availability review requested.',
    createdAt: '2026-06-14T10:38:00.000Z',
    processed: false,
    customerEmailTemplateId: 'customerOnRequestReceived',
    customerEmailTemplateLabel: 'Customer On Request Received',
    adminEmailPreviewCreated: true,
    customerEmailPreviewCreated: true,
    emailStatus: 'Not sent / Preview only',
  },
  {
    id: 'ACR-20260613-1031',
    customerName: 'Jan Novak',
    phone: '+420 602 118 442',
    email: 'jan.novak@example.com',
    hotelRoom: 'Faliraki Blue',
    flightNumber: '',
    pickupDate: '2026-06-18',
    pickupTime: '08:30',
    pickupLocation: 'Faliraki',
    returnDate: '2026-06-26',
    returnTime: '18:00',
    returnLocation: 'Rhodes Airport',
    carName: 'Peugeot 2008 or similar',
    groupCode: 'D1',
    rentalDays: 8,
    rentalAmount: 688,
    extras: [],
    couponCode: '',
    couponDiscount: 0,
    customFields: [],
    total: 688,
    paymentMethod: 'Payment Link',
    status: 'Ready',
    notes: 'Payment completed.',
    createdAt: '2026-06-13T10:31:00.000Z',
    processed: true,
    customerEmailTemplateId: 'customerBookingConfirmed',
    customerEmailTemplateLabel: 'Customer Booking Confirmed',
    adminEmailPreviewCreated: true,
    customerEmailPreviewCreated: true,
    emailStatus: 'Not sent / Preview only',
  },
  {
    id: 'ACR-20260612-1026',
    customerName: 'Anna Keller',
    phone: '+49 151 242 9981',
    email: 'anna.keller@example.com',
    hotelRoom: 'Ixia Grand',
    flightNumber: '',
    pickupDate: '2026-06-15',
    pickupTime: '16:30',
    pickupLocation: 'Ixia',
    returnDate: '2026-06-19',
    returnTime: '12:00',
    returnLocation: 'Ixia',
    carName: 'Hyundai i10 or similar',
    groupCode: 'B',
    rentalDays: 4,
    rentalAmount: 196,
    extras: [],
    couponCode: '',
    couponDiscount: 0,
    customFields: [],
    total: 196,
    paymentMethod: 'Pay on Arrival',
    status: 'Cancelled',
    notes: 'Cancelled due to flight changes.',
    createdAt: '2026-06-12T10:26:00.000Z',
    processed: true,
    customerEmailTemplateId: 'customerRequestReceived',
    customerEmailTemplateLabel: 'Customer Reservation Received',
    adminEmailPreviewCreated: true,
    customerEmailPreviewCreated: true,
    emailStatus: 'Not sent / Preview only',
  },
];

const isBrowser = () => typeof window !== 'undefined';

const normalizeReservation = (reservation: Partial<BookingEngineWebsiteReservation>): BookingEngineWebsiteReservation => ({
  id: reservation.id || '',
  customerName: reservation.customerName || '',
  phone: reservation.phone || '',
  email: reservation.email || '',
  hotelRoom: reservation.hotelRoom || '',
  flightNumber: reservation.flightNumber || '',
  notes: reservation.notes || '',
  pickupLocation: reservation.pickupLocation || '',
  returnLocation: reservation.returnLocation || '',
  pickupDate: reservation.pickupDate || '',
  pickupTime: reservation.pickupTime || '',
  returnDate: reservation.returnDate || '',
  returnTime: reservation.returnTime || '',
  carName: reservation.carName || '',
  groupCode: reservation.groupCode || '',
  rentalDays: Number(reservation.rentalDays || 1),
  rentalAmount: Number(reservation.rentalAmount || 0),
  extras: Array.isArray(reservation.extras) ? reservation.extras : [],
  couponCode: reservation.couponCode || '',
  couponDiscount: Number(reservation.couponDiscount || 0),
  customFields: Array.isArray(reservation.customFields) ? reservation.customFields : [],
  paymentMethod: reservation.paymentMethod || '',
  total: Number(reservation.total || 0),
  status: reservation.status || 'New Request',
  createdAt: reservation.createdAt || new Date().toISOString(),
  processed: Boolean(reservation.processed),
  customerEmailTemplateId: reservation.customerEmailTemplateId || 'customerRequestReceived',
  customerEmailTemplateLabel:
    reservation.customerEmailTemplateLabel === 'Customer Request Received'
      ? 'Customer Reservation Received'
      : reservation.customerEmailTemplateLabel || 'Customer Reservation Received',
  adminEmailPreviewCreated: reservation.adminEmailPreviewCreated ?? true,
  customerEmailPreviewCreated: reservation.customerEmailPreviewCreated ?? true,
  emailStatus: reservation.emailStatus === 'Preview only / Not sent'
    ? 'Not sent / Preview only'
    : reservation.emailStatus || 'Not sent / Preview only',
});

const emitReservationChange = () => {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(BOOKING_ENGINE_RESERVATIONS_CHANGED));
};

export const loadBookingEngineReservations = () => {
  if (!isBrowser()) return defaultReservations;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    saveBookingEngineReservations(defaultReservations);
    return defaultReservations;
  }

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.map(normalizeReservation) : defaultReservations;
  } catch {
    return defaultReservations;
  }
};

export const saveBookingEngineReservations = (reservations: BookingEngineWebsiteReservation[]) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations.map(normalizeReservation)));
  emitReservationChange();
};

export const updateBookingEngineReservations = (
  updater: (reservations: BookingEngineWebsiteReservation[]) => BookingEngineWebsiteReservation[],
) => {
  const nextReservations = updater(loadBookingEngineReservations());
  saveBookingEngineReservations(nextReservations);
  return nextReservations;
};

const formatReservationIdDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

export const addBookingEngineReservation = (input: BookingEngineReservationCreateInput) => {
  const now = new Date();
  const datePart = formatReservationIdDate(now);
  const reservations = loadBookingEngineReservations();
  const sameDayCount = reservations.filter((reservation) =>
    reservation.id.startsWith(`ACR-${datePart}-`),
  ).length;
  const id = `ACR-${datePart}-${String(sameDayCount + 1).padStart(4, '0')}`;
  const reservation = normalizeReservation({
    ...input,
    id,
    status: 'New Request',
    createdAt: now.toISOString(),
    processed: false,
  });

  saveBookingEngineReservations([reservation, ...reservations]);
  return reservation;
};

export const subscribeBookingEngineReservations = (listener: () => void) => {
  if (!isBrowser()) return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };

  window.addEventListener(BOOKING_ENGINE_RESERVATIONS_CHANGED, listener);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(BOOKING_ENGINE_RESERVATIONS_CHANGED, listener);
    window.removeEventListener('storage', handleStorage);
  };
};
