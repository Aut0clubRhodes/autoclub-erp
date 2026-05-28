'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
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

type ReservationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
type LicenceState = 'uploaded' | 'empty';
type VehicleGroup = string;
type ReservationLanguage = 'English' | 'French' | 'Italian' | 'German' | 'Czech';

type WhatsappMessage = {
  id: string;
  from: 'AutoClub' | 'Customer';
  text: string;
  createdAt: string;
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
const statuses: Array<ReservationStatus | 'ALL'> = ['ALL', 'PENDING', 'ACCEPTED', 'REJECTED'];
const languageOptions: ReservationLanguage[] = ['English', 'French', 'Italian', 'German', 'Czech'];
const statusActiveClasses: Record<ReservationStatus, string> = {
  PENDING: 'border-amber-300 bg-amber-400/25 text-amber-50 shadow-[0_0_16px_rgba(251,191,36,0.14)]',
  ACCEPTED: 'border-emerald-300 bg-emerald-400/24 text-emerald-50 shadow-[0_0_16px_rgba(52,211,153,0.14)]',
  REJECTED: 'border-rose-300 bg-rose-400/24 text-rose-50 shadow-[0_0_16px_rgba(251,113,133,0.14)]',
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
  vehicleGroup: 'A',
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

const formatDate = (value: string) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString('el-GR') : '-');

const formatDateTime = (value: string) => (value ? new Date(value).toLocaleString('el-GR') : '-');

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
  status === 'ACCEPTED' ? 'ACCEPTED' : status === 'REJECTED' ? 'REJECTED' : 'PENDING';

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
  baby_seat_qty: reservation.extras.baby_seat_qty,
  booster_qty: reservation.extras.booster_qty,
  infant_qty: reservation.extras.infant_qty,
  notes: reservation.notes || null,
});

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

export default function BookingsManager() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [isLoadingReservations, setIsLoadingReservations] = useState(true);
  const [workflowEvents, setWorkflowEvents] = useState<WorkflowEvent[]>([]);
  const [isLoadingWorkflowEvents, setIsLoadingWorkflowEvents] = useState(false);
  const [vehicleGroups, setVehicleGroups] = useState<VehicleGroup[]>(DEFAULT_VEHICLE_GROUP_CODES);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof statuses)[number]>('ALL');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showReturnsModal, setShowReturnsModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showAvailabilityTestModal, setShowAvailabilityTestModal] = useState(false);
  const [form, setForm] = useState<ReservationForm>(initialForm);
  const [agencyRows, setAgencyRows] = useState<AgencyRow[]>([]);
  const [representativeRows, setRepresentativeRows] = useState<RepresentativeRow[]>([]);

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
    return nextReservations;
  };

  useEffect(() => {
    void Promise.resolve().then(() => loadReservations());
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

  const filteredReservations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return reservations.filter((reservation) => {
      const matchesStatus = statusFilter === 'ALL' || reservation.status === statusFilter;
      const matchesSearch =
        !query ||
        reservation.phoneWhatsapp.toLowerCase().includes(query) ||
        reservation.name.toLowerCase().includes(query) ||
        reservation.email.toLowerCase().includes(query) ||
        reservation.vehicleGroup.toLowerCase().includes(query) ||
        reservation.agency.toLowerCase().includes(query) ||
        reservation.representative.toLowerCase().includes(query) ||
        reservation.hotelRoom.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [reservations, searchTerm, statusFilter]);

  const selectedReservation =
    filteredReservations.find((reservation) => reservation.id === selectedId) ||
    filteredReservations[0] ||
    reservations[0];

  useEffect(() => {
    if (!selectedReservation?.id) {
      void Promise.resolve().then(() => setWorkflowEvents([]));
      return;
    }

    void Promise.resolve().then(() => loadWorkflowEvents(selectedReservation.id));
  }, [selectedReservation?.id]);

  const updateSelectedReservation = async (reservationDraft: Reservation) => {
    if (!selectedReservation) return false;

    const payload = reservationToPayload(reservationDraft);
    console.log('SAVE PAYLOAD', payload);

    const updatedRecord = await updateReservation(reservationDraft.id, payload);

    if (!updatedRecord) {
      window.alert('Η κράτηση δεν ενημερώθηκε.');
      return false;
    }

    const updatedReservation = reservationRecordToReservation(updatedRecord);
    console.log('UPDATED RESERVATION AFTER SAVE', updatedReservation);

    await loadReservations(updatedReservation.id);
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
    try {
      await postReturnReminderWebhook(reservation);
    } catch (error) {
      console.error('Send reminder webhook failed:', error);
      window.alert('Το reminder δεν στάλθηκε. Δοκιμάστε ξανά.');
      return false;
    }

    const reminderPatch = buildReturnReminderPatch(reservation);
    const nextReservation = {
      ...reservation,
      ...reminderPatch,
    };
    const updatedRecord = await updateReservation(nextReservation.id, reservationToPayload(nextReservation));

    if (!updatedRecord) {
      window.alert('Το reminder στάλθηκε αλλά η κράτηση δεν ενημερώθηκε.');
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

    return updatedReservation;
  };

  const saveReservation = async () => {
    if (form.status === 'ACCEPTED' && !hasAcceptedRequiredFormFields(form)) {
      window.alert(acceptedValidationMessage);
      return;
    }

    const reservationDraft: Reservation = {
      id: '',
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

    setReservations((current) => [nextReservation, ...current]);
    setSelectedId(nextReservation.id);
    setShowNewModal(false);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col gap-1 text-white">
      <div className="flex flex-shrink-0 flex-col gap-1 rounded-lg border border-white/[0.05] bg-white/[0.016] px-2 py-1 md:flex-row md:items-center">
        <h2 className="mr-1 whitespace-nowrap text-[13px] font-semibold text-white">Κρατήσεις</h2>
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search phone, name, group, agency, hotel..."
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-white outline-none transition duration-200 focus:border-sky-300/60 focus:ring-2 focus:ring-sky-400/10"
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as (typeof statuses)[number])}
          className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-white outline-none transition duration-200 focus:border-sky-300/60"
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
          className="shrink-0 rounded-lg border border-violet-300/25 bg-violet-300/10 px-3 py-1 text-xs font-bold text-violet-100 transition duration-200 hover:-translate-y-0.5 hover:border-violet-200/40 hover:bg-violet-300/16"
        >
          Ιστορικό Κρατήσεων
        </button>
        <button
          type="button"
          onClick={() => setShowReturnsModal(true)}
          className="shrink-0 rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-100 transition duration-200 hover:-translate-y-0.5 hover:border-amber-200/40 hover:bg-amber-300/16"
        >
          Επιστροφές
        </button>
        <button
          type="button"
          onClick={() => setShowAvailabilityModal(true)}
          className="shrink-0 rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-100 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200/40 hover:bg-emerald-300/16"
        >
          Availability
        </button>
        <button
          type="button"
          onClick={() => setShowAvailabilityTestModal(true)}
          className="shrink-0 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-200/40 hover:bg-cyan-300/16"
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
          className="shrink-0 rounded-lg border border-sky-300/25 bg-sky-300/12 px-3 py-1 text-xs font-bold text-sky-100 transition duration-200 hover:-translate-y-0.5 hover:border-sky-200/40 hover:bg-sky-300/18"
        >
          + Νέα Κράτηση
        </button>
      </div>

      <section className="h-[46%] min-h-[276px] flex-shrink-0 overflow-hidden rounded-xl border border-white/[0.07] bg-[#060a11]">
        <div className="h-full overflow-auto">
          <table className="w-full min-w-[1430px] text-left text-[12px]">
            <thead className="sticky top-0 z-10 bg-[#101824] text-[11px] font-semibold text-zinc-200 shadow-[0_1px_0_rgba(255,255,255,0.08)]">
              <tr>
                {[
                  'Phone WhatsApp',
                  'Vehicle Group',
                  'Agency',
                  'Representative',
                  'Name',
                  'Pickup Date',
                  'Return Date',
                  'Pickup Time',
                  'Return Time',
                  'Price',
                  'Status',
                  'Language',
                  'Send Return',
                  'Confirmation Sent',
                  'Extras',
                  'Licence Front',
                  'Licence Back',
                ].map((column) => (
                  <th key={column} className="whitespace-nowrap px-2 py-1.5">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.055]">
              {isLoadingReservations && (
                <tr>
                  <td colSpan={17} className="px-3 py-8 text-center text-sm text-zinc-500">
                    Φόρτωση κρατήσεων...
                  </td>
                </tr>
              )}
              {!isLoadingReservations && filteredReservations.length === 0 && (
                <tr>
                  <td colSpan={17} className="px-3 py-8 text-center text-sm text-zinc-500">
                    Δεν υπάρχουν κρατήσεις.
                  </td>
                </tr>
              )}
              {filteredReservations.map((reservation) => {
                const isSelected = selectedReservation.id === reservation.id;

                return (
                  <tr
                    key={reservation.id}
                    onClick={() => setSelectedId(reservation.id)}
                    className={`cursor-pointer transition duration-200 hover:bg-white/[0.045] ${
                      isSelected
                        ? 'bg-sky-300/[0.075] shadow-[inset_2px_0_0_rgba(125,211,252,0.8)]'
                        : 'odd:bg-white/[0.012] even:bg-black/[0.05]'
                    }`}
                  >
                    <td className="whitespace-nowrap px-2 py-1 font-mono text-[12px] text-sky-100">{reservation.phoneWhatsapp}</td>
                    <td className="whitespace-nowrap px-2 py-1"><VehicleGroupBadge value={reservation.vehicleGroup} /></td>
                    <td className="whitespace-nowrap px-2 py-1"><AgencyBadge value={reservation.agency} /></td>
                    <td className="max-w-[118px] truncate whitespace-nowrap px-2 py-1 text-zinc-300" title={reservation.representative}>{reservation.representative}</td>
                    <td className="max-w-[132px] truncate whitespace-nowrap px-2 py-1 font-semibold text-zinc-100" title={reservation.name}>{reservation.name}</td>
                    <td className="whitespace-nowrap px-2 py-1 text-zinc-300">{formatDate(reservation.pickupDate)}</td>
                    <td className="whitespace-nowrap px-2 py-1 text-zinc-300">{formatDate(reservation.returnDate)}</td>
                    <td className="whitespace-nowrap px-2 py-1 text-zinc-300">{reservation.pickupTime}</td>
                    <td className="whitespace-nowrap px-2 py-1 text-zinc-300">{reservation.returnTime}</td>
                    <td className="whitespace-nowrap px-2 py-1 text-right font-semibold text-white">{money(reservation.price)}</td>
                    <td className="whitespace-nowrap px-2 py-1"><StatusBadge status={reservation.status} /></td>
                    <td className="whitespace-nowrap px-2 py-1"><LanguageBadge language={reservation.language} /></td>
                    <td className="whitespace-nowrap px-2 py-1"><BooleanBadge active={reservation.sendReturn} /></td>
                    <td className="whitespace-nowrap px-2 py-1"><BooleanBadge active={reservation.confirmationSent} /></td>
                    <td className="whitespace-nowrap px-2 py-1"><ExtrasBadges extras={reservation.extras} /></td>
                    <td className="whitespace-nowrap px-2 py-1"><LicenceCell state={reservation.licenceFront} url={reservation.licenceFrontUrl} /></td>
                    <td className="whitespace-nowrap px-2 py-1"><LicenceCell state={reservation.licenceBack} url={reservation.licenceBackUrl} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

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
          onCreateWorkflowEvent={recordWorkflowEvent}
          onSendReminder={sendReminder}
        />
      ) : (
        <section className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-white/[0.07] bg-[#070b12]/90 p-6 text-sm text-zinc-500">
          Δεν υπάρχουν κρατήσεις.
        </section>
      )}

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

      {showHistoryModal && (
        <BookingHistoryModal
          reservations={reservations}
          onClose={() => setShowHistoryModal(false)}
          onSelect={(reservationId) => {
            setSelectedId(reservationId);
            setShowHistoryModal(false);
          }}
        />
      )}

      {showReturnsModal && (
        <ReturnsModal
          reservations={reservations}
          onClose={() => setShowReturnsModal(false)}
          onSendReminder={sendReminder}
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
  onCreateWorkflowEvent,
  onSendReminder,
}: {
  reservation: Reservation;
  agencyOptions: string[];
  representativesByAgency: Record<string, string[]>;
  vehicleGroups: VehicleGroup[];
  onUpdate: (reservation: Reservation) => Promise<boolean>;
  onDelete: () => void;
  workflowEvents: WorkflowEvent[];
  isLoadingWorkflowEvents: boolean;
  onCreateWorkflowEvent: (reservationId: string, eventType: string, eventMessage: string) => Promise<void>;
  onSendReminder: (reservation: Reservation) => Promise<Reservation | false>;
}) {
  const [draft, setDraft] = useState<Reservation>(reservation);
  const [viewerDocument, setViewerDocument] = useState<LicenceViewerDocument | null>(null);

  const updateDraft = (patch: Partial<Reservation>) => {
    setDraft((currentDraft) => ({ ...currentDraft, ...patch }));
  };

  const saveDraft = async () => {
    if (draft.status === 'ACCEPTED' && !hasAcceptedRequiredFields(draft)) {
      window.alert(acceptedValidationMessage);
      return;
    }

    const updated = await onUpdate(draft);
    if (updated) {
      await onCreateWorkflowEvent(draft.id, 'booking_updated', 'Booking details updated');
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
    const updated = await onUpdate(nextDraft);

    if (updated) {
      await onCreateWorkflowEvent(draft.id, 'status_changed', `Status changed to ${status}`);

      if (status === 'ACCEPTED' && draft.status !== 'ACCEPTED') {
        await onCreateWorkflowEvent(
          draft.id,
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
  }> = [
    { label: 'Send reminder', tone: 'reminder', onClick: sendReminder },
    { label: 'Save changes', tone: 'save', onClick: saveDraft },
    { label: 'Delete booking', tone: 'delete', onClick: onDelete },
  ];
  return (
    <>
    <section className="min-h-0 flex-1 rounded-xl border border-white/[0.07] bg-[#070b12]/90 p-1.5 shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
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
              <StatusPillSelector value={draft.status} onChange={updateStatus} />
            </div>
          </div>
        </Panel>

        <Panel title="Attachments & notes" subtitle="customer files">
          <div className="grid gap-1.5 md:grid-cols-2">
            <div className="grid gap-1.5">
              <LicenceCard title="Licence Front" state={draft.licenceFront} url={draft.licenceFrontUrl} onOpen={setViewerDocument} />
              <label className="grid gap-1 text-[11px] font-semibold text-zinc-500">
                Notes
                <textarea
                  value={draft.notes}
                  onChange={(event) => updateDraft({ notes: event.target.value })}
                  className="min-h-[86px] resize-none rounded-lg border border-white/[0.065] bg-black/25 px-2.5 py-1.5 text-[12px] leading-5 text-zinc-100 outline-none transition focus:border-sky-300/45"
                />
              </label>
            </div>
            <div className="grid gap-1.5">
              <LicenceCard title="Licence Back" state={draft.licenceBack} url={draft.licenceBackUrl} onOpen={setViewerDocument} />
              <ExtrasQuantityGroup
                extras={draft.extras}
                onChange={(extras) => updateDraft({ extras })}
              />
              <div className="grid grid-cols-3 gap-1">
                {actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    className={`flex h-8 min-w-0 items-center justify-center whitespace-nowrap rounded-lg border px-1.5 text-center text-[10px] font-black leading-none tracking-[0.005em] transition duration-200 hover:-translate-y-0.5 ${
                      action.tone === 'reminder'
                        ? 'border-cyan-300/40 bg-cyan-400/16 text-cyan-50 shadow-[0_0_14px_rgba(34,211,238,0.08)] hover:bg-cyan-400/22'
                        : action.tone === 'save'
                          ? 'border-emerald-300/40 bg-emerald-400/16 text-emerald-50 shadow-[0_0_14px_rgba(52,211,153,0.08)] hover:bg-emerald-400/22'
                          : 'border-rose-300/40 bg-rose-400/14 text-rose-50 shadow-[0_0_14px_rgba(251,113,133,0.08)] hover:bg-rose-400/20'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Workflow & WhatsApp" subtitle={draft.phoneWhatsapp}>
          <div className="rounded-lg border border-white/[0.055] bg-black/20 p-1.5">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[11px] font-bold text-zinc-100">WhatsApp messages</p>
              <span className="text-[10px] text-zinc-500">mock</span>
            </div>
            <div className="grid max-h-24 gap-1 overflow-auto pr-1">
              {(draft.whatsappMessages || defaultWhatsappMessages).map((message) => (
                <div key={message.id} className="rounded-md border border-white/[0.045] bg-white/[0.025] px-2 py-1.5">
                  <p className="text-[10px] font-semibold text-sky-200">{message.from}</p>
                  <p className="text-[11px] leading-4 text-zinc-300">{message.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex gap-1.5">
              <input
                placeholder="Write WhatsApp message..."
                className="min-w-0 flex-1 rounded-lg border border-white/[0.07] bg-zinc-950 px-2 py-1.5 text-[11px] text-white outline-none focus:border-sky-300/50"
              />
              <button
                type="button"
                className="rounded-lg border border-sky-300/25 bg-sky-300/12 px-3 py-1.5 text-[11px] font-semibold text-sky-100 transition hover:bg-sky-300/18"
              >
                Send
              </button>
            </div>
          </div>

          <div className="mt-1.5 rounded-lg border border-white/[0.055] bg-black/20 p-1.5">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[11px] font-bold text-zinc-100">Workflow log</p>
              <span className="text-[10px] text-zinc-500">audit</span>
            </div>
            <div className="grid max-h-20 gap-1 overflow-auto pr-1">
              {isLoadingWorkflowEvents ? (
                <p className="rounded-md border border-white/[0.045] bg-white/[0.018] px-2 py-1.5 text-[11px] text-zinc-500">
                  Loading workflow events...
                </p>
              ) : workflowEvents.length > 0 ? (
                workflowEvents.map((event) => {
                  const eventStyle = getWorkflowEventStyle(event.eventType);

                  return (
                    <div key={event.id} className={`rounded-md border px-2 py-1.5 text-[11px] leading-4 ${eventStyle.className}`}>
                      <div className="flex items-start justify-between gap-2">
                        <span>
                          <span className="block font-semibold">{event.message}</span>
                          <span className="mt-0.5 block text-[10px] opacity-70">{formatDateTime(event.createdAt)}</span>
                        </span>
                        {eventStyle.badge ? (
                          <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8.5px] font-black tracking-wide ${eventStyle.badgeClassName}`}>
                            {eventStyle.badge}
                          </span>
                        ) : null}
                        {!eventStyle.badge ? (
                          <span className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.035] px-1.5 py-0.5 text-[8.5px] font-black tracking-wide text-zinc-400">
                            {event.eventType}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-md border border-white/[0.045] bg-white/[0.018] px-2 py-1.5 text-[11px] text-zinc-500">
                  No workflow events yet.
                </p>
              )}
            </div>
          </div>

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

  const updateForm = (patch: Partial<ReservationForm>) => {
    onChange({ ...form, ...patch });
  };

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
            <Field label="Vehicle Group">
              <select value={form.vehicleGroup} onChange={(event) => updateForm({ vehicleGroup: event.target.value })} className={modalFieldClass}>
                {withCurrentOption(vehicleGroups, form.vehicleGroup).map((group) => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
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
            <Field label="Representative">
              <select value={form.representative} onChange={(event) => updateForm({ representative: event.target.value })} className={modalFieldClass}>
                {withCurrentOption(representatives, form.representative).map((representative) => (
                  <option key={representative} value={representative}>{representative}</option>
                ))}
              </select>
            </Field>
            <Field label="Hotel and Room">
              <input value={form.hotelRoom} onChange={(event) => updateForm({ hotelRoom: event.target.value })} className={modalFieldClass} />
            </Field>
            <Field label="Pickup Date">
              <input
                type="date"
                value={form.pickupDate}
                onClick={(event) => openNativeDatePicker(event.currentTarget)}
                onFocus={(event) => openNativeDatePicker(event.currentTarget)}
                onChange={(event) => updateForm({ pickupDate: event.target.value })}
                className={modalFieldClass}
              />
            </Field>
            <Field label="Pickup Time">
              <input value={form.pickupTime} onChange={(event) => updateForm({ pickupTime: event.target.value })} className={modalFieldClass} placeholder="09:30" />
            </Field>
            <Field label="Return Date">
              <input
                type="date"
                value={form.returnDate}
                onClick={(event) => openNativeDatePicker(event.currentTarget)}
                onFocus={(event) => openNativeDatePicker(event.currentTarget)}
                onChange={(event) => updateForm({ returnDate: event.target.value })}
                className={modalFieldClass}
              />
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
          <button type="button" onClick={onSave} className="rounded-xl border border-cyan-200/35 bg-cyan-400/16 px-5 py-2.5 text-sm font-bold text-cyan-50 transition hover:-translate-y-0.5 hover:bg-cyan-400/24 hover:shadow-[0_0_24px_rgba(34,211,238,0.16)]">
            Αποθήκευση
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
}: {
  reservations: Reservation[];
  onClose: () => void;
  onSendReminder: (reservation: Reservation) => Promise<Reservation | false>;
}) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [sendingReservationId, setSendingReservationId] = useState<string | null>(null);

  const returnRows = useMemo(
    () => reservations.filter((reservation) => reservation.returnDate === selectedDate),
    [reservations, selectedDate]
  );

  const handleSendReminder = async (reservation: Reservation) => {
    setSendingReservationId(reservation.id);
    await onSendReminder(reservation);
    setSendingReservationId(null);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[82vh] w-[min(980px,95vw)] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(145deg,#09111d_0%,#060a11_58%,#03060a_100%)] shadow-[0_32px_110px_rgba(0,0,0,0.62)]">
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

        <div className="min-h-0 flex-1 overflow-auto p-4">
          <table className="w-full min-w-[900px] text-left text-[12px]">
            <thead className="sticky top-0 z-10 bg-[#101824] text-[11px] font-semibold text-zinc-200 shadow-[0_1px_0_rgba(255,255,255,0.08)]">
              <tr>
                {['Customer', 'Phone', 'Group', 'Hotel / Room', 'Return time', 'Language', 'Send Return', 'Reminder', 'Action'].map((column) => (
                  <th key={column} className="whitespace-nowrap px-2 py-1.5">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.055]">
              {returnRows.map((reservation) => (
                <tr key={reservation.id} className="transition duration-200 hover:bg-white/[0.035]">
                  <td className="whitespace-nowrap px-2 py-2 font-semibold text-zinc-100">{reservation.name}</td>
                  <td className="whitespace-nowrap px-2 py-2 font-mono text-sky-100">{reservation.phoneWhatsapp}</td>
                  <td className="whitespace-nowrap px-2 py-2"><VehicleGroupBadge value={reservation.vehicleGroup} /></td>
                  <td className="max-w-[180px] truncate whitespace-nowrap px-2 py-2 text-zinc-300" title={reservation.hotelRoom}>{reservation.hotelRoom}</td>
                  <td className="whitespace-nowrap px-2 py-2 font-semibold text-zinc-100">{reservation.returnTime || '-'}</td>
                  <td className="whitespace-nowrap px-2 py-2"><LanguageBadge language={reservation.language} /></td>
                  <td className="whitespace-nowrap px-2 py-2"><BooleanBadge active={reservation.sendReturn} /></td>
                  <td className="whitespace-nowrap px-2 py-2"><BooleanBadge active={reservation.returnReminderSent} /></td>
                  <td className="whitespace-nowrap px-2 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleSendReminder(reservation)}
                      disabled={sendingReservationId === reservation.id}
                      className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-100 transition hover:border-cyan-200/40 hover:bg-cyan-300/16 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sendingReservationId === reservation.id ? 'Sending...' : 'Send reminder'}
                    </button>
                  </td>
                </tr>
              ))}
              {returnRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-sm text-zinc-500">
                    Δεν υπάρχουν επιστροφές για αυτή την ημερομηνία.
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
                      <td className="px-4 py-2 text-right font-semibold text-zinc-100">{result.booked_count}</td>
                      <td className="px-4 py-2 text-right">
                        {result.available <= 0 ? (
                          <span className="rounded-full border border-rose-300/35 bg-rose-400/14 px-2.5 py-1 text-[11px] font-black text-rose-50">
                            FULL
                          </span>
                        ) : (
                          <span className="rounded-full border border-emerald-300/35 bg-emerald-400/14 px-2.5 py-1 text-[11px] font-black text-emerald-50">
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
      className: 'border-emerald-300/35 bg-emerald-400/12 text-emerald-50',
      badgeClassName: 'border-emerald-200/35 bg-emerald-300/16 text-emerald-50',
    };
  }

  if (text === 'return_reminder_sent') {
    return {
      badge: 'REMINDER SENT',
      className: 'border-cyan-300/35 bg-cyan-400/12 text-cyan-50',
      badgeClassName: 'border-cyan-200/35 bg-cyan-300/16 text-cyan-50',
    };
  }

  if (text === 'status_changed') {
    return {
      badge: 'STATUS',
      className: 'border-amber-300/25 bg-amber-400/10 text-amber-50',
      badgeClassName: 'border-amber-200/30 bg-amber-300/14 text-amber-50',
    };
  }

  return {
    badge: '',
    className: 'border-white/[0.045] bg-white/[0.025] text-zinc-300',
    badgeClassName: '',
  };
}

function StatusBadge({ status }: { status: ReservationStatus }) {
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black tracking-wide ${statusActiveClasses[status]}`}>{status}</span>;
}

function LanguageBadge({ language }: { language: ReservationLanguage }) {
  const languageClassName: Record<ReservationLanguage, string> = {
    English: 'border-sky-300/35 bg-sky-300/14 text-sky-50',
    French: 'border-indigo-300/35 bg-indigo-300/14 text-indigo-50',
    Italian: 'border-emerald-300/35 bg-emerald-300/14 text-emerald-50',
    German: 'border-amber-300/35 bg-amber-300/14 text-amber-50',
    Czech: 'border-fuchsia-300/35 bg-fuchsia-300/14 text-fuchsia-50',
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
    <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-2 rounded-md border border-white/[0.045] bg-black/20 px-2 py-1">
      <span className="text-[10px] font-semibold text-zinc-500">{label}</span>
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
        className={`h-6 min-w-0 rounded-md border border-white/[0.05] bg-zinc-950/70 px-2 text-[11px] font-semibold text-zinc-100 outline-none transition focus:border-sky-300/45 disabled:border-transparent disabled:bg-transparent disabled:px-0 disabled:text-zinc-200 ${mono ? 'font-mono' : ''}`}
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

function EditableCompactSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-2 rounded-md border border-white/[0.045] bg-black/20 px-2 py-1">
      <span className="text-[10px] font-semibold text-zinc-500">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-6 min-w-0 rounded-md border border-white/[0.05] bg-zinc-950/70 px-2 text-[11px] font-semibold text-zinc-100 outline-none transition focus:border-sky-300/45 disabled:border-transparent disabled:bg-transparent disabled:px-0 disabled:text-zinc-200"
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
  state,
  url,
  onOpen,
}: {
  title: string;
  state: LicenceState;
  url?: string;
  onOpen: (document: LicenceViewerDocument) => void;
}) {
  const resolvedUrl = resolveLicenceUrl(url);
  const isImage = /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(resolvedUrl);

  return (
    <div className="rounded-xl border border-white/[0.065] bg-black/25 p-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold text-zinc-100">{title}</p>
        <LicenceBadge state={state} />
      </div>
      {state === 'uploaded' && resolvedUrl ? (
        <button
          type="button"
          onClick={() => onOpen({ title, url: resolvedUrl })}
          className="mt-1 flex h-14 items-center justify-center overflow-hidden rounded-lg border border-blue-300/18 bg-blue-300/[0.045] text-[11px] font-bold text-blue-100 transition hover:border-blue-200/40 hover:bg-blue-300/[0.08]"
        >
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolvedUrl} alt={title} className="h-full w-full object-cover" />
          ) : (
            'Open file'
          )}
        </button>
      ) : (
        <div className="mt-1 flex h-14 items-center justify-center rounded-lg border border-dashed border-white/[0.12] bg-white/[0.025] text-[11px] font-semibold text-zinc-500">
          No attachment
        </div>
      )}
    </div>
  );
}

function LicenceCell({ state }: { state: LicenceState; url?: string }) {
  const className = `inline-flex h-5 w-8 items-center justify-center rounded-md border text-[11px] ${
    state === 'uploaded'
      ? 'border-blue-300/35 bg-blue-300/14 text-blue-100'
      : 'border-white/[0.08] bg-white/[0.025] text-zinc-500'
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
    <span className="inline-flex min-w-7 justify-center rounded-md border border-violet-300/35 bg-violet-300/16 px-1.5 py-0.5 text-[11px] font-bold text-violet-50">
      {value}
    </span>
  );
}

function AgencyBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex rounded-md border border-sky-300/25 bg-sky-300/12 px-1.5 py-0.5 text-[11px] font-semibold text-sky-50">
      {value}
    </span>
  );
}

function BooleanBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${
        active
          ? 'border-emerald-300/35 bg-emerald-300/14 text-emerald-100'
          : 'border-zinc-500/25 bg-zinc-500/10 text-zinc-400'
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
    return <span className="text-[11px] font-semibold text-zinc-600">-</span>;
  }

  return (
    <span className="inline-flex flex-wrap gap-1">
      {selectedExtras.map((extra) => (
        <span
          key={extra}
          className="rounded-md border border-amber-300/35 bg-amber-300/14 px-1.5 py-0.5 text-[10px] font-bold text-amber-100"
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
          : 'border-white/[0.06] bg-black/20'
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-amber-100">Extras</span>
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
                  ? 'border-amber-300 bg-amber-300/18 text-amber-50 shadow-[0_0_14px_rgba(251,191,36,0.12)]'
                  : 'border-white/[0.08] bg-black/20 text-zinc-300 hover:border-amber-300/35 hover:text-amber-100'
              }`}
            >
              <div className="mb-0.5 text-[10.5px] font-bold">{option.label}</div>
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => updateQuantity(option.key, -1)}
                  disabled={quantity <= 0}
                  className="flex h-5 w-5 items-center justify-center rounded-md border border-white/[0.08] bg-black/25 text-xs font-black text-zinc-200 transition hover:border-amber-300/35 hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label={`Decrease ${option.label}`}
                >
                  -
                </button>
                <span className="min-w-5 text-center text-xs font-black text-amber-50">{quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(option.key, 1)}
                  disabled={quantity >= 5}
                  className="flex h-5 w-5 items-center justify-center rounded-md border border-amber-300/25 bg-amber-300/12 text-xs font-black text-amber-50 transition hover:border-amber-200/45 hover:bg-amber-300/18 disabled:cursor-not-allowed disabled:opacity-35"
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
      className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${
        state === 'uploaded'
          ? 'border-blue-300/30 bg-blue-300/12 text-blue-100'
          : 'border-white/[0.08] bg-white/[0.025] text-zinc-500'
      }`}
    >
      {state === 'uploaded' ? 'Uploaded' : 'Empty'}
    </span>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-0 rounded-lg border border-white/[0.055] bg-white/[0.022] p-1.5">
      <div className="flex items-start justify-between gap-2 border-b border-white/[0.045] pb-0.5">
        <p className="text-[11px] font-bold text-zinc-100">{title}</p>
        <p className="truncate text-[10px] font-medium text-zinc-500">{subtitle}</p>
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


