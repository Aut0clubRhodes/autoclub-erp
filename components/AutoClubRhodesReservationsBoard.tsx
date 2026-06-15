'use client';

import { useMemo, useRef, useState } from 'react';
import {
  Check,
  Clock3,
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

type ReservationStatus = 'New Request' | 'Under Review' | 'Ready' | 'Cancelled';
type EmailTemplateId = 'confirmation' | 'reminder' | 'payment' | 'custom';
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

type WebsiteReservation = {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  carName: string;
  groupCode: string;
  pickupDate: string;
  pickupTime: string;
  pickupLocation: string;
  returnDate: string;
  returnTime: string;
  returnLocation: string;
  total: number;
  paymentMethod: string;
  status: ReservationStatus;
  notes: string;
  processed: boolean;
};

const sampleReservations: WebsiteReservation[] = [
  {
    id: 'ACR-260615-1047',
    customerName: 'Lucia Rossi',
    phone: '+39 333 870 1220',
    email: 'lucia.rossi@example.com',
    carName: 'Fiat Panda or similar',
    groupCode: 'A',
    pickupDate: '2026-06-21',
    pickupTime: '12:00',
    pickupLocation: 'Lindos',
    returnDate: '2026-06-28',
    returnTime: '10:00',
    returnLocation: 'Rhodes Airport',
    total: 329,
    paymentMethod: 'Bank Transfer',
    status: 'New Request',
    notes: 'Infant seat requested.',
    processed: false,
  },
  {
    id: 'ACR-260615-1042',
    customerName: 'Marco Bianchi',
    phone: '+39 347 555 0194',
    email: 'marco.bianchi@example.com',
    carName: 'Peugeot 108 or similar',
    groupCode: 'A',
    pickupDate: '2026-06-15',
    pickupTime: '10:30',
    pickupLocation: 'Rhodes Airport',
    returnDate: '2026-06-20',
    returnTime: '09:00',
    returnLocation: 'Rhodes Airport',
    total: 245,
    paymentMethod: 'Payment Link',
    status: 'New Request',
    notes: 'Flight FR 9821.',
    processed: false,
  },
  {
    id: 'ACR-260614-1038',
    customerName: 'Claire Martin',
    phone: '+33 6 44 21 08 77',
    email: 'claire.martin@example.com',
    carName: 'Peugeot 208 or similar',
    groupCode: 'C',
    pickupDate: '2026-06-17',
    pickupTime: '14:00',
    pickupLocation: 'Rhodes Town',
    returnDate: '2026-06-24',
    returnTime: '11:00',
    returnLocation: 'Rhodes Town',
    total: 392,
    paymentMethod: 'Card',
    status: 'Under Review',
    notes: 'Availability review requested.',
    processed: false,
  },
  {
    id: 'ACR-260613-1031',
    customerName: 'Jan Novak',
    phone: '+420 602 118 442',
    email: 'jan.novak@example.com',
    carName: 'Peugeot 2008 or similar',
    groupCode: 'D1',
    pickupDate: '2026-06-18',
    pickupTime: '08:30',
    pickupLocation: 'Faliraki',
    returnDate: '2026-06-26',
    returnTime: '18:00',
    returnLocation: 'Rhodes Airport',
    total: 688,
    paymentMethod: 'Payment Link',
    status: 'Ready',
    notes: 'Payment completed.',
    processed: true,
  },
  {
    id: 'ACR-260612-1026',
    customerName: 'Anna Keller',
    phone: '+49 151 242 9981',
    email: 'anna.keller@example.com',
    carName: 'Hyundai i10 or similar',
    groupCode: 'B',
    pickupDate: '2026-06-15',
    pickupTime: '16:30',
    pickupLocation: 'Ixia',
    returnDate: '2026-06-19',
    returnTime: '12:00',
    returnLocation: 'Ixia',
    total: 196,
    paymentMethod: 'Pay on Arrival',
    status: 'Cancelled',
    notes: 'Cancelled due to flight changes.',
    processed: true,
  },
];

const statusStyles: Record<ReservationStatus, string> = {
  'New Request': 'border-sky-200 bg-sky-50 text-sky-800',
  'Under Review': 'border-amber-200 bg-amber-50 text-amber-800',
  Ready: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Cancelled: 'border-rose-200 bg-rose-50 text-rose-700',
};

const emailTemplates: Record<
  EmailTemplateId,
  { label: string; subject: string; message: string }
> = {
  confirmation: {
    label: 'Confirmation email',
    subject: 'Reservation {reservation_id} confirmation',
    message:
      'Hello {customer_name},\n\nYour reservation for {car_name} (Group {group}) is confirmed.\nPickup: {pickup_date} at {pickup_time}, {pickup_location}.\nReturn: {return_date} at {return_time}, {return_location}.\nTotal: {total_price}.\nPayment method: {payment_method}.',
  },
  reminder: {
    label: 'Reminder email',
    subject: 'Reminder for reservation {reservation_id}',
    message:
      'Hello {customer_name},\n\nThis is a reminder for your upcoming {car_name} pickup on {pickup_date} at {pickup_time} from {pickup_location}.',
  },
  payment: {
    label: 'Payment request email',
    subject: 'Payment request for reservation {reservation_id}',
    message:
      'Hello {customer_name},\n\nThe total for reservation {reservation_id} is {total_price}. Please complete payment using the agreed {payment_method} method.',
  },
  custom: {
    label: 'Custom message',
    subject: '',
    message: '',
  },
};

const emailVariables = [
  '{customer_name}',
  '{reservation_id}',
  '{car_name}',
  '{group}',
  '{pickup_date}',
  '{pickup_time}',
  '{return_date}',
  '{return_time}',
  '{pickup_location}',
  '{return_location}',
  '{total_price}',
  '{payment_method}',
];

const formatDate = (value: string) => {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(value);

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
      return reservation.phone;
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

export default function AutoClubRhodesReservationsBoard() {
  const [reservations, setReservations] = useState<WebsiteReservation[]>(sampleReservations);
  const [editingReservationId, setEditingReservationId] = useState<string | null>(null);
  const [reservationDraft, setReservationDraft] = useState<WebsiteReservation | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [emailFeedback, setEmailFeedback] = useState('');
  const [emailReservationId, setEmailReservationId] = useState<string | null>(null);
  const [emailInitialTemplate, setEmailInitialTemplate] =
    useState<EmailTemplateId>('confirmation');
  const [newRequestsSort, setNewRequestsSort] = useState<ReservationSortState>({
    key: 'customer',
    direction: 'asc',
  });
  const [processedSort, setProcessedSort] = useState<ReservationSortState>({
    key: 'id',
    direction: 'desc',
  });

  const newReservations = useMemo(
    () =>
      sortReservations(
        reservations.filter((reservation) => !reservation.processed),
        newRequestsSort,
      ),
    [newRequestsSort, reservations],
  );
  const processedReservations = useMemo(
    () =>
      sortReservations(
        reservations.filter((reservation) => reservation.processed),
        processedSort,
      ),
    [processedSort, reservations],
  );

  const summary = {
    newRequests: newReservations.filter((reservation) => reservation.status === 'New Request').length,
    underReview: newReservations.filter((reservation) => reservation.status === 'Under Review').length,
    processed: processedReservations.length,
    cancelled: reservations.filter((reservation) => reservation.status === 'Cancelled').length,
  };

  const updateReservation = (
    reservationId: string,
    patch: Partial<Pick<WebsiteReservation, 'status' | 'processed'>>,
  ) => {
    setReservations((current) =>
      current.map((reservation) =>
        reservation.id === reservationId ? { ...reservation, ...patch } : reservation,
      ),
    );
  };

  const openEditor = (reservation: WebsiteReservation) => {
    setEditingReservationId(reservation.id);
    setReservationDraft({ ...reservation });
  };

  const closeEditor = () => {
    setEditingReservationId(null);
    setReservationDraft(null);
  };

  const saveEditedReservation = () => {
    if (!editingReservationId || !reservationDraft?.customerName.trim()) return;

    setReservations((current) =>
      current.map((reservation) =>
        reservation.id === editingReservationId
          ? {
              ...reservationDraft,
              customerName: reservationDraft.customerName.trim(),
              phone: reservationDraft.phone.trim(),
              email: reservationDraft.email.trim(),
              carName: reservationDraft.carName.trim(),
              groupCode: reservationDraft.groupCode.trim().toUpperCase(),
              pickupLocation: reservationDraft.pickupLocation.trim(),
              returnLocation: reservationDraft.returnLocation.trim(),
              paymentMethod: reservationDraft.paymentMethod.trim(),
              notes: reservationDraft.notes.trim(),
            }
          : reservation,
      ),
    );
    closeEditor();
  };

  const deleteReservation = (reservationId: string) => {
    setReservations((current) =>
      current.filter((reservation) => reservation.id !== reservationId),
    );
    closeEditor();
    setPendingDeleteId(null);
  };

  const openEmailComposer = (
    reservationId: string,
    template: EmailTemplateId = 'confirmation',
  ) => {
    setEmailReservationId(reservationId);
    setEmailInitialTemplate(template);
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
      <header className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-cyan-700">
            <Globe2 className="h-3.5 w-3.5" />
            Website reservations
          </div>
          <h2 className="text-lg font-black text-slate-950">
            ΚΡΑΤΗΣΕΙΣ AUTOCLUB-RHODES
          </h2>
        </div>
        <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-cyan-800">
          Local preview
        </span>
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
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <SectionHeading
            title="Νέες κρατήσεις από website"
            description="Incoming requests waiting to be reviewed or passed into the future ERP workflow."
            count={newReservations.length}
          />

          <div className="overflow-x-auto">
            <div className="min-w-[1230px]">
              <div className="grid grid-cols-[170px_135px_180px_135px_135px_85px_120px_105px_365px] border-y border-slate-200 bg-slate-100 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.05em] text-slate-600">
                <SortHeader label="Customer" sortKey="customer" sort={newRequestsSort} onSort={(key) => toggleSort(key, setNewRequestsSort)} />
                <SortHeader label="Phone" sortKey="phone" sort={newRequestsSort} onSort={(key) => toggleSort(key, setNewRequestsSort)} />
                <SortHeader label="Car / Group" sortKey="car" sort={newRequestsSort} onSort={(key) => toggleSort(key, setNewRequestsSort)} />
                <SortHeader label="Pickup" sortKey="pickup" sort={newRequestsSort} onSort={(key) => toggleSort(key, setNewRequestsSort)} />
                <SortHeader label="Return" sortKey="return" sort={newRequestsSort} onSort={(key) => toggleSort(key, setNewRequestsSort)} />
                <SortHeader label="Total" sortKey="total" sort={newRequestsSort} onSort={(key) => toggleSort(key, setNewRequestsSort)} />
                <SortHeader label="Payment" sortKey="payment" sort={newRequestsSort} onSort={(key) => toggleSort(key, setNewRequestsSort)} />
                <SortHeader label="Status" sortKey="status" sort={newRequestsSort} onSort={(key) => toggleSort(key, setNewRequestsSort)} />
                <span className="text-right">Actions</span>
              </div>
              {newReservations.length > 0 ? (
                newReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="grid grid-cols-[170px_135px_180px_135px_135px_85px_120px_105px_365px] items-center border-b border-slate-200 px-3 py-1.5 text-sm last:border-b-0 hover:bg-slate-50"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="truncate font-black text-slate-900">{reservation.customerName}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-400">{reservation.id}</p>
                    </div>
                    <span className="truncate pr-3 text-xs font-semibold text-slate-700">
                      {reservation.phone}
                    </span>
                    <CarCell reservation={reservation} />
                    <DateCell date={reservation.pickupDate} time={reservation.pickupTime} />
                    <DateCell date={reservation.returnDate} time={reservation.returnTime} />
                    <span className="font-black text-slate-900">{formatMoney(reservation.total)}</span>
                    <span className="truncate pr-2 text-xs font-bold text-slate-700">
                      {reservation.paymentMethod}
                    </span>
                    <StatusBadge status={reservation.status} />
                    <div className="flex flex-nowrap items-center justify-end gap-1 whitespace-nowrap">
                      <TextAction
                        label="View"
                        icon={Eye}
                        tone="secondary"
                        onClick={() => openEditor(reservation)}
                      />
                      <TextAction
                        label="Edit"
                        icon={Pencil}
                        tone="primary"
                        onClick={() => openEditor(reservation)}
                      />
                      <TextAction
                        label="Delete"
                        icon={Trash2}
                        tone="danger"
                        onClick={() => setPendingDeleteId(reservation.id)}
                      />
                      <TextAction
                        label="Email"
                        icon={Mail}
                        tone="primary"
                        onClick={() => openEmailComposer(reservation.id)}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateReservation(reservation.id, { status: 'Ready', processed: true })
                        }
                        className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-md border border-emerald-600 bg-emerald-600 px-2 text-[9px] font-black text-white transition hover:bg-emerald-700"
                      >
                        <Check className="h-3 w-3" />
                        OK / Πέρασμα
                      </button>
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
            description="Reservations already accepted, processed or cancelled in this local preview."
            count={processedReservations.length}
          />

          <div className="overflow-x-auto">
            <div className="min-w-[1320px]">
              <div className="grid grid-cols-[135px_160px_135px_180px_135px_135px_85px_120px_105px_330px] border-y border-slate-200 bg-slate-100 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.05em] text-slate-600">
                <SortHeader label="ID" sortKey="id" sort={processedSort} onSort={(key) => toggleSort(key, setProcessedSort)} />
                <SortHeader label="Customer" sortKey="customer" sort={processedSort} onSort={(key) => toggleSort(key, setProcessedSort)} />
                <SortHeader label="Phone" sortKey="phone" sort={processedSort} onSort={(key) => toggleSort(key, setProcessedSort)} />
                <SortHeader label="Car / Group" sortKey="car" sort={processedSort} onSort={(key) => toggleSort(key, setProcessedSort)} />
                <SortHeader label="Pickup" sortKey="pickup" sort={processedSort} onSort={(key) => toggleSort(key, setProcessedSort)} />
                <SortHeader label="Return" sortKey="return" sort={processedSort} onSort={(key) => toggleSort(key, setProcessedSort)} />
                <SortHeader label="Total" sortKey="total" sort={processedSort} onSort={(key) => toggleSort(key, setProcessedSort)} />
                <SortHeader label="Payment" sortKey="payment" sort={processedSort} onSort={(key) => toggleSort(key, setProcessedSort)} />
                <SortHeader label="Status" sortKey="status" sort={processedSort} onSort={(key) => toggleSort(key, setProcessedSort)} />
                <span className="text-right">Actions</span>
              </div>
              {processedReservations.length > 0 ? (
                processedReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="grid grid-cols-[135px_160px_135px_180px_135px_135px_85px_120px_105px_330px] items-center border-b border-slate-200 px-3 py-1.5 text-sm last:border-b-0 hover:bg-slate-50"
                  >
                    <span className="font-mono text-[11px] font-black text-cyan-700">
                      {reservation.id}
                    </span>
                    <span className="truncate pr-3 font-black text-slate-900">
                      {reservation.customerName}
                    </span>
                    <span className="truncate pr-3 text-xs font-semibold text-slate-700">
                      {reservation.phone}
                    </span>
                    <CarCell reservation={reservation} />
                    <DateCell date={reservation.pickupDate} time={reservation.pickupTime} />
                    <DateCell date={reservation.returnDate} time={reservation.returnTime} />
                    <span className="font-black text-slate-900">{formatMoney(reservation.total)}</span>
                    <span className="truncate pr-2 text-xs font-bold text-slate-700">
                      {reservation.paymentMethod}
                    </span>
                    <StatusBadge status={reservation.status} />
                    <div className="flex flex-nowrap items-center justify-end gap-1 whitespace-nowrap">
                      <TextAction
                        label="View"
                        icon={Eye}
                        tone="secondary"
                        onClick={() => openEditor(reservation)}
                      />
                      <TextAction
                        label="Edit"
                        icon={Pencil}
                        tone="primary"
                        onClick={() => openEditor(reservation)}
                      />
                      <TextAction
                        label="Delete"
                        icon={Trash2}
                        tone="danger"
                        onClick={() => setPendingDeleteId(reservation.id)}
                      />
                      <TextAction
                        label="Email"
                        icon={Mail}
                        tone="primary"
                        onClick={() => openEmailComposer(reservation.id)}
                      />
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
          onEmail={(template) => openEmailComposer(reservationDraft.id, template)}
        />
      )}

      {emailReservation && (
        <EmailComposerModal
          key={`${emailReservation.id}-${emailInitialTemplate}`}
          reservation={emailReservation}
          initialTemplate={emailInitialTemplate}
          onClose={() => setEmailReservationId(null)}
          onFeedback={(message) => {
            setEmailFeedback(message);
            setEmailReservationId(null);
          }}
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
  onEmail,
}: {
  draft: WebsiteReservation;
  onDraftChange: (draft: WebsiteReservation) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  onEmail: (template: EmailTemplateId) => void;
}) {
  const updateDraft = (patch: Partial<WebsiteReservation>) => {
    onDraftChange({ ...draft, ...patch });
  };

  return (
    <aside className="absolute inset-y-0 right-0 z-30 flex w-full max-w-[860px] flex-col border-l border-slate-200 bg-white shadow-[-24px_0_70px_rgba(15,23,42,0.2)]">
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div>
          <p className="font-mono text-xs font-black text-cyan-700">{draft.id}</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">View / Edit reservation</h3>
          <p className="mt-1 text-xs text-slate-500">Local state only.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-100"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100"
            aria-label="Close editor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <EditorField
            label="Customer name"
            value={draft.customerName}
            onChange={(customerName) => updateDraft({ customerName })}
            className="md:col-span-2"
          />
          <EditorField
            label="Phone"
            value={draft.phone}
            onChange={(phone) => updateDraft({ phone })}
          />
          <EditorField
            label="Email"
            value={draft.email}
            onChange={(email) => updateDraft({ email })}
          />
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
            label="Payment method"
            value={draft.paymentMethod}
            onChange={(paymentMethod) => updateDraft({ paymentMethod })}
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
          <label className="block md:col-span-2">
            <EditorLabel>Notes</EditorLabel>
            <textarea
              value={draft.notes}
              onChange={(event) => updateDraft({ notes: event.target.value })}
              rows={4}
              placeholder="Internal reservation notes"
              className="mt-1.5 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-3 md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-900">Manual email actions</p>
                <p className="mt-0.5 text-xs text-slate-500">Email provider is not connected yet.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onEmail('confirmation')}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-cyan-700 bg-cyan-700 px-3 text-xs font-black text-white transition hover:bg-cyan-800"
                >
                  <Mail className="h-4 w-4" />
                  Send confirmation email
                </button>
                <button
                  type="button"
                  onClick={() => onEmail('reminder')}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-indigo-600 bg-indigo-600 px-3 text-xs font-black text-white transition hover:bg-indigo-700"
                >
                  <Clock3 className="h-4 w-4" />
                  Send reminder email
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-4">
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-rose-600 bg-rose-600 px-3 text-sm font-black text-white transition hover:bg-rose-700"
        >
          <Trash2 className="h-4 w-4" />
          Delete reservation
        </button>
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
        {isActive ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}
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
  tone: 'secondary' | 'primary' | 'warning' | 'danger';
  onClick: () => void;
}) {
  const styles = {
    secondary: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100',
    primary: 'border-cyan-700 bg-cyan-700 text-white hover:bg-cyan-800',
    warning: 'border-amber-500 bg-amber-500 text-white hover:bg-amber-600',
    danger: 'border-rose-600 bg-rose-600 text-white hover:bg-rose-700',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex h-7 items-center justify-center gap-1 whitespace-nowrap rounded-md border px-1.5 text-[9px] font-black transition ${styles[tone]}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

function EmailComposerModal({
  reservation,
  initialTemplate,
  onClose,
  onFeedback,
}: {
  reservation: WebsiteReservation;
  initialTemplate: EmailTemplateId;
  onClose: () => void;
  onFeedback: (message: string) => void;
}) {
  const initialContent = emailTemplates[initialTemplate];
  const [templateId, setTemplateId] = useState<EmailTemplateId>(initialTemplate);
  const [recipient, setRecipient] = useState(reservation.email);
  const [subject, setSubject] = useState(initialContent.subject);
  const [message, setMessage] = useState(initialContent.message);
  const [activeField, setActiveField] = useState<EmailField>('message');
  const subjectRef = useRef<HTMLInputElement | null>(null);
  const messageRef = useRef<HTMLTextAreaElement | null>(null);

  const applyTemplate = (nextTemplateId: EmailTemplateId) => {
    const template = emailTemplates[nextTemplateId];
    setTemplateId(nextTemplateId);
    setSubject(template.subject);
    setMessage(template.message);
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
          <div>
            <p className="font-mono text-xs font-black text-cyan-700">{reservation.id}</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">Email composer</h3>
            <p className="mt-1 text-xs text-slate-500">
              Local preview only. No email provider is connected.
            </p>
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

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4 p-5">
            <label className="block">
              <EditorLabel>Template</EditorLabel>
              <select
                value={templateId}
                onChange={(event) => applyTemplate(event.target.value as EmailTemplateId)}
                className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              >
                {(Object.entries(emailTemplates) as Array<
                  [EmailTemplateId, (typeof emailTemplates)[EmailTemplateId]]
                >).map(([id, template]) => (
                  <option key={id} value={id}>
                    {template.label}
                  </option>
                ))}
              </select>
            </label>

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
            onClick={() => onFeedback('Email sending not connected yet.')}
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
            This removes the local preview record only.
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

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="px-5 py-8 text-center text-sm font-semibold text-slate-500">
      {message}
    </div>
  );
}
