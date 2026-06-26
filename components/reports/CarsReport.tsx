'use client';

import { Fragment, useEffect, useState } from 'react';
import type { BookingRecord } from '@/lib/bookingsApi';
import type { DebtRecord } from '@/lib/debtsApi';
import type {
  ServiceInventoryItem,
  ServiceInventoryMovement,
} from '@/lib/serviceInventoryApi';
import type { ServiceRecord } from '@/lib/servicesApi';
import type { ReportTransaction, ReportVehicle } from './types';
import { calculateVehicleDepreciationAmount } from './depreciationUtils';

type CarsReportProps = {
  transactions: ReportTransaction[];
  bookings: BookingRecord[];
  vehicles: ReportVehicle[];
  debts: DebtRecord[];
  inventoryItems: ServiceInventoryItem[];
  inventoryMovements: ServiceInventoryMovement[];
  services: ServiceRecord[];
  fromDate: string;
  toDate: string;
  depreciationYear: number;
};

const money = (value: number) =>
  `€${value.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

function isDebtOrFinancingExpense(transaction: ReportTransaction) {
  const searchableText = [
    transaction.type,
    transaction.source,
    transaction.category,
    transaction.notes,
    transaction.supplier_name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('el-GR');

  return [
    'debt_payment',
    'γραμμάτιο',
    'γραμμάτια',
    'debt installment',
    'loan installment',
    'leasing installment',
    'vehicle purchase financing',
    'δόση',
    'δάνειο',
    'χρηματοδότηση',
    'αγορά οχήματος',
  ].some((term) => searchableText.includes(term));
}

export default function CarsReport({
  transactions,
  vehicles,
  inventoryItems,
  inventoryMovements,
  services,
  fromDate,
  toDate,
  depreciationYear,
}: CarsReportProps) {
  const [expandedCarId, setExpandedCarId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [allocationCarCount, setAllocationCarCount] = useState(vehicles.length);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setAllocationCarCount((current) => (current === 0 ? vehicles.length : current));
  }, [vehicles.length]);

  const totalGeneralBusinessExpenses = transactions
    .filter(
      (transaction) =>
        transaction.type === 'expense' &&
        !transaction.car_id &&
        ['cash', 'card', 'bank'].includes(transaction.payment_method)
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const generalExpensesPerCar =
    allocationCarCount > 0 ? totalGeneralBusinessExpenses / allocationCarCount : 0;
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const rows = vehicles
    .filter((vehicle) =>
      [vehicle.plate, vehicle.brand, vehicle.model].some((value) =>
        value.toLowerCase().includes(normalizedSearch)
      )
    )
    .map((vehicle) => {
      const carTransactions = transactions.filter(
        (transaction) => transaction.car_id && String(transaction.car_id) === vehicle.id
      );
      const accountingCarTransactions = carTransactions.filter(
        (transaction) => transaction.type !== 'expense' || !isDebtOrFinancingExpense(transaction)
      );
      const carInventoryUsages = inventoryMovements
        .filter(
          (movement) =>
            movement.movement_type === 'usage' &&
            movement.car_id &&
            String(movement.car_id) === vehicle.id
        )
        .map((movement) => {
          const linkedService = services.find(
            (service) => Number(service.id) === Number(movement.service_id)
          );
          const item = inventoryItems.find(
            (inventoryItem) => Number(inventoryItem.id) === Number(movement.item_id)
          );

          return {
            ...movement,
            date: linkedService?.service_date || movement.created_at?.slice(0, 10) || '',
            itemName: item?.name || movement.notes || `Item #${movement.item_id}`,
          };
        })
        .filter(
          (movement) =>
            (!fromDate || !movement.date || movement.date >= fromDate) &&
            (!toDate || !movement.date || movement.date <= toDate)
        );
      const income = accountingCarTransactions
        .filter((transaction) => transaction.type === 'income')
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      const transactionDirectExpenses = accountingCarTransactions
        .filter((transaction) => transaction.type === 'expense' && ['cash', 'card', 'bank'].includes(transaction.payment_method))
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      const inventoryUsageExpenses = carInventoryUsages.reduce(
        (sum, movement) => sum + Number(movement.total_cost || 0),
        0
      );
      const directExpenses = transactionDirectExpenses + inventoryUsageExpenses;
      const depreciation = calculateVehicleDepreciationAmount(vehicle, vehicles, depreciationYear);
      const totalExpenses = directExpenses + generalExpensesPerCar + depreciation;
      const net = income - totalExpenses;

      return {
        vehicle,
        income,
        directExpenses,
        depreciation,
        totalExpenses,
        net,
        transactions: accountingCarTransactions,
        inventoryUsages: carInventoryUsages,
      };
    })
    .sort((left, right) => right.net - left.net);
  const groupedRows = rows.reduce<Array<{ category: string; rows: typeof rows }>>((groups, row) => {
    const category = normalizeVehicleGroup(row.vehicle.category);
    const existingGroup = groups.find((group) => group.category === category);

    if (existingGroup) {
      existingGroup.rows.push(row);
      return groups;
    }

    return [...groups, { category, rows: [row] }];
  }, []);

  groupedRows.sort((left, right) => {
    const leftIndex = getVehicleGroupSortIndex(left.category);
    const rightIndex = getVehicleGroupSortIndex(right.category);

    if (leftIndex !== rightIndex) return leftIndex - rightIndex;
    return left.category.localeCompare(right.category, 'el');
  });
  groupedRows.forEach((group) => {
    group.rows.sort((left, right) => left.vehicle.plate.localeCompare(right.vehicle.plate, 'el', { numeric: true }));
  });
  const summary = rows.reduce(
    (totals, row) => ({
      income: totals.income + row.income,
      directExpenses: totals.directExpenses + row.directExpenses,
      generalExpenses: totals.generalExpenses + generalExpensesPerCar,
      depreciation: totals.depreciation + row.depreciation,
    }),
    { income: 0, directExpenses: 0, generalExpenses: 0, depreciation: 0 }
  );
  const summaryNet =
    summary.income - summary.directExpenses - summary.generalExpenses - summary.depreciation;

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
    <div className="space-y-3">
      <div className="grid gap-2.5 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryMetric label="Συνολικά Έσοδα" value={summary.income} />
        <SummaryMetric label="Συνολικά Άμεσα Έξοδα" value={summary.directExpenses} />
        <SummaryMetric label="Συνολικά Γενικά Έξοδα" value={summary.generalExpenses} />
        <SummaryMetric label="Συνολικές Αποσβέσεις" value={summary.depreciation} />
        <SummaryMetric label="Συνολικό Κέρδος / Ζημία" value={summaryNet} signed />
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 lg:flex-row lg:items-center">
        <label className="flex flex-col gap-1 text-sm text-zinc-300 sm:flex-row sm:items-center sm:gap-2.5">
          <span className="shrink-0">Αυτοκίνητα κατανομής γενικών εξόδων</span>
          <input
            type="number"
            min="1"
            value={allocationCarCount}
            onChange={(event) => setAllocationCarCount(Number(event.target.value))}
            className="w-28 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
          />
        </label>
        <p className="shrink-0 text-sm text-zinc-400 lg:ml-auto">
          Γενικά έξοδα / αμάξι: <span className="text-zinc-200">{money(generalExpensesPerCar)}</span>
        </p>
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Αναζήτηση αυτοκινήτου..."
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm text-white outline-none focus:border-sky-500 lg:max-w-sm"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <table className="w-full min-w-[1120px] text-left">
          <thead className="bg-zinc-900/90">
            <tr>
              {[
                'Αυτοκίνητο',
                'Έσοδα',
                'Άμεσα Έξοδα',
                'Γενικά Έξοδα / Αμάξι',
                'Αποσβέσεις',
                'Σύνολο Εξόδων',
                'Κέρδος / Ζημία',
              ].map(
                (label) => (
                  <th key={label} className="px-4 py-3 text-sm text-zinc-400">
                    {label}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {groupedRows.map((group) => (
              <Fragment key={group.category}>
                <tr className="border-t border-zinc-700/70 bg-zinc-900/70">
                  <td colSpan={7} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-zinc-300">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.category)}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <span>{formatVehicleGroupLabel(group.category)} ({group.rows.length})</span>
                      <span className="text-zinc-500">{collapsedGroups.has(group.category) ? '+' : '−'}</span>
                    </button>
                  </td>
                </tr>
                {!collapsedGroups.has(group.category) && group.rows.map(
                  ({
                    vehicle,
                    income,
                    directExpenses,
                    depreciation,
                    totalExpenses,
                    net,
                    transactions: carTransactions,
                    inventoryUsages: carInventoryUsages,
                  }) => {
                    const expanded = expandedCarId === vehicle.id;
                    return (
                      <Fragment key={vehicle.id}>
                        <tr
                          onClick={() => setExpandedCarId(expanded ? null : vehicle.id)}
                          className="cursor-pointer border-t border-zinc-800 hover:bg-zinc-900/60"
                        >
                          <td className="px-4 py-4 text-sm text-white">{vehicle.plate}</td>
                          <td className="px-4 py-4 text-sm text-zinc-200">{money(income)}</td>
                          <td className="px-4 py-4 text-sm text-zinc-200">{money(directExpenses)}</td>
                          <td className="px-4 py-4 text-sm text-zinc-200">{money(generalExpensesPerCar)}</td>
                          <td className="px-4 py-4 text-sm text-zinc-200">{money(depreciation)}</td>
                          <td className="px-4 py-4 text-sm text-zinc-200">{money(totalExpenses)}</td>
                          <td className={`px-4 py-4 text-sm ${net >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {money(net)}
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="border-t border-zinc-800 bg-zinc-950/80">
                            <td colSpan={7} className="p-4">
                        <div className="overflow-hidden rounded-2xl border border-zinc-800">
                          <table className="w-full text-left">
                            <thead className="bg-zinc-900/70">
                              <tr>
                                {['Ημερομηνία', 'Τύπος', 'Ποσό', 'Πληροφορία'].map((label) => (
                                  <th key={label} className="px-4 py-3 text-sm text-zinc-400">
                                    {label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {carInventoryUsages
                                .slice()
                                .sort((left, right) => right.date.localeCompare(left.date))
                                .map((movement) => (
                                  <tr
                                    key={`inventory-usage-${movement.id}`}
                                    className="border-t border-zinc-800"
                                  >
                                    <td className="px-4 py-3 text-sm text-zinc-200">
                                      {movement.date || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-zinc-200">
                                      Ανάλωση Αποθήκης
                                    </td>
                                    <td className="px-4 py-3 text-sm text-zinc-200">
                                      {money(Number(movement.total_cost || 0))}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-zinc-200">
                                      {movement.itemName} · {movement.quantity} ×{' '}
                                      {money(Number(movement.unit_cost || 0))}
                                    </td>
                                  </tr>
                                ))}
                              {carTransactions
                                .slice()
                                .sort((left, right) => right.date.localeCompare(left.date))
                                .map((transaction) => (
                                  <tr key={transaction.id} className="border-t border-zinc-800">
                                    <td className="px-4 py-3 text-sm text-zinc-200">{transaction.date}</td>
                                    <td className="px-4 py-3 text-sm text-zinc-200">
                                      {transaction.type === 'income' ? 'Έσοδο' : 'Έξοδο'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-zinc-200">{money(transaction.amount)}</td>
                                    <td className="px-4 py-3 text-sm text-zinc-200">
                                      {transaction.type === 'income'
                                        ? transaction.contract_number || transaction.notes || '-'
                                        : transaction.category || transaction.supplier_name || transaction.notes || '-'}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                        )}
                      </Fragment>
                    );
                  }
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-sm text-zinc-500">Δεν βρέθηκαν κινήσεις αυτοκινήτων.</p>}
      </div>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  signed = false,
}: {
  label: string;
  value: number;
  signed?: boolean;
}) {
  const tone = value >= 0 ? 'text-emerald-300' : 'text-rose-300';
  const displayValue = signed && value > 0 ? `+${money(value)}` : money(value);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-sm font-bold ${signed ? tone : 'text-zinc-100'}`}>
        {displayValue}
      </p>
    </div>
  );
}
