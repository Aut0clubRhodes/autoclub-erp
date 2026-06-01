'use client';

import { Fragment, useEffect, useState } from 'react';
import type { BookingRecord } from '@/lib/bookingsApi';
import type { DebtRecord } from '@/lib/debtsApi';
import type { ReportTransaction, ReportVehicle } from './types';

type CarsReportProps = {
  transactions: ReportTransaction[];
  bookings: BookingRecord[];
  vehicles: ReportVehicle[];
  debts: DebtRecord[];
  fromDate: string;
  toDate: string;
};

const money = (value: number) =>
  `€${value.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CarsReport({ transactions, vehicles, debts, fromDate, toDate }: CarsReportProps) {
  const [expandedCarId, setExpandedCarId] = useState<string | null>(null);
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
      const income = carTransactions
        .filter((transaction) => transaction.type === 'income')
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      const directExpenses = carTransactions
        .filter((transaction) => transaction.type === 'expense' && ['cash', 'card', 'bank'].includes(transaction.payment_method))
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      const yearlyDebts = debts
        .filter(
          (debt) =>
            debt.car_id &&
            String(debt.car_id) === vehicle.id &&
            debt.due_date &&
            (!fromDate || debt.due_date >= fromDate) &&
            (!toDate || debt.due_date <= toDate) &&
            Number(debt.remaining_amount || 0) > 0
        )
        .reduce((sum, debt) => sum + Number(debt.remaining_amount || 0), 0);
      const totalExpenses = directExpenses + generalExpensesPerCar;
      const net = income - totalExpenses;

      return {
        vehicle,
        income,
        directExpenses,
        totalExpenses,
        yearlyDebts,
        net,
        netAfterDebts: net - yearlyDebts,
        transactions: carTransactions,
      };
    })
    .filter((row) => row.transactions.length > 0 || row.yearlyDebts > 0)
    .sort((left, right) => right.net - left.net);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 sm:flex-row sm:items-end sm:justify-between">
        <label className="space-y-2 text-sm text-zinc-300">
          <span className="block">Αυτοκίνητα κατανομής γενικών εξόδων</span>
          <input
            type="number"
            min="1"
            value={allocationCarCount}
            onChange={(event) => setAllocationCarCount(Number(event.target.value))}
            className="w-40 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
          />
        </label>
        <p className="text-sm text-zinc-400">
          Γενικά έξοδα / αμάξι: <span className="text-zinc-200">{money(generalExpensesPerCar)}</span>
        </p>
      </div>

      <p className="text-sm text-zinc-400">
        Τα γενικά έξοδα επιχείρησης κατανέμονται ισόποσα στα αυτοκίνητα μόνο για σκοπούς αναφοράς.
      </p>

      <input
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder="Αναζήτηση αυτοκινήτου..."
        className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500"
      />

      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <table className="w-full min-w-[1280px] text-left">
          <thead className="bg-zinc-900/90">
            <tr>
              {[
                'Αυτοκίνητο',
                'Έσοδα',
                'Άμεσα Έξοδα',
                'Γενικά Έξοδα / Αμάξι',
                'Σύνολο Εξόδων',
                'Οφειλές Έτους',
                'Καθαρό',
                'Καθαρό Μετά Οφειλών',
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
            {rows.map(
              ({
                vehicle,
                income,
                directExpenses,
                totalExpenses,
                yearlyDebts,
                net,
                netAfterDebts,
                transactions: carTransactions,
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
                    <td className="px-4 py-4 text-sm text-zinc-200">{money(totalExpenses)}</td>
                    <td className="px-4 py-4 text-sm text-zinc-200">{money(yearlyDebts)}</td>
                    <td className={`px-4 py-4 text-sm ${net >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {money(net)}
                    </td>
                    <td
                      className={`px-4 py-4 text-sm ${
                        netAfterDebts >= 0 ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {money(netAfterDebts)}
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="border-t border-zinc-800 bg-zinc-950/80">
                      <td colSpan={8} className="p-4">
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
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-sm text-zinc-500">Δεν βρέθηκαν κινήσεις αυτοκινήτων.</p>}
      </div>
    </div>
  );
}
