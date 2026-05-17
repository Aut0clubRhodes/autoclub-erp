'use client';

import { useMemo, useState } from 'react';
import type { ReportVehicle } from './types';

type KteoReportProps = {
  vehicles: ReportVehicle[];
  fromDate: string;
  toDate: string;
  onUpdateKteo: (vehicleId: string, kteoExpiry: string) => Promise<boolean>;
};

type KteoStatus = 'missing' | 'expired' | 'inRange' | 'soon';
type SortKey = 'plate' | 'brand' | 'model' | 'kteoExpiry' | 'status';
type SortDirection = 'asc' | 'desc';

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

function getKteoStatus(kteoExpiry: string | undefined, fromDate: string, toDate: string): KteoStatus {
  if (!kteoExpiry) return 'missing';

  const today = new Date();
  const expiry = parseDate(kteoExpiry);
  const rangeStart = parseDate(fromDate);
  const rangeEnd = parseDate(toDate);
  const soonThreshold = new Date(today);
  soonThreshold.setDate(soonThreshold.getDate() + 60);

  if (!expiry) return 'missing';
  if (expiry < new Date(today.toDateString())) return 'expired';
  if ((!rangeStart || expiry >= rangeStart) && (!rangeEnd || expiry <= rangeEnd)) return 'inRange';
  if (expiry <= soonThreshold) return 'soon';
  return 'inRange';
}

function shouldShowVehicle(vehicle: ReportVehicle, fromDate: string, toDate: string) {
  if (!vehicle.kteo_expiry) return true;

  const today = new Date();
  const expiry = parseDate(vehicle.kteo_expiry);
  const rangeStart = parseDate(fromDate);
  const rangeEnd = parseDate(toDate);
  if (!expiry) return true;
  const expired = expiry < new Date(today.toDateString());
  const insideRange = (!rangeStart || expiry >= rangeStart) && (!rangeEnd || expiry <= rangeEnd);

  return expired || insideRange;
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

export default function KteoReport({ vehicles, fromDate, toDate, onUpdateKteo }: KteoReportProps) {
  const [editingVehicle, setEditingVehicle] = useState<ReportVehicle | null>(null);
  const [nextExpiry, setNextExpiry] = useState('');
  const [saving, setSaving] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('kteoExpiry');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const rows = useMemo(
    () =>
      vehicles
        .filter((vehicle) => shouldShowVehicle(vehicle, fromDate, toDate))
        .map((vehicle) => ({
          vehicle,
          status: getKteoStatus(vehicle.kteo_expiry, fromDate, toDate),
        }))
        .sort((left, right) => {
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
        }),
    [fromDate, sortDirection, sortKey, toDate, vehicles]
  );

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
  };

  const closeUpdateModal = () => {
    setEditingVehicle(null);
    setNextExpiry('');
  };

  const saveKteoExpiry = async () => {
    if (!editingVehicle || !nextExpiry) return;

    setSaving(true);
    const updated = await onUpdateKteo(editingVehicle.id, nextExpiry);
    setSaving(false);

    if (updated) {
      closeUpdateModal();
    }
  };

  return (
    <div className="space-y-4">
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
            {rows.map(({ vehicle, status }) => (
              <tr key={vehicle.id} className="border-t border-zinc-800">
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
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-sm text-zinc-500">Δεν υπάρχουν αυτοκίνητα για παρακολούθηση ΚΤΕΟ.</p>}
      </div>

      {editingVehicle && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
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
              <div className="flex justify-end gap-3">
                <button type="button" onClick={closeUpdateModal} className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm text-zinc-300">
                  Ακύρωση
                </button>
                <button
                  type="button"
                  onClick={saveKteoExpiry}
                  disabled={!nextExpiry || saving}
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
