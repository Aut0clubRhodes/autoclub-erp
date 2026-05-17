'use client';

import { useMemo, useState } from 'react';

type FinanceTransaction = {
  id: string;
  date: string;
  amount: number;
  payment_method: string;
  type: string;
  car_id: string;
  car_plate: string;
  agency_id: string;
  representative_id: string;
  supplier_id?: number | null;
  supplier: string;
  supplier_name?: string;
  category: string;
  notes: string;
  contract_number?: string;
  income_entry_id?: string;
  booking_id?: string;
  source?: string;
  agency?: string;
  representative?: string;
};

interface FinanceExpensesProps {
  expenseTransactions: FinanceTransaction[];
  onAddExpense: () => void;
  onAddSupplierPayment: () => void;
  onEditExpense: (transaction: FinanceTransaction) => void;
  onDeleteExpense: (transaction: FinanceTransaction) => void;
}

type ExpenseSortKey =
  | 'date'
  | 'amount'
  | 'payment_method'
  | 'supplier_name'
  | 'car_plate'
  | 'category';

type SortDirection = 'asc' | 'desc';

export default function FinanceExpenses({
  expenseTransactions,
  onAddExpense,
  onAddSupplierPayment,
  onEditExpense,
  onDeleteExpense,
}: FinanceExpensesProps) {
  const [sortKey, setSortKey] = useState<ExpenseSortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const formatMoney = (value: number) =>
    `€${value.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('el-GR');
  };

  const sortedTransactions = useMemo(
    () =>
      [...expenseTransactions].sort((left, right) => {
        const comparison = compareExpenseTransactions(left, right, sortKey);
        return sortDirection === 'asc' ? comparison : -comparison;
      }),
    [expenseTransactions, sortDirection, sortKey]
  );

  const handleSort = (key: ExpenseSortKey) => {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection('asc');
  };

  const headers: { label: string; key?: ExpenseSortKey }[] = [
    { label: 'Ημερομηνία', key: 'date' },
    { label: 'Τύπος Κίνησης' },
    { label: 'Ποσό', key: 'amount' },
    { label: 'Τρόπος Πληρωμής', key: 'payment_method' },
    { label: 'Προμηθευτής', key: 'supplier_name' },
    { label: 'Αυτοκίνητο', key: 'car_plate' },
    { label: 'Κατηγορία', key: 'category' },
    { label: 'Σημειώσεις' },
    { label: 'Ενέργειες' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Έξοδα</h2>
          <p className="mt-1 text-sm text-zinc-500">Πλήρης λίστα εξόδων και πληρωμών προμηθευτών.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onAddExpense}
            className="rounded-2xl border border-rose-600 bg-rose-600/10 px-4 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-600/20"
          >
            + Καταχώρηση Εξόδου
          </button>
          <button
            type="button"
            onClick={onAddSupplierPayment}
            className="rounded-2xl border border-rose-600 bg-rose-600/10 px-4 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-600/20"
          >
            Πληρωμή Προμηθευτή
          </button>
        </div>
      </div>

      <div className="w-fit max-w-full overflow-x-auto rounded-3xl border border-white/[0.08] bg-black/20 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
        <table className="w-max min-w-[1130px] text-left">
          <colgroup>
            <col className="w-[95px]" />
            <col className="w-[168px]" />
            <col className="w-[95px]" />
            <col className="w-[120px]" />
            <col className="w-[145px]" />
            <col className="w-[105px]" />
            <col className="w-[115px]" />
            <col className="w-[112px]" />
            <col className="w-[160px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.03]">
              {headers.map(({ label, key }) => (
                <th key={label} className="px-3 py-3 text-xs font-medium text-zinc-400">
                  {key ? (
                    <button
                      type="button"
                      onClick={() => handleSort(key)}
                      className="inline-flex items-center gap-1 cursor-pointer transition hover:text-zinc-200"
                    >
                      <span>{label}</span>
                      {sortKey === key && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                    </button>
                  ) : (
                    label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.map((transaction) => (
              <tr key={transaction.id} className="border-b border-white/[0.05] hover:bg-white/[0.03]">
                <td className="px-3 py-3.5 text-[13px] text-zinc-200">{formatDate(transaction.date)}</td>
                <td className="whitespace-nowrap px-3 py-3.5 text-[13px] text-zinc-200">
                  <span
                    className={
                      transaction.type === 'supplier_payment'
                        ? 'rounded-full border border-sky-700 bg-sky-950/40 px-2.5 py-1 text-[11px] text-sky-200'
                        : ''
                    }
                  >
                    {transaction.type === 'supplier_payment' ? 'Πληρωμή Προμηθευτή' : 'Έξοδο'}
                  </span>
                </td>
                <td className="px-3 py-3.5 text-[13px] font-medium text-white">{formatMoney(transaction.amount)}</td>
                <td className="px-3 py-3.5 text-[13px] text-zinc-200">{transaction.payment_method || '-'}</td>
                <td className="px-3 py-3.5 text-[13px] text-zinc-200">{transaction.supplier_name || '-'}</td>
                <td className="px-3 py-3.5 text-[13px] text-zinc-200">
                  {transaction.type === 'supplier_payment' ? '-' : transaction.car_plate || '-'}
                </td>
                <td className="px-3 py-3.5 text-[13px] text-zinc-200">
                  {transaction.type === 'supplier_payment' ? '-' : transaction.category || '-'}
                </td>
                <td className="whitespace-normal break-words px-3 py-3.5 text-[13px] text-zinc-200">{transaction.notes || '-'}</td>
                <td className="px-3 py-3.5 text-[13px] text-zinc-200">
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEditExpense(transaction)}
                      className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-[11px] text-zinc-200 hover:bg-zinc-900"
                    >
                      Επεξεργασία
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteExpense(transaction)}
                      className="rounded-lg border border-red-700 px-2.5 py-1.5 text-[11px] text-red-300 hover:bg-red-950/40"
                    >
                      Διαγραφή
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {expenseTransactions.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-sm text-zinc-400">
                  Δεν βρέθηκαν συναλλαγές.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function compareExpenseTransactions(
  left: FinanceTransaction,
  right: FinanceTransaction,
  key: ExpenseSortKey
) {
  switch (key) {
    case 'date':
      return new Date(left.date).getTime() - new Date(right.date).getTime();
    case 'amount':
      return Number(left.amount || 0) - Number(right.amount || 0);
    case 'payment_method':
      return compareText(left.payment_method, right.payment_method);
    case 'supplier_name':
      return compareText(left.supplier_name, right.supplier_name);
    case 'car_plate':
      return compareText(left.car_plate, right.car_plate);
    case 'category':
      return compareText(left.category, right.category);
  }
}

function compareText(left?: string, right?: string) {
  return String(left || '').localeCompare(String(right || ''), 'el', { numeric: true });
}
