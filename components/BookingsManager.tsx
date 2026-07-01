'use client';

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import {
  createReservation,
  deleteReservation,
  fetchReservations,
  updateReservation,
  type ReservationRequestPayload,
  type ReservationRequestRecord,
} from '@/lib/reservationsApi';
import {
  createReservationEvent,
  fetchReservationEvents,
  type ReservationEventRecord,
} from '@/lib/reservationEventsApi';
import {
  createNotificationOnce,
  markReservationNotificationsRead,
} from '@/lib/notificationsApi';
import {
  fetchGroupStock,
  upsertGroupStock,
} from '@/lib/reservationAvailabilityApi';
import {
  checkGroupAvailability,
  type GroupAvailabilityResult,
} from '@/lib/reservationAvailabilityEngine';
import { DEFAULT_VEHICLE_GROUP_CODES, fetchVehicleGroups } from '@/lib/vehicleGroupsApi';

// Paste the real Make webhook URL here for both Send reminder buttons.
const SEND_REMINDER_WEBHOOK_URL = 'https://hook.eu1.make.com/8hq66ccdrcx0aa56ui43o6ylpgq8bff5';
const WHATSAPP_SEND_WEBHOOK_URL = 'https://hook.eu1.make.com/d2vag9sqf3q6akb9iwk4jx8rbuo84tx2';
const REMINDER_SEND_DELAY_MS = 5000;
const BULK_REMINDER_DELAY_MS = 10000;
const RESERVATIONS_AUTO_REFRESH_MS = 4 * 60 * 1000;

type ReservationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'RETURN';
type LicenceState = 'uploaded' | 'empty';
type VehicleGroup = string;
type ReservationLanguage = 'English' | 'French' | 'Italian' | 'German' | 'Czech';
type QuickReservationFilter =
  | 'latest20'
  | 'returnsToday'
  | 'pickupsToday'
  | 'pickupsTomorrow'
  | 'returnsTomorrow'
  | 'all';
type ReservationListMode = 'active' | 'returned';
type ReservationSortKey =
  | 'phone'
  | 'vehicleGroup'
  | 'agency'
  | 'representative'
  | 'hotelRoom'
  | 'pickupDate'
  | 'returnDate'
  | 'pickupTime'
  | 'returnTime'
  | 'price'
  | 'status'
  | 'language'
  | 'sendReturn'
  | 'confirmationSent'
  | 'extras'
  | 'licenceFront'
  | 'modified';
type ReservationSortState = {
  key: ReservationSortKey;
  direction: 'asc' | 'desc';
};

type BookingHealthStatus = {
  label: string;
  state: 'active' | 'idle' | 'error';
  lastEventAt: string;
};

type WhatsappMessage = {
  id: string;
  from: 'AutoClub' | 'Customer';
  text: string;
  createdAt: string;
  isUnread?: boolean;
};

type WhatsappMessageRow = {
  id: string;
  reservation_id: string;
  phone?: string | null;
  message?: string | null;
  direction?: string | null;
  is_read?: boolean | null;
  created_at?: string | null;
};

type UnreadWhatsappReservationRow = {
  reservation_id?: string | number | null;
  message?: string | null;
};

type WorkflowEvent = {
  id: string;
  eventType: string;
  message: string;
  createdAt: string;
};

type BookingExtras = {
  baby_seat_qty: number;
  booster_qty: number;
  infant_qty: number;
};

type AvailabilityDraftRow = {
  vehicleGroup: string;
  allowedStock: string;
  active: boolean;
  notes: string;
};

type LicenceViewerDocument = {
  title: string;
  url: string;
};

type LegacyBookingExtras = Partial<BookingExtras> & {
  babySeat?: unknown;
  booster?: unknown;
  infantSeat?: unknown;
  infant_seat_qty?: unknown;
};

type Reservation = {
  id: string;
  createdAt: string;
  lastModifiedAt: string;
  phoneWhatsapp: string;
  name: string;
  email: string;
  vehicleGroup: VehicleGroup;
  agency: string;
  representative: string;
  hotelRoom: string;
  pickupDate: string;
  returnDate: string;
  pickupTime: string;
  returnTime: string;
  price: number | null;
  status: ReservationStatus;
  language: ReservationLanguage;
  confirmationSent: boolean;
  sendReturn: boolean;
  returnReminderSent: boolean;
  returnReminderSentAt: string;
  returnConfirmed: boolean;
  returnConfirmedAt: string;
  licenceFront: LicenceState;
  licenceBack: LicenceState;
  licenceFrontUrl: string;
  licenceBackUrl: string;
  notes: string;
  extras: BookingExtras;
  whatsappMessages?: WhatsappMessage[];
  workflowEvents?: WorkflowEvent[];
};

type ReservationForm = {
  phoneWhatsapp: string;
  name: string;
  email: string;
  vehicleGroup: VehicleGroup;
  agency: string;
  representative: string;
  hotelRoom: string;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
  price: string;
  notes: string;
  status: ReservationStatus;
  language: ReservationLanguage;
  extras: BookingExtras;
};

type AgencyRow = {
  id: number;
  name: string;
};

type RepresentativeRow = {
  id: number;
  name: string;
  agency_id: number;
};

const fallbackAgencyRepresentatives: Record<string, string[]> = {
  Drivealia: ['Maria K.', 'Nikos P.', 'Elena T.'],
  'Apollo / Cardlink': ['Dimitris', 'Sofia', 'George'],
  TUI: ['Elena', 'Marios'],
  'Hotel Desk': ['Front Office', 'George'],
  'Direct WhatsApp': ['Office', 'Nikos'],
  'Walk-in': ['Office'],
};

const fallbackAgencies = Object.keys(fallbackAgencyRepresentatives);
const statuses: Array<ReservationStatus | 'ALL'> = ['ALL', 'PENDING', 'ACCEPTED', 'REJECTED', 'RETURN'];
const languageOptions: ReservationLanguage[] = ['English', 'French', 'Italian', 'German', 'Czech'];
const quickReservationFilters: Array<{ id: QuickReservationFilter; label: string }> = [
  { id: 'returnsToday', label: 'Επιστροφές σήμερα' },
  { id: 'pickupsToday', label: 'Παραδόσεις σήμερα' },
  { id: 'pickupsTomorrow', label: 'Παραδόσεις αύριο' },
  { id: 'all', label: 'Όλες' },
];
const bookingTableColumns: Array<{ key: ReservationSortKey; label: string; align?: 'right'; className?: string }> = [
  { key: 'phone', label: 'Phone WhatsApp' },
  { key: 'vehicleGroup', label: 'Vehicle Group' },
  { key: 'agency', label: 'Agency' },
  { key: 'representative', label: 'Representative' },
  { key: 'hotelRoom', label: 'Hotel & Room' },
  { key: 'pickupDate', label: 'Pickup Date' },
  { key: 'returnDate', label: 'Return Date' },
  { key: 'pickupTime', label: 'Pickup Time' },
  { key: 'returnTime', label: 'Return Time' },
  { key: 'price', label: 'Price', align: 'right' },
  { key: 'status', label: 'Status' },
  { key: 'language', label: 'Language' },
  { key: 'sendReturn', label: 'Send Return' },
  { key: 'confirmationSent', label: 'Confirmation Sent' },
  { key: 'extras', label: 'Extras' },
  { key: 'licenceFront', label: 'Driving Licence' },
  { key: 'modified', label: 'Modified', className: 'w-[82px]' },
];
const statusActiveClasses: Record<ReservationStatus, string> = {
  PENDING: 'border-amber-400 bg-amber-100 text-amber-900 shadow-sm',
  ACCEPTED: 'border-emerald-400 bg-emerald-100 text-emerald-900 shadow-sm',
  REJECTED: 'border-rose-400 bg-rose-100 text-rose-900 shadow-sm',
  RETURN: 'border-cyan-400 bg-cyan-100 text-cyan-900 shadow-sm',
};
const statusSelectClasses: Record<ReservationStatus, string> = {
  PENDING: 'border-amber-300/45 text-amber-100 focus:border-amber-300/65',
  ACCEPTED: 'border-emerald-300/45 text-emerald-100 focus:border-emerald-300/65',
  REJECTED: 'border-rose-300/45 text-rose-100 focus:border-rose-300/65',
  RETURN: 'border-cyan-300/45 text-cyan-100 focus:border-cyan-300/65',
};
const defaultWhatsappMessages: WhatsappMessage[] = [
  { id: 'msg-default-1', from: 'AutoClub', text: 'Hello, your reservation request has been received.', createdAt: 'mock' },
  { id: 'msg-default-2', from: 'Customer', text: 'Can I send the licence photos here?', createdAt: 'mock' },
  { id: 'msg-default-3', from: 'AutoClub', text: 'Yes, please send front and back side of the licence.', createdAt: 'mock' },
];
const emptyExtras: BookingExtras = {
  baby_seat_qty: 0,
  booster_qty: 0,
  infant_qty: 0,
};

const initialForm: ReservationForm = {
  phoneWhatsapp: '',
  name: '',
  email: '',
  vehicleGroup: '',
  agency: fallbackAgencies[0],
  representative: fallbackAgencyRepresentatives[fallbackAgencies[0]][0],
  hotelRoom: '',
  pickupDate: '',
  pickupTime: '',
  returnDate: '',
  returnTime: '',
  price: '',
  notes: '',
  status: 'PENDING',
  language: 'English',
  extras: emptyExtras,
};

const money = (value: number | null) =>
  value === null ? '' : `€${value.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value: string) => {
  if (!value) return '-';

  const dateOnlyMatch = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateOnlyMatch) return value;

  const [, year, month, day] = dateOnlyMatch;
  return `${day}/${month}/${year}`;
};

const formatDateTime = (value: string) => (value ? new Date(value).toLocaleString('el-GR') : '-');
const formatTime = (value: string) =>
  value
    ? new Date(value).toLocaleTimeString('el-GR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-';
const formatCompactDateTime = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('el-GR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const latestValidTimestamp = (values: Array<string | undefined>) => {
  let latestValue = '';
  let latestTimestamp = Number.NEGATIVE_INFINITY;

  values.forEach((value) => {
    if (!value) return;
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp) || timestamp <= latestTimestamp) return;

    latestTimestamp = timestamp;
    latestValue = value;
  });

  return latestValue;
};

const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const todayDateValue = () => formatDateInputValue(new Date());

const tomorrowDateValue = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return formatDateInputValue(tomorrow);
};

const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
const isReminderSuccessFeedback = (feedback: string) =>
  feedback === 'Reminder sent.' || /^Sent \d+ reminders\. Failed 0\.$/.test(feedback);
const isReminderPendingFeedback = (feedback: string) => feedback.startsWith('Sending ');

const reservationSortValue = (reservation: Reservation) => {
  const lastModifiedAt = reservation.lastModifiedAt ? new Date(reservation.lastModifiedAt).getTime() : Number.NaN;

  if (Number.isFinite(lastModifiedAt)) {
    return lastModifiedAt;
  }

  const createdAt = reservation.createdAt ? new Date(reservation.createdAt).getTime() : Number.NaN;

  if (Number.isFinite(createdAt)) {
    return createdAt;
  }

  const pickupDate = reservation.pickupDate ? new Date(`${reservation.pickupDate}T00:00:00`).getTime() : Number.NaN;
  return Number.isFinite(pickupDate) ? pickupDate : 0;
};

const reservationTableSortValue = (reservation: Reservation, key: ReservationSortKey): string | number => {
  if (key === 'phone') return reservation.phoneWhatsapp.toLowerCase();
  if (key === 'vehicleGroup') return reservation.vehicleGroup.toLowerCase();
  if (key === 'agency') return reservation.agency.toLowerCase();
  if (key === 'representative') return reservation.representative.toLowerCase();
  if (key === 'hotelRoom') return (reservation.hotelRoom || reservation.name).toLowerCase();
  if (key === 'pickupDate') return reservation.pickupDate || '';
  if (key === 'returnDate') return reservation.returnDate || '';
  if (key === 'pickupTime') return reservation.pickupTime || '';
  if (key === 'returnTime') return reservation.returnTime || '';
  if (key === 'price') return reservation.price ?? -1;
  if (key === 'status') return reservation.status;
  if (key === 'language') return reservation.language;
  if (key === 'sendReturn') return reservation.sendReturn ? 1 : 0;
  if (key === 'confirmationSent') return reservation.confirmationSent ? 1 : 0;
  if (key === 'extras') {
    return reservation.extras.baby_seat_qty + reservation.extras.booster_qty + reservation.extras.infant_qty;
  }
  if (key === 'licenceFront') return reservation.licenceFrontUrl || reservation.licenceBackUrl ? 1 : 0;
  return reservationSortValue(reservation);
};

const compareReservationTableValues = (firstReservation: Reservation, secondReservation: Reservation, sort: ReservationSortState) => {
  const firstValue = reservationTableSortValue(firstReservation, sort.key);
  const secondValue = reservationTableSortValue(secondReservation, sort.key);
  const directionMultiplier = sort.direction === 'asc' ? 1 : -1;

  if (typeof firstValue === 'number' && typeof secondValue === 'number') {
    return (firstValue - secondValue) * directionMultiplier;
  }

  return String(firstValue).localeCompare(String(secondValue), 'el', { numeric: true, sensitivity: 'base' }) * directionMultiplier;
};

const withCurrentOption = (options: string[], current: string) =>
  current && !options.includes(current) ? [current, ...options] : options;

const modalFieldClass =
  'w-full rounded-[14px] border border-white/[0.08] bg-zinc-950/80 px-3.5 py-2.5 text-sm font-semibold text-zinc-50 outline-none transition placeholder:text-zinc-600 focus:border-sky-300/55 focus:bg-zinc-950 focus:ring-2 focus:ring-sky-400/10';

const openNativeDatePicker = (input: HTMLInputElement) => {
  if (input.type !== 'date') return;

  try {
    input.showPicker?.();
  } catch {
    return;
  }
};

const normalizeStatus = (status: unknown): ReservationStatus =>
  status === 'ACCEPTED' ? 'ACCEPTED' : status === 'REJECTED' ? 'REJECTED' : status === 'RETURN' ? 'RETURN' : 'PENDING';

const normalizeLanguage = (language: unknown): ReservationLanguage =>
  languageOptions.includes(language as ReservationLanguage) ? (language as ReservationLanguage) : 'English';

const clampExtraQuantity = (value: unknown) => {
  const quantity = Number(value);

  if (!Number.isFinite(quantity)) return 0;
  return Math.min(5, Math.max(0, Math.trunc(quantity)));
};

const normalizeExtras = (extras?: LegacyBookingExtras): BookingExtras => ({
  baby_seat_qty: clampExtraQuantity(extras?.baby_seat_qty ?? (extras?.babySeat ? 1 : 0)),
  booster_qty: clampExtraQuantity(extras?.booster_qty ?? (extras?.booster ? 1 : 0)),
  infant_qty: clampExtraQuantity(extras?.infant_qty ?? extras?.infant_seat_qty ?? (extras?.infantSeat ? 1 : 0)),
});

const hasSelectedExtras = (extras: BookingExtras) =>
  extras.baby_seat_qty > 0 || extras.booster_qty > 0 || extras.infant_qty > 0;

const hasLicenceUrl = (url?: string | null) => typeof url === 'string' && url.trim().length > 0;

const resolveLicenceUrl = (value?: string | null) => {
  if (!value) return '';
  const clean = value.trim();

  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }

  return `https://ilmwmzifvpnsajfehhir.supabase.co/storage/v1/object/public/${clean.replace(/^\/+/, '')}`;
};

const reservationRecordToReservation = (record: ReservationRequestRecord): Reservation => ({
  id: String(record.id),
  createdAt: record.created_at || '',
  lastModifiedAt: record.updated_at || record.last_modified || record.created_at || '',
  phoneWhatsapp: record.phone || '',
  name: record.customer_name || '',
  email: record.email || '',
  vehicleGroup: record.vehicle_group || 'A',
  agency: record.agency || '',
  representative: record.representative || '',
  hotelRoom: record.hotel_room || '',
  pickupDate: record.pickup_date || '',
  returnDate: record.return_date || '',
  pickupTime: record.pickup_time || '',
  returnTime: record.return_time || '',
  price: record.price === null || record.price === undefined ? null : Number(record.price),
  status: normalizeStatus(record.status),
  language: normalizeLanguage(record.language),
  confirmationSent: Boolean(record.confirmation_sent),
  sendReturn: Boolean(record.send_return),
  returnReminderSent: Boolean(record.return_reminder_sent),
  returnReminderSentAt: record.return_reminder_sent_at || '',
  returnConfirmed: Boolean(record.return_confirmed),
  returnConfirmedAt: record.return_confirmed_at || '',
  licenceFront: hasLicenceUrl(record.licence_front_url) ? 'uploaded' : 'empty',
  licenceBack: hasLicenceUrl(record.licence_back_url) ? 'uploaded' : 'empty',
  licenceFrontUrl: record.licence_front_url || '',
  licenceBackUrl: record.licence_back_url || '',
  notes: record.notes || '',
  extras: normalizeExtras({
    baby_seat_qty: record.baby_seat_qty || 0,
    booster_qty: record.booster_qty || 0,
    infant_qty: record.infant_qty || 0,
  }),
  whatsappMessages: defaultWhatsappMessages,
  workflowEvents: [],
});

const reservationToPayload = (reservation: Reservation): ReservationRequestPayload => ({
  phone: reservation.phoneWhatsapp.replace(/\s+/g, ''),
  email: reservation.email.trim() || null,
  customer_name: reservation.name.trim() || 'New Customer',
  hotel_room: reservation.hotelRoom.trim() || null,
  vehicle_group: reservation.vehicleGroup,
  agency: reservation.agency || null,
  representative: reservation.representative || null,
  pickup_date: reservation.pickupDate || null,
  return_date: reservation.returnDate || null,
  pickup_time: reservation.pickupTime || null,
  return_time: reservation.returnTime || null,
  price: reservation.price,
  status: reservation.status,
  language: reservation.language,
  send_return: reservation.sendReturn,
  return_reminder_sent: reservation.returnReminderSent,
  return_reminder_sent_at: reservation.returnReminderSentAt || null,
  return_confirmed: reservation.returnConfirmed,
  return_confirmed_at: reservation.returnConfirmedAt || null,
  baby_seat_qty: reservation.extras.baby_seat_qty,
  booster_qty: reservation.extras.booster_qty,
  infant_qty: reservation.extras.infant_qty,
  notes: reservation.notes || null,
});

const getReservationNotificationName = (reservation: Pick<Reservation, 'hotelRoom' | 'name'>) =>
  reservation.hotelRoom.trim() || reservation.name.trim() || 'Booking';

const getDrivingLicenceUrl = (reservation: Pick<Reservation, 'licenceFrontUrl' | 'licenceBackUrl'>) => {
  if (hasLicenceUrl(reservation.licenceFrontUrl)) return reservation.licenceFrontUrl;
  if (hasLicenceUrl(reservation.licenceBackUrl)) return reservation.licenceBackUrl;
  return '';
};

const getDrivingLicenceState = (reservation: Pick<Reservation, 'licenceFrontUrl' | 'licenceBackUrl'>): LicenceState =>
  hasLicenceUrl(reservation.licenceFrontUrl) || hasLicenceUrl(reservation.licenceBackUrl) ? 'uploaded' : 'empty';

const createReservationNotificationOnce = async (
  reservation: Pick<Reservation, 'id' | 'hotelRoom' | 'name'>,
  type: string,
  title: string,
  message: string
) => {
  if (!reservation.id) return null;
  const displayName = getReservationNotificationName(reservation);

  return createNotificationOnce({
    reservation_id: reservation.id,
    type,
    title,
    message,
    display_name: displayName,
  });
};

const reservationEventToWorkflowEvent = (event: ReservationEventRecord): WorkflowEvent => ({
  id: event.id,
  eventType: event.event_type,
  message: event.event_message,
  createdAt: event.created_at || '',
});

const createWhatsappMessage = (text: string): WhatsappMessage => ({
  id: `msg-${Date.now()}-${Math.round(Math.random() * 1000)}`,
  from: 'AutoClub',
  text,
  createdAt: new Date().toISOString(),
});

const whatsappRowToMessage = (row: WhatsappMessageRow): WhatsappMessage => ({
  id: row.id,
  from: row.direction === 'incoming' ? 'Customer' : 'AutoClub',
  text: row.message || '',
  createdAt: row.created_at || '',
  isUnread: row.direction === 'incoming' && row.is_read === false,
});

const isIgnoredIncomingWhatsappMessage = (message?: string | null) => {
  const normalizedMessage = (message || '').trim();
  const lowerMessage = normalizedMessage.toLowerCase();

  if (!normalizedMessage) return true;
  if (lowerMessage === 'accepted') return true;

  return ['sent', 'delivered', 'read', 'failed', 'undelivered'].includes(lowerMessage);
};

const hasAcceptedRequiredFields = (reservation: Pick<Reservation, 'pickupTime' | 'returnTime' | 'price'>) =>
  reservation.pickupTime.trim() !== '' && reservation.returnTime.trim() !== '' && reservation.price !== null;

const hasAcceptedRequiredFormFields = (form: ReservationForm) =>
  form.pickupTime.trim() !== '' && form.returnTime.trim() !== '' && form.price.trim() !== '';

const acceptedValidationMessage = 'Συμπλήρωσε ώρα παραλαβής, ώρα επιστροφής και τιμή πριν κάνεις ACCEPTED.';
const returnReminderEventType = 'return_reminder_sent';
const returnReminderEventMessage = 'Return reminder sent. Waiting for customer return confirmation.';

async function postReturnReminderWebhook(reservation: Reservation) {
  const reminderPayload = {
    reservation_id: reservation.id,
    phone: reservation.phoneWhatsapp,
    customer_name: reservation.name,
    hotel_room: reservation.hotelRoom,
    return_date: reservation.returnDate,
    return_time: reservation.returnTime,
    language: reservation.language,
    vehicle_group: reservation.vehicleGroup,
    price: reservation.price,
  };

  const response = await fetch(SEND_REMINDER_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reminderPayload),
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${await response.text()}`);
  }
}

async function postWhatsappMessageWebhook(reservation: Reservation, message: string) {
  const response = await fetch(WHATSAPP_SEND_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reservation_id: reservation.id,
      phone: reservation.phoneWhatsapp,
      message,
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

function buildReturnReminderPatch(reservation: Reservation): Partial<Reservation> {
  return {
    sendReturn: true,
    returnReminderSent: true,
    returnReminderSentAt: new Date().toISOString(),
    whatsappMessages: [
      ...(reservation.whatsappMessages || defaultWhatsappMessages),
      createWhatsappMessage('Return reminder sent to customer.'),
    ],
  };
}

export default function BookingsManager({
  mobileMode = false,
  mobileFocus = 'bookings',
  onNotificationsChanged,
}: {
  mobileMode?: boolean;
  mobileFocus?: 'dashboard' | 'bookings' | 'whatsapp';
  onNotificationsChanged?: () => void | Promise<void>;
}) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [isLoadingReservations, setIsLoadingReservations] = useState(true);
  const [workflowEvents, setWorkflowEvents] = useState<WorkflowEvent[]>([]);
  const [isLoadingWorkflowEvents, setIsLoadingWorkflowEvents] = useState(false);
  const [whatsappMessages, setWhatsappMessages] = useState<WhatsappMessage[]>([]);
  const [isLoadingWhatsappMessages, setIsLoadingWhatsappMessages] = useState(false);
  const [unreadWhatsappReservationIds, setUnreadWhatsappReservationIds] = useState<Set<string>>(new Set());
  const [showWhatsappChat, setShowWhatsappChat] = useState(false);
  const [vehicleGroups, setVehicleGroups] = useState<VehicleGroup[]>(DEFAULT_VEHICLE_GROUP_CODES);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof statuses)[number]>('ALL');
  const [quickFilter, setQuickFilter] = useState<QuickReservationFilter>('latest20');
  const [listMode, setListMode] = useState<ReservationListMode>('active');
  const [tableSort, setTableSort] = useState<ReservationSortState>({ key: 'modified', direction: 'desc' });
  const [agencyQuickFilter, setAgencyQuickFilter] = useState('ALL');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showReturnsModal, setShowReturnsModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showAvailabilityTestModal, setShowAvailabilityTestModal] = useState(false);
  const [sendingReminderIds, setSendingReminderIds] = useState<Set<string>>(new Set());
  const pendingReminderIdsRef = useRef<Set<string>>(new Set());
  const rateLimitedReminderIdsRef = useRef<Set<string>>(new Set());
  const isBulkSendingRemindersRef = useRef(false);
  const shouldSkipAutoRefreshRef = useRef(false);
  const autoRefreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isBulkSendingReminders, setIsBulkSendingReminders] = useState(false);
  const [reminderFeedback, setReminderFeedback] = useState('');
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [lastReservationsUpdatedAt, setLastReservationsUpdatedAt] = useState('');
  const [mobileReservationId, setMobileReservationId] = useState('');
  const [detailPanelHeight, setDetailPanelHeight] = useState(330);
  const [isResizingDetails, setIsResizingDetails] = useState(false);
  const desktopSplitRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState<ReservationForm>(initialForm);
  const [agencyRows, setAgencyRows] = useState<AgencyRow[]>([]);
  const [representativeRows, setRepresentativeRows] = useState<RepresentativeRow[]>([]);
  const [isPhoneBookingsViewport, setIsPhoneBookingsViewport] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const updatePhoneViewport = () => setIsPhoneBookingsViewport(mediaQuery.matches);

    updatePhoneViewport();
    mediaQuery.addEventListener('change', updatePhoneViewport);
    window.addEventListener('orientationchange', updatePhoneViewport);

    return () => {
      mediaQuery.removeEventListener('change', updatePhoneViewport);
      window.removeEventListener('orientationchange', updatePhoneViewport);
    };
  }, []);

  useEffect(() => {
    if (!isResizingDetails) return;

    const handlePointerMove = (event: PointerEvent) => {
      const splitContainer = desktopSplitRef.current;
      if (!splitContainer) return;

      const bounds = splitContainer.getBoundingClientRect();
      const maximumDetailHeight = Math.max(220, bounds.height - 180 - 8);
      const nextHeight = Math.min(Math.max(bounds.bottom - event.clientY, 220), maximumDetailHeight);
      setDetailPanelHeight(nextHeight);
    };

    const stopResizing = () => setIsResizingDetails(false);

    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResizing);
    window.addEventListener('pointercancel', stopResizing);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResizing);
      window.removeEventListener('pointercancel', stopResizing);
    };
  }, [isResizingDetails]);

  useEffect(() => {
    shouldSkipAutoRefreshRef.current = Boolean(editingReservation || showNewModal);
  }, [editingReservation, showNewModal]);

  const notifyBookingEventOnce = async (
    reservation: Pick<Reservation, 'id' | 'hotelRoom' | 'name'>,
    type: string,
    title: string,
    message: string
  ) => {
    const notification = await createReservationNotificationOnce(reservation, type, title, message);

    if (notification) {
      await Promise.resolve(onNotificationsChanged?.());
    }

    return notification;
  };

  const ensureCustomerMessageNotifications = async (nextReservations: Reservation[]) => {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('reservation_id, message')
      .eq('direction', 'incoming')
      .eq('is_read', false);

    if (error) {
      console.warn('Fetch unread customer whatsapp messages warning', error);
      return;
    }

    const unreadReservationIds = new Set(
      ((data || []) as UnreadWhatsappReservationRow[])
        .filter((row) => !isIgnoredIncomingWhatsappMessage(row.message))
        .map((row) => String(row.reservation_id || ''))
        .filter(Boolean)
    );

    if (unreadReservationIds.size === 0) return;

    await Promise.all(
      nextReservations
        .filter((reservation) => unreadReservationIds.has(reservation.id))
        .map(async (reservation) => {
          const displayName = getReservationNotificationName(reservation);
          const notification = await notifyBookingEventOnce(
            reservation,
            'customer_message_received',
            'Customer WhatsApp message',
            `${displayName} sent a WhatsApp message.`
          );

          if (notification?.read === true) {
            const { error: reopenError } = await supabase
              .from('notifications')
              .update({ read: false })
              .eq('id', notification.id);

            if (reopenError) {
              console.warn('Reopen customer message notification warning', reopenError);
            } else {
              await Promise.resolve(onNotificationsChanged?.());
            }
          }
        })
    );
  };

  const ensureReservationNotifications = async (nextReservations: Reservation[]) => {
    await Promise.all(
      nextReservations.flatMap((reservation) => {
        const displayName = getReservationNotificationName(reservation);
        const notificationPromises: Array<Promise<unknown>> = [];

        if (reservation.licenceFrontUrl) {
          notificationPromises.push(
            notifyBookingEventOnce(
              reservation,
              'licence_front_uploaded',
              'Licence front uploaded',
              `${displayName} uploaded licence front.`
            )
          );
        }

        if (reservation.licenceBackUrl) {
          notificationPromises.push(
            notifyBookingEventOnce(
              reservation,
              'licence_back_uploaded',
              'Licence back uploaded',
              `${displayName} uploaded licence back.`
            )
          );
        }

        if (reservation.returnConfirmed) {
          notificationPromises.push(
            notifyBookingEventOnce(
              reservation,
              'return_confirmed',
              'Vehicle return confirmed',
              `${displayName} confirmed vehicle return.`
            )
          );
        }

        return notificationPromises;
      })
    );

    await ensureCustomerMessageNotifications(nextReservations);
  };

  const loadReservations = async (preferredReservationId?: string) => {
    setIsLoadingReservations(true);
    const records = await fetchReservations();
    const nextReservations = records.map(reservationRecordToReservation);

    setReservations(nextReservations);
    setSelectedId((currentSelectedId) => {
      const nextSelectedId = preferredReservationId || currentSelectedId;

      return nextReservations.some((reservation) => reservation.id === nextSelectedId)
        ? nextSelectedId
        : nextReservations[0]?.id || '';
    });
    setIsLoadingReservations(false);
    setLastReservationsUpdatedAt(new Date().toISOString());
    void ensureReservationNotifications(nextReservations);
    return nextReservations;
  };

  useEffect(() => {
    void Promise.resolve().then(() => loadReservations());
    void Promise.resolve().then(() => loadUnreadWhatsappReservations());
  }, []);

  useEffect(() => {
    autoRefreshTimerRef.current = setInterval(() => {
      if (shouldSkipAutoRefreshRef.current) {
        console.log('Reservations auto-refresh skipped: reservation form is open.');
        return;
      }

      void Promise.resolve()
        .then(() => loadReservations())
        .then(() => loadUnreadWhatsappReservations())
        .catch((error) => {
          console.warn('Reservations auto-refresh failed', error);
        });
    }, RESERVATIONS_AUTO_REFRESH_MS);

    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const loadVehicleGroups = async () => {
      const groups = await fetchVehicleGroups();
      const activeCodes = groups
        .filter((group) => group.active)
        .map((group) => group.code)
        .filter(Boolean);

      setVehicleGroups(activeCodes.length > 0 ? activeCodes : DEFAULT_VEHICLE_GROUP_CODES);
    };

    void Promise.resolve().then(loadVehicleGroups);
  }, []);

  const loadWorkflowEvents = async (reservationId: string) => {
    setIsLoadingWorkflowEvents(true);
    const events = await fetchReservationEvents(reservationId);

    setWorkflowEvents(events.map(reservationEventToWorkflowEvent));
    setIsLoadingWorkflowEvents(false);
  };

  const loadUnreadWhatsappReservations = async () => {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('reservation_id, message')
      .eq('direction', 'incoming')
      .eq('is_read', false);

    console.log('WhatsApp unread query result', data || []);
    console.log('WhatsApp unread query error', error);

    if (error) {
      console.warn('Fetch unread whatsapp messages warning', error);
      return;
    }

    setUnreadWhatsappReservationIds(
      new Set(
        ((data || []) as UnreadWhatsappReservationRow[])
          .filter((row) => !isIgnoredIncomingWhatsappMessage(row.message))
          .map((row) => String(row.reservation_id || ''))
          .filter(Boolean)
      )
    );

    if (reservations.length > 0) {
      void ensureCustomerMessageNotifications(reservations);
    }
  };

  const loadWhatsappMessages = async (reservationId: string) => {
    console.log('Selected reservation id for WhatsApp messages:', reservationId);
    setIsLoadingWhatsappMessages(true);
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('id, reservation_id, phone, message, direction, is_read, created_at')
      .eq('reservation_id', reservationId)
      .order('created_at', { ascending: false });

    console.log('WhatsApp query result', data || []);
    console.log('WhatsApp query error', error);

    if (error) {
      console.warn('Fetch whatsapp messages warning', error);
      setWhatsappMessages([]);
      setIsLoadingWhatsappMessages(false);
      return;
    }

    const rows = (data || []) as WhatsappMessageRow[];
    console.log('Loaded whatsapp_messages:', rows);
    setWhatsappMessages(
      rows
        .filter((row) => !(row.direction === 'incoming' && isIgnoredIncomingWhatsappMessage(row.message)))
        .map(whatsappRowToMessage)
    );

    if (rows.some((row) => row.direction === 'incoming' && row.is_read === false && !isIgnoredIncomingWhatsappMessage(row.message))) {
      setUnreadWhatsappReservationIds((currentIds) => new Set(currentIds).add(reservationId));
      const reservationForNotification =
        reservations.find((reservation) => reservation.id === reservationId) ||
        (selectedReservation?.id === reservationId ? selectedReservation : null);

      if (reservationForNotification) {
        await ensureCustomerMessageNotifications([reservationForNotification]);
      }
    }

    setIsLoadingWhatsappMessages(false);
  };

  const markReservationRead = async (reservationId: string) => {
    setUnreadWhatsappReservationIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.delete(reservationId);
      return nextIds;
    });
    setWhatsappMessages((currentMessages) =>
      currentMessages.map((message) => ({ ...message, isUnread: false }))
    );

    const whatsappResult = await supabase
      .from('whatsapp_messages')
      .update({ is_read: true })
      .eq('reservation_id', reservationId)
      .eq('direction', 'incoming')
      .eq('is_read', false);

    if (whatsappResult.error) {
      console.warn('Mark reservation WhatsApp messages read warning', whatsappResult.error);
      await loadUnreadWhatsappReservations();
    }

    const notificationsUpdated = await markReservationNotificationsRead(reservationId);

    if (!notificationsUpdated) {
      console.warn('Reservation notifications were not marked read', { reservationId });
    }

    setUnreadWhatsappReservationIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.delete(reservationId);
      return nextIds;
    });
    setWhatsappMessages((currentMessages) =>
      currentMessages.map((message) => ({ ...message, isUnread: false }))
    );
    await Promise.resolve(onNotificationsChanged?.());
  };

  const openReservation = (reservationId: string) => {
    setSelectedId(reservationId);
    void markReservationRead(reservationId);
  };

  const openWhatsappChat = (reservationId: string) => {
    setShowWhatsappChat(true);
    void markReservationRead(reservationId);
  };

  const recordWorkflowEvent = async (reservationId: string, eventType: string, eventMessage: string) => {
    const event = await createReservationEvent({
      reservation_id: reservationId,
      event_type: eventType,
      event_message: eventMessage,
    });

    if (!event) return;
    setWorkflowEvents((currentEvents) => [reservationEventToWorkflowEvent(event), ...currentEvents]);
  };

  useEffect(() => {
    const loadAgencyData = async () => {
      const [{ data: agenciesData, error: agenciesError }, { data: representativesData, error: representativesError }] =
        await Promise.all([
          supabase.from('agencies').select('id, name').order('name'),
          supabase.from('representatives').select('id, name, agency_id').order('name'),
        ]);

      if (agenciesError || representativesError) {
        console.warn('Bookings agencies load warning', {
          agenciesError,
          representativesError,
        });
        return;
      }

      setAgencyRows((agenciesData || []) as AgencyRow[]);
      setRepresentativeRows((representativesData || []) as RepresentativeRow[]);
    };

    loadAgencyData();
  }, []);

  const liveAgencyNames = agencyRows.map((agency) => agency.name);
  const agencyOptions = liveAgencyNames.length > 0 ? liveAgencyNames : fallbackAgencies;
  const representativesByAgency = useMemo(() => {
    if (agencyRows.length === 0) {
      return fallbackAgencyRepresentatives;
    }

    return agencyRows.reduce<Record<string, string[]>>((accumulator, agency) => {
      accumulator[agency.name] = representativeRows
        .filter((representative) => representative.agency_id === agency.id)
        .map((representative) => representative.name);
      return accumulator;
    }, {});
  }, [agencyRows, representativeRows]);

  const agencyQuickFilterOptions = useMemo(() => {
    const agencyNames = new Set<string>();

    agencyOptions.forEach((agency) => {
      if (agency) agencyNames.add(agency);
    });
    reservations.forEach((reservation) => {
      if (reservation.agency) agencyNames.add(reservation.agency);
    });

    return Array.from(agencyNames).sort((firstAgency, secondAgency) => firstAgency.localeCompare(secondAgency));
  }, [agencyOptions, reservations]);

  const bookingHealthStatuses = useMemo<BookingHealthStatus[]>(() => {
    const recentThreshold = Date.now() - 24 * 60 * 60 * 1000;
    const workflowTimes = (eventTypes: string[]) =>
      workflowEvents
        .filter((event) => eventTypes.includes(event.eventType))
        .map((event) => event.createdAt);
    const buildStatus = (label: string, timestamps: Array<string | undefined>): BookingHealthStatus => {
      const lastEventAt = latestValidTimestamp(timestamps);
      const lastEventTimestamp = lastEventAt ? new Date(lastEventAt).getTime() : Number.NaN;

      return {
        label,
        state: Number.isFinite(lastEventTimestamp) && lastEventTimestamp >= recentThreshold ? 'active' : 'idle',
        lastEventAt,
      };
    };

    return [
      buildStatus('Confirmation', [
        ...workflowTimes(['confirmation_sent']),
        ...reservations
          .filter((reservation) => reservation.confirmationSent)
          .map((reservation) => reservation.lastModifiedAt || reservation.createdAt),
      ]),
      buildStatus('Send Reminder', [
        ...workflowTimes(['return_reminder_sent', 'reminder_sent']),
        ...reservations
          .filter((reservation) => reservation.returnReminderSent || reservation.sendReturn)
          .map((reservation) => reservation.returnReminderSentAt || reservation.lastModifiedAt),
      ]),
      buildStatus('Return Confirm', [
        ...workflowTimes(['return_confirmed']),
        ...reservations
          .filter((reservation) => reservation.returnConfirmed || reservation.status === 'RETURN')
          .map((reservation) => reservation.returnConfirmedAt || reservation.lastModifiedAt),
      ]),
      buildStatus(
        'Licence Upload',
        reservations
          .filter((reservation) => Boolean(reservation.licenceFrontUrl || reservation.licenceBackUrl))
          .map((reservation) => reservation.lastModifiedAt || reservation.createdAt)
      ),
      buildStatus(
        'WhatsApp Incoming',
        whatsappMessages
          .filter((message) => message.from === 'Customer')
          .map((message) => message.createdAt)
      ),
    ];
  }, [reservations, whatsappMessages, workflowEvents]);

  const filteredReservations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const today = todayDateValue();
    const tomorrow = tomorrowDateValue();

    const reservationsForListMode =
      quickFilter === 'returnsToday'
        ? reservations
        : reservations.filter((reservation) => {
            const isReturnedReservation = reservation.status === 'RETURN' || reservation.returnConfirmed === true;
            return listMode === 'returned' ? isReturnedReservation : !isReturnedReservation;
          });

    const reservationsForQuickFilter = reservationsForListMode.filter((reservation) => {
      if (quickFilter === 'returnsToday') return reservation.returnDate === today;
      if (quickFilter === 'pickupsToday') return reservation.pickupDate === today;
      if (quickFilter === 'pickupsTomorrow') return reservation.pickupDate === tomorrow;
      if (quickFilter === 'returnsTomorrow') return reservation.returnDate === tomorrow;
      return true;
    });

    const visibleReservations =
      quickFilter === 'latest20'
        ? [...reservationsForQuickFilter]
            .sort((firstReservation, secondReservation) => reservationSortValue(secondReservation) - reservationSortValue(firstReservation))
            .slice(0, 20)
        : reservationsForQuickFilter;

    return visibleReservations.filter((reservation) => {
      const matchesStatus = statusFilter === 'ALL' || reservation.status === statusFilter;
      const matchesAgency = agencyQuickFilter === 'ALL' || reservation.agency === agencyQuickFilter;
      const matchesSearch =
        !query ||
        reservation.phoneWhatsapp.toLowerCase().includes(query) ||
        reservation.name.toLowerCase().includes(query) ||
        reservation.email.toLowerCase().includes(query) ||
        reservation.vehicleGroup.toLowerCase().includes(query) ||
        reservation.agency.toLowerCase().includes(query) ||
        reservation.representative.toLowerCase().includes(query) ||
        reservation.hotelRoom.toLowerCase().includes(query);

      return matchesStatus && matchesAgency && matchesSearch;
    }).sort((firstReservation, secondReservation) => compareReservationTableValues(firstReservation, secondReservation, tableSort));
  }, [agencyQuickFilter, listMode, quickFilter, reservations, searchTerm, statusFilter, tableSort]);

  const selectedReservation =
    filteredReservations.find((reservation) => reservation.id === selectedId) ||
    filteredReservations[0] ||
    reservations[0];
  const todayReturnReminderTargets = useMemo(() => {
    const reservationIds = new Set<string>();

    return filteredReservations.filter((reservation) => {
      if (quickFilter !== 'returnsToday') return false;
      if (reservationIds.has(reservation.id)) return false;
      if (reservation.sendReturn || reservation.returnReminderSent) return false;

      reservationIds.add(reservation.id);
      return true;
    });
  }, [filteredReservations, quickFilter]);
  const mobileReservation =
    reservations.find((reservation) => reservation.id === mobileReservationId) ||
    filteredReservations.find((reservation) => reservation.id === mobileReservationId);

  useEffect(() => {
    if (!selectedReservation?.id) {
      void Promise.resolve().then(() => setWorkflowEvents([]));
      void Promise.resolve().then(() => setWhatsappMessages([]));
      return;
    }

    void Promise.resolve().then(() => loadWorkflowEvents(selectedReservation.id));
    void Promise.resolve().then(() => loadWhatsappMessages(selectedReservation.id));
  }, [selectedReservation?.id]);

  const updateSelectedReservation = async (reservationDraft: Reservation): Promise<Reservation | false> => {
    if (!selectedReservation) return false;

    const previousReservation =
      reservations.find((reservation) => reservation.id === reservationDraft.id) || selectedReservation;
    const payload = reservationToPayload(reservationDraft);
    console.log('SAVE PAYLOAD', payload);

    const updatedRecord = await updateReservation(reservationDraft.id, payload);

    if (!updatedRecord) {
      window.alert('Η κράτηση δεν ενημερώθηκε.');
      return false;
    }

    const updatedReservation = reservationRecordToReservation(updatedRecord);
    console.log('UPDATED RESERVATION AFTER SAVE', updatedReservation);

    const freshReservations = await loadReservations(updatedReservation.id);
    const freshUpdatedReservation =
      freshReservations.find((reservation) => reservation.id === updatedReservation.id) || updatedReservation;

    setSelectedId(freshUpdatedReservation.id);
    if (previousReservation.status !== freshUpdatedReservation.status) {
      const displayName = getReservationNotificationName(freshUpdatedReservation);
      await notifyBookingEventOnce(
        freshUpdatedReservation,
        'status_changed',
        'Booking status changed',
        `${displayName} status changed to ${freshUpdatedReservation.status}.`
      );
    }

    return freshUpdatedReservation;
  };

  const saveEditedReservation = async (reservationDraft: Reservation) => {
    if (reservationDraft.status === 'ACCEPTED' && !hasAcceptedRequiredFields(reservationDraft)) {
      window.alert(acceptedValidationMessage);
      return false;
    }

    const previousReservation = reservations.find((reservation) => reservation.id === reservationDraft.id);
    const updatedRecord = await updateReservation(reservationDraft.id, reservationToPayload(reservationDraft));

    if (!updatedRecord) {
      window.alert('Η κράτηση δεν ενημερώθηκε.');
      return false;
    }

    const updatedReservation = reservationRecordToReservation(updatedRecord);
    await loadReservations(updatedReservation.id);
    setSelectedId(updatedReservation.id);
    setEditingReservation(null);
    await recordWorkflowEvent(updatedReservation.id, 'booking_updated', 'Booking details updated');
    if (previousReservation && previousReservation.status !== updatedReservation.status) {
      const displayName = getReservationNotificationName(updatedReservation);
      await notifyBookingEventOnce(
        updatedReservation,
        'status_changed',
        'Booking status changed',
        `${displayName} status changed to ${updatedReservation.status}.`
      );
    }
    return true;
  };

  const deleteSelectedReservation = async () => {
    if (!selectedReservation) return;
    if (!window.confirm('Να διαγραφεί αυτή η κράτηση;')) return;

    const deleted = await deleteReservation(selectedReservation.id);

    if (!deleted) {
      window.alert('Η κράτηση δεν διαγράφηκε.');
      return;
    }

    setReservations((currentReservations) => {
      const selectedIndex = currentReservations.findIndex((reservation) => reservation.id === selectedReservation.id);
      const nextReservations = currentReservations.filter((reservation) => reservation.id !== selectedReservation.id);
      const nextSelectedReservation = nextReservations[selectedIndex] || nextReservations[selectedIndex - 1] || nextReservations[0];

      setSelectedId(nextSelectedReservation?.id || '');
      return nextReservations;
    });
  };

  const sendReminder = async (reservation: Reservation) => {
    if (pendingReminderIdsRef.current.has(reservation.id)) {
      return false;
    }

    pendingReminderIdsRef.current.add(reservation.id);
    setReminderFeedback('');
    setSendingReminderIds((currentIds) => new Set(currentIds).add(reservation.id));

    try {
      await wait(REMINDER_SEND_DELAY_MS);
      await postReturnReminderWebhook(reservation);
    } catch (error) {
      console.error('Send reminder webhook failed:', error);
      const isRateLimited = error instanceof Error && error.message.includes('429');
      if (isRateLimited) {
        rateLimitedReminderIdsRef.current.add(reservation.id);
      }
      const message = isRateLimited
        ? 'Too many requests from Make. Please wait a little and try again.'
        : 'Reminder was not sent. Please try again.';
      setReminderFeedback(message);
      setSendingReminderIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(reservation.id);
        return nextIds;
      });
      pendingReminderIdsRef.current.delete(reservation.id);
      return false;
    }

    const reminderPatch = buildReturnReminderPatch(reservation);
    const nextReservation = {
      ...reservation,
      ...reminderPatch,
    };
    const updatedRecord = await updateReservation(nextReservation.id, reservationToPayload(nextReservation));

    if (!updatedRecord) {
      setReminderFeedback('Reminder was sent, but the reservation was not updated.');
      setSendingReminderIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(reservation.id);
        return nextIds;
      });
      pendingReminderIdsRef.current.delete(reservation.id);
      return false;
    }

    const updatedReservation = {
      ...reservationRecordToReservation(updatedRecord),
      whatsappMessages: nextReservation.whatsappMessages,
    };
    setReservations((currentReservations) =>
      currentReservations.map((currentReservation) =>
        currentReservation.id === updatedReservation.id ? updatedReservation : currentReservation
      )
    );

    const event = await createReservationEvent({
      reservation_id: updatedReservation.id,
      event_type: returnReminderEventType,
      event_message: returnReminderEventMessage,
    });

    if (event && selectedReservation?.id === updatedReservation.id) {
      setWorkflowEvents((currentEvents) => [reservationEventToWorkflowEvent(event), ...currentEvents]);
    }

    setReminderFeedback('Reminder sent.');
    setSendingReminderIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.delete(reservation.id);
      return nextIds;
    });
    pendingReminderIdsRef.current.delete(reservation.id);
    return updatedReservation;
  };

  const sendAllTodayReturnReminders = async () => {
    if (isBulkSendingRemindersRef.current || quickFilter !== 'returnsToday') return;

    const processedReservationIds = new Set<string>();
    const targetReservations = todayReturnReminderTargets.filter((reservation) => {
      if (processedReservationIds.has(reservation.id)) return false;
      processedReservationIds.add(reservation.id);
      return true;
    });

    if (targetReservations.length === 0) {
      setReminderFeedback('No unsent return reminders in the visible list.');
      return;
    }

    isBulkSendingRemindersRef.current = true;
    setIsBulkSendingReminders(true);
    setReminderFeedback(`Sending 1/${targetReservations.length}...`);

    let sentCount = 0;
    let failedCount = 0;
    let rateLimitedCount = 0;

    try {
      for (let index = 0; index < targetReservations.length; index += 1) {
        const reservation = targetReservations[index];
        rateLimitedReminderIdsRef.current.delete(reservation.id);
        setReminderFeedback(`Sending ${index + 1}/${targetReservations.length}...`);

        try {
          const result = await sendReminder(reservation);

          if (result) {
            sentCount += 1;
          } else {
            failedCount += 1;
            if (rateLimitedReminderIdsRef.current.has(reservation.id)) {
              rateLimitedCount += 1;
              console.warn('Make rate limit for this reservation, skipped', {
                reservation_id: reservation.id,
              });
              setReminderFeedback('Make rate limit for this reservation, skipped');
            }
          }
        } catch (error) {
          failedCount += 1;
          console.error('Bulk return reminder failed for reservation:', reservation.id, error);
        }

        if (index < targetReservations.length - 1) {
          await wait(BULK_REMINDER_DELAY_MS);
        }
      }
    } finally {
      isBulkSendingRemindersRef.current = false;
      setIsBulkSendingReminders(false);
    }

    setReminderFeedback(
      rateLimitedCount > 0
        ? 'Make rate limit. Some reminders were skipped. Try again later.'
        : `Sent ${sentCount} reminders. Failed ${failedCount}.`,
    );
  };

  const saveReservation = async () => {
    if (form.status === 'ACCEPTED' && !hasAcceptedRequiredFormFields(form)) {
      window.alert(acceptedValidationMessage);
      return;
    }

    if (!form.vehicleGroup || !form.pickupDate || !form.returnDate) {
      window.alert('Select vehicle group, pickup date and return date before saving.');
      return;
    }

    const availability = await checkGroupAvailability({
      pickup_date: form.pickupDate,
      return_date: form.returnDate,
    });
    const selectedGroupAvailability = availability.find((group) => group.vehicle_group === form.vehicleGroup);

    if (!selectedGroupAvailability || selectedGroupAvailability.available <= 0) {
      window.alert('No availability for this vehicle group on the selected dates.');
      return;
    }

    const reservationDraft: Reservation = {
      id: '',
      createdAt: '',
      lastModifiedAt: '',
      phoneWhatsapp: form.phoneWhatsapp.replace(/\s+/g, ''),
      name: form.name.trim() || 'New Customer',
      email: form.email.trim(),
      vehicleGroup: form.vehicleGroup,
      agency: form.agency,
      representative: form.representative,
      hotelRoom: form.hotelRoom.trim() || '-',
      pickupDate: form.pickupDate,
      returnDate: form.returnDate,
      pickupTime: form.pickupTime,
      returnTime: form.returnTime,
      price: form.price === '' ? null : Number(form.price) || null,
      status: form.status,
      language: form.language,
      confirmationSent: false,
      sendReturn: false,
      returnReminderSent: false,
      returnReminderSentAt: '',
      returnConfirmed: false,
      returnConfirmedAt: '',
      licenceFront: 'empty',
      licenceBack: 'empty',
      licenceFrontUrl: '',
      licenceBackUrl: '',
      notes: form.notes,
      extras: normalizeExtras(form.extras),
      whatsappMessages: defaultWhatsappMessages,
      workflowEvents: [],
    };
    const createdRecord = await createReservation(reservationToPayload(reservationDraft));

    if (!createdRecord) {
      window.alert('Η κράτηση δεν αποθηκεύτηκε.');
      return;
    }

    const nextReservation = reservationRecordToReservation(createdRecord);
    await recordWorkflowEvent(nextReservation.id, 'booking_created', 'Booking created');
    const displayName = getReservationNotificationName(nextReservation);
    await notifyBookingEventOnce(
      nextReservation,
      'booking_created',
      'New booking created',
      `${displayName} created a new booking.`
    );

    setReservations((current) => [nextReservation, ...current]);
    setSelectedId(nextReservation.id);
    setShowNewModal(false);
  };

  if (mobileMode) {
    const today = todayDateValue();
    const reservationsToday = reservations.filter((reservation) => reservation.pickupDate === today).length;
    const returnsToday = reservations.filter((reservation) => reservation.returnDate === today).length;
    const unreadWhatsappCount = unreadWhatsappReservationIds.size;
    const mobileReservations =
      mobileFocus === 'whatsapp'
        ? [...filteredReservations].sort((firstReservation, secondReservation) => {
            const firstUnread = unreadWhatsappReservationIds.has(firstReservation.id) ? 1 : 0;
            const secondUnread = unreadWhatsappReservationIds.has(secondReservation.id) ? 1 : 0;
            return secondUnread - firstUnread || reservationSortValue(secondReservation) - reservationSortValue(firstReservation);
          })
        : filteredReservations;

    if (isPhoneBookingsViewport) {
      return (
        <div
          className="flex h-full min-h-0 w-[100dvw] max-w-none flex-col overflow-x-hidden bg-[linear-gradient(180deg,#07101a_0%,#050910_100%)] px-2.5 pb-2 pt-1 text-white"
          style={{ width: '100dvw', maxWidth: 'none' }}
        >
          <div className="flex flex-shrink-0 items-center justify-between px-1 pb-1">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-sky-200/60">Bookings</p>
              <h2 className="text-base font-black leading-5 text-white">Κρατήσεις</h2>
            </div>
            <span className="rounded-xl border border-white/[0.07] bg-white/[0.035] px-2.5 py-1 text-[11px] font-black text-zinc-200">
              {mobileReservations.length}
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-1">
            {isLoadingReservations ? (
              <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5 text-center text-sm text-zinc-400">
                Φόρτωση κρατήσεων...
              </div>
            ) : mobileReservations.length > 0 ? (
              <div className="space-y-1.5">
                {mobileReservations.map((reservation) => {
                  const hasUnreadWhatsapp = unreadWhatsappReservationIds.has(reservation.id);
                  const licenceState = getDrivingLicenceState(reservation);

                  return (
                    <button
                      key={reservation.id}
                      type="button"
                      onClick={() => {
                        openReservation(reservation.id);
                        setMobileReservationId(reservation.id);
                      }}
                      className="w-full rounded-[18px] border border-white/[0.075] bg-white/[0.035] p-2.5 text-left shadow-[0_12px_34px_rgba(0,0,0,0.2)] transition active:scale-[0.99]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-1.5">
                            {hasUnreadWhatsapp && <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.7)]" />}
                            <p className="truncate text-[15px] font-black leading-5 text-white">{reservation.hotelRoom || '-'}</p>
                          </div>
                          <p className="mt-0.5 truncate text-[13px] font-semibold leading-4 text-zinc-200">{reservation.name || 'Customer'}</p>
                          <p className="font-mono text-[11px] leading-4 text-sky-100/80">{reservation.phoneWhatsapp || '-'}</p>
                        </div>
                        <StatusBadge status={reservation.status} />
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
                        <div className="rounded-xl border border-white/[0.055] bg-black/20 px-2.5 py-1.5">
                          <p className="leading-4 text-zinc-500">Group</p>
                          <p className="font-black leading-4 text-sky-100">{reservation.vehicleGroup || '-'}</p>
                        </div>
                        <div className="rounded-xl border border-white/[0.055] bg-black/20 px-2.5 py-1.5">
                          <p className="leading-4 text-zinc-500">Driving Licence</p>
                          <p className={`font-black leading-4 ${licenceState === 'uploaded' ? 'text-blue-100' : 'text-zinc-500'}`}>
                            {licenceState === 'uploaded' ? 'Uploaded' : 'Empty'}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/[0.055] bg-black/20 px-2.5 py-1.5">
                          <p className="leading-4 text-zinc-500">Pickup</p>
                          <p className="font-semibold leading-4 text-zinc-100">{formatDate(reservation.pickupDate)}</p>
                          <p className="font-mono text-[10px] leading-3 text-zinc-400">{reservation.pickupTime || '-'}</p>
                        </div>
                        <div className="rounded-xl border border-white/[0.055] bg-black/20 px-2.5 py-1.5">
                          <p className="leading-4 text-zinc-500">Return</p>
                          <p className="font-semibold leading-4 text-zinc-100">{formatDate(reservation.returnDate)}</p>
                          <p className="font-mono text-[10px] leading-3 text-zinc-400">{reservation.returnTime || '-'}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5 text-center text-sm text-zinc-400">
                Δεν υπάρχουν κρατήσεις.
              </div>
            )}
          </div>

          {mobileReservation && (
            <MobileReservationModal
              reservation={mobileReservation}
              agencyOptions={agencyOptions}
              representativesByAgency={representativesByAgency}
              vehicleGroups={vehicleGroups}
              workflowEvents={workflowEvents}
              isLoadingWorkflowEvents={isLoadingWorkflowEvents}
              whatsappMessages={whatsappMessages}
              isLoadingWhatsappMessages={isLoadingWhatsappMessages}
              onClose={() => setMobileReservationId('')}
              onUpdate={updateSelectedReservation}
              onSendReminder={sendReminder}
              isReminderSending={sendingReminderIds.has(mobileReservation.id)}
              isReminderDisabled={isBulkSendingReminders}
              reminderFeedback={reminderFeedback}
              onReloadWhatsappMessages={loadWhatsappMessages}
              phoneLayout
            />
          )}
        </div>
      );
    }

    if (mobileFocus === 'dashboard') {
      return (
        <div
          className="flex h-full min-h-0 w-[100dvw] max-w-none flex-col items-center overflow-x-hidden overflow-y-auto bg-[linear-gradient(180deg,#07101a_0%,#050910_100%)] px-4 py-4 text-white"
          style={{ width: '100dvw', maxWidth: 'none' }}
        >
          <div className="flex w-[100dvw] max-w-none flex-col items-center gap-4">
            <div className="relative flex h-[238px] w-[calc(100dvw-32px)] max-w-[420px] flex-col items-center justify-center">
              <div className="absolute inset-10 rounded-full bg-sky-400/[0.08] blur-3xl" />
              <div className="absolute inset-0 rounded-[28px] border border-sky-200/[0.16] bg-[linear-gradient(135deg,rgba(56,189,248,0.065),rgba(9,18,29,0.74)_35%,rgba(34,197,94,0.045))] shadow-[0_0_34px_rgba(0,160,255,0.09)]" />
              <Image src="/logo.png" alt="AUTOCLUB" fill priority className="relative object-cover object-center opacity-95" sizes="420px" />
              <p className="absolute bottom-7 text-[10px] font-medium uppercase tracking-[0.24em] text-[#8e99a8]">
                Bookings Operations
              </p>
            </div>

            <div className="grid w-[calc(100dvw-32px)] max-w-[420px] gap-2">
              {[
                { label: 'Reservations today', value: reservationsToday, tone: 'text-sky-100 border-sky-300/18 bg-sky-300/[0.06]' },
                { label: 'Returns today', value: returnsToday, tone: 'text-amber-100 border-amber-300/18 bg-amber-300/[0.06]' },
                { label: 'Unread WhatsApp', value: unreadWhatsappCount, tone: 'text-rose-100 border-rose-300/18 bg-rose-300/[0.06]' },
              ].map((item) => (
                <div key={item.label} className={`flex items-center justify-between rounded-3xl border px-4 py-3 ${item.tone}`}>
                  <span className="text-sm font-bold">{item.label}</span>
                  <span className="text-2xl font-black">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className="flex h-full min-h-0 w-[100dvw] max-w-none flex-col overflow-x-hidden bg-[linear-gradient(180deg,#07101a_0%,#050910_100%)] px-3 pb-3 pt-2 text-white"
        style={{ width: '100dvw', maxWidth: 'none' }}
      >
        <div className="flex w-full max-w-none flex-shrink-0 gap-2 pb-2">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search booking..."
            className="min-w-0 flex-1 rounded-2xl border border-white/[0.08] bg-zinc-950/90 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-300/55"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as (typeof statuses)[number])}
            className="w-[112px] rounded-2xl border border-white/[0.08] bg-zinc-950/90 px-2 py-2.5 text-xs font-bold text-white outline-none transition focus:border-sky-300/55"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status === 'ALL' ? 'All' : status}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-2 flex w-full flex-shrink-0 gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setQuickFilter('returnsToday')}
            className={`shrink-0 rounded-2xl border px-3 py-2 text-xs font-black ${
              quickFilter === 'returnsToday'
                ? 'border-amber-300/35 bg-amber-300/14 text-amber-50'
                : 'border-white/[0.07] bg-white/[0.025] text-zinc-300'
            }`}
          >
            Επιστροφές σήμερα
          </button>
          <button
            type="button"
            onClick={() => setQuickFilter('pickupsToday')}
            className={`shrink-0 rounded-2xl border px-3 py-2 text-xs font-black ${
              quickFilter === 'pickupsToday'
                ? 'border-sky-300/35 bg-sky-300/14 text-sky-50'
                : 'border-white/[0.07] bg-white/[0.025] text-zinc-300'
            }`}
          >
            Παραδόσεις σήμερα
          </button>
          <button
            type="button"
            onClick={() => setQuickFilter('all')}
            className={`shrink-0 rounded-2xl border px-3 py-2 text-xs font-black ${
              quickFilter === 'all'
                ? 'border-zinc-300/35 bg-white/[0.08] text-white'
                : 'border-white/[0.07] bg-white/[0.025] text-zinc-300'
            }`}
          >
            Όλες
          </button>
        </div>
        {quickFilter === 'returnsToday' && (
          <div className="mb-2 flex flex-shrink-0 flex-col gap-1.5 rounded-2xl border border-amber-300/14 bg-amber-300/[0.045] p-2">
            <button
              type="button"
              onClick={sendAllTodayReturnReminders}
              disabled={isBulkSendingReminders || todayReturnReminderTargets.length === 0}
              className="min-h-11 rounded-xl border border-cyan-300/30 bg-cyan-300/12 px-3 py-2 text-xs font-black text-cyan-50 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-900/65 disabled:text-zinc-500"
            >
              {isBulkSendingReminders ? 'Sending...' : "Send all today's return reminders"}
            </button>
            {reminderFeedback && (
              <p
                className={`rounded-lg border px-2 py-1 text-[11px] font-bold ${
                  isReminderSuccessFeedback(reminderFeedback)
                    ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100'
                    : isReminderPendingFeedback(reminderFeedback)
                      ? 'border-white/[0.08] bg-white/[0.035] text-zinc-300'
                      : 'border-rose-300/25 bg-rose-300/10 text-rose-100'
                }`}
              >
                {reminderFeedback}
              </p>
            )}
          </div>
        )}

        <div className="min-h-0 w-full max-w-none flex-1 overflow-x-hidden overflow-y-auto pb-2">
          {isLoadingReservations ? (
            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5 text-center text-sm text-zinc-400">
              Φόρτωση κρατήσεων...
            </div>
          ) : mobileReservations.length > 0 ? (
            <div className="space-y-2.5">
              {mobileReservations.map((reservation) => {
                const hasUnreadWhatsapp = unreadWhatsappReservationIds.has(reservation.id);
                const licenceState = getDrivingLicenceState(reservation);

                return (
                  <button
                    key={reservation.id}
                    type="button"
                    onClick={() => {
                      openReservation(reservation.id);
                      setMobileReservationId(reservation.id);
                    }}
                    className="w-full rounded-3xl border border-white/[0.075] bg-white/[0.035] p-3 text-left shadow-[0_18px_48px_rgba(0,0,0,0.22)] transition active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {hasUnreadWhatsapp && <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.75)]" />}
                          <p className="truncate text-base font-black text-white">{reservation.hotelRoom || reservation.name || 'Customer'}</p>
                        </div>
                        <p className="mt-1 font-mono text-xs text-sky-100/80">{reservation.phoneWhatsapp || '-'}</p>
                      </div>
                      <StatusBadge status={reservation.status} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-2xl border border-white/[0.055] bg-black/20 px-3 py-2">
                        <p className="text-zinc-500">Group</p>
                        <p className="mt-1 font-black text-sky-100">{reservation.vehicleGroup || '-'}</p>
                      </div>
                      <div className="rounded-2xl border border-white/[0.055] bg-black/20 px-3 py-2">
                        <p className="text-zinc-500">Price</p>
                        <p className="mt-1 font-semibold text-zinc-100">{money(reservation.price)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/[0.055] bg-black/20 px-3 py-2">
                        <p className="text-zinc-500">Pickup</p>
                        <p className="mt-1 font-semibold text-zinc-100">{formatDate(reservation.pickupDate)} {reservation.pickupTime}</p>
                      </div>
                      <div className="rounded-2xl border border-white/[0.055] bg-black/20 px-3 py-2">
                        <p className="text-zinc-500">Return</p>
                        <p className="mt-1 font-semibold text-zinc-100">{formatDate(reservation.returnDate)} {reservation.returnTime}</p>
                      </div>
                      <div className="rounded-2xl border border-white/[0.055] bg-black/20 px-3 py-2">
                        <p className="text-zinc-500">Driving Licence</p>
                        <p className={`mt-1 font-semibold ${licenceState === 'uploaded' ? 'text-blue-100' : 'text-zinc-500'}`}>
                          {licenceState === 'uploaded' ? 'Uploaded' : 'Empty'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/[0.055] bg-black/20 px-3 py-2">
                        <p className="text-zinc-500">Modified</p>
                        <p className="mt-1 font-mono text-[11px] font-semibold text-zinc-100">{formatCompactDateTime(reservation.lastModifiedAt)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-zinc-500">Tap to open details</span>
                      <span className="rounded-xl border border-sky-300/24 bg-sky-300/10 px-3 py-1.5 text-xs font-black text-sky-100">
                        Open/Edit
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5 text-center text-sm text-zinc-400">
              Δεν υπάρχουν κρατήσεις.
            </div>
          )}
        </div>

        {mobileReservation && (
          <MobileReservationModal
            reservation={mobileReservation}
            agencyOptions={agencyOptions}
            representativesByAgency={representativesByAgency}
            vehicleGroups={vehicleGroups}
            workflowEvents={workflowEvents}
            isLoadingWorkflowEvents={isLoadingWorkflowEvents}
            whatsappMessages={whatsappMessages}
            isLoadingWhatsappMessages={isLoadingWhatsappMessages}
            onClose={() => setMobileReservationId('')}
            onUpdate={updateSelectedReservation}
            onSendReminder={sendReminder}
            isReminderSending={sendingReminderIds.has(mobileReservation.id)}
            isReminderDisabled={isBulkSendingReminders}
            reminderFeedback={reminderFeedback}
            onReloadWhatsappMessages={loadWhatsappMessages}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col gap-px overflow-hidden rounded-xl bg-slate-100 p-0.5 text-slate-900">
      <div className="flex flex-shrink-0 flex-col gap-0.5 rounded-lg border border-slate-200 bg-white px-1 py-px shadow-sm md:flex-row md:items-center">
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search phone, name, group, agency, hotel..."
          className="h-[26px] min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-[11px] text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as (typeof statuses)[number])}
          className="h-[26px] rounded-md border border-slate-300 bg-white px-2 text-[11px] text-slate-900 outline-none transition duration-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status === 'ALL' ? 'All statuses' : status}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowHistoryModal(true)}
          className="h-[26px] shrink-0 rounded-md border border-violet-300 bg-violet-100 px-2 text-[11px] font-bold text-violet-800 transition duration-200 hover:-translate-y-0.5 hover:border-violet-400 hover:bg-violet-200"
        >
          Ιστορικό Κρατήσεων
        </button>
        <button
          type="button"
          onClick={() => setShowReturnsModal(true)}
          className="h-[26px] shrink-0 rounded-md border border-amber-300 bg-amber-100 px-2 text-[11px] font-bold text-amber-800 transition duration-200 hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-200"
        >
          Επιστροφές
        </button>
        <button
          type="button"
          onClick={() => setShowAvailabilityModal(true)}
          className="h-[26px] shrink-0 rounded-md border border-emerald-300 bg-emerald-100 px-2 text-[11px] font-bold text-emerald-800 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-400 hover:bg-emerald-200"
        >
          Availability
        </button>
        <button
          type="button"
          onClick={() => setShowAvailabilityTestModal(true)}
          className="h-[26px] shrink-0 rounded-md border border-cyan-300 bg-cyan-100 px-2 text-[11px] font-bold text-cyan-800 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-400 hover:bg-cyan-200"
        >
          Check Availability
        </button>
        <button
          type="button"
          onClick={() => {
            const nextAgency = agencyOptions[0] || '';
            setForm({
              ...initialForm,
              agency: nextAgency,
              representative: representativesByAgency[nextAgency]?.[0] || '',
            });
            setShowNewModal(true);
          }}
          className="h-[26px] shrink-0 rounded-md border border-sky-400 bg-sky-600 px-2 text-[11px] font-bold text-white transition duration-200 hover:-translate-y-0.5 hover:border-sky-500 hover:bg-sky-700"
        >
          + Νέα Κράτηση
        </button>
        <div className="flex h-[26px] shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold text-slate-500">
          <span>Auto-refresh: 4 min</span>
          <span className="h-3 w-px bg-slate-300" />
          <span>Last updated: {formatTime(lastReservationsUpdatedAt)}</span>
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-wrap items-center gap-x-2 gap-y-px rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-px text-[9px] font-bold text-slate-700">
        {bookingHealthStatuses.map((health) => {
          const stateLabel = health.state === 'active' ? 'active' : health.state === 'error' ? 'error' : 'no recent event';
          const title = health.lastEventAt
            ? `${health.label}: last event ${formatDateTime(health.lastEventAt)}`
            : `${health.label}: no event available in loaded data`;

          return (
            <span key={health.label} title={title} className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  health.state === 'active'
                    ? 'bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,0.55)]'
                    : health.state === 'error'
                      ? 'bg-rose-500 shadow-[0_0_7px_rgba(244,63,94,0.5)]'
                      : 'bg-amber-400 shadow-[0_0_7px_rgba(251,191,36,0.45)]'
                }`}
              />
              <span>{health.label}</span>
              <span className={health.state === 'active' ? 'text-emerald-700' : health.state === 'error' ? 'text-rose-700' : 'text-amber-700'}>
                {stateLabel}
              </span>
            </span>
          );
        })}
      </div>

      <div className="flex flex-shrink-0 flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white px-1.5 py-0.5 shadow-sm">
        {([
          { id: 'active', label: 'Active' },
          { id: 'returned', label: 'Returned' },
        ] as Array<{ id: ReservationListMode; label: string }>).map((mode) => {
          const isActive = listMode === mode.id;

          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => setListMode(mode.id)}
              className={`h-[26px] rounded-md border px-2 text-[11px] font-black transition duration-200 ${
                isActive
                  ? 'border-emerald-400 bg-emerald-100 text-emerald-900 shadow-sm'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-emerald-400 hover:bg-emerald-50 hover:text-slate-900'
              }`}
            >
              {mode.label}
            </button>
          );
        })}
        <span className="h-5 w-px bg-slate-300" />
        {quickReservationFilters.map((filter) => {
          const isActive = quickFilter === filter.id;

          if (filter.id === 'all') {
            return (
              <Fragment key={filter.id}>
                <select
                  value={agencyQuickFilter}
                  onChange={(event) => setAgencyQuickFilter(event.target.value)}
                  className="h-[26px] rounded-md border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-700 outline-none transition hover:border-sky-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                >
                  <option value="ALL">All agencies</option>
                  {agencyQuickFilterOptions.map((agency) => (
                    <option key={agency} value={agency}>
                      {agency}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setQuickFilter(filter.id)}
                  className={`h-[26px] rounded-md border px-2 text-[11px] font-bold transition duration-200 ${
                    isActive
                      ? 'border-sky-400 bg-sky-100 text-sky-900 shadow-sm'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-sky-400 hover:bg-sky-50 hover:text-slate-900'
                  }`}
                >
                  {filter.label}
                </button>
              </Fragment>
            );
          }

          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setQuickFilter(filter.id)}
              className={`h-[26px] rounded-md border px-2 text-[11px] font-bold transition duration-200 ${
                isActive
                  ? 'border-sky-400 bg-sky-100 text-sky-900 shadow-sm'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-sky-400 hover:bg-sky-50 hover:text-slate-900'
              }`}
            >
              {filter.label}
            </button>
          );
        })}
        {quickFilter === 'returnsToday' && (
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {reminderFeedback && (
              <span
                className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                  isReminderSuccessFeedback(reminderFeedback)
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : isReminderPendingFeedback(reminderFeedback)
                      ? 'border-slate-300 bg-slate-50 text-slate-700'
                      : 'border-rose-300 bg-rose-50 text-rose-800'
                }`}
              >
                {reminderFeedback}
              </span>
            )}
            <button
              type="button"
              onClick={sendAllTodayReturnReminders}
              disabled={isBulkSendingReminders || todayReturnReminderTargets.length === 0}
              className="rounded-md border border-cyan-500 bg-cyan-600 px-2.5 py-0.5 text-[10px] font-black text-white transition hover:border-cyan-600 hover:bg-cyan-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
            >
              {isBulkSendingReminders ? 'Sending...' : "Send all today's return reminders"}
            </button>
          </div>
        )}
      </div>

      <div ref={desktopSplitRef} className="flex min-h-0 flex-1 flex-col">
      <section className="min-h-[180px] flex-1 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
        <div className="h-full overflow-auto">
          <table className="w-full min-w-[1430px] text-left text-[13px]">
            <thead className="sticky top-0 z-10 bg-slate-200 text-xs font-bold text-slate-800 shadow-[0_1px_0_rgba(15,23,42,0.15)]">
              <tr>
                {bookingTableColumns.map((column) => (
                  <th key={column.key} className={`whitespace-nowrap px-2.5 py-2 ${column.className || ''}`}>
                    <button
                      type="button"
                      onClick={() =>
                        setTableSort((currentSort) =>
                          currentSort.key === column.key
                            ? { key: column.key, direction: currentSort.direction === 'asc' ? 'desc' : 'asc' }
                            : { key: column.key, direction: 'asc' }
                        )
                      }
                      className={`flex w-full items-center gap-1 text-left font-bold transition hover:text-slate-950 ${
                        column.align === 'right' ? 'justify-end' : ''
                      } ${tableSort.key === column.key ? 'text-sky-800' : 'text-slate-700'}`}
                    >
                      <span>{column.label}</span>
                      {tableSort.key === column.key && (
                        <span className="text-[9px] text-sky-700">{tableSort.direction === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoadingReservations && (
                <tr>
                  <td colSpan={17} className="px-3 py-8 text-center text-sm text-slate-500">
                    Φόρτωση κρατήσεων...
                  </td>
                </tr>
              )}
              {!isLoadingReservations && filteredReservations.length === 0 && (
                <tr>
                  <td colSpan={17} className="px-3 py-8 text-center text-sm text-slate-500">
                    Δεν υπάρχουν κρατήσεις.
                  </td>
                </tr>
              )}
              {filteredReservations.map((reservation) => {
                const isSelected = selectedReservation.id === reservation.id;
                const isReturned = reservation.status === 'RETURN' || reservation.returnConfirmed === true;
                const hasUnreadWhatsapp =
                  unreadWhatsappReservationIds.has(reservation.id) ||
                  (selectedReservation.id === reservation.id && whatsappMessages.some((message) => message.isUnread));

                return (
                  <tr
                    key={reservation.id}
                    onClick={() => {
                      openReservation(reservation.id);
                    }}
                    onDoubleClick={() => {
                      openReservation(reservation.id);
                      setEditingReservation(reservation);
                    }}
                    className={`cursor-pointer transition duration-200 hover:bg-sky-50 ${
                      isSelected
                        ? 'bg-sky-100 shadow-[inset_3px_0_0_rgb(14,165,233)]'
                        : isReturned
                          ? 'bg-cyan-50 text-cyan-950 shadow-[inset_3px_0_0_rgb(6,182,212)] hover:bg-cyan-100'
                          : 'odd:bg-white even:bg-slate-50'
                    }`}
                  >
                    <td className={`whitespace-nowrap px-2.5 py-2 font-mono text-[13px] ${isReturned ? 'font-semibold text-cyan-900' : 'text-sky-800'}`}>
                      <span className="inline-flex items-center gap-1.5">
                        {hasUnreadWhatsapp && (
                          <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.65)]" title="Unread WhatsApp message" />
                        )}
                        {reservation.phoneWhatsapp}
                        {hasUnreadWhatsapp && !isReturned && (
                          <span className="rounded-full border border-rose-300/45 bg-rose-500 px-1.5 py-0.5 text-[9px] font-black leading-none text-white">
                            NEW
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2.5 py-2"><VehicleGroupBadge value={reservation.vehicleGroup} /></td>
                    <td className="whitespace-nowrap px-2.5 py-2"><AgencyBadge value={reservation.agency} /></td>
                    <td className={`max-w-[102px] truncate whitespace-nowrap px-2.5 py-2 ${isReturned ? 'text-cyan-800' : 'text-slate-700'}`} title={reservation.representative}>{reservation.representative}</td>
                    <td className={`max-w-[150px] truncate whitespace-nowrap px-2.5 py-2 font-semibold ${isReturned ? 'text-cyan-950' : 'text-slate-950'}`} title={reservation.hotelRoom || reservation.name}>{reservation.hotelRoom || reservation.name}</td>
                    <td className={`whitespace-nowrap px-2.5 py-2 ${isReturned ? 'text-cyan-800' : 'text-slate-700'}`}>{formatDate(reservation.pickupDate)}</td>
                    <td className={`whitespace-nowrap px-2.5 py-2 ${isReturned ? 'font-semibold text-cyan-950' : 'text-slate-700'}`}>{formatDate(reservation.returnDate)}</td>
                    <td className={`whitespace-nowrap px-2.5 py-2 ${isReturned ? 'text-cyan-800' : 'text-slate-700'}`}>{reservation.pickupTime}</td>
                    <td className={`whitespace-nowrap px-2.5 py-2 ${isReturned ? 'font-semibold text-cyan-950' : 'text-slate-700'}`}>{reservation.returnTime}</td>
                    <td className="whitespace-nowrap px-2.5 py-2 text-right font-bold text-slate-950">{money(reservation.price)}</td>
                    <td className="whitespace-nowrap px-2.5 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <StatusBadge status={reservation.status} />
                        {quickFilter === 'returnsToday' && isReturned && (
                          <span className="rounded-full border border-emerald-400 bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black leading-none text-emerald-900">
                            ✓ RETURN
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2.5 py-2"><LanguageBadge language={reservation.language} /></td>
                    <td className="whitespace-nowrap px-2.5 py-2"><BooleanBadge active={reservation.sendReturn} /></td>
                    <td className="whitespace-nowrap px-2.5 py-2"><BooleanBadge active={reservation.confirmationSent} /></td>
                    <td className="whitespace-nowrap px-2.5 py-2"><ExtrasBadges extras={reservation.extras} /></td>
                    <td className="whitespace-nowrap px-2.5 py-2"><LicenceCell url={getDrivingLicenceUrl(reservation)} /></td>
                    <td className={`w-[88px] whitespace-nowrap px-2.5 py-2 font-mono text-xs ${isReturned ? 'text-cyan-800' : 'text-slate-500'}`}>{formatCompactDateTime(reservation.lastModifiedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize reservation details"
        onPointerDown={(event) => {
          event.preventDefault();
          setIsResizingDetails(true);
        }}
        className={`group flex h-2 flex-shrink-0 cursor-ns-resize touch-none items-center justify-center ${
          isResizingDetails ? 'bg-sky-100' : 'bg-transparent'
        }`}
      >
        <span
          className={`h-1 w-20 rounded-full border transition ${
            isResizingDetails
              ? 'border-sky-500 bg-sky-400'
              : 'border-slate-300 bg-slate-200 group-hover:border-sky-400 group-hover:bg-sky-300'
          }`}
        />
      </div>

      <div className="flex min-h-[220px] flex-shrink-0 overflow-hidden" style={{ height: detailPanelHeight }}>
      {selectedReservation ? (
        <ReservationInspector
          key={selectedReservation.id}
          reservation={selectedReservation}
          agencyOptions={agencyOptions}
          representativesByAgency={representativesByAgency}
          vehicleGroups={vehicleGroups}
          onUpdate={updateSelectedReservation}
          onDelete={deleteSelectedReservation}
          workflowEvents={workflowEvents}
          isLoadingWorkflowEvents={isLoadingWorkflowEvents}
          whatsappMessages={whatsappMessages}
          isLoadingWhatsappMessages={isLoadingWhatsappMessages}
          unreadWhatsappCount={whatsappMessages.filter((message) => message.isUnread).length}
          onOpenWhatsappChat={() => openWhatsappChat(selectedReservation.id)}
          onCreateWorkflowEvent={recordWorkflowEvent}
          onSendReminder={sendReminder}
          isReminderSending={sendingReminderIds.has(selectedReservation.id)}
          isReminderDisabled={isBulkSendingReminders}
          reminderFeedback={reminderFeedback}
        />
      ) : (
        <section className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Δεν υπάρχουν κρατήσεις.
        </section>
      )}
      </div>
      </div>

      {showNewModal && (
        <NewReservationModal
          form={form}
          agencyOptions={agencyOptions}
          representativesByAgency={representativesByAgency}
          vehicleGroups={vehicleGroups}
          onChange={setForm}
          onClose={() => setShowNewModal(false)}
          onSave={saveReservation}
        />
      )}

      {editingReservation && (
        <EditReservationModal
          reservation={editingReservation}
          agencyOptions={agencyOptions}
          representativesByAgency={representativesByAgency}
          vehicleGroups={vehicleGroups}
          onClose={() => setEditingReservation(null)}
          onSave={saveEditedReservation}
        />
      )}

      {showHistoryModal && (
        <BookingHistoryModal
          reservations={reservations}
          onClose={() => setShowHistoryModal(false)}
          onSelect={(reservationId) => {
            openReservation(reservationId);
            setShowHistoryModal(false);
          }}
        />
      )}

      {showReturnsModal && (
        <ReturnsModal
          reservations={reservations}
          onClose={() => setShowReturnsModal(false)}
          onSendReminder={sendReminder}
          sendingReminderIds={sendingReminderIds}
          isBulkSending={isBulkSendingReminders}
          reminderFeedback={reminderFeedback}
        />
      )}

      {showAvailabilityModal && (
        <AvailabilityModal
          vehicleGroups={vehicleGroups}
          onClose={() => setShowAvailabilityModal(false)}
        />
      )}

      {showAvailabilityTestModal && (
        <AvailabilityTestModal onClose={() => setShowAvailabilityTestModal(false)} />
      )}

      {showWhatsappChat && selectedReservation && (
        <WhatsappChatPopup
          reservation={selectedReservation}
          messages={whatsappMessages}
          onReloadMessages={loadWhatsappMessages}
          onClose={() => setShowWhatsappChat(false)}
        />
      )}
    </div>
  );
}

function ReservationInspector({
  reservation,
  agencyOptions,
  representativesByAgency,
  vehicleGroups,
  onUpdate,
  onDelete,
  workflowEvents,
  isLoadingWorkflowEvents,
  whatsappMessages,
  isLoadingWhatsappMessages,
  unreadWhatsappCount,
  onOpenWhatsappChat,
  onCreateWorkflowEvent,
  onSendReminder,
  isReminderSending,
  isReminderDisabled,
  reminderFeedback,
}: {
  reservation: Reservation;
  agencyOptions: string[];
  representativesByAgency: Record<string, string[]>;
  vehicleGroups: VehicleGroup[];
  onUpdate: (reservation: Reservation) => Promise<Reservation | false>;
  onDelete: () => void;
  workflowEvents: WorkflowEvent[];
  isLoadingWorkflowEvents: boolean;
  whatsappMessages: WhatsappMessage[];
  isLoadingWhatsappMessages: boolean;
  unreadWhatsappCount: number;
  onOpenWhatsappChat: () => void;
  onCreateWorkflowEvent: (reservationId: string, eventType: string, eventMessage: string) => Promise<void>;
  onSendReminder: (reservation: Reservation) => Promise<Reservation | false>;
  isReminderSending: boolean;
  isReminderDisabled: boolean;
  reminderFeedback: string;
}) {
  const [draft, setDraft] = useState<Reservation>(reservation);
  const [viewerDocument, setViewerDocument] = useState<LicenceViewerDocument | null>(null);

  useEffect(() => {
    setDraft(reservation);
  }, [reservation]);

  const updateDraft = (patch: Partial<Reservation>) => {
    setDraft((currentDraft) => ({ ...currentDraft, ...patch }));
  };

  const saveDraft = async () => {
    if (draft.status === 'ACCEPTED' && !hasAcceptedRequiredFields(draft)) {
      window.alert(acceptedValidationMessage);
      return;
    }

    const updatedReservation = await onUpdate(draft);
    if (updatedReservation) {
      setDraft(updatedReservation);
      await onCreateWorkflowEvent(updatedReservation.id, 'booking_updated', 'Booking details updated');
    }
  };

  const sendReminder = async () => {
    const updated = await onSendReminder(draft);
    if (updated) {
      setDraft(updated);
    }
  };

  const updateStatus = async (status: ReservationStatus) => {
    if (status === 'ACCEPTED' && !hasAcceptedRequiredFields(draft)) {
      window.alert(acceptedValidationMessage);
      return;
    }

    const patch: Partial<Reservation> = { status };

    if (status === 'ACCEPTED' && draft.status !== 'ACCEPTED') {
      patch.whatsappMessages = [
        ...(draft.whatsappMessages || defaultWhatsappMessages),
        createWhatsappMessage('Confirmation message sent with agreement/licence link.'),
      ];
    }

    updateDraft(patch);
    const nextDraft = { ...draft, ...patch };
    const updatedReservation = await onUpdate(nextDraft);

    if (updatedReservation) {
      setDraft(updatedReservation);
      await onCreateWorkflowEvent(updatedReservation.id, 'status_changed', `Status changed to ${status}`);

      if (status === 'ACCEPTED' && draft.status !== 'ACCEPTED') {
        await onCreateWorkflowEvent(
          updatedReservation.id,
          'confirmation_sent',
          'Confirmation sent with agreement/licence link'
        );
      }
    }
  };

  const actions: Array<{
    label: string;
    tone: 'reminder' | 'save' | 'delete';
    onClick: () => void | Promise<void>;
    disabled?: boolean;
  }> = [
    {
      label: isReminderSending ? 'Sending...' : 'Send reminder',
      tone: 'reminder',
      onClick: sendReminder,
      disabled: isReminderSending || isReminderDisabled,
    },
    { label: 'Save changes', tone: 'save', onClick: saveDraft },
    { label: 'Delete booking', tone: 'delete', onClick: onDelete },
  ];
  return (
    <>
    <section className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-300 bg-white p-1.5 shadow-sm">
      <div className="grid h-full min-h-0 gap-1.5 xl:grid-cols-[minmax(390px,1.12fr)_minmax(300px,0.88fr)_minmax(230px,0.55fr)]">
        <Panel title="Reservation record" subtitle={reservation.id}>
          <div className="grid gap-1 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <div className="grid gap-1">
              <EditableCompactInput label="Phone WhatsApp" value={draft.phoneWhatsapp} onChange={(value) => updateDraft({ phoneWhatsapp: value.replace(/\s+/g, '') })} mono />
              <EditableCompactInput label="Name" value={draft.name} onChange={(value) => updateDraft({ name: value })} />
              <EditableCompactInput label="Hotel and Room" value={draft.hotelRoom} onChange={(value) => updateDraft({ hotelRoom: value })} />
              <EditableCompactSelect label="Vehicle Group" value={draft.vehicleGroup} options={withCurrentOption(vehicleGroups, draft.vehicleGroup)} onChange={(value) => updateDraft({ vehicleGroup: value })} />
              <EditableCompactSelect
                label="Agency"
                value={draft.agency}
                options={withCurrentOption(agencyOptions, draft.agency)}
                onChange={(value) => updateDraft({ agency: value, representative: representativesByAgency[value]?.[0] || '' })}
              />
              <EditableCompactSelect
                label="Representative"
                value={draft.representative}
                options={withCurrentOption(representativesByAgency[draft.agency] || [], draft.representative)}
                onChange={(value) => updateDraft({ representative: value })}
              />
            </div>
            <div className="grid gap-1">
              <EditableCompactInput label="Pickup Date" type="date" value={draft.pickupDate} onChange={(value) => updateDraft({ pickupDate: value })} />
              <EditableCompactInput label="Pickup Time" value={draft.pickupTime} placeholder="09:30" onChange={(value) => updateDraft({ pickupTime: value })} />
              <EditableCompactInput label="Return Date" type="date" value={draft.returnDate} onChange={(value) => updateDraft({ returnDate: value })} />
              <EditableCompactInput label="Return Time" value={draft.returnTime} placeholder="18:00" onChange={(value) => updateDraft({ returnTime: value })} />
              <EditableCompactInput label="Price" type="number" value={draft.price === null ? '' : String(draft.price)} onChange={(value) => updateDraft({ price: value === '' ? null : Number(value) || null })} />
              <EditableCompactInput label="Email" type="email" value={draft.email} onChange={(value) => updateDraft({ email: value })} />
              <EditableCompactSelect label="Language" value={draft.language} options={languageOptions} onChange={(value) => updateDraft({ language: normalizeLanguage(value) })} />
              <CompactStatusButtons value={draft.status} onChange={updateStatus} />
            </div>
          </div>
        </Panel>

        <Panel title="Actions & files" subtitle="workflow">
          <div className="grid min-h-0 gap-1.5 md:grid-cols-[minmax(0,1.08fr)_minmax(126px,0.72fr)] xl:mt-2 2xl:mt-3">
            <div className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-slate-50 p-2">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-black text-slate-900">Workflow log</p>
                <span className="text-[11px] font-semibold text-slate-500">audit</span>
              </div>
              <div className="grid max-h-[136px] min-h-[88px] gap-1 overflow-auto pr-1">
                {isLoadingWorkflowEvents ? (
                  <p className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-500">
                    Loading workflow events...
                  </p>
                ) : workflowEvents.length > 0 ? (
                  workflowEvents.map((event) => {
                    const eventStyle = getWorkflowEventStyle(event.eventType);

                    return (
                      <div key={event.id} className={`rounded-md border px-2.5 py-2 text-xs leading-5 ${eventStyle.className}`}>
                        <div className="flex items-start justify-between gap-2">
                          <span>
                            <span className="block font-bold text-slate-900">{event.message}</span>
                            <span className="mt-0.5 block text-[11px] opacity-75">{formatDateTime(event.createdAt)}</span>
                          </span>
                          {eventStyle.badge ? (
                            <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8.5px] font-black tracking-wide ${eventStyle.badgeClassName}`}>
                              {eventStyle.badge}
                            </span>
                          ) : null}
                          {!eventStyle.badge ? (
                            <span className="shrink-0 rounded-full border border-slate-300 bg-white px-1.5 py-0.5 text-[8.5px] font-black tracking-wide text-slate-600">
                              {event.eventType}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-500">
                    No workflow events yet.
                  </p>
                )}
              </div>
              <div className="mt-auto grid grid-cols-3 gap-1 pt-2">
                {actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className={`flex h-9 min-w-0 items-center justify-center whitespace-nowrap rounded-lg border px-2 text-center text-[11.5px] font-black leading-none tracking-normal transition duration-200 hover:-translate-y-0.5 ${
                      action.tone === 'reminder'
                        ? 'border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-700'
                        : action.tone === 'save'
                          ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'border-rose-600 bg-rose-600 text-white hover:bg-rose-700'
                    } disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:translate-y-0`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
              {reminderFeedback && (
                <p
                  className={`mt-1 rounded-md border px-2 py-1 text-[10.5px] font-bold ${
                    isReminderSuccessFeedback(reminderFeedback)
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : isReminderPendingFeedback(reminderFeedback)
                        ? 'border-slate-300 bg-slate-50 text-slate-700'
                        : 'border-rose-300 bg-rose-50 text-rose-800'
                  }`}
                >
                  {reminderFeedback}
                </p>
              )}
            </div>

            <div className="grid gap-1.5">
              <LicenceCard title="Driving Licence" url={getDrivingLicenceUrl(draft)} onOpen={setViewerDocument} />
              <ExtrasQuantityGroup
                extras={draft.extras}
                onChange={(extras) => updateDraft({ extras })}
              />
            </div>
          </div>
        </Panel>

        <Panel title="Workflow & WhatsApp" subtitle={draft.phoneWhatsapp}>
          <div
            role="button"
            tabIndex={0}
            onClick={onOpenWhatsappChat}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              onOpenWhatsappChat();
            }}
            className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 p-2 transition hover:border-sky-300 hover:bg-sky-50"
          >
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-900">WhatsApp messages</p>
              {unreadWhatsappCount > 0 ? (
                <span className="rounded-full border border-rose-300/40 bg-rose-500 px-1.5 py-0.5 text-[9px] font-black leading-none text-white">
                  {unreadWhatsappCount} unread
                </span>
              ) : (
                <span className="text-[10px] text-slate-500">live</span>
              )}
            </div>
            <div className="grid max-h-24 gap-1 overflow-auto pr-1">
              {isLoadingWhatsappMessages ? (
                <p className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-500">
                  Loading WhatsApp messages...
                </p>
              ) : whatsappMessages.length > 0 ? (
                whatsappMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-md border px-2 py-1.5 ${
                      message.from === 'Customer'
                        ? 'ml-0 mr-5 border-emerald-200 bg-emerald-50'
                        : 'ml-5 mr-0 border-sky-200 bg-sky-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-[10px] font-black ${message.from === 'Customer' ? 'text-emerald-800' : 'text-sky-800'}`}>
                        {message.from}
                      </p>
                      {message.isUnread && (
                        <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[8.5px] font-black leading-none text-white">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs leading-5 text-slate-800">{message.text || '-'}</p>
                    {message.createdAt && <p className="mt-0.5 text-[10.5px] font-semibold text-slate-500">{formatDateTime(message.createdAt)}</p>}
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-500">
                  No WhatsApp messages yet.
                </p>
              )}
            </div>
            <div className="mt-1.5 flex gap-1.5">
              <input
                placeholder="Write WhatsApp message..."
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
              <button
                type="button"
                onClick={(event) => event.stopPropagation()}
                className="rounded-lg border border-sky-600 bg-sky-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-sky-700"
              >
                Send
              </button>
            </div>
          </div>

          <label className="mt-1.5 grid gap-1 text-xs font-bold text-slate-700">
            Notes
            <textarea
              value={draft.notes}
              onChange={(event) => updateDraft({ notes: event.target.value })}
              className="min-h-[58px] resize-none rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] leading-5 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            />
          </label>

        </Panel>
      </div>
    </section>
    {viewerDocument && (
      <LicenceViewerModal
        document={viewerDocument}
        onClose={() => setViewerDocument(null)}
      />
    )}
    </>
  );
}

function NewReservationModal({
  form,
  agencyOptions,
  representativesByAgency,
  vehicleGroups,
  onChange,
  onClose,
  onSave,
}: {
  form: ReservationForm;
  agencyOptions: string[];
  representativesByAgency: Record<string, string[]>;
  vehicleGroups: VehicleGroup[];
  onChange: (form: ReservationForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const representatives = representativesByAgency[form.agency] || [];
  const [availabilityState, setAvailabilityState] = useState<{
    status: 'idle' | 'checking' | 'ready' | 'empty';
    groups: GroupAvailabilityResult[];
  }>({ status: 'idle', groups: [] });
  const datesReady = Boolean(form.pickupDate && form.returnDate);
  const availableVehicleGroups = availabilityState.groups.map((group) => group.vehicle_group);
  const selectedGroupAvailability = availabilityState.groups.find((group) => group.vehicle_group === form.vehicleGroup);
  const vehicleGroupSelectDisabled =
    !datesReady || availabilityState.status === 'checking' || availabilityState.status === 'empty';

  useEffect(() => {
    if (!form.pickupDate || !form.returnDate) {
      setAvailabilityState({ status: 'idle', groups: [] });
      return;
    }

    let isCurrentCheck = true;
    setAvailabilityState({ status: 'checking', groups: [] });

    const runAvailabilityCheck = async () => {
      const availability = await checkGroupAvailability({
        pickup_date: form.pickupDate,
        return_date: form.returnDate,
      });
      const availableGroups = availability.filter((group) => group.available > 0);

      if (!isCurrentCheck) return;

      if (availableGroups.length === 0) {
        setAvailabilityState({ status: 'empty', groups: [] });
        return;
      }

      setAvailabilityState({ status: 'ready', groups: availableGroups });
    };

    void runAvailabilityCheck();

    return () => {
      isCurrentCheck = false;
    };
  }, [form.pickupDate, form.returnDate]);

  const updateForm = (patch: Partial<ReservationForm>) => {
    onChange({ ...form, ...patch });
  };

  const isSaveDisabled =
    !form.vehicleGroup || availabilityState.status === 'checking' || availabilityState.status === 'empty';

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-[min(920px,95vw)] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(145deg,#09111d_0%,#060a11_55%,#03060a_100%)] shadow-[0_32px_110px_rgba(0,0,0,0.62)]">
        <div className="flex flex-shrink-0 items-start justify-between border-b border-white/10 bg-white/[0.025] px-6 py-5">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-sky-200/75">BOOKINGS</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Νέα Κράτηση</h2>
            <p className="mt-1 text-xs text-zinc-500">AutoClub reservation operations entry</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white">
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-5">
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-100">Βασικά Στοιχεία</h3>
                <p className="text-xs text-zinc-500">Reservation details before automation sync.</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-[10px] font-extrabold ${statusActiveClasses[form.status]}`}>
                {form.status}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Phone WhatsApp">
              <input value={form.phoneWhatsapp} onChange={(event) => updateForm({ phoneWhatsapp: event.target.value })} className={modalFieldClass} placeholder="+306941123011" />
            </Field>
            <Field label="Name">
              <input value={form.name} onChange={(event) => updateForm({ name: event.target.value })} className={modalFieldClass} />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={(event) => updateForm({ email: event.target.value })} className={modalFieldClass} placeholder="customer@email.com" />
            </Field>
            <Field label="Pickup Date">
              <input
                type="date"
                value={form.pickupDate}
                onClick={(event) => openNativeDatePicker(event.currentTarget)}
                onFocus={(event) => openNativeDatePicker(event.currentTarget)}
                onChange={(event) => updateForm({ pickupDate: event.target.value, vehicleGroup: '' })}
                className={modalFieldClass}
              />
            </Field>
            <Field label="Agency">
              <select
                value={form.agency}
                onChange={(event) => {
                  const agency = event.target.value;
                  updateForm({ agency, representative: representativesByAgency[agency]?.[0] || '' });
                }}
                className={modalFieldClass}
              >
                {withCurrentOption(agencyOptions, form.agency).map((agency) => (
                  <option key={agency} value={agency}>{agency}</option>
                ))}
              </select>
            </Field>
            <Field label="Return Date">
              <input
                type="date"
                value={form.returnDate}
                onClick={(event) => openNativeDatePicker(event.currentTarget)}
                onFocus={(event) => openNativeDatePicker(event.currentTarget)}
                onChange={(event) => updateForm({ returnDate: event.target.value, vehicleGroup: '' })}
                className={modalFieldClass}
              />
            </Field>
            <Field label="Hotel and Room">
              <input value={form.hotelRoom} onChange={(event) => updateForm({ hotelRoom: event.target.value })} className={modalFieldClass} />
            </Field>
            <Field label="Vehicle Group">
              <select
                value={form.vehicleGroup}
                onChange={(event) => updateForm({ vehicleGroup: event.target.value })}
                disabled={vehicleGroupSelectDisabled}
                className={`${modalFieldClass} disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-950/80 disabled:text-zinc-500`}
              >
                {!datesReady && <option value="">Select dates first</option>}
                {datesReady && availabilityState.status === 'checking' && <option value="">Checking availability...</option>}
                {datesReady && availabilityState.status === 'empty' && <option value="">No available groups</option>}
                {datesReady && availabilityState.status === 'ready' && (
                  <>
                    <option value="">Select available group</option>
                    {availableVehicleGroups.map((group) => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </>
                )}
              </select>
              {availabilityState.status === 'checking' && (
                <p className="mt-2 rounded-xl border border-sky-300/20 bg-sky-400/10 px-3 py-2 text-xs font-semibold text-sky-100">
                  Checking availability...
                </p>
              )}
              {availabilityState.status === 'empty' && (
                <p className="mt-2 rounded-xl border border-rose-300/35 bg-rose-500/12 px-3 py-2 text-xs font-bold text-rose-100">
                  No vehicle groups available for selected dates.
                </p>
              )}
              {availabilityState.status === 'ready' && !form.vehicleGroup && (
                <p className="mt-2 rounded-xl border border-emerald-300/20 bg-emerald-400/8 px-3 py-2 text-xs font-semibold text-emerald-100">
                  Select one of the available vehicle groups.
                </p>
              )}
              {availabilityState.status === 'ready' && form.vehicleGroup && selectedGroupAvailability && (
                <p className="mt-2 rounded-xl border border-emerald-300/30 bg-emerald-400/12 px-3 py-2 text-xs font-bold text-emerald-100">
                  Available for selected dates · {selectedGroupAvailability.available} left.
                </p>
              )}
            </Field>
            <Field label="Pickup Time">
              <input value={form.pickupTime} onChange={(event) => updateForm({ pickupTime: event.target.value })} className={modalFieldClass} placeholder="09:30" />
            </Field>
            <Field label="Representative">
              <select value={form.representative} onChange={(event) => updateForm({ representative: event.target.value })} className={modalFieldClass}>
                {withCurrentOption(representatives, form.representative).map((representative) => (
                  <option key={representative} value={representative}>{representative}</option>
                ))}
              </select>
            </Field>
            <Field label="Return Time">
              <input value={form.returnTime} onChange={(event) => updateForm({ returnTime: event.target.value })} className={modalFieldClass} placeholder="18:00" />
            </Field>
            <Field label="Price">
              <input type="number" value={form.price} onChange={(event) => updateForm({ price: event.target.value })} className={modalFieldClass} placeholder="0.00" />
            </Field>
            <Field label="Language">
              <select value={form.language} onChange={(event) => updateForm({ language: normalizeLanguage(event.target.value) })} className={modalFieldClass}>
                {languageOptions.map((language) => (
                  <option key={language} value={language}>{language}</option>
                ))}
              </select>
            </Field>
            <StatusPillSelector
              value={form.status}
              onChange={(status) => {
                if (status === 'ACCEPTED' && !hasAcceptedRequiredFormFields(form)) {
                  window.alert(acceptedValidationMessage);
                  return;
                }

                updateForm({ status });
              }}
            />
            <div className="sm:col-span-2">
              <ExtrasQuantityGroup
                extras={form.extras}
                onChange={(extras) => updateForm({ extras })}
              />
            </div>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <textarea value={form.notes} onChange={(event) => updateForm({ notes: event.target.value })} className={`${modalFieldClass} min-h-[96px] resize-none`} />
              </Field>
            </div>
            </div>
          </section>
        </div>

        <div className="flex flex-shrink-0 justify-end gap-2 border-t border-white/10 bg-black/20 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-5 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.07] hover:text-white">
            Ακύρωση
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaveDisabled}
            className="rounded-xl border border-cyan-200/35 bg-cyan-400/16 px-5 py-2.5 text-sm font-bold text-cyan-50 transition hover:-translate-y-0.5 hover:bg-cyan-400/24 hover:shadow-[0_0_24px_rgba(34,211,238,0.16)] disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-900/70 disabled:text-zinc-500 disabled:shadow-none disabled:hover:translate-y-0"
          >
            {availabilityState.status === 'checking' ? 'Checking...' : 'Αποθήκευση'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MobileReservationModal({
  reservation,
  agencyOptions,
  representativesByAgency,
  vehicleGroups,
  workflowEvents,
  isLoadingWorkflowEvents,
  whatsappMessages,
  isLoadingWhatsappMessages,
  onClose,
  onUpdate,
  onSendReminder,
  isReminderSending,
  isReminderDisabled,
  reminderFeedback,
  onReloadWhatsappMessages,
  phoneLayout = false,
}: {
  reservation: Reservation;
  agencyOptions: string[];
  representativesByAgency: Record<string, string[]>;
  vehicleGroups: VehicleGroup[];
  workflowEvents: WorkflowEvent[];
  isLoadingWorkflowEvents: boolean;
  whatsappMessages: WhatsappMessage[];
  isLoadingWhatsappMessages: boolean;
  onClose: () => void;
  onUpdate: (reservation: Reservation) => Promise<Reservation | false>;
  onSendReminder: (reservation: Reservation) => Promise<Reservation | false>;
  isReminderSending: boolean;
  isReminderDisabled: boolean;
  reminderFeedback: string;
  onReloadWhatsappMessages: (reservationId: string) => Promise<void>;
  phoneLayout?: boolean;
}) {
  const [draft, setDraft] = useState(reservation);
  const [viewerDocument, setViewerDocument] = useState<LicenceViewerDocument | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const representatives = representativesByAgency[draft.agency] || [];
  const sortedMessages = [...whatsappMessages].sort((firstMessage, secondMessage) => {
    const firstDate = firstMessage.createdAt ? new Date(firstMessage.createdAt).getTime() : 0;
    const secondDate = secondMessage.createdAt ? new Date(secondMessage.createdAt).getTime() : 0;
    return firstDate - secondDate;
  });

  useEffect(() => {
    setDraft(reservation);
  }, [reservation]);

  const updateDraft = (patch: Partial<Reservation>) => {
    setDraft((currentDraft) => ({ ...currentDraft, ...patch }));
  };

  const saveDraft = async () => {
    if (draft.status === 'ACCEPTED' && !hasAcceptedRequiredFields(draft)) {
      window.alert(acceptedValidationMessage);
      return;
    }

    const updatedReservation = await onUpdate(draft);
    if (updatedReservation) {
      setDraft(updatedReservation);
    }
  };

  const sendReminder = async () => {
    if (isReminderSending || isReminderDisabled) return;

    const updated = await onSendReminder(draft);
    if (updated) {
      setDraft(updated);
    }
  };

  const sendMessage = async () => {
    const message = messageDraft.trim();

    if (!message || isSendingMessage) return;

    setIsSendingMessage(true);
    try {
      await postWhatsappMessageWebhook(draft, message);
      await onReloadWhatsappMessages(draft.id);
      setMessageDraft('');
    } catch (error) {
      console.error('Mobile WhatsApp send failed:', error);
      window.alert('Message was not sent.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col bg-[linear-gradient(180deg,#07101a_0%,#050910_100%)] text-white">
      <header className="flex flex-shrink-0 items-center justify-between border-b border-white/[0.08] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-200/65">Reservation</p>
          <h2 className="truncate text-lg font-black text-white">{draft.name || 'Customer'}</h2>
          <p className="font-mono text-xs text-sky-100/75">{draft.phoneWhatsapp || '-'}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-xl text-zinc-300">
          ×
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <section className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-3">
          <div className="grid gap-2">
            <EditableCompactInput label="Phone WhatsApp" value={draft.phoneWhatsapp} onChange={(value) => updateDraft({ phoneWhatsapp: value.replace(/\s+/g, '') })} mono />
            <EditableCompactInput label="Name" value={draft.name} onChange={(value) => updateDraft({ name: value })} />
            <EditableCompactInput label="Hotel and Room" value={draft.hotelRoom} onChange={(value) => updateDraft({ hotelRoom: value })} />
            <EditableCompactSelect label="Vehicle Group" value={draft.vehicleGroup} options={withCurrentOption(vehicleGroups, draft.vehicleGroup)} onChange={(value) => updateDraft({ vehicleGroup: value })} />
            <EditableCompactSelect
              label="Agency"
              value={draft.agency}
              options={withCurrentOption(agencyOptions, draft.agency)}
              onChange={(value) => updateDraft({ agency: value, representative: representativesByAgency[value]?.[0] || '' })}
            />
            <EditableCompactSelect
              label="Representative"
              value={draft.representative}
              options={withCurrentOption(representatives, draft.representative)}
              onChange={(value) => updateDraft({ representative: value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <EditableCompactInput label="Pickup Date" type="date" value={draft.pickupDate} onChange={(value) => updateDraft({ pickupDate: value })} />
              <EditableCompactInput label="Pickup Time" value={draft.pickupTime} placeholder="09:30" onChange={(value) => updateDraft({ pickupTime: value })} />
              <EditableCompactInput label="Return Date" type="date" value={draft.returnDate} onChange={(value) => updateDraft({ returnDate: value })} />
              <EditableCompactInput label="Return Time" value={draft.returnTime} placeholder="18:00" onChange={(value) => updateDraft({ returnTime: value })} />
            </div>
            <EditableCompactInput label="Price" type="number" value={draft.price === null ? '' : String(draft.price)} onChange={(value) => updateDraft({ price: value === '' ? null : Number(value) || null })} />
            <EditableCompactSelect label="Status" value={draft.status} options={statuses.filter((status) => status !== 'ALL')} onChange={(value) => updateDraft({ status: normalizeStatus(value) })} />
            <div className="grid grid-cols-3 gap-2">
              {(['ACCEPTED', 'REJECTED', 'RETURN'] as ReservationStatus[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => updateDraft({ status })}
                  className={`min-h-11 rounded-2xl border px-2 text-xs font-black ${
                    draft.status === status
                      ? status === 'ACCEPTED'
                        ? 'border-emerald-300/45 bg-emerald-400/18 text-emerald-50'
                        : status === 'REJECTED'
                          ? 'border-rose-300/45 bg-rose-400/16 text-rose-50'
                          : 'border-cyan-300/45 bg-cyan-400/16 text-cyan-50'
                      : 'border-white/[0.08] bg-white/[0.025] text-zinc-300'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            {phoneLayout && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={saveDraft}
                  className="min-h-12 rounded-2xl border border-emerald-300/35 bg-emerald-400/18 px-3 py-3 text-sm font-black text-emerald-50"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={sendReminder}
                  disabled={isReminderSending || isReminderDisabled}
                  className="min-h-12 rounded-2xl border border-cyan-300/35 bg-cyan-400/14 px-3 py-3 text-sm font-black text-cyan-50 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-900/70 disabled:text-zinc-500"
                >
                  {isReminderSending ? 'Sending...' : 'Send Reminder'}
                </button>
              </div>
            )}
          </div>
        </section>

        {phoneLayout && (
          <section className="mt-3 rounded-3xl border border-white/[0.07] bg-white/[0.03] p-3">
            <LicenceCard title="Driving Licence" url={getDrivingLicenceUrl(draft)} onOpen={setViewerDocument} />
          </section>
        )}

        {phoneLayout && (
          <section className="mt-3 rounded-3xl border border-white/[0.07] bg-white/[0.03] p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-black text-white">Workflow</h3>
              <span className="text-[10px] font-semibold text-zinc-500">audit</span>
            </div>
            <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
              {isLoadingWorkflowEvents ? (
                <p className="rounded-2xl border border-white/[0.06] bg-black/20 p-3 text-sm text-zinc-500">Loading workflow...</p>
              ) : workflowEvents.length > 0 ? (
                workflowEvents.map((event) => {
                  const eventStyle = getWorkflowEventStyle(event.eventType);

                  return (
                    <div key={event.id} className={`rounded-2xl border px-3 py-2 text-xs leading-5 ${eventStyle.className}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-zinc-50">{event.message}</p>
                          <p className="mt-1 text-[10px] opacity-70">{formatDateTime(event.createdAt)}</p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black ${eventStyle.badgeClassName || 'border-white/[0.08] bg-white/[0.035] text-zinc-400'}`}>
                          {eventStyle.badge || event.eventType}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-2xl border border-white/[0.06] bg-black/20 p-3 text-sm text-zinc-500">No workflow events yet.</p>
              )}
            </div>
          </section>
        )}

        <section className="mt-3 rounded-3xl border border-white/[0.07] bg-white/[0.03] p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-black text-white">WhatsApp</h3>
            <span className="text-[10px] font-semibold text-zinc-500">live</span>
          </div>
          <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
            {isLoadingWhatsappMessages ? (
              <p className="rounded-2xl border border-white/[0.06] bg-black/20 p-3 text-sm text-zinc-500">Loading messages...</p>
            ) : sortedMessages.length > 0 ? (
              sortedMessages.map((message) => {
                const isCustomer = message.from === 'Customer';

                return (
                  <div key={message.id} className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[86%] rounded-2xl border px-3 py-2 ${isCustomer ? 'border-emerald-300/20 bg-emerald-300/[0.08]' : 'border-sky-300/20 bg-sky-300/[0.09]'}`}>
                      <p className={`text-[10px] font-black ${isCustomer ? 'text-emerald-100' : 'text-sky-100'}`}>{message.from}</p>
                      <p className="mt-1 text-sm leading-5 text-zinc-100">{message.text || '-'}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="rounded-2xl border border-white/[0.06] bg-black/20 p-3 text-sm text-zinc-500">No WhatsApp messages yet.</p>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={messageDraft}
              onChange={(event) => setMessageDraft(event.target.value)}
              placeholder="Write message..."
              className="min-w-0 flex-1 rounded-2xl border border-white/[0.08] bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-sky-300/50"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={isSendingMessage || messageDraft.trim() === ''}
              className="rounded-2xl border border-sky-300/30 bg-sky-400/14 px-4 py-2.5 text-sm font-black text-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSendingMessage ? '...' : 'Send'}
            </button>
          </div>
        </section>
      </div>

      {reminderFeedback && (
        <p
          className={`mx-3 mb-2 rounded-2xl border px-3 py-2 text-xs font-bold ${
            isReminderSuccessFeedback(reminderFeedback)
              ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100'
              : isReminderPendingFeedback(reminderFeedback)
                ? 'border-white/[0.08] bg-black/30 text-zinc-300'
                : 'border-rose-300/25 bg-rose-300/10 text-rose-100'
          }`}
        >
          {reminderFeedback}
        </p>
      )}
      {!phoneLayout && (
        <footer className="grid flex-shrink-0 grid-cols-2 gap-2 border-t border-white/[0.08] bg-black/28 p-3">
          <button
            type="button"
            onClick={sendReminder}
            disabled={isReminderSending || isReminderDisabled}
            className="rounded-2xl border border-cyan-300/35 bg-cyan-400/14 px-3 py-3 text-sm font-black text-cyan-50 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-900/70 disabled:text-zinc-500"
          >
            {isReminderSending ? 'Sending...' : 'Send reminder'}
          </button>
          <button type="button" onClick={saveDraft} className="rounded-2xl border border-emerald-300/35 bg-emerald-400/18 px-3 py-3 text-sm font-black text-emerald-50">
            Save changes
          </button>
        </footer>
      )}
      {phoneLayout && viewerDocument && <LicenceViewerModal document={viewerDocument} onClose={() => setViewerDocument(null)} />}
    </div>
  );
}

function WhatsappChatPopup({
  reservation,
  messages,
  onReloadMessages,
  onClose,
}: {
  reservation: Reservation;
  messages: WhatsappMessage[];
  onReloadMessages: (reservationId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [draftMessage, setDraftMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const sortedMessages = [...messages].sort((firstMessage, secondMessage) => {
    const firstDate = firstMessage.createdAt ? new Date(firstMessage.createdAt).getTime() : 0;
    const secondDate = secondMessage.createdAt ? new Date(secondMessage.createdAt).getTime() : 0;
    return firstDate - secondDate;
  });

  const handleSend = async () => {
    const message = draftMessage.trim();

    if (!message || isSending) return;

    setIsSending(true);
    try {
      const response = await fetch(WHATSAPP_SEND_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservation_id: reservation.id,
          phone: reservation.phoneWhatsapp,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await onReloadMessages(reservation.id);
      setDraftMessage('');
    } catch (error) {
      console.error('WhatsApp send webhook failed:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-end bg-black/35 p-4 backdrop-blur-[2px]">
      <section className="flex h-[min(620px,86vh)] w-[min(440px,96vw)] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(145deg,#09111d_0%,#060a11_58%,#03060a_100%)] text-white shadow-[0_28px_90px_rgba(0,0,0,0.58)]">
        <header className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-white/10 bg-white/[0.025] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-sky-200/70">WHATSAPP CHAT</p>
            <h2 className="mt-1 truncate text-lg font-semibold text-white">{reservation.name || 'Customer'}</h2>
            <p className="mt-1 font-mono text-xs text-sky-100/80">{reservation.phoneWhatsapp || '-'}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white">
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-black/18 px-4 py-3">
          {sortedMessages.length > 0 ? (
            <div className="flex flex-col gap-2">
              {sortedMessages.map((message) => {
                const isCustomer = message.from === 'Customer';

                return (
                  <div key={message.id} className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}>
                    <div
                      className={`max-w-[82%] rounded-2xl border px-3 py-2 ${
                        isCustomer
                          ? 'rounded-bl-md border-emerald-300/20 bg-emerald-300/[0.08] text-zinc-100'
                          : 'rounded-br-md border-sky-300/20 bg-sky-300/[0.09] text-zinc-100'
                      }`}
                    >
                      <p className={`text-[10px] font-black ${isCustomer ? 'text-emerald-100' : 'text-sky-100'}`}>
                        {message.from}
                      </p>
                      <p className="mt-1 text-sm leading-5">{message.text || '-'}</p>
                      {message.createdAt && <p className="mt-1 text-[10px] font-semibold text-zinc-500">{formatDateTime(message.createdAt)}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 text-center text-sm text-zinc-500">
              No WhatsApp messages yet.
            </div>
          )}
        </div>

        <footer className="flex flex-shrink-0 gap-2 border-t border-white/10 bg-black/25 p-3">
          <input
            value={draftMessage}
            onChange={(event) => setDraftMessage(event.target.value)}
            placeholder="Write WhatsApp message..."
            className="min-w-0 flex-1 rounded-2xl border border-white/[0.08] bg-zinc-950 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-sky-300/50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || draftMessage.trim() === ''}
            className="rounded-2xl border border-sky-300/25 bg-sky-300/12 px-4 py-2.5 text-sm font-black text-sky-100 transition hover:bg-sky-300/18 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </footer>
      </section>
    </div>
  );
}

function EditReservationModal({
  reservation,
  agencyOptions,
  representativesByAgency,
  vehicleGroups,
  onClose,
  onSave,
}: {
  reservation: Reservation;
  agencyOptions: string[];
  representativesByAgency: Record<string, string[]>;
  vehicleGroups: VehicleGroup[];
  onClose: () => void;
  onSave: (reservation: Reservation) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<Reservation>(reservation);
  const representatives = representativesByAgency[draft.agency] || [];

  const updateDraft = (patch: Partial<Reservation>) => {
    setDraft((currentDraft) => ({ ...currentDraft, ...patch }));
  };

  const saveDraft = async () => {
    await onSave(draft);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-[min(980px,95vw)] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(145deg,#09111d_0%,#060a11_55%,#03060a_100%)] shadow-[0_32px_110px_rgba(0,0,0,0.62)]">
        <div className="flex flex-shrink-0 items-start justify-between border-b border-white/10 bg-white/[0.025] px-6 py-5">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-sky-200/75">BOOKINGS</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Edit reservation</h2>
            <p className="mt-1 text-xs text-zinc-500">{reservation.id}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white">
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-5">
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Phone WhatsApp">
                <input value={draft.phoneWhatsapp} onChange={(event) => updateDraft({ phoneWhatsapp: event.target.value.replace(/\s+/g, '') })} className={modalFieldClass} />
              </Field>
              <Field label="Name">
                <input value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} className={modalFieldClass} />
              </Field>
              <Field label="Email">
                <input type="email" value={draft.email} onChange={(event) => updateDraft({ email: event.target.value })} className={modalFieldClass} />
              </Field>
              <Field label="Hotel and Room">
                <input value={draft.hotelRoom} onChange={(event) => updateDraft({ hotelRoom: event.target.value })} className={modalFieldClass} />
              </Field>
              <Field label="Vehicle Group">
                <select value={draft.vehicleGroup} onChange={(event) => updateDraft({ vehicleGroup: event.target.value })} className={modalFieldClass}>
                  {withCurrentOption(vehicleGroups, draft.vehicleGroup).map((group) => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </Field>
              <Field label="Agency">
                <select value={draft.agency} onChange={(event) => updateDraft({ agency: event.target.value, representative: representativesByAgency[event.target.value]?.[0] || '' })} className={modalFieldClass}>
                  {withCurrentOption(agencyOptions, draft.agency).map((agency) => (
                    <option key={agency} value={agency}>{agency}</option>
                  ))}
                </select>
              </Field>
              <Field label="Representative">
                <select value={draft.representative} onChange={(event) => updateDraft({ representative: event.target.value })} className={modalFieldClass}>
                  {withCurrentOption(representatives, draft.representative).map((representative) => (
                    <option key={representative} value={representative}>{representative}</option>
                  ))}
                </select>
              </Field>
              <Field label="Language">
                <select value={draft.language} onChange={(event) => updateDraft({ language: normalizeLanguage(event.target.value) })} className={modalFieldClass}>
                  {languageOptions.map((language) => (
                    <option key={language} value={language}>{language}</option>
                  ))}
                </select>
              </Field>
              <Field label="Pickup Date">
                <input type="date" value={draft.pickupDate} onClick={(event) => openNativeDatePicker(event.currentTarget)} onFocus={(event) => openNativeDatePicker(event.currentTarget)} onChange={(event) => updateDraft({ pickupDate: event.target.value })} className={modalFieldClass} />
              </Field>
              <Field label="Pickup Time">
                <input value={draft.pickupTime} placeholder="09:30" onChange={(event) => updateDraft({ pickupTime: event.target.value })} className={modalFieldClass} />
              </Field>
              <Field label="Return Date">
                <input type="date" value={draft.returnDate} onClick={(event) => openNativeDatePicker(event.currentTarget)} onFocus={(event) => openNativeDatePicker(event.currentTarget)} onChange={(event) => updateDraft({ returnDate: event.target.value })} className={modalFieldClass} />
              </Field>
              <Field label="Return Time">
                <input value={draft.returnTime} placeholder="18:00" onChange={(event) => updateDraft({ returnTime: event.target.value })} className={modalFieldClass} />
              </Field>
              <Field label="Price">
                <input type="number" value={draft.price === null ? '' : String(draft.price)} onChange={(event) => updateDraft({ price: event.target.value === '' ? null : Number(event.target.value) || null })} className={modalFieldClass} />
              </Field>
              <Field label="Status">
                <select value={draft.status} onChange={(event) => updateDraft({ status: normalizeStatus(event.target.value) })} className={modalFieldClass}>
                  {statuses.filter((status) => status !== 'ALL').map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </Field>
              <div className="md:col-span-2">
                <ExtrasQuantityGroup extras={draft.extras} onChange={(extras) => updateDraft({ extras })} />
              </div>
              <Field label="Notes">
                <textarea value={draft.notes} onChange={(event) => updateDraft({ notes: event.target.value })} className={`${modalFieldClass} min-h-[96px] resize-none`} />
              </Field>
            </div>
          </section>
        </div>

        <div className="flex flex-shrink-0 justify-end gap-3 border-t border-white/10 bg-black/20 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-5 py-2.5 text-sm font-bold text-zinc-200 transition hover:bg-white/[0.06]">
            Cancel
          </button>
          <button type="button" onClick={saveDraft} className="rounded-2xl border border-emerald-300/30 bg-emerald-400 px-5 py-2.5 text-sm font-black text-zinc-950 transition hover:bg-emerald-300">
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function BookingHistoryModal({
  reservations,
  onClose,
  onSelect,
}: {
  reservations: Reservation[];
  onClose: () => void;
  onSelect: (reservationId: string) => void;
}) {
  const [nameSearch, setNameSearch] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const results = useMemo(() => {
    const nameQuery = nameSearch.trim().toLowerCase();
    const phoneQuery = phoneSearch.trim().replace(/\s+/g, '').toLowerCase();

    return reservations.filter((reservation) => {
      const matchesName = !nameQuery || reservation.name.toLowerCase().includes(nameQuery);
      const matchesPhone = !phoneQuery || reservation.phoneWhatsapp.toLowerCase().includes(phoneQuery);
      const matchesFrom = !dateFrom || reservation.returnDate >= dateFrom;
      const matchesTo = !dateTo || reservation.pickupDate <= dateTo;

      return matchesName && matchesPhone && matchesFrom && matchesTo;
    });
  }, [dateFrom, dateTo, nameSearch, phoneSearch, reservations]);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[86vh] w-[min(980px,95vw)] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(145deg,#09111d_0%,#060a11_58%,#03060a_100%)] shadow-[0_32px_110px_rgba(0,0,0,0.62)]">
        <div className="flex flex-shrink-0 items-start justify-between border-b border-white/10 bg-white/[0.025] px-5 py-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-violet-200/75">BOOKINGS</p>
            <h2 className="mt-1 text-lg font-semibold text-white">Ιστορικό Κρατήσεων</h2>
            <p className="mt-1 text-xs text-zinc-500">Local/mock reservation search.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white">
            ×
          </button>
        </div>

        <div className="grid flex-shrink-0 gap-2 border-b border-white/[0.06] bg-black/20 p-4 md:grid-cols-4">
          <Field label="Customer name">
            <input value={nameSearch} onChange={(event) => setNameSearch(event.target.value)} className={modalFieldClass} placeholder="Name..." />
          </Field>
          <Field label="Phone">
            <input value={phoneSearch} onChange={(event) => setPhoneSearch(event.target.value)} className={modalFieldClass} placeholder="+30..." />
          </Field>
          <Field label="Date from">
            <input
              type="date"
              value={dateFrom}
              onClick={(event) => openNativeDatePicker(event.currentTarget)}
              onFocus={(event) => openNativeDatePicker(event.currentTarget)}
              onChange={(event) => setDateFrom(event.target.value)}
              className={modalFieldClass}
            />
          </Field>
          <Field label="Date to">
            <input
              type="date"
              value={dateTo}
              onClick={(event) => openNativeDatePicker(event.currentTarget)}
              onFocus={(event) => openNativeDatePicker(event.currentTarget)}
              onChange={(event) => setDateTo(event.target.value)}
              className={modalFieldClass}
            />
          </Field>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          <table className="w-full min-w-[760px] text-left text-[12px]">
            <thead className="sticky top-0 z-10 bg-[#101824] text-[11px] font-semibold text-zinc-200 shadow-[0_1px_0_rgba(255,255,255,0.08)]">
              <tr>
                {['Name', 'Phone', 'Pickup date', 'Return date', 'Vehicle group', 'Status', 'Price'].map((column) => (
                  <th key={column} className="whitespace-nowrap px-2 py-1.5">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.055]">
              {results.map((reservation) => (
                <tr
                  key={reservation.id}
                  onClick={() => onSelect(reservation.id)}
                  className="cursor-pointer transition duration-200 hover:bg-sky-300/[0.07]"
                >
                  <td className="whitespace-nowrap px-2 py-1.5 font-semibold text-zinc-100">{reservation.name}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 font-mono text-sky-100">{reservation.phoneWhatsapp}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-zinc-300">{formatDate(reservation.pickupDate)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-zinc-300">{formatDate(reservation.returnDate)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5"><VehicleGroupBadge value={reservation.vehicleGroup} /></td>
                  <td className="whitespace-nowrap px-2 py-1.5"><StatusBadge status={reservation.status} /></td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right font-semibold text-white">{money(reservation.price)}</td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-zinc-500">
                    Δεν βρέθηκαν κρατήσεις.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReturnsModal({
  reservations,
  onClose,
  onSendReminder,
  sendingReminderIds,
  isBulkSending,
  reminderFeedback,
}: {
  reservations: Reservation[];
  onClose: () => void;
  onSendReminder: (reservation: Reservation) => Promise<Reservation | false>;
  sendingReminderIds: Set<string>;
  isBulkSending: boolean;
  reminderFeedback: string;
}) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [sendingReservationId, setSendingReservationId] = useState<string | null>(null);

  const returnRows = useMemo(
    () => reservations.filter((reservation) => reservation.returnDate === selectedDate),
    [reservations, selectedDate]
  );

  const handleSendReminder = async (reservation: Reservation) => {
    if (isBulkSending || sendingReminderIds.has(reservation.id)) return;

    setSendingReservationId(reservation.id);
    try {
      await onSendReminder(reservation);
    } finally {
      setSendingReservationId(null);
    }
  };

  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 z-40 flex justify-end">
      <div className="pointer-events-auto flex h-full w-full max-w-[520px] flex-col overflow-hidden border-l border-white/10 bg-[linear-gradient(145deg,#09111d_0%,#060a11_58%,#03060a_100%)] shadow-[-24px_0_70px_rgba(0,0,0,0.48)] sm:rounded-l-[24px]">
        <div className="flex flex-shrink-0 items-start justify-between border-b border-white/10 bg-white/[0.025] px-5 py-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-amber-200/75">RETURNS</p>
            <h2 className="mt-1 text-lg font-semibold text-white">Επιστροφές</h2>
            <p className="mt-1 text-xs text-zinc-500">Κρατήσεις με επιστροφή στην επιλεγμένη ημερομηνία.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white">
            ×
          </button>
        </div>

        <div className="flex flex-shrink-0 items-end gap-3 border-b border-white/[0.06] bg-black/20 p-4">
          <Field label="Ημερομηνία επιστροφής">
            <input
              type="date"
              value={selectedDate}
              onClick={(event) => openNativeDatePicker(event.currentTarget)}
              onFocus={(event) => openNativeDatePicker(event.currentTarget)}
              onChange={(event) => setSelectedDate(event.target.value)}
              className={modalFieldClass}
            />
          </Field>
          <div className="pb-2 text-xs font-semibold text-zinc-500">
            {returnRows.length} επιστροφές
          </div>
        </div>
        {reminderFeedback && (
          <div
            className={`border-b px-4 py-2 text-xs font-bold ${
              isReminderSuccessFeedback(reminderFeedback)
                ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100'
                : isReminderPendingFeedback(reminderFeedback)
                  ? 'border-white/[0.06] bg-black/20 text-zinc-300'
                  : 'border-rose-300/20 bg-rose-300/10 text-rose-100'
            }`}
          >
            {reminderFeedback}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto p-4">
          <div className="space-y-3">
            {returnRows.map((reservation) => {
              const returnConfirmed = reservation.returnConfirmed;

              return (
                <article
                  key={reservation.id}
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 transition duration-200 hover:border-amber-200/18 hover:bg-white/[0.04]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{reservation.name || '-'}</p>
                      <p className="mt-1 font-mono text-xs text-sky-100">{reservation.phoneWhatsapp || '-'}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <VehicleGroupBadge value={reservation.vehicleGroup} />
                      <LanguageBadge language={reservation.language} />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl border border-white/[0.055] bg-black/20 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">Hotel / Room</p>
                      <p className="mt-1 truncate font-semibold text-zinc-200" title={reservation.hotelRoom}>
                        {reservation.hotelRoom || '-'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/[0.055] bg-black/20 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">Return time</p>
                      <p className="mt-1 font-semibold text-zinc-100">{reservation.returnTime || '-'}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${
                        reservation.returnReminderSent
                          ? 'border-cyan-300/35 bg-cyan-300/12 text-cyan-100'
                          : 'border-zinc-600/60 bg-zinc-900/80 text-zinc-300'
                      }`}
                    >
                      {reservation.returnReminderSent ? 'Reminder sent' : 'Not sent'}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${
                        returnConfirmed
                          ? 'border-emerald-300/35 bg-emerald-300/12 text-emerald-100'
                          : 'border-amber-300/35 bg-amber-300/12 text-amber-100'
                      }`}
                    >
                      {returnConfirmed ? 'Returned' : 'Pending return'}
                    </span>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSendReminder(reservation)}
                      disabled={isBulkSending || sendingReservationId === reservation.id || sendingReminderIds.has(reservation.id)}
                      className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-100 transition hover:border-cyan-200/40 hover:bg-cyan-300/16 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sendingReservationId === reservation.id || sendingReminderIds.has(reservation.id) ? 'Sending...' : 'Send reminder'}
                    </button>
                  </div>
                </article>
              );
            })}
            {returnRows.length === 0 && (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-8 text-center text-sm text-zinc-500">
                Δεν υπάρχουν επιστροφές για αυτή την ημερομηνία.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AvailabilityModal({
  vehicleGroups,
  onClose,
}: {
  vehicleGroups: VehicleGroup[];
  onClose: () => void;
}) {
  const [rows, setRows] = useState<AvailabilityDraftRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadAvailability = async () => {
      setIsLoading(true);
      const stockRows = await fetchGroupStock();
      const stockByGroup = new Map(stockRows.map((stockRow) => [stockRow.vehicle_group, stockRow]));
      const nextRows = vehicleGroups.map((vehicleGroup) => {
        const stockRow = stockByGroup.get(vehicleGroup);

        return {
          vehicleGroup,
          allowedStock: String(stockRow?.allowed_stock ?? 0),
          active: stockRow?.active ?? true,
          notes: stockRow?.notes || '',
        };
      });

      setRows(nextRows);
      setIsLoading(false);
    };

    void Promise.resolve().then(loadAvailability);
  }, [vehicleGroups]);

  const updateRow = (vehicleGroup: string, patch: Partial<AvailabilityDraftRow>) => {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.vehicleGroup === vehicleGroup ? { ...row, ...patch } : row
      )
    );
  };

  const saveAvailability = async () => {
    setIsSaving(true);
    setMessage('');

    const results = await Promise.all(
      rows.map((row) =>
        upsertGroupStock({
          vehicle_group: row.vehicleGroup,
          allowed_stock: Math.max(0, Math.trunc(Number(row.allowedStock) || 0)),
          active: row.active,
          notes: row.notes.trim() || null,
        })
      )
    );

    setIsSaving(false);
    setMessage(results.some((result) => !result) ? 'Μερικές ομάδες δεν αποθηκεύτηκαν.' : 'Το availability ενημερώθηκε.');
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <section className="flex max-h-[88vh] w-[min(960px,95vw)] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(145deg,#09111d_0%,#060a11_55%,#03060a_100%)] text-white shadow-[0_32px_110px_rgba(0,0,0,0.62)]">
        <header className="flex flex-shrink-0 items-start justify-between border-b border-white/10 bg-white/[0.025] px-6 py-5">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-emerald-200/75">GROUP STOCK CONTROL</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Reservation Availability</h2>
            <p className="mt-1 text-xs text-zinc-500">Allowed reservation stock per vehicle group.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white">
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto p-5">
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/20">
            <div className="grid grid-cols-[120px_150px_120px_minmax(220px,1fr)] border-b border-white/[0.07] bg-white/[0.035] px-4 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-zinc-200">
              <span>Group</span>
              <span>Allowed stock</span>
              <span>Active</span>
              <span>Notes</span>
            </div>

            {isLoading ? (
              <p className="px-4 py-6 text-sm text-zinc-500">Loading availability...</p>
            ) : rows.length > 0 ? (
              <div className="divide-y divide-white/[0.055]">
                {rows.map((row) => (
                  <div key={row.vehicleGroup} className="grid grid-cols-[120px_150px_120px_minmax(220px,1fr)] items-center gap-3 px-4 py-2.5">
                    <span className="font-mono text-sm font-black text-white">{row.vehicleGroup}</span>
                    <input
                      type="number"
                      min="0"
                      value={row.allowedStock}
                      onChange={(event) => updateRow(row.vehicleGroup, { allowedStock: event.target.value })}
                      className="h-9 rounded-xl border border-white/[0.08] bg-zinc-950 px-3 text-sm font-bold text-white outline-none transition focus:border-emerald-300/45"
                    />
                    <button
                      type="button"
                      onClick={() => updateRow(row.vehicleGroup, { active: !row.active })}
                      className={`h-8 rounded-full border px-3 text-[11px] font-black transition ${
                        row.active
                          ? 'border-emerald-300/35 bg-emerald-400/14 text-emerald-50'
                          : 'border-zinc-600 bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      {row.active ? 'Active' : 'Inactive'}
                    </button>
                    <input
                      value={row.notes}
                      onChange={(event) => updateRow(row.vehicleGroup, { notes: event.target.value })}
                      className="h-9 rounded-xl border border-white/[0.08] bg-zinc-950 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-300/45"
                      placeholder="Notes"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-4 py-6 text-sm text-zinc-500">No active vehicle groups found.</p>
            )}
          </div>

          {message && (
            <p className="mt-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] px-4 py-2 text-xs text-zinc-300">
              {message}
            </p>
          )}
        </div>

        <footer className="flex flex-shrink-0 justify-end gap-2 border-t border-white/10 bg-black/20 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-5 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.07] hover:text-white">
            Κλείσιμο
          </button>
          <button
            type="button"
            onClick={saveAvailability}
            disabled={isSaving || rows.length === 0}
            className="rounded-xl border border-emerald-200/35 bg-emerald-400/16 px-5 py-2.5 text-sm font-bold text-emerald-50 transition hover:-translate-y-0.5 hover:bg-emerald-400/24 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isSaving ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </button>
        </footer>
      </section>
    </div>
  );
}

function AvailabilityTestModal({ onClose }: { onClose: () => void }) {
  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [results, setResults] = useState<GroupAvailabilityResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [message, setMessage] = useState('');

  const runCheck = async () => {
    if (!pickupDate || !returnDate) {
      setMessage('Select pickup and return date first.');
      return;
    }

    setIsChecking(true);
    setMessage('');

    const availability = await checkGroupAvailability({
      pickup_date: pickupDate,
      return_date: returnDate,
    });

    setResults(availability);
    setIsChecking(false);
    setMessage(availability.length === 0 ? 'No available groups for this date range.' : '');
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <section className="flex max-h-[84vh] w-[min(680px,94vw)] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(145deg,#09111d_0%,#060a11_58%,#03060a_100%)] text-white shadow-[0_32px_110px_rgba(0,0,0,0.62)]">
        <header className="flex flex-shrink-0 items-start justify-between border-b border-white/10 bg-white/[0.025] px-5 py-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-cyan-200/75">AVAILABILITY ENGINE</p>
            <h2 className="mt-1 text-lg font-semibold text-white">Check Availability</h2>
            <p className="mt-1 text-xs text-zinc-500">Test group stock against accepted reservations.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white">
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Pickup date">
              <input
                type="date"
                value={pickupDate}
                onClick={(event) => openNativeDatePicker(event.currentTarget)}
                onFocus={(event) => openNativeDatePicker(event.currentTarget)}
                onChange={(event) => setPickupDate(event.target.value)}
                className={modalFieldClass}
              />
            </Field>
            <Field label="Return date">
              <input
                type="date"
                value={returnDate}
                onClick={(event) => openNativeDatePicker(event.currentTarget)}
                onFocus={(event) => openNativeDatePicker(event.currentTarget)}
                onChange={(event) => setReturnDate(event.target.value)}
                className={modalFieldClass}
              />
            </Field>
            <button
              type="button"
              onClick={runCheck}
              disabled={isChecking}
              className="h-10 rounded-xl border border-cyan-200/35 bg-cyan-400/16 px-5 text-sm font-bold text-cyan-50 transition hover:-translate-y-0.5 hover:bg-cyan-400/24 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isChecking ? 'Checking...' : 'Check'}
            </button>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/20">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.035] text-[11px] font-black uppercase tracking-[0.08em] text-zinc-300">
                <tr>
                  <th className="px-4 py-2">GROUP</th>
                  <th className="px-4 py-2 text-right">STOCK</th>
                  <th className="px-4 py-2 text-right">BOOKED</th>
                  <th className="px-4 py-2 text-right">AVAILABLE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.055]">
                {results.length > 0 ? (
                  results.map((result) => (
                    <tr key={result.vehicle_group}>
                      <td className="px-4 py-2 font-mono font-black text-white">{result.vehicle_group}</td>
                      <td className="px-4 py-2 text-right font-semibold text-zinc-100">{result.allowed_stock}</td>
                      <td className="px-4 py-2 text-right font-semibold text-slate-900">{result.booked_count}</td>
                      <td className="px-4 py-2 text-right">
                        {result.available <= 0 ? (
                          <span className="rounded-full border border-rose-300 bg-rose-100 px-2.5 py-1 text-[11px] font-black text-rose-800">
                            FULL
                          </span>
                        ) : (
                          <span className="rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-900">
                            {result.available}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-zinc-500">
                      {message || 'Run a check to see availability.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {message && results.length > 0 && (
            <p className="mt-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] px-4 py-2 text-xs text-zinc-300">
              {message}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function getWorkflowEventStyle(text: string) {
  if (text === 'confirmation_sent') {
    return {
      badge: 'SENT',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      badgeClassName: 'border-emerald-300 bg-emerald-100 text-emerald-800',
    };
  }

  if (text === 'return_reminder_sent') {
    return {
      badge: 'REMINDER SENT',
      className: 'border-cyan-200 bg-cyan-50 text-cyan-900',
      badgeClassName: 'border-cyan-300 bg-cyan-100 text-cyan-800',
    };
  }

  if (text === 'status_changed') {
    return {
      badge: 'STATUS',
      className: 'border-amber-200 bg-amber-50 text-amber-900',
      badgeClassName: 'border-amber-300 bg-amber-100 text-amber-800',
    };
  }

  return {
    badge: '',
    className: 'border-slate-200 bg-white text-slate-700',
    badgeClassName: '',
  };
}

function StatusBadge({ status }: { status: ReservationStatus }) {
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black tracking-wide ${statusActiveClasses[status]}`}>{status}</span>;
}

function LanguageBadge({ language }: { language: ReservationLanguage }) {
  const languageClassName: Record<ReservationLanguage, string> = {
    English: 'border-sky-300 bg-sky-100 text-sky-900',
    French: 'border-indigo-300 bg-indigo-100 text-indigo-900',
    Italian: 'border-emerald-300 bg-emerald-100 text-emerald-900',
    German: 'border-amber-300 bg-amber-100 text-amber-900',
    Czech: 'border-fuchsia-300 bg-fuchsia-100 text-fuchsia-900',
  };

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black tracking-wide ${languageClassName[language]}`}>
      {language}
    </span>
  );
}

function EditableCompactInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  mono = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'date' | 'time' | 'number' | 'email';
  placeholder?: string;
  mono?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-[118px_minmax(0,1fr)] items-center gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">
      <span className="text-[11px] font-bold text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onClick={(event) => {
          if (type === 'date') openNativeDatePicker(event.currentTarget);
        }}
        onFocus={(event) => {
          if (type === 'date') openNativeDatePicker(event.currentTarget);
        }}
        onChange={(event) => onChange(event.target.value)}
        className={`h-7 min-w-0 rounded-md border border-slate-300 bg-white px-2.5 text-[12.5px] font-semibold text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:border-transparent disabled:bg-transparent disabled:px-0 disabled:text-slate-700 ${mono ? 'font-mono' : ''}`}
      />
    </div>
  );
}

function StatusPillSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: ReservationStatus;
  onChange: (status: ReservationStatus) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-1 rounded-md border border-white/[0.045] bg-black/20 px-2 py-1.5">
      <span className="text-[10px] font-semibold text-zinc-400">Status</span>
      <div className="grid grid-cols-3 gap-1">
        {(['PENDING', 'ACCEPTED', 'REJECTED'] as ReservationStatus[]).map((status) => (
          <button
            key={status}
            type="button"
            disabled={disabled}
            onClick={() => onChange(status)}
            className={`rounded-full border px-2 py-1 text-[10px] font-black tracking-wide transition disabled:cursor-not-allowed ${
              value === status
                ? statusActiveClasses[status]
                : 'border-white/[0.1] bg-white/[0.035] text-zinc-300 hover:border-white/[0.2] hover:bg-white/[0.055] hover:text-white disabled:text-zinc-500 disabled:hover:border-white/[0.1] disabled:hover:bg-white/[0.035]'
            }`}
          >
            {status}
          </button>
        ))}
      </div>
    </div>
  );
}

function CompactStatusButtons({
  value,
  onChange,
}: {
  value: ReservationStatus;
  onChange: (status: ReservationStatus) => void;
}) {
  return (
    <div className="grid grid-cols-[118px_minmax(0,1fr)] items-center gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">
      <span className="text-[11px] font-bold text-slate-600">Status</span>
      <div className="grid grid-cols-3 gap-1">
        {(['PENDING', 'ACCEPTED', 'REJECTED'] as ReservationStatus[]).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => onChange(status)}
            className={`h-7 rounded-md border px-1.5 text-[10.5px] font-black leading-none transition hover:-translate-y-px ${
              value === status
                ? statusActiveClasses[status]
                : status === 'PENDING'
                  ? 'border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-400'
                  : status === 'ACCEPTED'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-400'
                    : 'border-rose-300 bg-rose-50 text-rose-800 hover:border-rose-400'
            }`}
          >
            {status}
          </button>
        ))}
      </div>
    </div>
  );
}

function EditableCompactSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
  inputClassName = '',
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  inputClassName?: string;
}) {
  return (
    <label className="grid grid-cols-[118px_minmax(0,1fr)] items-center gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">
      <span className="text-[11px] font-bold text-slate-600">{label}</span>
      <select
        value={value}
        disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className={`h-7 min-w-0 rounded-md border border-slate-300 bg-white px-2.5 text-[12.5px] font-semibold text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:border-transparent disabled:bg-transparent disabled:px-0 disabled:text-slate-700 ${inputClassName}`}
    >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function LicenceCard({
  title,
  url,
  onOpen,
}: {
  title: string;
  url?: string;
  onOpen: (document: LicenceViewerDocument) => void;
}) {
  const resolvedUrl = resolveLicenceUrl(url);
  const state: LicenceState = resolvedUrl ? 'uploaded' : 'empty';
  const isImage = /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(resolvedUrl);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-1">
      <div className="flex items-center justify-between gap-1.5">
        <p className="truncate text-[10.5px] font-black text-slate-900">{title}</p>
        <LicenceBadge state={state} />
      </div>
      {state === 'uploaded' && resolvedUrl ? (
        <button
          type="button"
          onClick={() => onOpen({ title, url: resolvedUrl })}
          className="mt-1 flex h-10 items-center justify-center overflow-hidden rounded-md border border-blue-300 bg-blue-50 text-[10.5px] font-black text-blue-800 transition hover:border-blue-400 hover:bg-blue-100"
        >
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolvedUrl} alt={title} className="h-full w-full object-cover" />
          ) : (
            'Open file'
          )}
        </button>
      ) : (
        <div className="mt-1 flex h-10 items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-[10.5px] font-bold text-slate-500">
          No attachment
        </div>
      )}
    </div>
  );
}

function LicenceCell({ url }: { url?: string }) {
  const state: LicenceState = hasLicenceUrl(url) ? 'uploaded' : 'empty';
  const className = `inline-flex h-5 w-8 items-center justify-center rounded-md border text-[11px] ${
    state === 'uploaded'
      ? 'border-blue-300 bg-blue-100 text-blue-900'
      : 'border-slate-300 bg-slate-100 text-slate-500'
  }`;

  return (
    <span className={className} title={state === 'uploaded' ? 'Licence file received' : 'No attachment'}>
      {state === 'uploaded' ? '▣' : '□'}
    </span>
  );
}

function LicenceViewerModal({
  document,
  onClose,
}: {
  document: LicenceViewerDocument;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const resolvedUrl = resolveLicenceUrl(document.url);
  const resolvedPath = resolvedUrl.split('?')[0].toLowerCase();
  const isPdf = resolvedPath.endsWith('.pdf');
  const isImage =
    resolvedPath.endsWith('.jpg') ||
    resolvedPath.endsWith('.jpeg') ||
    resolvedPath.endsWith('.png') ||
    resolvedPath.endsWith('.webp');

  const resetView = () => {
    setZoom(1);
    setRotation(0);
  };
  const buttonClassName =
    'rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-xs font-bold text-zinc-200 transition hover:border-blue-300/30 hover:bg-blue-400/12 hover:text-blue-50';
  console.log('licence url', resolvedUrl);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm">
      <section className="flex max-h-[90vh] w-[min(1120px,94vw)] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(145deg,#09111d_0%,#050910_100%)] text-white shadow-[0_32px_120px_rgba(0,0,0,0.68)]">
        <header className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-white/[0.025] px-5 py-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-blue-200/75">LICENCE VIEWER</p>
            <h2 className="mt-1 text-lg font-semibold text-white">{document.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-2 text-sm font-bold text-zinc-300 transition hover:bg-white/[0.07] hover:text-white"
          >
            Close
          </button>
        </header>

        <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-black/20 px-5 py-3">
          {isImage && (
            <>
              <button type="button" onClick={() => setZoom((value) => Math.min(3, value + 0.15))} className={buttonClassName}>Zoom in</button>
              <button type="button" onClick={() => setZoom((value) => Math.max(0.4, value - 0.15))} className={buttonClassName}>Zoom out</button>
              <button type="button" onClick={() => setRotation((value) => value - 90)} className={buttonClassName}>Rotate left</button>
              <button type="button" onClick={() => setRotation((value) => value + 90)} className={buttonClassName}>Rotate right</button>
              <button type="button" onClick={resetView} className={buttonClassName}>Reset</button>
            </>
          )}
          <a href={resolvedUrl} target="_blank" rel="noreferrer" className={`${buttonClassName} ml-auto`}>Open in new tab</a>
        </div>

        <div className="flex h-[min(66vh,680px)] min-h-0 items-center justify-center overflow-hidden bg-black/35 p-5">
          {isPdf ? (
            <iframe title={document.title} src={resolvedUrl} className="h-full w-full rounded-2xl border border-white/10 bg-zinc-950" />
          ) : isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolvedUrl}
              alt={document.title}
              className="block max-h-full max-w-full rounded-2xl object-contain transition-transform duration-200"
              style={{
                transform: `rotate(${rotation}deg) scale(${zoom})`,
                transformOrigin: 'center center',
              }}
            />
          ) : (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-6 py-5 text-center">
              <p className="text-sm font-semibold text-zinc-200">Preview is not available for this file type.</p>
              <a href={resolvedUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-xl border border-blue-300/30 bg-blue-400/12 px-4 py-2 text-sm font-bold text-blue-100 transition hover:bg-blue-400/18">
                Open in new tab
              </a>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function VehicleGroupBadge({ value }: { value: VehicleGroup }) {
  return (
    <span className="inline-flex min-w-7 justify-center rounded-md border border-violet-300 bg-violet-100 px-1.5 py-0.5 text-[11px] font-bold text-violet-900">
      {value}
    </span>
  );
}

function AgencyBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex rounded-md border border-sky-300 bg-sky-100 px-1.5 py-0.5 text-[11px] font-semibold text-sky-900">
      {value}
    </span>
  );
}

function BooleanBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${
        active
          ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
          : 'border-slate-300 bg-slate-100 text-slate-600'
      }`}
    >
      {active ? 'Yes' : 'No'}
    </span>
  );
}

function ExtrasBadges({ extras }: { extras: BookingExtras }) {
  const selectedExtras = [
    extras.baby_seat_qty > 0 ? `Baby x${extras.baby_seat_qty}` : null,
    extras.booster_qty > 0 ? `Booster x${extras.booster_qty}` : null,
    extras.infant_qty > 0 ? `Infant x${extras.infant_qty}` : null,
  ].filter(Boolean);

  if (selectedExtras.length === 0) {
    return <span className="text-[11px] font-semibold text-slate-400">-</span>;
  }

  return (
    <span className="inline-flex flex-wrap gap-1">
      {selectedExtras.map((extra) => (
        <span
          key={extra}
          className="rounded-md border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900"
        >
          {extra}
        </span>
      ))}
    </span>
  );
}

function ExtrasQuantityGroup({
  extras,
  onChange,
}: {
  extras: BookingExtras;
  onChange: (extras: BookingExtras) => void;
}) {
  const options: Array<{ key: keyof BookingExtras; label: string }> = [
    { key: 'baby_seat_qty', label: 'Baby Seat' },
    { key: 'booster_qty', label: 'Booster' },
    { key: 'infant_qty', label: 'Infant' },
  ];

  const updateQuantity = (key: keyof BookingExtras, delta: number) => {
    onChange({
      ...extras,
      [key]: clampExtraQuantity(extras[key] + delta),
    });
  };
  const hasExtras = hasSelectedExtras(extras);

  return (
    <div
      className={`rounded-lg border p-1.5 transition ${
        hasExtras
          ? 'border-amber-300/25 bg-amber-300/[0.07] shadow-[0_0_14px_rgba(251,191,36,0.08)]'
          : 'border-slate-200 bg-slate-50'
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-amber-800">Extras</span>
        <ExtrasBadges extras={extras} />
      </div>
      <div className="grid gap-1 sm:grid-cols-3 md:grid-cols-1 2xl:grid-cols-3">
        {options.map((option) => {
          const quantity = extras[option.key];
          const isActive = quantity > 0;

          return (
            <div
              key={option.key}
              className={`rounded-lg border px-1.5 py-1 transition ${
                isActive
                  ? 'border-amber-400 bg-amber-100 text-amber-900 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:text-amber-800'
              }`}
            >
              <div className="mb-0.5 text-[10.5px] font-bold">{option.label}</div>
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => updateQuantity(option.key, -1)}
                  disabled={quantity <= 0}
                  className="flex h-5 w-5 items-center justify-center rounded-md border border-slate-300 bg-white text-xs font-black text-slate-700 transition hover:border-amber-400 hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label={`Decrease ${option.label}`}
                >
                  -
                </button>
                <span className="min-w-5 text-center text-xs font-black text-amber-900">{quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(option.key, 1)}
                  disabled={quantity >= 5}
                  className="flex h-5 w-5 items-center justify-center rounded-md border border-amber-300 bg-amber-100 text-xs font-black text-amber-900 transition hover:border-amber-400 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label={`Increase ${option.label}`}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LicenceBadge({ state }: { state: LicenceState }) {
  return (
    <span
      className={`inline-flex rounded-md border px-1.5 py-0.5 text-[9.5px] font-black leading-none ${
        state === 'uploaded'
          ? 'border-blue-300 bg-blue-100 text-blue-900'
          : 'border-slate-300 bg-slate-100 text-slate-600'
      }`}
    >
      {state === 'uploaded' ? 'Uploaded' : 'Empty'}
    </span>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-0 overflow-y-auto overflow-x-hidden rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm">
      <div className="flex items-start justify-between gap-2.5 border-b border-slate-200 pb-1">
        <p className="text-[12.5px] font-black text-slate-900">{title}</p>
        <p className="truncate text-[11px] font-medium text-slate-500">{subtitle}</p>
      </div>
      <div className="mt-1 grid gap-1">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-[12px] font-bold text-zinc-300">
      {label}
      {children}
    </label>
  );
}


