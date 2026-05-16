'use client';

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

export default function FinanceExpenses({
  expenseTransactions,
  onAddExpense,
  onAddSupplierPayment,
  onEditExpense,
  onDeleteExpense,
}: FinanceExpensesProps) {
  const formatMoney = (value: number) =>
    `€${value.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('el-GR');
  };

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

      <div className="w-fit max-w-full overflow-x-auto rounded-3xl border border-zinc-800 bg-zinc-950/60">
        <table className="w-max min-w-[1170px] text-left">
          <colgroup>
            <col className="w-[95px]" />
            <col className="w-[170px]" />
            <col className="w-[95px]" />
            <col className="w-[120px]" />
            <col className="w-[150px]" />
            <col className="w-[110px]" />
            <col className="w-[120px]" />
            <col className="w-[120px]" />
            <col className="w-[170px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80">
              {['Ημερομηνία', 'Τύπος Κίνησης', 'Ποσό', 'Τρόπος Πληρωμής', 'Προμηθευτής', 'Αυτοκίνητο', 'Κατηγορία', 'Σημειώσεις', 'Ενέργειες'].map((label) => (
                <th key={label} className="px-3 py-3 text-xs font-medium text-zinc-400">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {expenseTransactions.map((transaction) => (
              <tr key={transaction.id} className="border-b border-zinc-800 hover:bg-zinc-900/60">
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
