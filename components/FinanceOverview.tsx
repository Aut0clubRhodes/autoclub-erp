'use client';

interface FinanceOverviewProps {
  fromDate: string;
  toDate: string;
  setFromDate: (value: string) => void;
  setToDate: (value: string) => void;
  totalIncome: number;
  totalIncomeCash: number;
  totalIncomeCard: number;
  totalIncomeBank: number;
  totalPaidExpenses: number;
  totalExpensesCash: number;
  totalExpensesCard: number;
  totalExpensesBank: number;
  totalSupplierPayments: number;
  totalSupplierCredits: number;
  netTotal: number;
}

export default function FinanceOverview({
  fromDate,
  toDate,
  setFromDate,
  setToDate,
  totalIncome,
  totalIncomeCash,
  totalIncomeCard,
  totalIncomeBank,
  totalPaidExpenses,
  totalExpensesCash,
  totalExpensesCard,
  totalExpensesBank,
  totalSupplierPayments,
  totalSupplierCredits,
  netTotal,
}: FinanceOverviewProps) {
  const formatMoney = (value: number) =>
    `€${value.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Φίλτρο Ημερομηνίας</h2>
            <p className="mt-1 text-sm text-zinc-500">Επιλέξτε εύρος ημερομηνιών για το Ταμείο.</p>
          </div>
          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Από</span>
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                onClick={(event) => event.currentTarget.showPicker?.()}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </label>
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Έως</span>
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                onClick={(event) => event.currentTarget.showPicker?.()}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </label>
          </div>
        </div>
      </section>

      <SummarySection
        title="Έσοδα"
        items={[
          { label: 'Σύνολο Εσόδων', value: totalIncome },
          { label: 'Έσοδα Μετρητά', value: totalIncomeCash },
          { label: 'Έσοδα Κάρτα', value: totalIncomeCard },
          { label: 'Έσοδα Τράπεζα', value: totalIncomeBank },
        ]}
      />

      <SummarySection
        title="Έξοδα"
        items={[
          { label: 'Σύνολο Εξόδων', value: totalPaidExpenses },
          { label: 'Έξοδα Μετρητά', value: totalExpensesCash },
          { label: 'Έξοδα Κάρτα', value: totalExpensesCard },
          { label: 'Έξοδα Τράπεζα', value: totalExpensesBank },
        ]}
      />

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <SummarySection
          title="Προμηθευτές"
          items={[
            { label: 'Πληρωμές Προμηθευτών', value: totalSupplierPayments },
            { label: 'Πιστώσεις Προμηθευτών', value: totalSupplierCredits },
          ]}
          columns="sm:grid-cols-2"
        />

        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/95 p-6">
          <h2 className="text-sm font-semibold text-white">Αποτέλεσμα</h2>
          <div
            className={`mt-4 rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6 ${
              netTotal >= 0 ? 'text-emerald-300' : 'text-rose-300'
            }`}
          >
            <p className="text-sm text-zinc-400">Καθαρό Αποτέλεσμα</p>
            <p className="mt-4 text-4xl font-semibold">{formatMoney(netTotal)}</p>
          </div>
        </section>
      </section>
    </div>
  );
}

function SummarySection({
  title,
  items,
  columns = 'sm:grid-cols-2 xl:grid-cols-4',
}: {
  title: string;
  items: { label: string; value: number }[];
  columns?: string;
}) {
  const formatMoney = (value: number) =>
    `€${value.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className={`mt-4 grid gap-3 ${columns}`}>
        {items.map((item) => (
          <div key={item.label} className="min-h-[118px] rounded-3xl border border-zinc-800 bg-zinc-900/90 p-5">
            <p className="text-sm text-zinc-400">{item.label}</p>
            <p className="mt-4 text-3xl font-semibold text-white">{formatMoney(item.value)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
