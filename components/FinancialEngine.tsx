'use client';

import { useMemo, useState } from 'react';
import {
  addFinancialObligation,
  deleteFinancialObligation,
  fetchFinancialObligations,
  updateFinancialObligation,
  type FinancialObligation,
  type FinancialObligationStatus,
} from '@/lib/financialObligationsApi';

type FinancialEngineTransaction = {
  id: string | number;
  date: string;
  amount: number;
  type: string;
};

type FinancialEngineDebt = {
  id: number;
  title: string;
  payment_date?: string | null;
  due_date?: string | null;
  remaining_amount: number;
  status?: string | null;
  category?: string | null;
};

type FinancialEngineProps = {
  transactions: FinancialEngineTransaction[];
  debts?: FinancialEngineDebt[];
};

type EngineTab = 'income' | 'expenses' | 'obligations' | 'cashflow' | 'forecast';
type RiskLevel = 'SAFE' | 'WARNING' | 'DANGEROUS';

type ObligationForm = {
  title: string;
  category: string;
  total_amount: string;
  down_payment: string;
  seasons_count: string;
  months_per_season: string;
  start_month: string;
  start_year: string;
  payment_method: string;
  notes: string;
  status: FinancialObligationStatus;
};

type ForecastInputs = {
  forecastYear: string;
  baseYear: string;
  carsCount: string;
  pricePerCar: string;
  downPaymentPerCar: string;
  downPaymentMonth: string;
  seasons: string;
  monthsPerSeason: string;
  startMonth: string;
};

type MatrixRow = {
  label: string;
  values: number[];
  tone?: 'income' | 'expense' | 'danger' | 'neutral';
  totalMode?: 'sum' | 'last';
};

type ScheduledPayment = {
  year: number;
  month: number;
  amount: number;
  title: string;
  source: 'debt';
};

const monthShort = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μάι', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπτ', 'Οκτ', 'Νοε', 'Δεκ'];
const monthNames = [
  'Ιανουάριος',
  'Φεβρουάριος',
  'Μάρτιος',
  'Απρίλιος',
  'Μάιος',
  'Ιούνιος',
  'Ιούλιος',
  'Αύγουστος',
  'Σεπτέμβριος',
  'Οκτώβριος',
  'Νοέμβριος',
  'Δεκέμβριος',
];

const tabs: { id: EngineTab; label: string; description: string }[] = [
  { id: 'income', label: 'Έσοδα', description: 'Συνοπτική βάση για ανάλυση εσόδων από πραγματικές κινήσεις.' },
  { id: 'expenses', label: 'Έξοδα', description: 'Συνοπτική βάση για έλεγχο εξόδων και πίεσης ταμείου.' },
  { id: 'obligations', label: 'Γραμμάτια', description: 'Ανοιχτά γραμμάτια, δάνεια και χρέη από το module Γραμμάτια.' },
  { id: 'cashflow', label: 'Ταμειακή Ροή', description: 'Προβολή ταμείου από πραγματικό ιστορικό και γραμμάτια.' },
  { id: 'forecast', label: 'Πρόβλεψη', description: 'Προσομοίωση αγοράς στόλου πάνω σε πραγματική ιστορική βάση.' },
];

const obligationCategories = ['ΟΤΕ', 'ΔΕΗ', 'Ενοίκιο', 'Δάνειο', 'Γραμμάτια', 'ΦΠΑ', 'Ασφάλεια', 'Μισθοδοσία', 'Λοιπά'];
const paymentMethods = [
  { value: 'cash', label: 'Μετρητά' },
  { value: 'card', label: 'Κάρτα' },
  { value: 'bank', label: 'Τράπεζα' },
];
const statuses: { value: FinancialObligationStatus; label: string }[] = [
  { value: 'active', label: 'Ενεργή' },
  { value: 'completed', label: 'Ολοκληρωμένη' },
  { value: 'cancelled', label: 'Ακυρωμένη' },
];

const emptyObligationForm: ObligationForm = {
  title: '',
  category: 'Δάνειο',
  total_amount: '',
  down_payment: '',
  seasons_count: '1',
  months_per_season: '6',
  start_month: '5',
  start_year: '2027',
  payment_method: 'bank',
  notes: '',
  status: 'active',
};

const defaultForecastInputs: ForecastInputs = {
  forecastYear: '2027',
  baseYear: '2026',
  carsCount: '0',
  pricePerCar: '0',
  downPaymentPerCar: '0',
  downPaymentMonth: '5',
  seasons: '1',
  monthsPerSeason: '6',
  startMonth: '5',
};

const money = (value: number) =>
  `€${value.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function FinancialEngine({ transactions, debts = [] }: FinancialEngineProps) {
  const [activeTab, setActiveTab] = useState<EngineTab>('cashflow');
  const [cashflowBaseYear, setCashflowBaseYear] = useState('2026');
  const [forecastInputs, setForecastInputs] = useState<ForecastInputs>(defaultForecastInputs);
  const [obligations, setObligations] = useState<FinancialObligation[]>([]);
  const [loadingObligations, setLoadingObligations] = useState(false);
  const [showObligationModal, setShowObligationModal] = useState(false);
  const [editingObligationId, setEditingObligationId] = useState<number | null>(null);
  const [obligationForm, setObligationForm] = useState<ObligationForm>(emptyObligationForm);

  const active = tabs.find((tab) => tab.id === activeTab) || tabs[0];

  const loadObligations = async () => {
    setLoadingObligations(true);
    try {
      const rows = await fetchFinancialObligations();
      setObligations(rows);
    } finally {
      setLoadingObligations(false);
    }
  };

  const obligationSchedules = useMemo(
    () => buildDebtSchedules(debts),
    [debts]
  );
  const unpaidDebtTotal = useMemo(() => debts.reduce((sum, debt) => sum + Math.max(0, toNumber(debt.remaining_amount)), 0), [debts]);
  const incomeSummary = useMemo(() => buildYearSummary(transactions, '2026', 'income'), [transactions]);
  const expenseSummary = useMemo(() => buildYearSummary(transactions, '2026', 'expenses'), [transactions]);
  const cashflow = useMemo(
    () =>
      buildCashflowMatrix({
        transactions,
        schedules: obligationSchedules,
        baseYear: cashflowBaseYear,
        targetYear: cashflowBaseYear,
        baseResult: calculateHistoricalEndingCash(transactions, Number(cashflowBaseYear)),
      }),
    [cashflowBaseYear, obligationSchedules, transactions]
  );
  const forecast = useMemo(
    () =>
      buildForecastMatrix({
        transactions,
        schedules: obligationSchedules,
        inputs: forecastInputs,
      }),
    [forecastInputs, obligationSchedules, transactions]
  );

  const openNewObligation = () => {
    setEditingObligationId(null);
    setObligationForm({
      ...emptyObligationForm,
      start_year: forecastInputs.forecastYear || '2027',
    });
    setShowObligationModal(true);
  };

  const openEditObligation = (obligation: FinancialObligation) => {
    setEditingObligationId(obligation.id);
    setObligationForm({
      title: obligation.title || '',
      category: obligation.category || 'Δάνειο',
      total_amount: String(obligation.total_amount || ''),
      down_payment: String(obligation.down_payment || ''),
      seasons_count: String(obligation.seasons_count || 1),
      months_per_season: String(obligation.months_per_season || 1),
      start_month: String(obligation.start_month || 1),
      start_year: String(obligation.start_year || new Date().getFullYear()),
      payment_method: obligation.payment_method || 'bank',
      notes: obligation.notes || '',
      status: obligation.status || 'active',
    });
    setShowObligationModal(true);
  };

  const saveObligation = async () => {
    if (!obligationForm.title.trim()) {
      alert('Συμπληρώστε τίτλο υποχρέωσης.');
      return;
    }

    if (!toNumber(obligationForm.total_amount)) {
      alert('Συμπληρώστε συνολικό ποσό.');
      return;
    }

    const payload = {
      title: obligationForm.title.trim(),
      category: obligationForm.category,
      total_amount: toNumber(obligationForm.total_amount),
      down_payment: toNumber(obligationForm.down_payment),
      seasons_count: Math.max(1, Math.floor(toNumber(obligationForm.seasons_count) || 1)),
      months_per_season: Math.max(1, Math.floor(toNumber(obligationForm.months_per_season) || 1)),
      start_month: clamp(Math.floor(toNumber(obligationForm.start_month) || 1), 1, 12),
      start_year: Math.floor(toNumber(obligationForm.start_year) || new Date().getFullYear()),
      payment_method: obligationForm.payment_method || null,
      notes: obligationForm.notes.trim() || null,
      status: obligationForm.status,
    };

    const saved = editingObligationId
      ? await updateFinancialObligation(editingObligationId, payload)
      : await addFinancialObligation(payload);

    if (!saved) {
      alert('Η υποχρέωση δεν αποθηκεύτηκε.');
      return;
    }

    setShowObligationModal(false);
    await loadObligations();
  };

  const removeObligation = async (id: number) => {
    if (!confirm('Να διαγραφεί αυτή η υποχρέωση;')) return;
    const ok = await deleteFinancialObligation(id);
    if (!ok) {
      alert('Η υποχρέωση δεν διαγράφηκε.');
      return;
    }
    await loadObligations();
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#07101a]/95 text-white">
      <div className="flex flex-shrink-0 flex-col gap-3 border-b border-white/10 px-4 py-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-cyan-200/70">AUTOCLUB ERP</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Financial Engine</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-300">
              Προσομοιωτής επιβίωσης cashflow για επέκταση στόλου, βασισμένος σε πραγματικές κινήσεις και γραμμάτια.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <MiniMetric label="Γραμμάτια" value={String(obligationSchedules.length)} />
            <MiniMetric label="Υπόλοιπο" value={money(unpaidDebtTotal)} tone="warn" />
            <MiniMetric label="Cashflow" value="Survival" />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded-2xl border px-3 py-2 text-xs font-semibold transition duration-200 ${
                activeTab === tab.id
                  ? 'border-cyan-300/40 bg-cyan-400/15 text-white shadow-[0_0_22px_rgba(34,211,238,0.14)]'
                  : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-4">
        <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
          <h3 className="text-base font-semibold text-white">{active.label}</h3>
          <p className="mt-1 text-xs text-slate-400">{active.description}</p>
        </div>

        {activeTab === 'income' && <SummaryFoundation title="Έσοδα" summary={incomeSummary} tone="income" />}
        {activeTab === 'expenses' && <SummaryFoundation title="Έξοδα" summary={expenseSummary} tone="expense" />}
        {activeTab === 'obligations' && (
          <ObligationsView
            debts={debts}
            schedules={obligationSchedules}
          />
        )}
        {activeTab === 'cashflow' && (
          <CashflowView
            baseYear={cashflowBaseYear}
            onBaseYearChange={setCashflowBaseYear}
            matrix={cashflow}
          />
        )}
        {activeTab === 'forecast' && (
          <ForecastView inputs={forecastInputs} onChange={setForecastInputs} matrix={forecast} />
        )}
      </div>

      {showObligationModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[88vh] w-[min(760px,94vw)] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#07101a] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.12em] text-cyan-200/70">Υποχρέωση</p>
                <h3 className="text-lg font-semibold text-white">
                  {editingObligationId ? 'Επεξεργασία Υποχρέωσης' : 'Νέα Υποχρέωση'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowObligationModal(false)}
                className="rounded-xl px-3 py-2 text-lg text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="grid gap-3 overflow-auto px-5 py-4 md:grid-cols-2">
              <Field label="Τίτλος">
                <input className="engine-input" value={obligationForm.title} onChange={(event) => setObligationForm({ ...obligationForm, title: event.target.value })} />
              </Field>
              <Field label="Κατηγορία">
                <select className="engine-input" value={obligationForm.category} onChange={(event) => setObligationForm({ ...obligationForm, category: event.target.value })}>
                  {obligationCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </Field>
              <Field label="Συνολικό Ποσό">
                <input className="engine-input" type="number" value={obligationForm.total_amount} onChange={(event) => setObligationForm({ ...obligationForm, total_amount: event.target.value })} />
              </Field>
              <Field label="Προκαταβολή">
                <input className="engine-input" type="number" value={obligationForm.down_payment} onChange={(event) => setObligationForm({ ...obligationForm, down_payment: event.target.value })} />
              </Field>
              <Field label="Σεζόν">
                <input className="engine-input" type="number" min="1" value={obligationForm.seasons_count} onChange={(event) => setObligationForm({ ...obligationForm, seasons_count: event.target.value })} />
              </Field>
              <Field label="Μήνες πληρωμής / σεζόν">
                <input className="engine-input" type="number" min="1" value={obligationForm.months_per_season} onChange={(event) => setObligationForm({ ...obligationForm, months_per_season: event.target.value })} />
              </Field>
              <Field label="Μήνας Έναρξης">
                <select className="engine-input" value={obligationForm.start_month} onChange={(event) => setObligationForm({ ...obligationForm, start_month: event.target.value })}>
                  {monthNames.map((month, index) => (
                    <option key={month} value={index + 1}>{month}</option>
                  ))}
                </select>
              </Field>
              <Field label="Έτος Έναρξης">
                <input className="engine-input" type="number" value={obligationForm.start_year} onChange={(event) => setObligationForm({ ...obligationForm, start_year: event.target.value })} />
              </Field>
              <Field label="Τρόπος Πληρωμής">
                <select className="engine-input" value={obligationForm.payment_method} onChange={(event) => setObligationForm({ ...obligationForm, payment_method: event.target.value })}>
                  {paymentMethods.map((method) => (
                    <option key={method.value} value={method.value}>{method.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Κατάσταση">
                <select className="engine-input" value={obligationForm.status} onChange={(event) => setObligationForm({ ...obligationForm, status: event.target.value as FinancialObligationStatus })}>
                  {statuses.map((status) => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Σημειώσεις">
                  <textarea
                    className="engine-input min-h-[86px] resize-none"
                    value={obligationForm.notes}
                    onChange={(event) => setObligationForm({ ...obligationForm, notes: event.target.value })}
                  />
                </Field>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
              <button type="button" onClick={() => setShowObligationModal(false)} className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/[0.06]">
                Ακύρωση
              </button>
              <button type="button" onClick={saveObligation} className="rounded-2xl border border-cyan-300/40 bg-cyan-400/15 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/25">
                Αποθήκευση
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        :global(.engine-input) {
          width: 100%;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(2, 6, 12, 0.55);
          padding: 0.58rem 0.75rem;
          font-size: 0.82rem;
          color: white;
          outline: none;
          transition: border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
        }
        :global(.engine-input:focus) {
          border-color: rgba(34, 211, 238, 0.45);
          box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.08);
        }
        :global(.engine-input option) {
          background: #07101a;
          color: white;
        }
      `}</style>
    </div>
  );
}

function SummaryFoundation({
  title,
  summary,
  tone,
}: {
  title: string;
  summary: { total: number; monthly: number[] };
  tone: 'income' | 'expense';
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label={`Σύνολο ${title}`} value={money(summary.total)} tone={tone} />
        <MetricCard label="Καλύτερος μήνας" value={money(Math.max(...summary.monthly, 0))} />
        <MetricCard label="Μήνες με κίνηση" value={String(summary.monthly.filter((value) => value > 0).length)} />
      </div>
      <MatrixTable
        rows={[
          {
            label: title,
            values: summary.monthly,
            tone,
          },
        ]}
      />
    </div>
  );
}

function ObligationsView({
  debts,
  schedules,
}: {
  debts: FinancialEngineDebt[];
  schedules: ScheduledPayment[];
}) {
  const openDebts = debts.filter(isOpenDebt);
  const openDebtsWithoutDate = openDebts.filter((debt) => !getDebtPaymentDate(debt));

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Ανοιχτά γραμμάτια" value={String(openDebts.length)} tone="warn" />
        <MetricCard label="Προγραμματισμένες πληρωμές" value={String(schedules.length)} />
        <MetricCard label="Σύνολο πίεσης ταμείου" value={money(schedules.reduce((sum, payment) => sum + payment.amount, 0))} tone="expense" />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
        <div>
          <h4 className="text-sm font-semibold text-white">Γραμμάτια</h4>
          <p className="text-xs text-slate-300">
            Η πρόβλεψη cashflow τραβάει τα ανοιχτά γραμμάτια και τα τοποθετεί στον μήνα πληρωμής.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-amber-300/15 bg-amber-400/[0.04]">
        <div className="border-b border-amber-300/10 px-4 py-3">
          <h4 className="text-sm font-semibold text-amber-100">Γραμμάτια που μπαίνουν στην πρόβλεψη</h4>
          <p className="text-xs text-amber-100/70">Υπολογίζονται με υπόλοιπο και ημερομηνία πληρωμής, χωρίς να αλλάζει το module Γραμμάτια.</p>
        </div>
        <div className="max-h-56 overflow-auto">
          {openDebts.map((debt) => (
            <div key={debt.id} className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-white/5 px-4 py-2 text-xs last:border-b-0">
              <span className="text-white">{debt.title}</span>
              <span className="text-slate-400">{getDebtPaymentDate(debt) || 'χωρίς ημερομηνία'}</span>
              <span className="font-semibold text-amber-100">{money(toNumber(debt.remaining_amount))}</span>
            </div>
          ))}
          {openDebts.length === 0 && <p className="px-4 py-4 text-xs text-slate-500">Δεν υπάρχουν ανοιχτά γραμμάτια με υπόλοιπο.</p>}
        </div>
      </div>
      {openDebtsWithoutDate.length > 0 && (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-slate-300">
          {openDebtsWithoutDate.length} γραμμάτια δεν έχουν ημερομηνία πληρωμής και εμφανίζονται εδώ χωρίς να μπαίνουν σε μήνα cashflow.
        </p>
      )}
    </div>
  );
}

function CashflowView({ baseYear, onBaseYearChange, matrix }: {
  baseYear: string;
  onBaseYearChange: (value: string) => void;
  matrix: EngineMatrixResult;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Έτος βάσης">
          <input className="engine-input" type="number" value={baseYear} onChange={(event) => onBaseYearChange(event.target.value)} />
        </Field>
      </div>
      <p className="rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.05] px-4 py-3 text-sm font-medium text-cyan-50">
        Ιστορικό αποτέλεσμα έτους βάσης: {money(matrix.meta.baseResult)}
      </p>
      <EngineSummary result={matrix} />
      <MatrixTable rows={matrix.rows} explanation />
    </div>
  );
}

function ForecastView({
  inputs,
  onChange,
  matrix,
}: {
  inputs: ForecastInputs;
  onChange: (inputs: ForecastInputs) => void;
  matrix: EngineMatrixResult;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 md:grid-cols-3 xl:grid-cols-5">
        <Field label="Έτος πρόβλεψης"><input className="engine-input" type="number" value={inputs.forecastYear} onChange={(event) => onChange({ ...inputs, forecastYear: event.target.value })} /></Field>
        <Field label="Έτος βάσης"><input className="engine-input" type="number" value={inputs.baseYear} onChange={(event) => onChange({ ...inputs, baseYear: event.target.value })} /></Field>
        <Field label="Νέα αυτοκίνητα"><input className="engine-input" type="number" value={inputs.carsCount} onChange={(event) => onChange({ ...inputs, carsCount: event.target.value })} /></Field>
        <Field label="Τιμή / αυτοκίνητο"><input className="engine-input" type="number" value={inputs.pricePerCar} onChange={(event) => onChange({ ...inputs, pricePerCar: event.target.value })} /></Field>
        <Field label="Προκαταβολή / αυτοκίνητο"><input className="engine-input" type="number" value={inputs.downPaymentPerCar} onChange={(event) => onChange({ ...inputs, downPaymentPerCar: event.target.value })} /></Field>
        <Field label="Μήνας προκαταβολής">
          <select className="engine-input" value={inputs.downPaymentMonth} onChange={(event) => onChange({ ...inputs, downPaymentMonth: event.target.value })}>
            {monthNames.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
          </select>
        </Field>
        <Field label="Σεζόν"><input className="engine-input" type="number" value={inputs.seasons} onChange={(event) => onChange({ ...inputs, seasons: event.target.value })} /></Field>
        <Field label="Μήνες πληρωμής / σεζόν"><input className="engine-input" type="number" value={inputs.monthsPerSeason} onChange={(event) => onChange({ ...inputs, monthsPerSeason: event.target.value })} /></Field>
        <Field label="Μήνας έναρξης">
          <select className="engine-input" value={inputs.startMonth} onChange={(event) => onChange({ ...inputs, startMonth: event.target.value })}>
            {monthNames.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
          </select>
        </Field>
      </div>
      <p className="rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.05] px-4 py-3 text-sm font-medium text-cyan-50">
        Ιστορικό αποτέλεσμα έτους βάσης: {money(matrix.meta.baseResult)}
      </p>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Συνολική επένδυση" value={money(matrix.meta.totalInvestment)} />
        <MetricCard label="Συνολική προκαταβολή" value={money(matrix.meta.totalDownPayment)} />
        <MetricCard label="Μηνιαία δόση" value={money(matrix.meta.monthlyInstallment)} />
        <MetricCard label="Χαμηλότερο ταμείο" value={`${matrix.lowestMonth} ${money(matrix.lowestCash)}`} tone={matrix.lowestCash < 0 ? 'danger' : 'neutral'} />
        <MetricCard label="Τελικό ταμείο" value={money(matrix.finalCash)} tone={matrix.finalCash < 0 ? 'danger' : 'income'} />
        <RiskCard risk={matrix.risk} />
      </div>
      <MatrixTable rows={matrix.rows} explanation />
    </div>
  );
}

function EngineSummary({ result }: { result: EngineMatrixResult }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <MetricCard label="Σύνολο εσόδων" value={money(rowTotal(result.rows[0]))} tone="income" />
      <MetricCard label="Σύνολο εκροών" value={money(rowTotal(result.rows[1]) + rowTotal(result.rows[2]) + rowTotal(result.rows[3]) + rowTotal(result.rows[4]))} tone="expense" />
      <MetricCard label="Χαμηλότερο ταμείο" value={`${result.lowestMonth} ${money(result.lowestCash)}`} tone={result.lowestCash < 0 ? 'danger' : 'neutral'} />
      <RiskCard risk={result.risk} />
    </div>
  );
}

function MatrixTable({ rows, explanation = false }: { rows: MatrixRow[]; explanation?: boolean }) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/25">
        <table className="min-w-[980px] w-full table-fixed text-sm">
          <thead className="bg-white/[0.05] text-[12px] font-semibold text-slate-300">
            <tr>
              <th className="w-48 px-3 py-3 text-left">Γραμμή</th>
              {monthShort.map((month) => (
                <th key={month} className="px-2 py-3 text-right">{month}</th>
              ))}
              <th className="px-3 py-3 text-right text-white">Σύνολο</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {rows.map((row) => (
              <tr key={row.label} className="transition hover:bg-white/[0.04]">
                <td className="px-3 py-3 font-semibold text-white">{row.label}</td>
                {row.values.map((value, index) => (
                  <td key={`${row.label}-${index}`} className={`px-2 py-3 text-right font-medium tabular-nums ${valueTone(row.tone, value)}`}>
                    {money(value)}
                  </td>
                ))}
                <td className={`px-3 py-3 text-right font-bold tabular-nums ${valueTone(row.tone, rowTotal(row))}`}>
                  {money(rowTotal(row))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {explanation && (
        <p className="rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.04] px-4 py-3 text-sm leading-relaxed text-slate-300">
          Το υπόλοιπο ταμείου ξεκινά από το αποτέλεσμα του έτους βάσης και συνεχίζει με τις μηνιαίες προβλέψεις.
        </p>
      )}
    </div>
  );
}

function MetricCard({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'income' | 'expense' | 'danger' | 'warn' | 'neutral' }) {
  const toneClass =
    tone === 'income'
      ? 'text-emerald-100 border-emerald-300/20 bg-emerald-400/[0.06]'
      : tone === 'expense' || tone === 'danger'
        ? 'text-rose-100 border-rose-300/20 bg-rose-400/[0.06]'
        : tone === 'warn'
          ? 'text-amber-100 border-amber-300/20 bg-amber-400/[0.06]'
          : 'text-white border-white/10 bg-white/[0.035]';

  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`}>
      <p className="text-[11px] font-medium text-slate-300">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'warn' | 'neutral' }) {
  return (
    <div className={`rounded-2xl border px-3 py-2 ${tone === 'warn' ? 'border-amber-300/20 bg-amber-400/[0.06]' : 'border-white/10 bg-white/[0.035]'}`}>
      <p className="text-[10px] font-medium text-slate-400">{label}</p>
      <p className="mt-0.5 font-semibold text-white">{value}</p>
    </div>
  );
}

function RiskCard({ risk }: { risk: RiskLevel }) {
  const className =
    risk === 'SAFE'
      ? 'border-emerald-300/25 bg-emerald-400/[0.08] text-emerald-100'
      : risk === 'WARNING'
        ? 'border-amber-300/25 bg-amber-400/[0.08] text-amber-100'
        : 'border-rose-300/25 bg-rose-400/[0.08] text-rose-100';

  return (
    <div className={`rounded-2xl border p-3 ${className}`}>
      <p className="text-[11px] font-medium opacity-75">Κίνδυνος</p>
      <p className="mt-1 text-lg font-semibold">{riskLabel(risk)}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-slate-400">{label}</span>
      {children}
    </label>
  );
}

type EngineMatrixResult = {
  rows: MatrixRow[];
  lowestCash: number;
  lowestMonth: string;
  finalCash: number;
  risk: RiskLevel;
  meta: {
    totalInvestment: number;
    totalDownPayment: number;
    monthlyInstallment: number;
  baseResult: number;
  };
};

function buildYearSummary(transactions: FinancialEngineTransaction[], year: string, kind: 'income' | 'expenses') {
  const monthly = createMonthArray();
  const targetYear = Number(year);

  transactions.forEach((transaction) => {
    const date = parseDate(transaction.date);
    if (!date || date.getFullYear() !== targetYear) return;
    if (kind === 'income' && transaction.type !== 'income') return;
    if (kind === 'expenses' && transaction.type !== 'expense' && transaction.type !== 'supplier_payment') return;
    monthly[date.getMonth()] += toNumber(transaction.amount);
  });

  return { monthly, total: monthly.reduce((sum, value) => sum + value, 0) };
}

function buildCashflowMatrix({
  transactions,
  schedules,
  baseYear,
  targetYear,
  baseResult,
}: {
  transactions: FinancialEngineTransaction[];
  schedules: ScheduledPayment[];
  baseYear: string;
  targetYear: string;
  baseResult: number;
}): EngineMatrixResult {
  const income = buildYearSummary(transactions, baseYear, 'income').monthly;
  const expenses = buildYearSummary(transactions, baseYear, 'expenses').monthly;
  const obligations = scheduleMonthlyTotals(schedules, Number(targetYear));
  const investment = createMonthArray();
  const net = income.map((value, index) => value - expenses[index] - obligations[index]);
  const runningCash = buildRunningCash(0, net);

  return toEngineResult(
    [
      { label: 'Προβλεπόμενα έσοδα', values: income, tone: 'income' },
      { label: 'Προβλεπόμενα έξοδα', values: expenses, tone: 'expense' },
      { label: 'Γραμμάτια', values: obligations, tone: 'expense' },
      { label: 'Προκαταβολές επένδυσης', values: investment, tone: 'expense' },
      { label: 'Δόσεις επένδυσης', values: createMonthArray(), tone: 'expense' },
      { label: 'Καθαρό αποτέλεσμα μήνα', values: net, tone: 'neutral' },
    { label: 'Σωρευτικό υπόλοιπο πρόβλεψης', values: runningCash, tone: 'neutral', totalMode: 'last' },
    ],
    { totalInvestment: 0, totalDownPayment: 0, monthlyInstallment: 0, baseResult }
  );
}

function buildForecastMatrix({
  transactions,
  schedules,
  inputs,
}: {
  transactions: FinancialEngineTransaction[];
  schedules: ScheduledPayment[];
  inputs: ForecastInputs;
}): EngineMatrixResult {
  const forecastYear = Number(inputs.forecastYear);
  const baseYear = inputs.baseYear;
  const income = buildYearSummary(transactions, baseYear, 'income').monthly;
  const expenses = buildYearSummary(transactions, baseYear, 'expenses').monthly;
  const obligations = scheduleMonthlyTotals(schedules, forecastYear);
  const downPayments = createMonthArray();
  const installments = createMonthArray();
  const baseResult = calculateHistoricalEndingCash(transactions, Number(baseYear));
  const carsCount = Math.max(0, Math.floor(toNumber(inputs.carsCount)));
  const pricePerCar = Math.max(0, toNumber(inputs.pricePerCar));
  const downPaymentPerCar = Math.max(0, toNumber(inputs.downPaymentPerCar));
  const downPaymentMonth = clamp(Math.floor(toNumber(inputs.downPaymentMonth) || 1), 1, 12);
  const seasons = Math.max(1, Math.floor(toNumber(inputs.seasons) || 1));
  const monthsPerSeason = Math.max(1, Math.floor(toNumber(inputs.monthsPerSeason) || 1));
  const startMonth = clamp(Math.floor(toNumber(inputs.startMonth) || 1), 1, 12);
  const totalInvestment = carsCount * pricePerCar;
  const totalDownPayment = carsCount * downPaymentPerCar;
  const financedAmount = Math.max(0, totalInvestment - totalDownPayment);
  const totalInstallments = Math.max(1, seasons * monthsPerSeason);
  const monthlyInstallment = financedAmount / totalInstallments;

  if (totalDownPayment > 0) {
    downPayments[downPaymentMonth - 1] += totalDownPayment;
  }

  for (let season = 0; season < seasons; season += 1) {
    for (let monthIndex = 0; monthIndex < monthsPerSeason; monthIndex += 1) {
      const absoluteMonth = startMonth - 1 + monthIndex;
      const paymentYear = forecastYear + season + Math.floor(absoluteMonth / 12);
      const month = absoluteMonth % 12;

      if (paymentYear === forecastYear) {
        installments[month] += monthlyInstallment;
      }
    }
  }

  const net = income.map((value, index) => value - expenses[index] - obligations[index] - downPayments[index] - installments[index]);
  const runningCash = buildRunningCash(0, net);

  return toEngineResult(
    [
      { label: 'Προβλεπόμενα έσοδα', values: income, tone: 'income' },
      { label: 'Προβλεπόμενα έξοδα', values: expenses, tone: 'expense' },
      { label: 'Γραμμάτια', values: obligations, tone: 'expense' },
      { label: 'Προκαταβολές επένδυσης', values: downPayments, tone: 'expense' },
      { label: 'Δόσεις επένδυσης', values: installments, tone: 'expense' },
      { label: 'Καθαρό αποτέλεσμα μήνα', values: net, tone: 'neutral' },
      { label: 'Σωρευτικό υπόλοιπο πρόβλεψης', values: runningCash, tone: 'neutral', totalMode: 'last' },
    ],
    { totalInvestment, totalDownPayment, monthlyInstallment, baseResult }
  );
}

function buildDebtSchedules(debts: FinancialEngineDebt[]): ScheduledPayment[] {
  const schedules: ScheduledPayment[] = [];

  debts.forEach((debt) => {
    const paymentDate = getDebtPaymentDate(debt);
    if (!isOpenDebt(debt) || !paymentDate) return;

    const date = parseDate(paymentDate);
    if (!date) return;

    schedules.push({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        amount: Math.max(0, toNumber(debt.remaining_amount)),
        title: debt.title,
        source: 'debt',
    });
  });

  return schedules;
}

function isOpenDebt(debt: FinancialEngineDebt) {
  const status = normalizeDebtStatus(debt.status);
  const remaining = toNumber(debt.remaining_amount);

  return remaining > 0 || (status !== 'paid' && status !== 'πληρωμένη');
}

function getDebtPaymentDate(debt: FinancialEngineDebt) {
  return debt.payment_date || debt.due_date || null;
}

function normalizeDebtStatus(status?: string | null) {
  return String(status || '').trim().toLowerCase();
}

function scheduleMonthlyTotals(schedules: ScheduledPayment[], targetYear: number) {
  const monthly = createMonthArray();
  schedules.forEach((schedule) => {
    if (schedule.year === targetYear && schedule.month >= 1 && schedule.month <= 12) {
      monthly[schedule.month - 1] += schedule.amount;
    }
  });
  return monthly;
}

function calculateHistoricalEndingCash(transactions: FinancialEngineTransaction[], baseYear: number) {
  const income = buildYearSummary(transactions, String(baseYear), 'income').total;
  const expenses = buildYearSummary(transactions, String(baseYear), 'expenses').total;

  return income - expenses;
}

function toEngineResult(
  rows: MatrixRow[],
  meta: EngineMatrixResult['meta'] = { totalInvestment: 0, totalDownPayment: 0, monthlyInstallment: 0, baseResult: 0 }
): EngineMatrixResult {
  const runningCash = rows.find((row) => row.label === 'Σωρευτικό υπόλοιπο πρόβλεψης')?.values || createMonthArray();
  const lowestCash = Math.min(...runningCash);
  const lowestIndex = runningCash.indexOf(lowestCash);
  const finalCash = runningCash[11] || 0;

  return {
    rows,
    lowestCash,
    lowestMonth: monthShort[lowestIndex] || '-',
    finalCash,
    risk: getRisk(lowestCash, finalCash),
    meta,
  };
}

function buildRunningCash(initialCash: number, net: number[]) {
  let current = initialCash;
  return net.map((value) => {
    current += value;
    return current;
  });
}

function getRisk(lowestCash: number, finalCash: number): RiskLevel {
  if (lowestCash < -30000) return 'DANGEROUS';
  if (finalCash < 0) return 'WARNING';
  return 'SAFE';
}

function riskLabel(risk: RiskLevel) {
  if (risk === 'SAFE') return 'Ασφαλές';
  if (risk === 'WARNING') return 'Προσοχή';
  return 'Επικίνδυνο';
}

function statusLabel(status: FinancialObligationStatus) {
  if (status === 'active') return 'Ενεργή';
  if (status === 'completed') return 'Ολοκληρωμένη';
  return 'Ακυρωμένη';
}

function rowTotal(row: MatrixRow) {
  if (row.totalMode === 'last') {
    return row.values[row.values.length - 1] || 0;
  }
  return row.values.reduce((sum, value) => sum + value, 0);
}

function valueTone(tone: MatrixRow['tone'], value: number) {
  if (tone === 'income') return 'text-emerald-200';
  if (tone === 'expense' || tone === 'danger') return 'text-rose-200';
  if (value < 0) return 'text-rose-200';
  if (value > 0) return 'text-slate-100';
  return 'text-slate-500';
}

function createMonthArray() {
  return Array.from({ length: 12 }, () => 0);
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
