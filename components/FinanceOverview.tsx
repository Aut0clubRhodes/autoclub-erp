'use client';

interface FinanceOverviewProps {
  fromDate: string;
  toDate: string;
  setFromDate: (value: string) => void;
  setToDate: (value: string) => void;
  totalIncome: number;
  totalPaidOperationalExpenses: number;
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
  totalPaidOperationalExpenses,
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

      <section className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Έσοδα</h2>
              <p className="mt-1 text-sm text-zinc-500">Συνολικά έσοδα από το φίλτρο.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="min-h-[112px] rounded-3xl border border-zinc-800 bg-zinc-900/90 p-5">
                <p className="text-sm text-zinc-400">Σύνολο Εσόδων</p>
                <p className="mt-4 text-3xl font-semibold text-white">{formatMoney(totalIncome)}</p>
              </div>
            </div>
          </div>
        </div>
        <div className={`rounded-3xl border border-zinc-800 bg-zinc-900/95 p-7 text-center ${netTotal >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
          <p className="text-sm text-zinc-400">Καθαρό Αποτέλεσμα</p>
          <p className="mt-3 text-5xl font-semibold">{formatMoney(netTotal)}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6">
          <p className="text-sm text-zinc-400">Λειτουργικά Έξοδα</p>
          <p className="mt-4 text-3xl font-semibold text-white">{formatMoney(totalPaidOperationalExpenses)}</p>
        </div>
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6">
          <p className="text-sm text-zinc-400">Πληρωμές Προμηθευτών</p>
          <p className="mt-4 text-3xl font-semibold text-white">{formatMoney(totalSupplierPayments)}</p>
        </div>
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6">
          <p className="text-sm text-zinc-400">Πιστώσεις Προμηθευτών</p>
          <p className="mt-4 text-3xl font-semibold text-white">{formatMoney(totalSupplierCredits)}</p>
        </div>
      </section>
    </div>
  );
}
