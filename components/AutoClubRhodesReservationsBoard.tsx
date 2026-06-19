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
  loadBookingEngineReservations,
  saveBookingEngineReservations,
  subscribeBookingEngineReservations,
  type BookingEngineReservationStatus,
  type BookingEngineWebsiteReservation,
} from '@/lib/bookingEngineReservationsStore';
import {
  loadBookingEngineConfig,
  subscribeBookingEngineConfig,
  type BookingEngineEmailTemplateId,
} from '@/lib/bookingEngineLocalConfig';

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

type WebsiteReservation = BookingEngineWebsiteReservation;

const statusStyles: Record<ReservationStatus, string> = {
  'New Request': 'border-sky-200 bg-sky-50 text-sky-800',
  'Under Review': 'border-amber-200 bg-amber-50 text-amber-800',
  Ready: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Cancelled: 'border-rose-200 bg-rose-50 text-rose-700',
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

const replaceEmailVariables = (template: string, reservation: WebsiteReservation) => {
  const replacements: Record<string, string> = {
    '{customer_name}': reservation.customerName,
    '{reservation_id}': reservation.id,
    '{car_name}': reservation.carName,
    '{group}': reservation.groupCode,
    '{pickup_date}': formatDate(reservation.pickupDate),
    '{pickup_time}': reservation.pickupTime,
    '{return_date}': formatDate(reservation.returnDate),
    '{return_time}': reservation.returnTime,
    '{pickup_location}': reservation.pickupLocation,
    '{return_location}': reservation.returnLocation,
    '{total_price}': formatMoney(reservation.total),
    '{payment_method}': reservation.paymentMethod,
  };

  return Object.entries(replacements).reduce(
    (message, [variable, value]) => message.split(variable).join(value || ''),
    template,
  );
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

export default function AutoClubRhodesReservationsBoard() {
  const [reservations, setReservations] = useState<WebsiteReservation[]>(() =>
    loadBookingEngineReservations(),
  );
  const [editingReservationId, setEditingReservationId] = useState<string | null>(null);
  const [reservationDraft, setReservationDraft] = useState<WebsiteReservation | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [emailFeedback, setEmailFeedback] = useState('');
  const [emailReservationId, setEmailReservationId] = useState<string | null>(null);
  const [emailInitialTemplate, setEmailInitialTemplate] =
    useState<EmailTemplateId>('customerRequestReceived');
  const [bookingEngineConfig, setBookingEngineConfig] = useState(() => loadBookingEngineConfig());
  const [newRequestsSort, setNewRequestsSort] = useState<ReservationSortState>({
    key: 'customer',
    direction: 'asc',
  });
  const [processedSort, setProcessedSort] = useState<ReservationSortState>({
    key: 'id',
    direction: 'desc',
  });

  useEffect(
    () =>
      subscribeBookingEngineReservations(() => {
        setReservations(loadBookingEngineReservations());
      }),
    [],
  );

  useEffect(
    () =>
      subscribeBookingEngineConfig(() => {
        setBookingEngineConfig(loadBookingEngineConfig());
      }),
    [],
  );

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
    setReservations((current) => {
      const nextReservations = current.map((reservation) =>
        reservation.id === reservationId ? { ...reservation, ...patch } : reservation,
      );
      saveBookingEngineReservations(nextReservations);
      return nextReservations;
    });
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

    setReservations((current) => {
      const nextReservations = current.map((reservation) =>
        reservation.id === editingReservationId
          ? {
              ...reservationDraft,
              customerName: reservationDraft.customerName.trim(),
              phone: reservationDraft.phone.trim(),
              fullPhone: reservationDraft.fullPhone?.trim() || reservationDraft.phone.trim(),
              countryCode: reservationDraft.countryCode?.trim() || '',
              email: reservationDraft.email.trim(),
              dateOfBirth: reservationDraft.dateOfBirth?.trim() || '',
              hotelVillaApartment: reservationDraft.hotelVillaApartment?.trim() || reservationDraft.hotelRoom.trim(),
              hotelRoom: reservationDraft.hotelRoom.trim(),
              carName: reservationDraft.carName.trim(),
              groupCode: reservationDraft.groupCode.trim().toUpperCase(),
              pickupLocation: reservationDraft.pickupLocation.trim(),
              returnLocation: reservationDraft.returnLocation.trim(),
              paymentMethod: reservationDraft.paymentMethod.trim(),
              notes: reservationDraft.notes.trim(),
            }
          : reservation,
      );
      saveBookingEngineReservations(nextReservations);
      return nextReservations;
    });
    closeEditor();
  };

  const deleteReservation = (reservationId: string) => {
    setReservations((current) => {
      const nextReservations = current.filter((reservation) => reservation.id !== reservationId);
      saveBookingEngineReservations(nextReservations);
      return nextReservations;
    });
    closeEditor();
    setPendingDeleteId(null);
  };

  const openEmailComposer = (
    reservationId: string,
    template?: EmailTemplateId,
  ) => {
    const reservation = reservations.find((item) => item.id === reservationId);
    setEmailReservationId(reservationId);
    setEmailInitialTemplate(template || reservation?.customerEmailTemplateId || 'customerRequestReceived');
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
            <div className="min-w-[1370px]">
              <div className="grid grid-cols-[170px_135px_180px_135px_135px_130px_85px_120px_365px] border-y border-slate-200 bg-slate-100 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.05em] text-slate-600">
                <SortHeader label="Customer" sortKey="customer" sort={newRequestsSort} onSort={(key) => toggleSort(key, setNewRequestsSort)} />
                <SortHeader label="Phone" sortKey="phone" sort={newRequestsSort} onSort={(key) => toggleSort(key, setNewRequestsSort)} />
                <SortHeader label="Car / Group" sortKey="car" sort={newRequestsSort} onSort={(key) => toggleSort(key, setNewRequestsSort)} />
                <SortHeader label="Pickup" sortKey="pickup" sort={newRequestsSort} onSort={(key) => toggleSort(key, setNewRequestsSort)} />
                <SortHeader label="Return" sortKey="return" sort={newRequestsSort} onSort={(key) => toggleSort(key, setNewRequestsSort)} />
                <SortHeader label="Status" sortKey="status" sort={newRequestsSort} onSort={(key) => toggleSort(key, setNewRequestsSort)} />
                <SortHeader label="Total" sortKey="total" sort={newRequestsSort} onSort={(key) => toggleSort(key, setNewRequestsSort)} />
                <SortHeader label="Payment" sortKey="payment" sort={newRequestsSort} onSort={(key) => toggleSort(key, setNewRequestsSort)} />
                <span className="text-right">Actions</span>
              </div>
              {newReservations.length > 0 ? (
                newReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="grid grid-cols-[170px_135px_180px_135px_135px_130px_85px_120px_365px] items-center border-b border-slate-200 px-3 py-1.5 text-sm last:border-b-0 hover:bg-slate-50"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="truncate font-black text-slate-900">{reservation.customerName}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-400">{reservation.id}</p>
                    </div>
                    <span className="truncate pr-3 text-xs font-semibold text-slate-700">
                      {reservation.fullPhone || reservation.phone}
                    </span>
                    <CarCell reservation={reservation} />
                    <DateCell date={reservation.pickupDate} time={reservation.pickupTime} />
                    <DateCell date={reservation.returnDate} time={reservation.returnTime} />
                    <StatusBadge status={reservation.status} />
                    <span className="font-black text-slate-900">{formatMoney(reservation.total)}</span>
                    <span className="truncate pr-2 text-xs font-bold text-slate-700">
                      {reservation.paymentMethod}
                    </span>
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
            <div className="min-w-[1430px]">
              <div className="grid grid-cols-[135px_160px_135px_180px_135px_135px_130px_85px_120px_330px] border-y border-slate-200 bg-slate-100 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.05em] text-slate-600">
                <SortHeader label="ID" sortKey="id" sort={processedSort} onSort={(key) => toggleSort(key, setProcessedSort)} />
                <SortHeader label="Customer" sortKey="customer" sort={processedSort} onSort={(key) => toggleSort(key, setProcessedSort)} />
                <SortHeader label="Phone" sortKey="phone" sort={processedSort} onSort={(key) => toggleSort(key, setProcessedSort)} />
                <SortHeader label="Car / Group" sortKey="car" sort={processedSort} onSort={(key) => toggleSort(key, setProcessedSort)} />
                <SortHeader label="Pickup" sortKey="pickup" sort={processedSort} onSort={(key) => toggleSort(key, setProcessedSort)} />
                <SortHeader label="Return" sortKey="return" sort={processedSort} onSort={(key) => toggleSort(key, setProcessedSort)} />
                <SortHeader label="Status" sortKey="status" sort={processedSort} onSort={(key) => toggleSort(key, setProcessedSort)} />
                <SortHeader label="Total" sortKey="total" sort={processedSort} onSort={(key) => toggleSort(key, setProcessedSort)} />
                <SortHeader label="Payment" sortKey="payment" sort={processedSort} onSort={(key) => toggleSort(key, setProcessedSort)} />
                <span className="text-right">Actions</span>
              </div>
              {processedReservations.length > 0 ? (
                processedReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="grid grid-cols-[135px_160px_135px_180px_135px_135px_130px_85px_120px_330px] items-center border-b border-slate-200 px-3 py-1.5 text-sm last:border-b-0 hover:bg-slate-50"
                  >
                    <span className="font-mono text-[11px] font-black text-cyan-700">
                      {reservation.id}
                    </span>
                    <span className="truncate pr-3 font-black text-slate-900">
                      {reservation.customerName}
                    </span>
                    <span className="truncate pr-3 text-xs font-semibold text-slate-700">
                      {reservation.fullPhone || reservation.phone}
                    </span>
                    <CarCell reservation={reservation} />
                    <DateCell date={reservation.pickupDate} time={reservation.pickupTime} />
                    <DateCell date={reservation.returnDate} time={reservation.returnTime} />
                    <StatusBadge status={reservation.status} />
                    <span className="font-black text-slate-900">{formatMoney(reservation.total)}</span>
                    <span className="truncate pr-2 text-xs font-bold text-slate-700">
                      {reservation.paymentMethod}
                    </span>
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
          onEmailPlaceholder={() => setEmailFeedback('Email sending not connected yet.')}
        />
      )}

      {emailReservation && (
        <EmailComposerModal
          key={`${emailReservation.id}-${emailInitialTemplate}`}
          reservation={emailReservation}
          initialTemplate={emailInitialTemplate}
          templates={bookingEngineConfig.emailSettings.templates}
          siteName={bookingEngineConfig.siteSettings.companyName || 'AutoClub Rhodes'}
          logoImage={bookingEngineConfig.siteSettings.logoImage}
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
  onEmailPlaceholder,
}: {
  draft: WebsiteReservation;
  onDraftChange: (draft: WebsiteReservation) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  onEmail: (template: EmailTemplateId) => void;
  onEmailPlaceholder: () => void;
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
            onChange={(phone) => updateDraft({ phone, fullPhone: `${draft.countryCode || ''} ${phone}`.trim() })}
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
            label="Full phone"
            value={draft.fullPhone || draft.phone}
            onChange={(fullPhone) => updateDraft({ fullPhone })}
          />
          <EditorField
            label="Email"
            value={draft.email}
            onChange={(email) => updateDraft({ email })}
          />
          <EditorField
            label="Date of Birth"
            type="date"
            value={draft.dateOfBirth || ''}
            onChange={(dateOfBirth) => updateDraft({ dateOfBirth })}
          />
          <EditorField
            label="Hotel / Villa / Apartment"
            value={draft.hotelVillaApartment || draft.hotelRoom}
            onChange={(hotelVillaApartment) =>
              updateDraft({ hotelVillaApartment, hotelRoom: hotelVillaApartment })
            }
          />
          <EditorField
            label="Flight Number"
            value={draft.flightNumber}
            onChange={(flightNumber) => updateDraft({ flightNumber })}
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
                <p className="text-sm font-black text-slate-900">Submitted extras</p>
                <p className="mt-0.5 text-xs text-slate-500">Stored with the local website reservation.</p>
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
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-3 md:col-span-2">
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
                    <p className="mt-1 text-sm font-bold text-slate-900">{field.value || '—'}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-xs font-semibold text-slate-500 sm:col-span-2">
                  No custom checkout fields submitted.
                </p>
              )}
            </div>
          </section>
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-3 md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-900">Email preview flow</p>
                <p className="mt-0.5 text-xs text-slate-500">Preview only. Email provider is not connected yet.</p>
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
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onEmail(draft.customerEmailTemplateId || 'customerRequestReceived')}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-cyan-700 bg-cyan-700 px-3 text-xs font-black text-white transition hover:bg-cyan-800"
              >
                <Mail className="h-4 w-4" />
                Open email composer
              </button>
              <button
                type="button"
                onClick={onEmailPlaceholder}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-700 bg-emerald-700 px-3 text-xs font-black text-white transition hover:bg-emerald-800"
              >
                <Mail className="h-4 w-4" />
                Send email placeholder
              </button>
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
  templates,
  siteName,
  logoImage,
  onClose,
  onFeedback,
}: {
  reservation: WebsiteReservation;
  initialTemplate: EmailTemplateId;
  templates: ReturnType<typeof loadBookingEngineConfig>['emailSettings']['templates'];
  siteName: string;
  logoImage: string;
  onClose: () => void;
  onFeedback: (message: string) => void;
}) {
  const customerTemplateOrder: EmailTemplateId[] = [
    'customerRequestReceived',
    'customerOnRequestReceived',
    'customerBookingConfirmed',
    'paymentReminder',
    'customEmail',
  ];
  const safeInitialTemplate = customerTemplateOrder.includes(initialTemplate)
    ? initialTemplate
    : 'customerRequestReceived';
  const initialContent = templates[safeInitialTemplate];
  const [templateId, setTemplateId] = useState<EmailTemplateId>(safeInitialTemplate);
  const [recipient, setRecipient] = useState(reservation.email);
  const [subject, setSubject] = useState(replaceEmailVariables(initialContent.subject, reservation));
  const [message, setMessage] = useState(replaceEmailVariables(initialContent.message, reservation));
  const [activeField, setActiveField] = useState<EmailField>('message');
  const subjectRef = useRef<HTMLInputElement | null>(null);
  const messageRef = useRef<HTMLTextAreaElement | null>(null);

  const applyTemplate = (nextTemplateId: EmailTemplateId) => {
    const template = templates[nextTemplateId];
    setTemplateId(nextTemplateId);
    setRecipient(reservation.email);
    setSubject(replaceEmailVariables(template.subject, reservation));
    setMessage(replaceEmailVariables(template.message, reservation));
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
                {siteName} · Car rental in Rhodes · Local preview only
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

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_280px]">
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
                    {template.label}
                  </option>
                  );
                })}
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
            Send email placeholder
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
