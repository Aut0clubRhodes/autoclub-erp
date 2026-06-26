'use client';

import { Fragment, useMemo, useState } from 'react';
import type { ReportVehicle } from './types';

type KteoReportProps = {
  vehicles: ReportVehicle[];
  onUpdateKteo: (
    vehicleId: string,
    kteoExpiry: string,
    expense?: { amount: number; paymentMethod: string }
  ) => Promise<boolean>;
};

type KteoStatus = 'missing' | 'expired' | 'inRange' | 'soon';
type SortKey = 'plate' | 'brand' | 'model' | 'kteoExpiry' | 'status';
type SortDirection = 'asc' | 'desc';
type KteoRow = { vehicle: ReportVehicle; status: KteoStatus };

const statusLabel: Record<KteoStatus, string> = {
  missing: 'Δεν έχει ημερομηνία',
  expired: 'Ληγμένο',
  inRange: 'Μέσα στο διάστημα',
  soon: 'Λήγει σύντομα',
};

const statusClassName: Record<KteoStatus, string> = {
  missing: 'border-zinc-600 bg-zinc-700/30 text-zinc-300',
  expired: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  inRange: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  soon: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
};

function parseDate(value?: string) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function getCurrentYear() {
  return new Date().getFullYear();
}

function getTodayStart() {
  return new Date(new Date().toDateString());
}

function getYearRange(year: number) {
  return {
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31),
  };
}

function isInsideYear(value: string | undefined, year: number) {
  const date = parseDate(value);
  if (!date) return false;

  const { start, end } = getYearRange(year);
  return date >= start && date <= end;
}

function getKteoStatus(kteoExpiry: string | undefined, selectedYear: number): KteoStatus {
  if (!kteoExpiry) return 'missing';

  const today = new Date();
  const expiry = parseDate(kteoExpiry);
  const soonThreshold = new Date(today);
  soonThreshold.setDate(soonThreshold.getDate() + 60);

  if (!expiry) return 'missing';
  if (expiry < getTodayStart()) return 'expired';
  if (isInsideYear(kteoExpiry, selectedYear)) return 'inRange';
  if (expiry <= soonThreshold) return 'soon';
  return 'inRange';
}

function formatKteoDate(value?: string) {
  if (!value) return '-';

  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year.slice(-2)}`;
}

function compareNullableDate(left?: string, right?: string, direction: SortDirection = 'asc') {
  if (!left && !right) return 0;
  if (!left) return direction === 'asc' ? -1 : 1;
  if (!right) return direction === 'asc' ? 1 : -1;
  return direction === 'asc' ? left.localeCompare(right) : right.localeCompare(left);
}

function sortKteoRows(rows: KteoRow[], sortKey: SortKey, sortDirection: SortDirection) {
  return [...rows].sort((left, right) => {
    switch (sortKey) {
      case 'plate':
        return sortDirection === 'asc'
          ? left.vehicle.plate.localeCompare(right.vehicle.plate)
          : right.vehicle.plate.localeCompare(left.vehicle.plate);
      case 'brand':
        return sortDirection === 'asc'
          ? (left.vehicle.brand || '').localeCompare(right.vehicle.brand || '')
          : (right.vehicle.brand || '').localeCompare(left.vehicle.brand || '');
      case 'model':
        return sortDirection === 'asc'
          ? (left.vehicle.model || '').localeCompare(right.vehicle.model || '')
          : (right.vehicle.model || '').localeCompare(left.vehicle.model || '');
      case 'status':
        return sortDirection === 'asc'
          ? statusLabel[left.status].localeCompare(statusLabel[right.status])
          : statusLabel[right.status].localeCompare(statusLabel[left.status]);
      case 'kteoExpiry':
      default:
        return compareNullableDate(left.vehicle.kteo_expiry, right.vehicle.kteo_expiry, sortDirection);
    }
  });
}

export default function KteoReport({ vehicles, onUpdateKteo }: KteoReportProps) {
  const [editingVehicle, setEditingVehicle] = useState<ReportVehicle | null>(null);
  const [nextExpiry, setNextExpiry] = useState('');
  const [kteoAmount, setKteoAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [saving, setSaving] = useState(false);
  const [selectedYear, setSelectedYear] = useState(getCurrentYear);
  const [sortKey, setSortKey] = useState<SortKey>('kteoExpiry');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const sections = useMemo(() => {
    const expiredRows: KteoRow[] = [];
    const dueRows: KteoRow[] = [];
    const missingRows: KteoRow[] = [];

    vehicles.forEach((vehicle) => {
      const status = getKteoStatus(vehicle.kteo_expiry, selectedYear);
      const row = { vehicle, status };

      if (!vehicle.kteo_expiry) {
        missingRows.push(row);
        return;
      }

      const expiry = parseDate(vehicle.kteo_expiry);
      if (!expiry) {
        missingRows.push({ vehicle, status: 'missing' });
        return;
      }

      if (expiry < getTodayStart()) {
        expiredRows.push(row);
        return;
      }

      if (isInsideYear(vehicle.kteo_expiry, selectedYear)) {
        dueRows.push(row);
      }
    });

    return [
      { id: 'expired', title: 'Ληγμένα', rows: sortKteoRows(expiredRows, sortKey, sortDirection) },
      {
        id: 'due-year',
        title: `Λήγουν το ${selectedYear}`,
        rows: sortKteoRows(dueRows, sortKey, sortDirection),
      },
      {
        id: 'missing',
        title: 'Χωρίς ημερομηνία ΚΤΕΟ',
        rows: sortKteoRows(missingRows, sortKey, sortDirection),
      },
    ];
  }, [selectedYear, sortDirection, sortKey, vehicles]);

  const visibleRowsCount = sections.reduce((total, section) => total + section.rows.length, 0);

  const handleSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(nextKey);
    setSortDirection('asc');
  };

  const openUpdateModal = (vehicle: ReportVehicle) => {
    setEditingVehicle(vehicle);
    setNextExpiry(vehicle.kteo_expiry || '');
    setKteoAmount('');
    setPaymentMethod('cash');
  };

  const closeUpdateModal = () => {
    setEditingVehicle(null);
    setNextExpiry('');
    setKteoAmount('');
    setPaymentMethod('cash');
  };

  const saveKteoExpiry = async () => {
    const amount = Number(kteoAmount.replace(',', '.'));
    if (!editingVehicle || !nextExpiry || !Number.isFinite(amount) || amount <= 0 || !paymentMethod) return;

    setSaving(true);
    const updated = await onUpdateKteo(editingVehicle.id, nextExpiry, {
      amount,
      paymentMethod,
    });
    setSaving(false);

    if (updated) {
      closeUpdateModal();
    }
  };

  return (
    <div className="space-y-4">
      <label className="inline-flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-300">
        <span className="font-semibold">Έτος ΚΤΕΟ</span>
        <input
          type="number"
          min="1900"
          max="2200"
          value={selectedYear}
          onChange={(event) => {
            const nextYear = Number(event.target.value);
            if (Number.isFinite(nextYear) && nextYear > 0) {
              setSelectedYear(nextYear);
            }
          }}
          className="w-28 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
        />
      </label>

      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <table className="w-full min-w-[860px] text-left">
          <thead className="bg-zinc-900/90">
            <tr>
              <SortableHeader label="Πινακίδα" sortKey="plate" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortableHeader label="Μάρκα" sortKey="brand" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortableHeader label="Μοντέλο" sortKey="model" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortableHeader label="ΚΤΕΟ Λήξη" sortKey="kteoExpiry" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortableHeader label="Κατάσταση" sortKey="status" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <th className="px-4 py-3 text-sm text-zinc-400">Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <Fragment key={section.id}>
                <tr className="border-t border-zinc-700/70 bg-zinc-900/70">
                  <td colSpan={6} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-zinc-300">
                    {section.title} ({section.rows.length})
                  </td>
                </tr>
                {section.rows.length === 0 ? (
                  <tr className="border-t border-zinc-800">
                    <td colSpan={6} className="px-4 py-4 text-sm text-zinc-500">
                      Δεν υπάρχουν αυτοκίνητα σε αυτή την ενότητα.
                    </td>
                  </tr>
                ) : (
                  section.rows.map(({ vehicle, status }) => (
                    <tr key={`${section.id}-${vehicle.id}`} className="border-t border-zinc-800">
                      <td className="px-4 py-4 text-sm font-medium text-white">{vehicle.plate}</td>
                      <td className="px-4 py-4 text-sm text-zinc-200">{vehicle.brand || '-'}</td>
                      <td className="px-4 py-4 text-sm text-zinc-200">{vehicle.model || '-'}</td>
                      <td className="px-4 py-4 text-sm text-zinc-200">{formatKteoDate(vehicle.kteo_expiry)}</td>
                      <td className="px-4 py-4 text-sm">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${statusClassName[status]}`}>
                          {statusLabel[status]}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <button
                          type="button"
                          onClick={() => openUpdateModal(vehicle)}
                          className="rounded-2xl border border-sky-400/25 bg-sky-400/10 px-3 py-2 text-xs font-medium text-sky-200 transition hover:bg-sky-400/20"
                        >
                          Πέρασε ΚΤΕΟ
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {visibleRowsCount === 0 && <p className="p-6 text-sm text-zinc-500">Δεν υπάρχουν αυτοκίνητα για παρακολούθηση ΚΤΕΟ.</p>}
      </div>

      {editingVehicle && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-sky-300/15 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-5">
              <h3 className="text-lg font-semibold text-white">Ενημέρωση ΚΤΕΟ — {editingVehicle.plate}</h3>
              <button type="button" onClick={closeUpdateModal} className="text-zinc-400 transition hover:text-white">
                ✕
              </button>
            </div>
            <div className="space-y-5 p-6">
              <label className="block space-y-2 text-sm text-zinc-300">
                <span>Νέα ημερομηνία λήξης ΚΤΕΟ</span>
                <input
                  type="date"
                  value={nextExpiry}
                  onChange={(event) => setNextExpiry(event.target.value)}
                  className="input"
                />
              </label>
              <label className="block space-y-2 text-sm text-zinc-300">
                <span>Ποσό</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={kteoAmount}
                  onChange={(event) => setKteoAmount(event.target.value)}
                  className="input"
                  placeholder="0.00"
                />
              </label>
              <label className="block space-y-2 text-sm text-zinc-300">
                <span>Τρόπος Πληρωμής</span>
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  className="input"
                >
                  <option value="cash">Μετρητά</option>
                  <option value="card">Κάρτα</option>
                  <option value="bank">Τράπεζα</option>
                </select>
              </label>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={closeUpdateModal} className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm text-zinc-300">
                  Ακύρωση
                </button>
                <button
                  type="button"
                  onClick={saveKteoExpiry}
                  disabled={
                    !nextExpiry ||
                    !paymentMethod ||
                    !Number.isFinite(Number(kteoAmount.replace(',', '.'))) ||
                    Number(kteoAmount.replace(',', '.')) <= 0 ||
                    saving
                  }
                  className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Αποθήκευση
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const active = activeSortKey === sortKey;

  return (
    <th className="px-4 py-3 text-sm text-zinc-400">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1.5 transition hover:text-white"
      >
        <span>{label}</span>
        {active && <span>{direction === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </th>
  );
}
