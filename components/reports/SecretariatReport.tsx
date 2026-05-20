'use client';

import { Fragment, useMemo, useState } from 'react';
import type { DebtRecord } from '@/lib/debtsApi';

type SecretariatReportProps = {
  debts: DebtRecord[];
};

type YearSummary = {
  year: string;
  total: number;
  paid: number;
  remaining: number;
  overdue: number;
  debts: DebtRecord[];
};

const formatMoney = (value: number) =>
  `€${Number(value || 0).toLocaleString('el-GR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getDebtYear = (debt: DebtRecord) => debt.due_date?.slice(0, 4) || 'Χωρίς ημερομηνία';

const isOverdueDebt = (debt: DebtRecord) => {
  if (!debt.due_date) return false;
  if (Number(debt.remaining_amount || 0) <= 0) return false;

  const today = new Date().toISOString().slice(0, 10);
  return debt.due_date < today;
};

export default function SecretariatReport({ debts }: SecretariatReportProps) {
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});

  const totals = useMemo(
    () =>
      debts.reduce(
        (summary, debt) => {
          const total = Number(debt.original_amount || 0);
          const paid = Number(debt.paid_amount || 0);
          const remaining = Number(debt.remaining_amount || 0);

          summary.total += total;
          summary.paid += paid;
          summary.remaining += remaining;
          if (isOverdueDebt(debt)) summary.overdue += remaining;

          return summary;
        },
        { total: 0, paid: 0, remaining: 0, overdue: 0 }
      ),
    [debts]
  );

  const yearlyRows = useMemo(() => {
    const grouped = debts.reduce<Record<string, YearSummary>>((accumulator, debt) => {
      const year = getDebtYear(debt);
      const total = Number(debt.original_amount || 0);
      const paid = Number(debt.paid_amount || 0);
      const remaining = Number(debt.remaining_amount || 0);
      const overdue = isOverdueDebt(debt) ? remaining : 0;

      if (!accumulator[year]) {
        accumulator[year] = { year, total: 0, paid: 0, remaining: 0, overdue: 0, debts: [] };
      }

      accumulator[year].total += total;
      accumulator[year].paid += paid;
      accumulator[year].remaining += remaining;
      accumulator[year].overdue += overdue;
      accumulator[year].debts.push(debt);

      return accumulator;
    }, {});

    return Object.values(grouped).sort((left, right) => right.year.localeCompare(left.year, 'el'));
  }, [debts]);

  const toggleYear = (year: string) => {
    setExpandedYears((current) => ({ ...current, [year]: !current[year] }));
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Σύνολο Οφειλών" value={totals.total} />
        <SummaryCard label="Πληρωμένα" value={totals.paid} tone="emerald" />
        <SummaryCard label="Υπόλοιπα" value={totals.remaining} tone="sky" />
        <SummaryCard label="Ληξιπρόθεσμα" value={totals.overdue} tone="rose" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
        <table className="w-full min-w-[760px] text-left">
          <thead className="bg-zinc-950/70">
            <tr>
              {['Έτος', 'Σύνολο', 'Πληρωμένα', 'Υπόλοιπα', 'Ληξιπρόθεσμα'].map((column) => (
                <th key={column} className="px-4 py-3 text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {yearlyRows.map((row) => (
              <Fragment key={row.year}>
                <tr
                  onClick={() => toggleYear(row.year)}
                  className="cursor-pointer border-t border-white/[0.06] transition hover:bg-white/[0.04]"
                >
                  <td className="px-4 py-4 text-sm font-semibold text-white">{row.year}</td>
                  <td className="px-4 py-4 text-sm text-zinc-200">{formatMoney(row.total)}</td>
                  <td className="px-4 py-4 text-sm text-emerald-200">{formatMoney(row.paid)}</td>
                  <td className="px-4 py-4 text-sm text-sky-200">{formatMoney(row.remaining)}</td>
                  <td className="px-4 py-4 text-sm text-rose-200">{formatMoney(row.overdue)}</td>
                </tr>

                {expandedYears[row.year] &&
                  row.debts.map((debt) => (
                    <tr key={debt.id} className="border-t border-white/[0.04] bg-black/20">
                      <td className="px-6 py-3 text-xs text-zinc-400">{debt.due_date || '-'}</td>
                      <td className="px-4 py-3 text-xs text-white">{debt.title}</td>
                      <td className="px-4 py-3 text-xs text-emerald-200">{formatMoney(debt.paid_amount)}</td>
                      <td className="px-4 py-3 text-xs text-sky-200">{formatMoney(debt.remaining_amount)}</td>
                      <td className="px-4 py-3 text-xs text-rose-200">
                        {isOverdueDebt(debt) ? formatMoney(debt.remaining_amount) : '-'}
                      </td>
                    </tr>
                  ))}
              </Fragment>
            ))}
          </tbody>
        </table>
        {yearlyRows.length === 0 && <p className="p-6 text-sm text-zinc-500">Δεν υπάρχουν οφειλές.</p>}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = 'zinc',
}: {
  label: string;
  value: number;
  tone?: 'zinc' | 'emerald' | 'sky' | 'rose';
}) {
  const toneClasses = {
    zinc: 'border-white/[0.08] text-white',
    emerald: 'border-emerald-400/20 text-emerald-200',
    sky: 'border-sky-400/20 text-sky-200',
    rose: 'border-rose-400/20 text-rose-200',
  };

  return (
    <div className={`rounded-2xl border bg-zinc-950/60 p-5 ${toneClasses[tone]}`}>
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold">{formatMoney(value)}</p>
    </div>
  );
}
