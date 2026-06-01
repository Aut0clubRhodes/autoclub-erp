'use client';

import { Fragment, useState } from 'react';
import type { ReportTransaction } from './types';

type ExpensesReportProps = {
  transactions: ReportTransaction[];
};

const months = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μάι', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπτ', 'Οκτ', 'Νοε', 'Δεκ'];

const money = (value: number) =>
  `€${value.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ExpensesReport({ transactions }: ExpensesReportProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const expenses = transactions.filter(
    (transaction) =>
      (transaction.type === 'expense' && ['cash', 'card', 'bank'].includes(transaction.payment_method)) ||
      transaction.type === 'supplier_payment'
  );
  const rows = Array.from(
    expenses.reduce((items, transaction) => {
      const category = getExpenseCategory(transaction);
      const monthIndex = getMonthIndex(transaction.date);
      const row = items.get(category) || {
        category,
        months: Array.from({ length: 12 }, () => 0),
        total: 0,
      };

      if (monthIndex >= 0) {
        row.months[monthIndex] += transaction.amount;
      }

      row.total += transaction.amount;
      items.set(category, row);
      return items;
    }, new Map<string, { category: string; months: number[]; total: number }>())
  )
    .map(([, row]) => row)
    .sort((left, right) => right.total - left.total);

  const totalsRow = rows.reduce(
    (totals, row) => ({
      months: totals.months.map((value, index) => value + row.months[index]),
      total: totals.total + row.total,
    }),
    { months: Array.from({ length: 12 }, () => 0), total: 0 }
  );

  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-800">
      <table className="w-full min-w-[1080px] border-separate border-spacing-y-1 text-left">
        <colgroup>
          <col className="w-[220px]" />
          {months.map((month) => (
            <col key={`expense-col-${month}`} className="w-[68px]" />
          ))}
          <col className="w-[96px]" />
        </colgroup>
        <thead>
          <tr className="bg-zinc-900/95">
            <th className="px-3 py-2.5 text-sm text-zinc-400">Κατηγορία</th>
            {months.map((month) => (
              <th key={month} className="px-2 py-2.5 text-center text-xs text-zinc-400">
                {month}
              </th>
            ))}
            <th className="px-3 py-2.5 text-right text-sm font-semibold text-white">Σύνολο</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const details = expenses
              .filter((transaction) => getExpenseCategory(transaction) === row.category)
              .sort((left, right) => right.date.localeCompare(left.date));
            const expanded = expandedCategory === row.category;

            return (
              <Fragment key={row.category}>
                <tr
                  onClick={() => setExpandedCategory(expanded ? null : row.category)}
                  className="cursor-pointer bg-zinc-950 transition hover:bg-zinc-900/70"
                >
                  <td className="px-3 py-3 text-sm font-medium text-white">{row.category}</td>
                  {row.months.map((value, index) => (
                    <td key={`${row.category}-${months[index]}`} className="px-2 py-3 text-right text-xs text-zinc-200">
                      {money(value)}
                    </td>
                  ))}
                  <td className="bg-zinc-900/70 px-3 py-3 text-right text-sm font-semibold text-white">
                    {money(row.total)}
                  </td>
                </tr>
                {expanded && (
                  <tr className="bg-zinc-950/80">
                    <td colSpan={14} className="p-4">
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
          {rows.length > 0 && (
            <tr className="bg-rose-400/[0.08]">
              <td className="px-3 py-3 text-sm font-semibold text-white">Σύνολο</td>
              {totalsRow.months.map((value, index) => (
                <td key={`expense-total-${months[index]}`} className="px-2 py-3 text-right text-xs font-semibold text-rose-100">
                  {money(value)}
                </td>
              ))}
              <td className="bg-rose-400/[0.12] px-3 py-3 text-right text-sm font-semibold text-white">
                {money(totalsRow.total)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {rows.length === 0 && <p className="p-6 text-sm text-zinc-500">Δεν βρέθηκαν έξοδα.</p>}
    </div>
  );
}

function getMonthIndex(date: string) {
  const month = Number(date?.slice(5, 7));
  return Number.isFinite(month) && month >= 1 && month <= 12 ? month - 1 : -1;
}

function getExpenseCategory(transaction: ReportTransaction) {
  if (transaction.type === 'supplier_payment') {
    return 'Πληρωμές Προμηθευτών';
  }

  return transaction.category || 'Χωρίς Κατηγορία';
}
