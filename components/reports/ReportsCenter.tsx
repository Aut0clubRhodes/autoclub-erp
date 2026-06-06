'use client';

import { useEffect, useMemo, useState } from 'react';
import AgenciesReport from './AgenciesReport';
import CarsReport from './CarsReport';
import ExpensesReport from './ExpensesReport';
import IncomeReport from './IncomeReport';
import KteoReport from './KteoReport';
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

type ReportSection = 'agencies' | 'expenses' | 'income' | 'suppliers' | 'cars' | 'kteo' | 'secretariat';

const sections: { id: ReportSection; label: string; group: 'income' | 'expense' | 'kteo' }[] = [
  { id: 'income', label: 'Έσοδα', group: 'income' },
  { id: 'agencies', label: 'Πρακτορεία', group: 'income' },
  { id: 'cars', label: 'Αυτοκίνητα', group: 'income' },
  { id: 'expenses', label: 'Έξοδα', group: 'expense' },
  { id: 'suppliers', label: 'Προμηθευτές', group: 'expense' },
  { id: 'secretariat', label: 'Γραμματεία', group: 'expense' },
  { id: 'kteo', label: 'ΚΤΕΟ', group: 'kteo' },
];

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
  onUpdateKteo,
}: ReportsData) {
  const [activeSection, setActiveSection] = useState<ReportSection>('income');
  const [filters, setFilters] = useState(initialFilters);
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
      <div className="sticky top-0 z-10 border-b border-white/[0.07] bg-black/30 px-6 py-5 backdrop-blur">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
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
          <nav className="flex gap-2 overflow-x-auto lg:flex-col">
            {sections.map((section, index) => {
              const startsNewGroup = index > 0 && section.group !== sections[index - 1].group;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`rounded-xl px-4 py-3 text-left text-sm transition ${
                    startsNewGroup ? 'ml-3 border-l border-white/[0.08] pl-5 lg:ml-0 lg:mt-3 lg:border-l-0 lg:border-t lg:pt-5' : ''
                  } ${
                    activeSection === section.id
                      ? 'border border-sky-400/20 bg-sky-400/10 text-white'
                      : 'border border-transparent text-zinc-400 hover:border-white/[0.06] hover:bg-white/[0.03] hover:text-zinc-200'
                  }`}
                >
                  {section.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-h-0 overflow-auto px-4 py-5">
          <div className="w-full max-w-none space-y-5">
            {activeSection === 'agencies' && (
              <AgenciesReport
                transactions={filteredTransactions}
                bookings={filteredBookings}
                agencies={agencies}
                representatives={representatives}
              />
            )}
            {activeSection === 'expenses' && <ExpensesReport transactions={filteredTransactions} />}
            {activeSection === 'income' && <IncomeReport transactions={filteredTransactions} />}
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
              />
            )}
            {activeSection === 'kteo' && (
              <KteoReport
                vehicles={vehicles}
                fromDate={filters.fromDate}
                toDate={filters.toDate}
                onUpdateKteo={onUpdateKteo}
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
    <label className="space-y-2 text-sm text-zinc-300">
      <span className="block text-xs text-zinc-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500"
      />
    </label>
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
    <label className="space-y-2 text-sm text-zinc-300">
      <span className="block text-xs text-zinc-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500"
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
