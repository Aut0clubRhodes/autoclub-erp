'use client';

import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import AgenciesReport from './AgenciesReport';
import CarsReport from './CarsReport';
import ExpensesReport from './ExpensesReport';
import IncomeReport from './IncomeReport';
import SecretariatReport from './SecretariatReport';
import SuppliersReport from './SuppliersReport';
import { fetchDebts, type DebtRecord } from '@/lib/debtsApi';
import {
  fetchServiceInventoryItems,
  fetchServiceInventoryMovements,
  type ServiceInventoryItem,
  type ServiceInventoryMovement,
} from '@/lib/serviceInventoryApi';
import { fetchServices, type ServiceRecord } from '@/lib/servicesApi';
import type { ReportsData, ReportsFilters } from './types';
import { DEPRECIATION_RATE, calculateYearDepreciation } from './depreciationUtils';

type ReportSection =
  | 'cashflow'
  | 'income'
  | 'expenses'
  | 'agencies'
  | 'suppliers'
  | 'secretariat'
  | 'cars'
  | 'depreciation';

const cashflowSections: { id: ReportSection; label: string }[] = [
  { id: 'cashflow', label: 'Σύνολα Ταμείου' },
  { id: 'income', label: 'Έσοδα' },
  { id: 'expenses', label: 'Έξοδα' },
  { id: 'agencies', label: 'Πρακτορεία' },
  { id: 'suppliers', label: 'Προμηθευτές' },
  { id: 'secretariat', label: 'Γραμμάτια' },
];

const accountingSections: { id: ReportSection; label: string }[] = [
  { id: 'cars', label: 'Αυτοκίνητα' },
  { id: 'depreciation', label: 'Αποσβέσεις' },
];

const VEHICLE_CATEGORY_GROUP_ORDER = ['A', 'B', 'C', 'D', 'E', 'H', 'H1', 'H2', 'H3', 'H4', 'H5', 'K', 'K1', 'K2'];
const UNCATEGORIZED_VEHICLE_GROUP = 'Χωρίς Κατηγορία';

function normalizeVehicleGroup(category?: string) {
  return category?.trim() || UNCATEGORIZED_VEHICLE_GROUP;
}

function getVehicleGroupSortIndex(category: string) {
  const index = VEHICLE_CATEGORY_GROUP_ORDER.indexOf(category);
  return index === -1 ? VEHICLE_CATEGORY_GROUP_ORDER.length : index;
}

function formatVehicleGroupLabel(category: string) {
  return category === UNCATEGORIZED_VEHICLE_GROUP ? 'ΧΩΡΙΣ ΚΑΤΗΓΟΡΙΑ' : `GROUP ${category}`;
}

function getYearFromDate(value?: string) {
  const year = Number(String(value || '').slice(0, 4));
  return Number.isFinite(year) && year > 0 ? year : new Date().getFullYear();
}

const initialFilters: ReportsFilters = {
  fromDate: '2026-01-01',
  toDate: '2026-12-31',
  paymentMethod: '',
  agencyId: '',
  representativeId: '',
  supplierId: '',
  carId: '',
};

export default function ReportsCenter({
  transactions,
  bookings,
  agencies,
  representatives,
  supplierLedger,
  vehicles,
  onAddIncome,
  onAddExpense,
}: ReportsData) {
  const [activeSection, setActiveSection] = useState<ReportSection>('cashflow');
  const [filters, setFilters] = useState(initialFilters);
  const [depreciationYear, setDepreciationYear] = useState(() => getYearFromDate(initialFilters.fromDate));
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [inventoryItems, setInventoryItems] = useState<ServiceInventoryItem[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<ServiceInventoryMovement[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);

  useEffect(() => {
    const loadReportData = async () => {
      const [loadedDebts, loadedInventoryItems, loadedInventoryMovements, loadedServices] =
        await Promise.all([
          fetchDebts(),
          fetchServiceInventoryItems(),
          fetchServiceInventoryMovements(),
          fetchServices(),
        ]);

      setDebts(loadedDebts);
      setInventoryItems(loadedInventoryItems);
      setInventoryMovements(loadedInventoryMovements);
      setServices(loadedServices);
    };

    loadReportData();
  }, []);

  useEffect(() => {
    setDepreciationYear(getYearFromDate(filters.fromDate));
  }, [filters.fromDate]);

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        if (filters.fromDate && transaction.date < filters.fromDate) return false;
        if (filters.toDate && transaction.date > filters.toDate) return false;
        if (filters.paymentMethod && transaction.payment_method !== filters.paymentMethod) return false;
        if (filters.agencyId && transaction.agency_id !== filters.agencyId) return false;
        if (filters.representativeId && transaction.representative_id !== filters.representativeId) return false;
        if (filters.supplierId && String(transaction.supplier_id || '') !== filters.supplierId) return false;
        if (filters.carId && transaction.car_id !== filters.carId) return false;
        return true;
      }),
    [filters, transactions]
  );

  const filteredBookings = useMemo(
    () =>
      bookings.filter((booking) => {
        const bookingDate = booking.created_at?.slice(0, 10);
        if (filters.fromDate && bookingDate && bookingDate < filters.fromDate) return false;
        if (filters.toDate && bookingDate && bookingDate > filters.toDate) return false;
        if (filters.paymentMethod && booking.payment_method !== filters.paymentMethod) return false;
        if (filters.agencyId && String(booking.agency_id || '') !== filters.agencyId) return false;
        if (
          filters.representativeId &&
          String(booking.representative_id || '') !== filters.representativeId
        ) {
          return false;
        }
        if (filters.carId && String(booking.car_id || '') !== filters.carId) return false;
        return true;
      }),
    [
      bookings,
      filters.agencyId,
      filters.carId,
      filters.fromDate,
      filters.paymentMethod,
      filters.representativeId,
      filters.toDate,
    ]
  );

  const availableRepresentatives = filters.agencyId
    ? representatives.filter((representative) => String(representative.agency_id) === filters.agencyId)
    : representatives;

  return (
    <div className="flex h-full min-h-0 flex-col bg-black/20">
      <div className="sticky top-0 z-10 border-b border-white/[0.07] bg-black/30 px-5 py-3.5 backdrop-blur">
        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-7">
          <FilterInput
            label="Από Ημερομηνία"
            type="date"
            value={filters.fromDate}
            onChange={(value) => setFilters((current) => ({ ...current, fromDate: value }))}
          />
          <FilterInput
            label="Έως Ημερομηνία"
            type="date"
            value={filters.toDate}
            onChange={(value) => setFilters((current) => ({ ...current, toDate: value }))}
          />
          <FilterSelect
            label="Payment Method"
            value={filters.paymentMethod}
            options={[
              { value: '', label: 'Όλα' },
              { value: 'cash', label: 'Μετρητά' },
              { value: 'card', label: 'Κάρτα' },
              { value: 'bank', label: 'Τράπεζα' },
              { value: 'credit', label: 'Πίστωση' },
            ]}
            onChange={(value) => setFilters((current) => ({ ...current, paymentMethod: value }))}
          />
          <FilterSelect
            label="Agency"
            value={filters.agencyId}
            options={[
              { value: '', label: 'Όλα' },
              ...agencies.map((agency) => ({ value: String(agency.id), label: agency.name })),
            ]}
            onChange={(value) =>
              setFilters((current) => ({ ...current, agencyId: value, representativeId: '' }))
            }
          />
          <FilterSelect
            label="Representative"
            value={filters.representativeId}
            options={[
              { value: '', label: 'Όλοι' },
              ...availableRepresentatives.map((representative) => ({
                value: String(representative.id),
                label: representative.name,
              })),
            ]}
            onChange={(value) => setFilters((current) => ({ ...current, representativeId: value }))}
          />
          <FilterSelect
            label="Supplier"
            value={filters.supplierId}
            options={[
              { value: '', label: 'Όλοι' },
              ...supplierLedger.map((supplier) => ({
                value: String(supplier.supplier_id),
                label: supplier.supplier_name,
              })),
            ]}
            onChange={(value) => setFilters((current) => ({ ...current, supplierId: value }))}
          />
          <FilterSelect
            label="Car"
            value={filters.carId}
            options={[
              { value: '', label: 'Όλα' },
              ...vehicles.map((vehicle) => ({ value: vehicle.id, label: vehicle.plate })),
            ]}
            onChange={(value) => setFilters((current) => ({ ...current, carId: value }))}
          />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[190px_minmax(0,1fr)]">
        <aside className="border-b border-white/[0.07] bg-white/[0.015] p-3 lg:border-b-0 lg:border-r">
          <ReportSectionTitle>ΤΑΜΕΙΑΚΗ ΡΟΗ</ReportSectionTitle>
          <nav className="flex gap-2 overflow-x-auto lg:flex-col">
            {cashflowSections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`rounded-xl px-4 py-3 text-left text-sm transition ${
                  activeSection === section.id
                    ? 'erp-active-nav border border-sky-400/20 bg-sky-400/10 text-white'
                    : 'border border-transparent text-zinc-400 hover:border-white/[0.06] hover:bg-white/[0.03] hover:text-zinc-200'
                }`}
              >
                {section.label}
              </button>
            ))}
            <ReportSectionTitle className="mt-3">ΛΟΓΙΣΤΙΚΟ ΚΕΡΔΟΣ / ΖΗΜΙΑ</ReportSectionTitle>
            {accountingSections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`rounded-xl px-4 py-3 text-left text-sm transition ${
                  activeSection === section.id
                    ? 'erp-active-nav border border-sky-400/20 bg-sky-400/10 text-white'
                    : 'border border-transparent text-zinc-400 hover:border-white/[0.06] hover:bg-white/[0.03] hover:text-zinc-200'
                }`}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-h-0 overflow-auto px-4 py-4">
          <div className="w-full max-w-none space-y-4">
            {activeSection === 'agencies' && (
              <AgenciesReport
                transactions={filteredTransactions}
                bookings={filteredBookings}
                agencies={agencies}
                representatives={representatives}
              />
            )}
            {activeSection === 'expenses' && (
              <>
                <ReportActionBar label="+ Καταχώρηση Εξόδου" onClick={onAddExpense} tone="expense" />
                <ExpensesReport transactions={filteredTransactions} />
              </>
            )}
            {activeSection === 'income' && (
              <>
                <ReportActionBar label="+ Καταχώρηση Εσόδου" onClick={onAddIncome} tone="income" />
                <IncomeReport transactions={filteredTransactions} />
              </>
            )}
            {activeSection === 'cashflow' && <CashflowSummary transactions={filteredTransactions} />}
            {activeSection === 'suppliers' && (
              <SuppliersReport
                transactions={filteredTransactions}
                supplierLedger={supplierLedger}
                debts={debts.filter((debt) => {
                  if (filters.supplierId && String(debt.supplier_id || '') !== filters.supplierId) return false;
                  if (filters.fromDate && debt.due_date && debt.due_date < filters.fromDate) return false;
                  if (filters.toDate && debt.due_date && debt.due_date > filters.toDate) return false;
                  return true;
                })}
              />
            )}
            {activeSection === 'cars' && (
              <CarsReport
                transactions={filteredTransactions}
                bookings={filteredBookings}
                vehicles={vehicles}
                debts={debts}
                inventoryItems={inventoryItems}
                inventoryMovements={inventoryMovements}
                services={services}
                fromDate={filters.fromDate}
                toDate={filters.toDate}
                depreciationYear={depreciationYear}
              />
            )}
            {activeSection === 'depreciation' && (
              <DepreciationReport
                vehicles={vehicles}
                depreciationYear={depreciationYear}
                onDepreciationYearChange={setDepreciationYear}
              />
            )}
            {activeSection === 'secretariat' && (
              <SecretariatReport
                debts={debts.filter(
                  (debt) =>
                    !String(debt.notes || '').includes('[service_inventory_item:')
                )}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function FilterInput({
  label,
  type,
  value,
  onChange,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5 text-sm text-zinc-300">
      <span className="block text-xs text-zinc-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
      />
    </label>
  );
}

function ReportSectionTitle({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`rounded-xl border border-zinc-700/70 bg-zinc-900/70 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-300 shadow-inner ${className}`}
    >
      {children}
    </h2>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5 text-sm text-zinc-300">
      <span className="block text-xs text-zinc-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CashflowSummary({ transactions }: { transactions: ReportsData['transactions'] }) {
  const incomeTotal = transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expenseTotal = transactions
    .filter((transaction) => transaction.type === 'expense' || transaction.type === 'supplier_payment')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const netTotal = incomeTotal - expenseTotal;
  const formatMoney = (value: number) =>
    `€${value.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const cards = [
    { label: 'Σύνολο Εσόδων', value: incomeTotal, className: 'text-emerald-300' },
    { label: 'Σύνολο Εξόδων', value: expenseTotal, className: 'text-rose-300' },
    { label: 'Καθαρή Ροή', value: netTotal, className: netTotal >= 0 ? 'text-emerald-300' : 'text-rose-300' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{card.label}</p>
          <p className={`mt-3 text-2xl font-bold ${card.className}`}>{formatMoney(card.value)}</p>
        </div>
      ))}
    </div>
  );
}

function DepreciationReport({
  vehicles,
  depreciationYear,
  onDepreciationYearChange,
}: {
  vehicles: ReportsData['vehicles'];
  depreciationYear: number;
  onDepreciationYearChange: (year: number) => void;
}) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const formatMoney = (value: number) =>
    `€${value.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const groupedVehicles = vehicles.reduce<Array<{ category: string; vehicles: typeof vehicles }>>((groups, vehicle) => {
    const category = normalizeVehicleGroup(vehicle.category);
    const existingGroup = groups.find((group) => group.category === category);

    if (existingGroup) {
      existingGroup.vehicles.push(vehicle);
      return groups;
    }

    return [...groups, { category, vehicles: [vehicle] }];
  }, []);

  groupedVehicles.sort((left, right) => {
    const leftIndex = getVehicleGroupSortIndex(left.category);
    const rightIndex = getVehicleGroupSortIndex(right.category);

    if (leftIndex !== rightIndex) return leftIndex - rightIndex;
    return left.category.localeCompare(right.category, 'el');
  });
  groupedVehicles.forEach((group) => {
    group.vehicles.sort((left, right) => left.plate.localeCompare(right.plate, 'el', { numeric: true }));
  });

  const toggleGroup = (category: string) => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <label className="inline-flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-300">
        <span className="font-semibold">Έτος Απόσβεσης</span>
        <input
          type="number"
          min="1900"
          max="2200"
          value={depreciationYear}
          onChange={(event) => {
            const nextYear = Number(event.target.value);
            if (Number.isFinite(nextYear)) {
              onDepreciationYearChange(nextYear);
            }
          }}
          className="w-28 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
        />
      </label>

      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <table className="w-full min-w-[1480px] text-left">
          <thead className="bg-zinc-900/90">
            <tr>
              {[
                'Κατηγορία',
                'Αυτοκίνητο / Πινακίδα',
                'Μάρκα',
                'Μοντέλο',
                'Έτος',
                'Έτος Απόσβεσης',
                'Αξία Αρχής Έτους',
                'Ποσοστό Απόσβεσης',
                'Ποσό Απόσβεσης',
                'Εκτιμώμενη Αξία Τέλους Έτους',
              ].map((label) => (
                <th key={label} className="px-4 py-3 text-sm text-zinc-400">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupedVehicles.map((group) => (
              <Fragment key={group.category}>
                <tr className="border-t border-zinc-700/70 bg-zinc-900/70">
                  <td colSpan={10} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-zinc-300">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.category)}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <span>{formatVehicleGroupLabel(group.category)} ({group.vehicles.length})</span>
                      <span className="text-zinc-500">{collapsedGroups.has(group.category) ? '+' : '−'}</span>
                    </button>
                  </td>
                </tr>
                {!collapsedGroups.has(group.category) && group.vehicles.map((vehicle) => {
                  const depreciation = calculateYearDepreciation(vehicle, depreciationYear);
                  const category = normalizeVehicleGroup(vehicle.category);

                  return (
                    <tr key={vehicle.id} className="border-t border-zinc-800 hover:bg-zinc-900/60">
                      <td className="px-4 py-4 text-sm text-zinc-200">{category}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-white">{vehicle.plate || '-'}</td>
                      <td className="px-4 py-4 text-sm text-zinc-200">{vehicle.brand || '-'}</td>
                      <td className="px-4 py-4 text-sm text-zinc-200">{vehicle.model || '-'}</td>
                      <td className="px-4 py-4 text-sm text-zinc-200">{vehicle.year || '-'}</td>
                      <td className="px-4 py-4 text-sm text-zinc-200">{depreciationYear}</td>
                      <td className="px-4 py-4 text-sm text-zinc-200">{formatMoney(depreciation.startValue)}</td>
                      <td className="px-4 py-4 text-sm text-zinc-200">{Math.round(DEPRECIATION_RATE * 100)}%</td>
                      <td className="px-4 py-4 text-sm text-amber-300">{formatMoney(depreciation.depreciationAmount)}</td>
                      <td className="px-4 py-4 text-sm text-emerald-300">{formatMoney(depreciation.endValue)}</td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
        {vehicles.length === 0 && <p className="p-6 text-sm text-zinc-500">Δεν βρέθηκαν αυτοκίνητα.</p>}
      </div>
    </div>
  );
}

function ReportActionBar({
  label,
  onClick,
  tone,
}: {
  label: string;
  onClick?: () => void;
  tone: 'income' | 'expense';
}) {
  const className =
    tone === 'income'
      ? 'border-emerald-500/30 bg-emerald-500 px-4 py-2 text-white hover:bg-emerald-600'
      : 'border-sky-500/30 bg-sky-500 px-4 py-2 text-white hover:bg-sky-600';

  return (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className={`rounded-xl border text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        {label}
      </button>
    </div>
  );
}
