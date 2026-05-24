'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';

type ReservationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'RETURN';
type LicenceState = 'uploaded' | 'empty';
type VehicleGroup = 'A' | 'B' | 'C' | 'D' | 'E' | 'H' | 'H1' | 'H2' | 'H3' | 'H4' | 'H5' | 'K' | 'K1' | 'K2';

type Reservation = {
  id: string;
  phoneWhatsapp: string;
  name: string;
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
};

type ReservationForm = {
  phoneWhatsapp: string;
  name: string;
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
const statuses: Array<ReservationStatus | 'ALL'> = ['ALL', 'PENDING', 'ACCEPTED', 'REJECTED', 'RETURN'];
const statusActiveClasses: Record<ReservationStatus, string> = {
  PENDING: 'border-amber-300/70 bg-amber-300/18 text-amber-100',
  ACCEPTED: 'border-emerald-300/65 bg-emerald-300/18 text-emerald-100',
  REJECTED: 'border-rose-300/70 bg-rose-300/18 text-rose-100',
  RETURN: 'border-cyan-300/65 bg-cyan-300/18 text-cyan-100',
};
const whatsappMessages = [
  { from: 'AutoClub', text: 'Hello, your reservation request has been received.' },
  { from: 'Customer', text: 'Can I send the licence photos here?' },
  { from: 'AutoClub', text: 'Yes, please send front and back side of the licence.' },
];

const initialForm: ReservationForm = {
  phoneWhatsapp: '',
  name: '',
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
};

const initialReservations: Reservation[] = [
  {
    id: 'AT-5821',
    phoneWhatsapp: '+306941123011',
    name: 'Nikos Papadopoulos',
    vehicleGroup: 'A',
    agency: 'Drivealia',
    representative: 'Maria K.',
    hotelRoom: 'Mitsis Faliraki / 214',
    pickupDate: '2026-06-03',
    returnDate: '2026-06-10',
    pickupTime: '09:30',
    returnTime: '18:00',
    price: 420,
    status: 'PENDING',
    sendReturn: false,
    licenceFront: 'empty',
    licenceBack: 'empty',
    notes: 'Airport pickup. Needs WhatsApp confirmation before 18:00.',
  },
  {
    id: 'AT-5822',
    phoneWhatsapp: '+393332219088',
    name: 'Maria Rossi',
    vehicleGroup: 'B',
    agency: 'Apollo / Cardlink',
    representative: 'Sofia',
    hotelRoom: 'Esperos Palace / 308',
    pickupDate: '2026-06-12',
    returnDate: '2026-06-18',
    pickupTime: '11:00',
    returnTime: '10:00',
    price: 510,
    status: 'ACCEPTED',
    sendReturn: true,
    licenceFront: 'empty',
    licenceBack: 'empty',
    notes: 'Child seat requested. Prefer FIAT 500 if available.',
  },
  {
    id: 'AT-5823',
    phoneWhatsapp: '+447700900123',
    name: 'George Smith',
    vehicleGroup: 'H2',
    agency: 'Direct WhatsApp',
    representative: 'Nikos',
    hotelRoom: 'Lindos Blu / 112',
    pickupDate: '2026-07-01',
    returnDate: '2026-07-14',
    pickupTime: '08:45',
    returnTime: '19:30',
    price: 1280,
    status: 'ACCEPTED',
    sendReturn: true,
    licenceFront: 'empty',
    licenceBack: 'empty',
    notes: 'Full payment on arrival. Long booking, keep compact SUV.',
  },
  {
    id: 'AT-5824',
    phoneWhatsapp: '+34600112223',
    name: 'Elena Garcia',
    vehicleGroup: 'A',
    agency: 'Hotel Desk',
    representative: 'George',
    hotelRoom: 'Casa Cook / 55',
    pickupDate: '2026-05-28',
    returnDate: '2026-05-31',
    pickupTime: '12:15',
    returnTime: '16:00',
    price: 180,
    status: 'REJECTED',
    sendReturn: false,
    licenceFront: 'empty',
    licenceBack: 'empty',
    notes: 'Rejected due to no availability in requested group.',
  },
  {
    id: 'AT-5825',
    phoneWhatsapp: '+306978814482',
    name: 'Dimitris Ioannou',
    vehicleGroup: 'K1',
    agency: 'Walk-in',
    representative: 'Office',
    hotelRoom: 'Local customer / -',
    pickupDate: '2026-05-10',
    returnDate: '2026-05-16',
    pickupTime: '10:00',
    returnTime: '10:00',
    price: 360,
    status: 'RETURN',
    sendReturn: true,
    licenceFront: 'empty',
    licenceBack: 'empty',
    notes: 'Returned without damage. Fuel OK.',
  },
  {
    id: 'AT-5826',
    phoneWhatsapp: '+4915144557821',
    name: 'Hans Muller',
    vehicleGroup: 'D',
    agency: 'TUI',
    representative: 'Elena',
    hotelRoom: 'Rodos Palace / 621',
    pickupDate: '2026-08-04',
    returnDate: '2026-08-15',
    pickupTime: '14:00',
    returnTime: '09:00',
    price: 1540,
    status: 'PENDING',
    sendReturn: false,
    licenceFront: 'empty',
    licenceBack: 'empty',
    notes: 'Needs confirmation once group D is assigned.',
  },
  {
    id: 'AT-5827',
    phoneWhatsapp: '+33618452290',
    name: 'Camille Laurent',
    vehicleGroup: 'H5',
    agency: 'Drivealia',
    representative: 'Maria K.',
    hotelRoom: 'Amada Colossos / 147',
    pickupDate: '2026-07-22',
    returnDate: '2026-07-29',
    pickupTime: '17:30',
    returnTime: '12:00',
    price: 790,
    status: 'ACCEPTED',
    sendReturn: true,
    licenceFront: 'empty',
    licenceBack: 'empty',
    notes: 'Representative requested WhatsApp copy after acceptance.',
  },
  {
    id: 'AT-5828',
    phoneWhatsapp: '+31644120091',
    name: 'Jeroen Van Dijk',
    vehicleGroup: 'B',
    agency: 'Apollo / Cardlink',
    representative: 'Dimitris',
    hotelRoom: 'Elysium / 402',
    pickupDate: '2026-09-05',
    returnDate: '2026-09-12',
    pickupTime: '13:20',
    returnTime: '11:30',
    price: 640,
    status: 'PENDING',
    sendReturn: false,
    licenceFront: 'empty',
    licenceBack: 'empty',
    notes: 'Payment link pending. Ask for licence photos after confirmation.',
  },
];

const money = (value: number | null) =>
  value === null ? '' : `€${value.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value: string) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString('el-GR') : '-');

const withCurrentOption = (options: string[], current: string) =>
  current && !options.includes(current) ? [current, ...options] : options;

export default function BookingsManager() {
  const [reservations, setReservations] = useState(initialReservations);
  const [selectedId, setSelectedId] = useState(initialReservations[0].id);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof statuses)[number]>('ALL');
  const [showNewModal, setShowNewModal] = useState(false);
  const [form, setForm] = useState<ReservationForm>(initialForm);
  const [agencyRows, setAgencyRows] = useState<AgencyRow[]>([]);
  const [representativeRows, setRepresentativeRows] = useState<RepresentativeRow[]>([]);

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

  const updateSelectedReservation = (patch: Partial<Reservation>) => {
    setReservations((currentReservations) =>
      currentReservations.map((reservation) =>
        reservation.id === selectedReservation.id ? { ...reservation, ...patch } : reservation
      )
    );
  };

  const saveMockReservation = () => {
    const nextReservation: Reservation = {
      id: `AT-${5821 + reservations.length}`,
      phoneWhatsapp: form.phoneWhatsapp.replace(/\s+/g, ''),
      name: form.name.trim() || 'New Customer',
      vehicleGroup: form.vehicleGroup,
      agency: form.agency,
      representative: form.representative,
      hotelRoom: form.hotelRoom.trim() || '-',
      pickupDate: form.pickupDate,
      returnDate: form.returnDate,
      pickupTime: form.pickupTime,
      returnTime: form.returnTime,
      price: form.price === '' ? null : Number(form.price) || null,
      status: 'PENDING',
      sendReturn: false,
      licenceFront: 'empty',
      licenceBack: 'empty',
      notes: form.notes,
    };

    setReservations((current) => [nextReservation, ...current]);
    setSelectedId(nextReservation.id);
    setShowNewModal(false);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col gap-1.5 text-white">
      <div className="flex flex-shrink-0 flex-col gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.018] px-2 py-1.5 md:flex-row md:items-center">
        <h2 className="mr-1 whitespace-nowrap text-sm font-semibold text-white">Κρατήσεις</h2>
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search phone, name, group, agency, hotel..."
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-white outline-none transition duration-200 focus:border-sky-300/60 focus:ring-2 focus:ring-sky-400/10"
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as (typeof statuses)[number])}
          className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-white outline-none transition duration-200 focus:border-sky-300/60"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status === 'ALL' ? 'All statuses' : status}
            </option>
          ))}
        </select>
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
          className="rounded-lg border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs font-semibold text-sky-100 transition duration-200 hover:-translate-y-0.5 hover:border-sky-200/35 hover:bg-sky-300/15"
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
                    <td className="whitespace-nowrap px-2 py-1"><LicenceCell state={reservation.licenceFront} /></td>
                    <td className="whitespace-nowrap px-2 py-1"><LicenceCell state={reservation.licenceBack} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <ReservationInspector
        reservation={selectedReservation}
        agencyOptions={agencyOptions}
        representativesByAgency={representativesByAgency}
        onUpdate={updateSelectedReservation}
      />

      {showNewModal && (
        <NewReservationModal
          form={form}
          agencyOptions={agencyOptions}
          representativesByAgency={representativesByAgency}
          onChange={setForm}
          onClose={() => setShowNewModal(false)}
          onSave={saveMockReservation}
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
}: {
  reservation: Reservation;
  agencyOptions: string[];
  representativesByAgency: Record<string, string[]>;
  onUpdate: (patch: Partial<Reservation>) => void;
}) {
  const actions: Array<{
    label: string;
    tone: 'reminder' | 'edit';
    onClick?: () => void;
  }> = [
    { label: 'Send reminder', tone: 'reminder' },
    { label: 'Edit booking', tone: 'edit' },
  ];

  return (
    <section className="min-h-0 flex-1 rounded-xl border border-white/[0.07] bg-[#070b12]/90 p-2.5 shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
      <div className="grid h-full min-h-0 gap-2 xl:grid-cols-[minmax(390px,1.2fr)_minmax(250px,0.75fr)_minmax(230px,0.58fr)]">
        <Panel title="Reservation record" subtitle={reservation.id}>
          <div className="grid gap-1 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <div className="grid gap-1">
              <EditableCompactInput label="Phone WhatsApp" value={reservation.phoneWhatsapp} onChange={(value) => onUpdate({ phoneWhatsapp: value.replace(/\s+/g, '') })} mono />
              <EditableCompactInput label="Name" value={reservation.name} onChange={(value) => onUpdate({ name: value })} />
              <EditableCompactInput label="Hotel and Room" value={reservation.hotelRoom} onChange={(value) => onUpdate({ hotelRoom: value })} />
              <EditableCompactSelect label="Vehicle Group" value={reservation.vehicleGroup} options={vehicleGroups} onChange={(value) => onUpdate({ vehicleGroup: value as VehicleGroup })} />
              <EditableCompactSelect
                label="Agency"
                value={reservation.agency}
                options={withCurrentOption(agencyOptions, reservation.agency)}
                onChange={(value) => onUpdate({ agency: value, representative: representativesByAgency[value]?.[0] || '' })}
              />
              <EditableCompactSelect
                label="Representative"
                value={reservation.representative}
                options={withCurrentOption(representativesByAgency[reservation.agency] || [], reservation.representative)}
                onChange={(value) => onUpdate({ representative: value })}
              />
            </div>
            <div className="grid gap-1">
              <EditableCompactInput label="Pickup Date" type="date" value={reservation.pickupDate} onChange={(value) => onUpdate({ pickupDate: value })} />
              <EditableCompactInput label="Pickup Time" value={reservation.pickupTime} placeholder="09:30" onChange={(value) => onUpdate({ pickupTime: value })} />
              <EditableCompactInput label="Return Date" type="date" value={reservation.returnDate} onChange={(value) => onUpdate({ returnDate: value })} />
              <EditableCompactInput label="Return Time" value={reservation.returnTime} placeholder="18:00" onChange={(value) => onUpdate({ returnTime: value })} />
              <EditableCompactInput label="Price" type="number" value={reservation.price === null ? '' : String(reservation.price)} onChange={(value) => onUpdate({ price: value === '' ? null : Number(value) || null })} />
              <StatusPillSelector value={reservation.status} onChange={(status) => onUpdate({ status })} />
            </div>
          </div>
        </Panel>

        <Panel title="Attachments & notes" subtitle="customer files">
          <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <LicenceCard title="Licence Front" state={reservation.licenceFront} />
            <LicenceCard title="Licence Back" state={reservation.licenceBack} />
          </div>
          <label className="mt-1.5 grid gap-1 text-[11px] font-semibold text-zinc-500">
            Notes
            <textarea
              readOnly
              value={reservation.notes}
              className="min-h-[74px] resize-none rounded-lg border border-white/[0.065] bg-black/25 px-2.5 py-1.5 text-[12px] leading-5 text-zinc-100 outline-none"
            />
          </label>
        </Panel>

        <Panel title="Workflow & WhatsApp" subtitle={reservation.phoneWhatsapp}>
          <div className="rounded-lg border border-white/[0.055] bg-black/20 p-2">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[11px] font-bold text-zinc-100">WhatsApp messages</p>
              <span className="text-[10px] text-zinc-500">mock</span>
            </div>
            <div className="grid gap-1 pr-1">
              {whatsappMessages.map((message, index) => (
                <div key={`${message.from}-${index}`} className="rounded-md border border-white/[0.045] bg-white/[0.025] px-2 py-1.5">
                  <p className="text-[10px] font-semibold text-sky-200">{message.from}</p>
                  <p className="text-[11px] leading-4 text-zinc-300">{message.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-1.5">
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

          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={`h-8 rounded-lg border px-2.5 text-left text-[11px] font-bold tracking-[0.01em] transition duration-200 hover:-translate-y-0.5 ${
                  action.tone === 'reminder'
                    ? 'border-cyan-300/35 bg-cyan-400/14 text-cyan-50 hover:bg-cyan-400/20'
                    : 'border-blue-300/30 bg-blue-300/12 text-blue-100 hover:border-blue-200/45 hover:bg-blue-300/18'
                }`}
              >
                {action.label}
              </button>
            ))}
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
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 p-6 backdrop-blur-sm">
      <div className="flex max-h-[86vh] w-[min(760px,94vw)] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#070b12] shadow-2xl">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Νέα Κράτηση</h2>
            <p className="text-xs text-zinc-500">AutoClub reservation operations entry</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-zinc-400 transition hover:bg-white/[0.05] hover:text-white">
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Phone WhatsApp">
              <input value={form.phoneWhatsapp} onChange={(event) => updateForm({ phoneWhatsapp: event.target.value })} className="input-dark" placeholder="+306941123011" />
            </Field>
            <Field label="Name">
              <input value={form.name} onChange={(event) => updateForm({ name: event.target.value })} className="input-dark" />
            </Field>
            <Field label="Vehicle Group">
              <select value={form.vehicleGroup} onChange={(event) => updateForm({ vehicleGroup: event.target.value as VehicleGroup })} className="input-dark">
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
                className="input-dark"
              >
                {withCurrentOption(agencyOptions, form.agency).map((agency) => (
                  <option key={agency} value={agency}>{agency}</option>
                ))}
              </select>
            </Field>
            <Field label="Representative">
              <select value={form.representative} onChange={(event) => updateForm({ representative: event.target.value })} className="input-dark">
                {withCurrentOption(representatives, form.representative).map((representative) => (
                  <option key={representative} value={representative}>{representative}</option>
                ))}
              </select>
            </Field>
            <Field label="Hotel and Room">
              <input value={form.hotelRoom} onChange={(event) => updateForm({ hotelRoom: event.target.value })} className="input-dark" />
            </Field>
            <Field label="Pickup Date">
              <input type="date" value={form.pickupDate} onChange={(event) => updateForm({ pickupDate: event.target.value })} className="input-dark" />
            </Field>
            <Field label="Pickup Time">
              <input value={form.pickupTime} onChange={(event) => updateForm({ pickupTime: event.target.value })} className="input-dark" placeholder="09:30" />
            </Field>
            <Field label="Return Date">
              <input type="date" value={form.returnDate} onChange={(event) => updateForm({ returnDate: event.target.value })} className="input-dark" />
            </Field>
            <Field label="Return Time">
              <input value={form.returnTime} onChange={(event) => updateForm({ returnTime: event.target.value })} className="input-dark" placeholder="18:00" />
            </Field>
            <Field label="Price">
              <input type="number" value={form.price} onChange={(event) => updateForm({ price: event.target.value })} className="input-dark" placeholder="0.00" />
            </Field>
            <Field label="Status">
              <input value="PENDING" readOnly className="input-dark opacity-70" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <textarea value={form.notes} onChange={(event) => updateForm({ notes: event.target.value })} className="input-dark min-h-[82px] resize-none" />
              </Field>
            </div>
          </div>
        </div>

        <div className="flex flex-shrink-0 justify-end gap-2 border-t border-white/10 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.06]">
            Ακύρωση
          </button>
          <button type="button" onClick={onSave} className="rounded-xl border border-sky-300/25 bg-sky-300/12 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-300/18">
            Αποθήκευση
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ReservationStatus }) {
  const classes: Record<ReservationStatus, string> = {
    PENDING: 'border-amber-300/70 bg-amber-300/18 text-amber-100',
    ACCEPTED: 'border-emerald-300/65 bg-emerald-300/18 text-emerald-100',
    REJECTED: 'border-rose-300/70 bg-rose-300/18 text-rose-100',
    RETURN: 'border-cyan-300/65 bg-cyan-300/18 text-cyan-100',
  };

  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black tracking-wide shadow-sm ${classes[status]}`}>{status}</span>;
}

function EditableCompactInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  mono = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'date' | 'time' | 'number';
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-2 rounded-md border border-white/[0.045] bg-black/20 px-2 py-1">
      <span className="text-[10px] font-semibold text-zinc-500">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`h-6 min-w-0 rounded-md border border-white/[0.05] bg-zinc-950/70 px-2 text-[11px] font-semibold text-zinc-100 outline-none transition focus:border-sky-300/45 ${mono ? 'font-mono' : ''}`}
      />
    </div>
  );
}

function StatusPillSelector({
  value,
  onChange,
}: {
  value: ReservationStatus;
  onChange: (status: ReservationStatus) => void;
}) {
  return (
    <div className="grid gap-1 rounded-md border border-white/[0.045] bg-black/20 px-2 py-1">
      <span className="text-[10px] font-semibold text-zinc-500">Status</span>
      <div className="grid grid-cols-2 gap-1">
        {(['PENDING', 'ACCEPTED', 'REJECTED', 'RETURN'] as ReservationStatus[]).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => onChange(status)}
            className={`rounded-full border px-2 py-1 text-[9px] font-black tracking-wide transition ${
              value === status
                ? statusActiveClasses[status]
                : 'border-white/[0.08] bg-white/[0.025] text-zinc-500 hover:border-white/[0.16] hover:text-zinc-200'
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
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-2 rounded-md border border-white/[0.045] bg-black/20 px-2 py-1">
      <span className="text-[10px] font-semibold text-zinc-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-6 min-w-0 rounded-md border border-white/[0.05] bg-zinc-950/70 px-2 text-[11px] font-semibold text-zinc-100 outline-none transition focus:border-sky-300/45"
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
    <div className="rounded-xl border border-white/[0.065] bg-black/25 p-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold text-zinc-100">{title}</p>
        <LicenceBadge state={state} />
      </div>
      <div className="mt-1.5 flex h-16 items-center justify-center rounded-lg border border-dashed border-white/[0.12] bg-white/[0.025] text-[11px] font-semibold text-zinc-500">
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
    <div className="min-h-0 rounded-lg border border-white/[0.055] bg-white/[0.022] p-2">
      <div className="flex items-start justify-between gap-2 border-b border-white/[0.045] pb-1.5">
        <p className="text-[11px] font-bold text-zinc-100">{title}</p>
        <p className="truncate text-[10px] font-medium text-zinc-500">{subtitle}</p>
      </div>
      <div className="mt-2 grid gap-1">{children}</div>
    </div>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-2 rounded-md border border-white/[0.045] bg-black/20 px-2 py-1.5">
      <span className="text-[10px] font-semibold text-zinc-500">{label}</span>
      <span className={`truncate text-[12px] font-semibold text-zinc-100 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function StatusRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-white/[0.045] bg-black/20 px-2 py-1.5">
      <span className="text-[11px] font-semibold text-zinc-500">{label}</span>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
      {label}
      {children}
    </label>
  );
}


