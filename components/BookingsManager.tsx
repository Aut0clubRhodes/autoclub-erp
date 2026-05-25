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

type ReservationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
type LicenceState = 'uploaded' | 'empty';
type VehicleGroup = 'A' | 'B' | 'C' | 'D' | 'E' | 'H' | 'H1' | 'H2' | 'H3' | 'H4' | 'H5' | 'K' | 'K1' | 'K2';

type WhatsappMessage = {
  id: string;
  from: 'AutoClub' | 'Customer';
  text: string;
  createdAt: string;
};

type WorkflowEvent = {
  id: string;
  text: string;
  createdAt: string;
};

type BookingExtras = {
  baby_seat_qty: number;
  booster_qty: number;
  infant_qty: number;
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
  sendReturn: boolean;
  licenceFront: LicenceState;
  licenceBack: LicenceState;
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

const vehicleGroups: VehicleGroup[] = ['A', 'B', 'C', 'D', 'E', 'H', 'H1', 'H2', 'H3', 'H4', 'H5', 'K', 'K1', 'K2'];

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
  extras: emptyExtras,
};

const money = (value: number | null) =>
  value === null ? '' : `€${value.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value: string) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString('el-GR') : '-');

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

const reservationRecordToReservation = (record: ReservationRequestRecord): Reservation => ({
  id: String(record.id),
  phoneWhatsapp: record.phone || '',
  name: record.customer_name || '',
  email: record.email || '',
  vehicleGroup: vehicleGroups.includes(record.vehicle_group as VehicleGroup) ? (record.vehicle_group as VehicleGroup) : 'A',
  agency: record.agency || '',
  representative: record.representative || '',
  hotelRoom: record.hotel_room || '',
  pickupDate: record.pickup_date || '',
  returnDate: record.return_date || '',
  pickupTime: record.pickup_time || '',
  returnTime: record.return_time || '',
  price: record.price === null || record.price === undefined ? null : Number(record.price),
  status: normalizeStatus(record.status),
  sendReturn: Boolean(record.send_return),
  licenceFront: 'empty',
  licenceBack: 'empty',
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
  send_return: reservation.sendReturn,
  baby_seat_qty: reservation.extras.baby_seat_qty,
  booster_qty: reservation.extras.booster_qty,
  infant_qty: reservation.extras.infant_qty,
  notes: reservation.notes || null,
});

const createWorkflowEvent = (text: string): WorkflowEvent => ({
  id: `event-${Date.now()}-${Math.round(Math.random() * 1000)}`,
  text,
  createdAt: new Date().toISOString(),
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

export default function BookingsManager() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [isLoadingReservations, setIsLoadingReservations] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof statuses)[number]>('ALL');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [form, setForm] = useState<ReservationForm>(initialForm);
  const [agencyRows, setAgencyRows] = useState<AgencyRow[]>([]);
  const [representativeRows, setRepresentativeRows] = useState<RepresentativeRow[]>([]);

  const loadReservations = async () => {
    setIsLoadingReservations(true);
    const records = await fetchReservations();
    const nextReservations = records.map(reservationRecordToReservation);

    setReservations(nextReservations);
    setSelectedId((currentSelectedId) =>
      nextReservations.some((reservation) => reservation.id === currentSelectedId)
        ? currentSelectedId
        : nextReservations[0]?.id || ''
    );
    setIsLoadingReservations(false);
  };

  useEffect(() => {
    void Promise.resolve().then(loadReservations);
  }, []);

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

  const updateSelectedReservation = async (patch: Partial<Reservation>) => {
    if (!selectedReservation) return;

    const nextReservation = { ...selectedReservation, ...patch };
    const updatedRecord = await updateReservation(selectedReservation.id, reservationToPayload(nextReservation));

    if (!updatedRecord) {
      window.alert('Η κράτηση δεν ενημερώθηκε.');
      return;
    }

    const savedReservation = {
      ...reservationRecordToReservation(updatedRecord),
      whatsappMessages: nextReservation.whatsappMessages,
      workflowEvents: nextReservation.workflowEvents,
      licenceFront: nextReservation.licenceFront,
      licenceBack: nextReservation.licenceBack,
    };

    setReservations((currentReservations) =>
      currentReservations.map((reservation) =>
        reservation.id === selectedReservation.id ? savedReservation : reservation
      )
    );
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
      sendReturn: false,
      licenceFront: 'empty',
      licenceBack: 'empty',
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
                  'Send Return',
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
                  <td colSpan={15} className="px-3 py-8 text-center text-sm text-zinc-500">
                    Φόρτωση κρατήσεων...
                  </td>
                </tr>
              )}
              {!isLoadingReservations && filteredReservations.length === 0 && (
                <tr>
                  <td colSpan={15} className="px-3 py-8 text-center text-sm text-zinc-500">
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
                    <td className="whitespace-nowrap px-2 py-1 text-zinc-300">{reservation.representative}</td>
                    <td className="whitespace-nowrap px-2 py-1 font-semibold text-zinc-100">{reservation.name}</td>
                    <td className="whitespace-nowrap px-2 py-1 text-zinc-300">{formatDate(reservation.pickupDate)}</td>
                    <td className="whitespace-nowrap px-2 py-1 text-zinc-300">{formatDate(reservation.returnDate)}</td>
                    <td className="whitespace-nowrap px-2 py-1 text-zinc-300">{reservation.pickupTime}</td>
                    <td className="whitespace-nowrap px-2 py-1 text-zinc-300">{reservation.returnTime}</td>
                    <td className="whitespace-nowrap px-2 py-1 text-right font-semibold text-white">{money(reservation.price)}</td>
                    <td className="whitespace-nowrap px-2 py-1"><StatusBadge status={reservation.status} /></td>
                    <td className="whitespace-nowrap px-2 py-1"><BooleanBadge active={reservation.sendReturn} /></td>
                    <td className="whitespace-nowrap px-2 py-1"><ExtrasBadges extras={reservation.extras} /></td>
                    <td className="whitespace-nowrap px-2 py-1"><LicenceCell state={reservation.licenceFront} /></td>
                    <td className="whitespace-nowrap px-2 py-1"><LicenceCell state={reservation.licenceBack} /></td>
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
          onUpdate={updateSelectedReservation}
          onDelete={deleteSelectedReservation}
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
    </div>
  );
}

function ReservationInspector({
  reservation,
  agencyOptions,
  representativesByAgency,
  onUpdate,
  onDelete,
}: {
  reservation: Reservation;
  agencyOptions: string[];
  representativesByAgency: Record<string, string[]>;
  onUpdate: (patch: Partial<Reservation>) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<Reservation>(reservation);

  const updateDraft = (patch: Partial<Reservation>) => {
    setDraft((currentDraft) => ({ ...currentDraft, ...patch }));
  };

  const saveDraft = () => {
    if (draft.status === 'ACCEPTED' && !hasAcceptedRequiredFields(draft)) {
      window.alert(acceptedValidationMessage);
      return;
    }

    onUpdate(draft);
  };

  const sendReminder = () => {
    const nextWhatsappMessages = [
      ...(draft.whatsappMessages || defaultWhatsappMessages),
      createWhatsappMessage('Return reminder sent to customer.'),
    ];
    const nextWorkflowEvents = [
      ...(draft.workflowEvents || []),
      createWorkflowEvent('Return reminder sent. Waiting for customer return confirmation.'),
    ];
    const patch = {
      sendReturn: true,
      whatsappMessages: nextWhatsappMessages,
      workflowEvents: nextWorkflowEvents,
    };

    updateDraft(patch);
    onUpdate(patch);
  };

  const updateStatus = (status: ReservationStatus) => {
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
      patch.workflowEvents = [
        ...(draft.workflowEvents || []),
        createWorkflowEvent('Confirmation sent'),
      ];
    }

    updateDraft(patch);
    onUpdate(patch);
  };

  const actions: Array<{
    label: string;
    tone: 'reminder' | 'save' | 'delete';
    onClick: () => void;
  }> = [
    { label: 'Send reminder', tone: 'reminder', onClick: sendReminder },
    { label: 'Save changes', tone: 'save', onClick: saveDraft },
    { label: 'Delete booking', tone: 'delete', onClick: onDelete },
  ];
  return (
    <section className="min-h-0 flex-1 rounded-xl border border-white/[0.07] bg-[#070b12]/90 p-1.5 shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
      <div className="grid h-full min-h-0 gap-1.5 xl:grid-cols-[minmax(390px,1.12fr)_minmax(300px,0.88fr)_minmax(230px,0.55fr)]">
        <Panel title="Reservation record" subtitle={reservation.id}>
          <div className="grid gap-1 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <div className="grid gap-1">
              <EditableCompactInput label="Phone WhatsApp" value={draft.phoneWhatsapp} onChange={(value) => updateDraft({ phoneWhatsapp: value.replace(/\s+/g, '') })} mono />
              <EditableCompactInput label="Name" value={draft.name} onChange={(value) => updateDraft({ name: value })} />
              <EditableCompactInput label="Hotel and Room" value={draft.hotelRoom} onChange={(value) => updateDraft({ hotelRoom: value })} />
              <EditableCompactSelect label="Vehicle Group" value={draft.vehicleGroup} options={vehicleGroups} onChange={(value) => updateDraft({ vehicleGroup: value as VehicleGroup })} />
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
              <StatusPillSelector value={draft.status} onChange={updateStatus} />
            </div>
          </div>
        </Panel>

        <Panel title="Attachments & notes" subtitle="customer files">
          <div className="grid gap-1.5 md:grid-cols-2">
            <div className="grid gap-1.5">
              <LicenceCard title="Licence Front" state={draft.licenceFront} />
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
              <LicenceCard title="Licence Back" state={draft.licenceBack} />
              <ExtrasQuantityGroup
                extras={draft.extras}
                onChange={(extras) => updateDraft({ extras })}
              />
              <div className="grid gap-1 sm:grid-cols-3 md:grid-cols-1 2xl:grid-cols-3">
                {actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    className={`h-7 rounded-lg border px-2 text-left text-[10.5px] font-bold tracking-[0.01em] transition duration-200 hover:-translate-y-0.5 ${
                      action.tone === 'reminder'
                        ? 'border-cyan-300/35 bg-cyan-400/14 text-cyan-50 hover:bg-cyan-400/20'
                        : action.tone === 'save'
                          ? 'border-emerald-300/35 bg-emerald-400/14 text-emerald-50 hover:bg-emerald-400/20'
                          : 'border-rose-300/35 bg-rose-400/12 text-rose-100 hover:bg-rose-400/18'
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
              <span className="text-[10px] text-zinc-500">local</span>
            </div>
            <div className="grid max-h-20 gap-1 overflow-auto pr-1">
              {(draft.workflowEvents || []).length > 0 ? (
                (draft.workflowEvents || []).map((event) => {
                  const eventStyle = getWorkflowEventStyle(event.text);

                  return (
                    <div key={event.id} className={`rounded-md border px-2 py-1.5 text-[11px] leading-4 ${eventStyle.className}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span>{event.text}</span>
                        {eventStyle.badge ? (
                          <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8.5px] font-black tracking-wide ${eventStyle.badgeClassName}`}>
                            {eventStyle.badge}
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
  );
}

function NewReservationModal({
  form,
  agencyOptions,
  representativesByAgency,
  onChange,
  onClose,
  onSave,
}: {
  form: ReservationForm;
  agencyOptions: string[];
  representativesByAgency: Record<string, string[]>;
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
              <select value={form.vehicleGroup} onChange={(event) => updateForm({ vehicleGroup: event.target.value as VehicleGroup })} className={modalFieldClass}>
                {vehicleGroups.map((group) => (
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

function getWorkflowEventStyle(text: string) {
  const normalizedText = text.toLowerCase();

  if (normalizedText.includes('confirmation sent')) {
    return {
      badge: 'SENT',
      className: 'border-emerald-300/35 bg-emerald-400/12 text-emerald-50',
      badgeClassName: 'border-emerald-200/35 bg-emerald-300/16 text-emerald-50',
    };
  }

  if (normalizedText.includes('return reminder sent')) {
    return {
      badge: 'REMINDER SENT',
      className: 'border-cyan-300/35 bg-cyan-400/12 text-cyan-50',
      badgeClassName: 'border-cyan-200/35 bg-cyan-300/16 text-cyan-50',
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

function LicenceCard({ title, state }: { title: string; state: LicenceState }) {
  return (
    <div className="rounded-xl border border-white/[0.065] bg-black/25 p-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold text-zinc-100">{title}</p>
        <LicenceBadge state={state} />
      </div>
      <div className="mt-1 flex h-14 items-center justify-center rounded-lg border border-dashed border-white/[0.12] bg-white/[0.025] text-[11px] font-semibold text-zinc-500">
        {state === 'uploaded' ? 'Mock thumbnail' : 'No attachment'}
      </div>
    </div>
  );
}

function LicenceCell({ state }: { state: LicenceState }) {
  return (
    <span
      className={`inline-flex h-5 w-8 items-center justify-center rounded-md border text-[11px] ${
        state === 'uploaded'
          ? 'border-blue-300/35 bg-blue-300/14 text-blue-100'
          : 'border-white/[0.08] bg-white/[0.025] text-zinc-500'
      }`}
      title={state === 'uploaded' ? 'Licence photo received' : 'No attachment'}
    >
      {state === 'uploaded' ? '▣' : '□'}
    </span>
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


