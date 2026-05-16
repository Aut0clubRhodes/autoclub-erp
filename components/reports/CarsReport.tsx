'use client';

import { Fragment, useState } from 'react';
import type { BookingRecord } from '@/lib/bookingsApi';
import type { ReportTransaction, ReportVehicle } from './types';

type CarsReportProps = {
  transactions: ReportTransaction[];
  bookings: BookingRecord[];
  vehicles: ReportVehicle[];
};

const money = (value: number) =>
  `€${value.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CarsReport({ transactions, vehicles }: CarsReportProps) {
  const [expandedCarId, setExpandedCarId] = useState<string | null>(null);
  const rows = vehicles
    .map((vehicle) => {
      const carTransactions = transactions.filter(
        (transaction) => transaction.car_id && String(transaction.car_id) === vehicle.id
      );
      // TODO: General business expenses without car_id must later be split across active fleet count:
      // general expense / number of cars = allocated overhead per car.
      const income = carTransactions
        .filter((transaction) => transaction.type === 'income')
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      const expenses = carTransactions
        .filter((transaction) => transaction.type === 'expense')
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      return { vehicle, income, expenses, net: income - expenses, transactions: carTransactions };
    })
    .filter((row) => row.transactions.length > 0)
    .sort((left, right) => right.net - left.net);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800">
      <table className="w-full min-w-[760px] text-left">
        <thead className="bg-zinc-900/90">
          <tr>
            <th className="px-4 py-3 text-sm text-zinc-400">Αυτοκίνητο</th>
            <th className="px-4 py-3 text-sm text-zinc-400">Έσοδα</th>
            <th className="px-4 py-3 text-sm text-zinc-400">Έξοδα</th>
            <th className="px-4 py-3 text-sm text-zinc-400">Καθαρό</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ vehicle, income, expenses, net, transactions: carTransactions }) => {
            const expanded = expandedCarId === vehicle.id;
            return (
              <Fragment key={vehicle.id}>
                <tr
                  onClick={() => setExpandedCarId(expanded ? null : vehicle.id)}
                  className="cursor-pointer border-t border-zinc-800 hover:bg-zinc-900/60"
                >
                  <td className="px-4 py-4 text-sm text-white">{vehicle.plate}</td>
                  <td className="px-4 py-4 text-sm text-zinc-200">{money(income)}</td>
                  <td className="px-4 py-4 text-sm text-zinc-200">{money(expenses)}</td>
                  <td className={`px-4 py-4 text-sm ${net >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {money(net)}
                  </td>
                </tr>
                {expanded && (
                  <tr className="border-t border-zinc-800 bg-zinc-950/80">
                    <td colSpan={4} className="p-4">
                      <div className="overflow-hidden rounded-2xl border border-zinc-800">
                        <table className="w-full text-left">
                          <thead className="bg-zinc-900/70">
                            <tr>
                              <th className="px-4 py-3 text-sm text-zinc-400">Ημερομηνία</th>
                              <th className="px-4 py-3 text-sm text-zinc-400">Τύπος</th>
                              <th className="px-4 py-3 text-sm text-zinc-400">Ποσό</th>
                              <th className="px-4 py-3 text-sm text-zinc-400">Πληροφορία</th>
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
  );
}
