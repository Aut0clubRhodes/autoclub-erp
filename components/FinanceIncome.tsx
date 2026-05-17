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
  supplier: string;
  category: string;
  notes: string;
  contract_number?: string;
  income_entry_id?: string;
  booking_id?: string;
  source?: string;
  agency?: string;
  representative?: string;
};

interface FinanceIncomeProps {
  incomeTransactions: FinanceTransaction[];
  onEditIncome: (transaction: FinanceTransaction) => void;
  onDeleteIncome: (transaction: FinanceTransaction) => void;
}

type IncomeSortKey =
  | 'date'
  | 'contract_number'
  | 'amount'
  | 'payment_method'
  | 'car_plate'
  | 'agency'
  | 'representative';

type SortDirection = 'asc' | 'desc';

export default function FinanceIncome({
  incomeTransactions,
  onEditIncome,
  onDeleteIncome,
}: FinanceIncomeProps) {
  const [sortKey, setSortKey] = useState<IncomeSortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const formatMoney = (value: number) =>
    `€${value.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('el-GR');
  };

  const formatPaymentMethod = (method: string) => {
    const paymentMethods: { [key: string]: string } = {
      cash: 'Μετρητά',
      card: 'Κάρτα',
      bank: 'Τράπεζα',
      credit: 'Επί Πιστώσει',
      other: 'Άλλο',
    };
    return paymentMethods[method] || '-';
  };

  const formatRelatedValue = (label: string, id: string) =>
    id ? `${label} #${id}` : '-';

  const sortedTransactions = useMemo(
    () =>
      [...incomeTransactions].sort((left, right) => {
        const comparison = compareIncomeTransactions(left, right, sortKey);
        return sortDirection === 'asc' ? comparison : -comparison;
      }),
    [incomeTransactions, sortDirection, sortKey]
  );

  const handleSort = (key: IncomeSortKey) => {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection('asc');
  };

  const headers: { label: string; key?: IncomeSortKey }[] = [
    { label: 'Ημερομηνία', key: 'date' },
    { label: 'Συμβόλαιο', key: 'contract_number' },
    { label: 'Ποσό', key: 'amount' },
    { label: 'Τρόπος Πληρωμής', key: 'payment_method' },
    { label: 'Αυτοκίνητο', key: 'car_plate' },
    { label: 'Πρακτορείο', key: 'agency' },
    { label: 'Αντιπρόσωπος', key: 'representative' },
    { label: 'Σημειώσεις' },
    { label: 'Ενέργειες' },
  ];
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-white">Έσοδα</h2>
        <p className="mt-1 text-sm text-zinc-500">Πλήρης λίστα καταχωρήσεων εσόδων.</p>
      </div>

      <div className="w-fit max-w-full overflow-x-auto rounded-3xl border border-white/[0.08] bg-black/20 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
        <table className="w-max min-w-[1090px] text-left">
          <colgroup>
            <col className="w-[95px]" />
            <col className="w-[110px]" />
            <col className="w-[95px]" />
            <col className="w-[130px]" />
            <col className="w-[120px]" />
            <col className="w-[120px]" />
            <col className="w-[130px]" />
            <col className="w-[120px]" />
            <col className="w-[170px]" />
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
                <td className="px-3 py-3.5 text-[13px] text-zinc-200">{transaction.contract_number || '-'}</td>
                <td className="px-3 py-3.5 text-[13px] font-medium text-white">{formatMoney(transaction.amount)}</td>
                <td className="px-3 py-3.5 text-[13px] text-zinc-200">{formatPaymentMethod(transaction.payment_method)}</td>
                <td className="px-3 py-3.5 text-[13px] text-zinc-200">{transaction.car_plate || '-'}</td>
                <td className="px-3 py-3.5 text-[13px] text-zinc-200">{transaction.agency || formatRelatedValue('Πρακτορείο', transaction.agency_id)}</td>
                <td className="px-3 py-3.5 text-[13px] text-zinc-200">{transaction.representative || formatRelatedValue('Αντιπρόσωπος', transaction.representative_id)}</td>
                <td className="whitespace-normal break-words px-3 py-3.5 text-[13px] text-zinc-200">{transaction.notes || '-'}</td>
                <td className="px-3 py-3.5 text-[13px] text-zinc-200">
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEditIncome(transaction)}
                      className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-[11px] text-zinc-200 hover:bg-zinc-900"
                    >
                      Επεξεργασία
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteIncome(transaction)}
                      className="rounded-lg border border-red-700 px-2.5 py-1.5 text-[11px] text-red-300 hover:bg-red-950/40"
                    >
                      Διαγραφή
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {incomeTransactions.length === 0 && (
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

function compareIncomeTransactions(
  left: FinanceTransaction,
  right: FinanceTransaction,
  key: IncomeSortKey
) {
  switch (key) {
    case 'date':
      return new Date(left.date).getTime() - new Date(right.date).getTime();
    case 'contract_number':
      return compareContracts(left.contract_number, right.contract_number);
    case 'amount':
      return Number(left.amount || 0) - Number(right.amount || 0);
    case 'payment_method':
      return compareText(left.payment_method, right.payment_method);
    case 'car_plate':
      return compareText(left.car_plate, right.car_plate);
    case 'agency':
      return compareText(left.agency || left.agency_id, right.agency || right.agency_id);
    case 'representative':
      return compareText(
        left.representative || left.representative_id,
        right.representative || right.representative_id
      );
  }
}

function compareContracts(left?: string, right?: string) {
  const leftNumeric = contractNumberValue(left);
  const rightNumeric = contractNumberValue(right);

  if (leftNumeric !== null && rightNumeric !== null && leftNumeric !== rightNumeric) {
    return leftNumeric - rightNumeric;
  }

  return compareText(left, right);
}

function contractNumberValue(value?: string) {
  const matches = String(value || '').match(/\d+/g);
  if (!matches?.length) return null;
  return Number(matches[matches.length - 1]);
}

function compareText(left?: string, right?: string) {
  return String(left || '').localeCompare(String(right || ''), 'el', { numeric: true });
}
