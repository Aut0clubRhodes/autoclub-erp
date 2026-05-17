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
    <div className="space-y-2">
      <section className="rounded-3xl border border-white/[0.08] bg-black/20 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Φίλτρο Ημερομηνίας</h2>
            <p className="mt-1 text-sm text-zinc-500">Επιλέξτε εύρος ημερομηνιών για το Ταμείο.</p>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Από</span>
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                onClick={(event) => event.currentTarget.showPicker?.()}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </label>
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Έως</span>
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                onClick={(event) => event.currentTarget.showPicker?.()}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
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

      <section className="rounded-3xl border border-white/[0.08] bg-black/20 p-3.5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
        <h2 className="text-sm font-semibold text-white">Προμηθευτές / Αποτέλεσμα</h2>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          <CompactCard label="Πληρωμές Προμηθευτών" value={totalSupplierPayments} />
          <CompactCard label="Πιστώσεις Προμηθευτών" value={totalSupplierCredits} />
          <CompactCard
            label="Καθαρό Αποτέλεσμα"
            value={netTotal}
            tone={netTotal >= 0 ? 'positive' : 'negative'}
          />
        </div>
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
    <section className="rounded-3xl border border-white/[0.08] bg-black/20 p-3.5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className={`mt-2 grid gap-2 ${columns}`}>
        {items.map((item) => (
          <div key={item.label} className="min-h-[82px] rounded-3xl border border-white/[0.06] bg-white/[0.025] p-3">
            <p className="text-sm text-zinc-400">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{formatMoney(item.value)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CompactCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'positive' | 'negative';
}) {
  const formatMoney = (amount: number) =>
    `€${amount.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div
      className={`min-h-[82px] rounded-3xl border border-white/[0.06] bg-white/[0.025] p-3 ${
        tone === 'positive' ? 'text-emerald-300' : tone === 'negative' ? 'text-rose-300' : 'text-white'
      }`}
    >
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{formatMoney(value)}</p>
    </div>
  );
}
