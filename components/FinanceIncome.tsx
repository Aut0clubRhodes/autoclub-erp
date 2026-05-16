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

export default function FinanceIncome({
  incomeTransactions,
  onEditIncome,
  onDeleteIncome,
}: FinanceIncomeProps) {
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
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-white">Έσοδα</h2>
        <p className="mt-1 text-sm text-zinc-500">Πλήρης λίστα καταχωρήσεων εσόδων.</p>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-zinc-800 bg-zinc-950/60">
        <table className="w-full min-w-[920px] text-left">
          <colgroup>
            <col className="w-[92px]" />
            <col className="w-[105px]" />
            <col className="w-[94px]" />
            <col className="w-[120px]" />
            <col className="w-[95px]" />
            <col className="w-[120px]" />
            <col className="w-[125px]" />
            <col />
            <col className="w-[150px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80">
              {['Ημερομηνία', 'Συμβόλαιο', 'Ποσό', 'Τρόπος Πληρωμής', 'Αυτοκίνητο', 'Πρακτορείο', 'Αντιπρόσωπος', 'Σημειώσεις', 'Ενέργειες'].map((label) => (
                <th key={label} className="px-3 py-3 text-xs font-medium text-zinc-400">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {incomeTransactions.map((transaction) => (
              <tr key={transaction.id} className="border-b border-zinc-800 hover:bg-zinc-900/60">
                <td className="px-3 py-3 text-xs text-zinc-200">{formatDate(transaction.date)}</td>
                <td className="px-3 py-3 text-xs text-zinc-200">{transaction.contract_number || '-'}</td>
                <td className="px-3 py-3 text-xs font-medium text-white">{formatMoney(transaction.amount)}</td>
                <td className="px-3 py-3 text-xs text-zinc-200">{formatPaymentMethod(transaction.payment_method)}</td>
                <td className="px-3 py-3 text-xs text-zinc-200">{transaction.car_plate || '-'}</td>
                <td className="px-3 py-3 text-xs text-zinc-200">{transaction.agency || formatRelatedValue('Πρακτορείο', transaction.agency_id)}</td>
                <td className="px-3 py-3 text-xs text-zinc-200">{transaction.representative || formatRelatedValue('Αντιπρόσωπος', transaction.representative_id)}</td>
                <td className="whitespace-normal break-words px-3 py-3 text-xs text-zinc-200">{transaction.notes || '-'}</td>
                <td className="px-3 py-3 text-xs text-zinc-200">
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
