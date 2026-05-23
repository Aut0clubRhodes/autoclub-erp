'use client';

import type { ReportTransaction } from './types';

type IncomeReportProps = {
  transactions: ReportTransaction[];
};

type IncomeSource = 'rental' | 'leasing' | 'car_sale' | 'other';

const months = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μάι', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπτ', 'Οκτ', 'Νοε', 'Δεκ'];

const sources: { id: IncomeSource; label: string }[] = [
  { id: 'rental', label: 'Έσοδα από Ενοικιάσεις' },
  { id: 'leasing', label: 'Έσοδα από Leasing' },
  { id: 'car_sale', label: 'Έσοδα από Πωλήσεις' },
  { id: 'other', label: 'Λοιπά Έσοδα' },
];

const money = (value: number) =>
  `€${value.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function IncomeReport({ transactions }: IncomeReportProps) {
  const incomeTransactions = transactions.filter((transaction) => transaction.type === 'income');
  const rows = sources.map((source) => {
    const sourceTransactions = incomeTransactions.filter((transaction) => getIncomeSource(transaction) === source.id);
    const monthlyTotals = Array.from({ length: 12 }, (_, index) =>
      sourceTransactions
        .filter((transaction) => getMonthIndex(transaction.date) === index)
        .reduce((sum, transaction) => sum + transaction.amount, 0)
    );
    const total = monthlyTotals.reduce((sum, value) => sum + value, 0);

    return {
      ...source,
      months: monthlyTotals,
      total,
    };
  });

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
            <col key={`col-${month}`} className="w-[68px]" />
          ))}
          <col className="w-[96px]" />
        </colgroup>
        <thead>
          <tr className="bg-zinc-900/95">
            <th className="px-3 py-2.5 text-sm text-zinc-400">Πηγή</th>
            {months.map((month) => (
              <th key={month} className="px-2 py-2.5 text-center text-xs text-zinc-400">
                {month}
              </th>
            ))}
            <th className="px-3 py-2.5 text-right text-sm font-semibold text-white">Σύνολο</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="bg-zinc-950 hover:bg-zinc-900/70">
              <td className="px-3 py-3 text-sm font-medium text-white">{row.label}</td>
              {row.months.map((value, index) => (
                <td key={`${row.id}-${months[index]}`} className="px-2 py-3 text-right text-xs text-zinc-200">
                  {money(value)}
                </td>
              ))}
              <td className="bg-zinc-900/70 px-3 py-3 text-right text-sm font-semibold text-white">
                {money(row.total)}
              </td>
            </tr>
          ))}
          <tr className="bg-sky-400/[0.08]">
            <td className="px-3 py-3 text-sm font-semibold text-white">Σύνολο</td>
            {totalsRow.months.map((value, index) => (
              <td key={`total-${months[index]}`} className="px-2 py-3 text-right text-xs font-semibold text-sky-100">
                {money(value)}
              </td>
            ))}
            <td className="bg-sky-400/[0.12] px-3 py-3 text-right text-sm font-semibold text-white">
              {money(totalsRow.total)}
            </td>
          </tr>
        </tbody>
      </table>
      {incomeTransactions.length === 0 && <p className="p-6 text-sm text-zinc-500">Δεν βρέθηκαν έσοδα.</p>}
    </div>
  );
}

function getMonthIndex(date: string) {
  const month = Number(date?.slice(5, 7));
  return Number.isFinite(month) && month >= 1 && month <= 12 ? month - 1 : -1;
}

function getIncomeSource(transaction: ReportTransaction): IncomeSource {
  const source = String(transaction.source || '').toLowerCase();
  const category = String(transaction.category || '').toLowerCase();
  const notes = String(transaction.notes || '').toLowerCase();
  const contractNumber = String(transaction.contract_number || '').toLowerCase();

  if (source === 'leasing' || category === 'leasing' || source.includes('leasing') || category.includes('leasing')) {
    return 'leasing';
  }

  if (source === 'rental' || category === 'rental' || source === 'booking' || transaction.booking_id) {
    return 'rental';
  }

  if (source === 'car_sale' || category === 'car_sale') {
    return 'car_sale';
  }

  if (notes.includes('leasing') || contractNumber.includes('leasing')) {
    return 'leasing';
  }

  return 'other';
}
