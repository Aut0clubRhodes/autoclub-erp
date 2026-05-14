'use client';

type FinanceTransaction = {
  id: string;
  date: string;
  amount: number;
  payment_method: string;
  car_id: string;
  car_plate?: string;
  agency_id: string;
  representative_id: string;
  notes: string;
  contract_number?: string;
  agency?: string;
  representative?: string;
};

interface FinanceIncomeProps {
  incomeTransactions: FinanceTransaction[];
}

export default function FinanceIncome({ incomeTransactions }: FinanceIncomeProps) {
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
        <table className="min-w-[980px] w-full text-left">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80">
              <th className="px-4 py-3 text-sm text-zinc-400">Ημερομηνία</th>
              <th className="px-4 py-3 text-sm text-zinc-400">Συμβόλαιο</th>
              <th className="px-4 py-3 text-sm text-zinc-400">Ποσό</th>
              <th className="px-4 py-3 text-sm text-zinc-400">Τρόπος Πληρωμής</th>
              <th className="px-4 py-3 text-sm text-zinc-400">Αυτοκίνητο</th>
              <th className="px-4 py-3 text-sm text-zinc-400">Πρακτορείο</th>
              <th className="px-4 py-3 text-sm text-zinc-400">Αντιπρόσωπος</th>
              <th className="px-4 py-3 text-sm text-zinc-400">Σημειώσεις</th>
            </tr>
          </thead>
          <tbody>
            {incomeTransactions.map((transaction) => (
              <tr key={transaction.id} className="border-b border-zinc-800 hover:bg-zinc-900/60">
                <td className="px-4 py-4 text-sm text-zinc-200">{formatDate(transaction.date)}</td>
                <td className="px-4 py-4 text-sm text-zinc-200">{transaction.contract_number || '-'}</td>
                <td className="px-4 py-4 text-sm text-white">{formatMoney(transaction.amount)}</td>
                <td className="px-4 py-4 text-sm text-zinc-200">{formatPaymentMethod(transaction.payment_method)}</td>
                <td className="px-4 py-4 text-sm text-zinc-200">{transaction.car_plate || '-'}</td>
                <td className="px-4 py-4 text-sm text-zinc-200">{transaction.agency || formatRelatedValue('Πρακτορείο', transaction.agency_id)}</td>
                <td className="px-4 py-4 text-sm text-zinc-200">{transaction.representative || formatRelatedValue('Αντιπρόσωπος', transaction.representative_id)}</td>
                <td className="px-4 py-4 text-sm text-zinc-200">{transaction.notes || '-'}</td>
              </tr>
            ))}
            {incomeTransactions.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm text-zinc-400">
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
