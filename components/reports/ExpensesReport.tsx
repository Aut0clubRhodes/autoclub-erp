'use client';

import { Fragment, useState } from 'react';
import type { ReportTransaction } from './types';

type ExpensesReportProps = {
  transactions: ReportTransaction[];
};

const money = (value: number) =>
  `€${value.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ExpensesReport({ transactions }: ExpensesReportProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const expenses = transactions.filter((transaction) => transaction.type === 'expense');
  const categories = Array.from(
    expenses.reduce((rows, transaction) => {
      const category = transaction.category || 'Χωρίς Κατηγορία';
      rows.set(category, (rows.get(category) || 0) + transaction.amount);
      return rows;
    }, new Map<string, number>())
  ).sort((left, right) => right[1] - left[1]);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800">
      <table className="w-full min-w-[720px] text-left">
        <thead className="bg-zinc-900/90">
          <tr>
            <th className="px-4 py-3 text-sm text-zinc-400">Κατηγορία</th>
            <th className="px-4 py-3 text-sm text-zinc-400">Σύνολο</th>
          </tr>
        </thead>
        <tbody>
          {categories.map(([category, total]) => {
            const details = expenses
              .filter((transaction) => (transaction.category || 'Χωρίς Κατηγορία') === category)
              .sort((left, right) => right.date.localeCompare(left.date));
            const expanded = expandedCategory === category;

            return (
              <Fragment key={category}>
                <tr
                  onClick={() => setExpandedCategory(expanded ? null : category)}
                  className="cursor-pointer border-t border-zinc-800 hover:bg-zinc-900/60"
                >
                  <td className="px-4 py-4 text-sm text-white">{category}</td>
                  <td className="px-4 py-4 text-sm text-zinc-200">{money(total)}</td>
                </tr>
                {expanded && (
                  <tr className="border-t border-zinc-800 bg-zinc-950/80">
                    <td colSpan={2} className="p-4">
                      <div className="overflow-hidden rounded-2xl border border-zinc-800">
                        <table className="w-full text-left">
                          <thead className="bg-zinc-900/70">
                            <tr>
                              <th className="px-4 py-3 text-sm text-zinc-400">Ημερομηνία</th>
                              <th className="px-4 py-3 text-sm text-zinc-400">Ποσό</th>
                              <th className="px-4 py-3 text-sm text-zinc-400">Supplier</th>
                              <th className="px-4 py-3 text-sm text-zinc-400">Car</th>
                              <th className="px-4 py-3 text-sm text-zinc-400">Payment</th>
                              <th className="px-4 py-3 text-sm text-zinc-400">Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {details.map((transaction) => (
                              <tr key={transaction.id} className="border-t border-zinc-800">
                                <td className="px-4 py-3 text-sm text-zinc-200">{transaction.date}</td>
                                <td className="px-4 py-3 text-sm text-zinc-200">{money(transaction.amount)}</td>
                                <td className="px-4 py-3 text-sm text-zinc-200">{transaction.supplier_name || '-'}</td>
                                <td className="px-4 py-3 text-sm text-zinc-200">{transaction.car_plate || '-'}</td>
                                <td className="px-4 py-3 text-sm text-zinc-200">{transaction.payment_method || '-'}</td>
                                <td className="px-4 py-3 text-sm text-zinc-200">{transaction.notes || '-'}</td>
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
      {categories.length === 0 && <p className="p-6 text-sm text-zinc-500">Δεν βρέθηκαν έξοδα.</p>}
    </div>
  );
}
