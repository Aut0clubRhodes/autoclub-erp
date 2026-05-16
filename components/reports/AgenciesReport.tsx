'use client';

import { useState } from 'react';
import type { BookingRecord } from '@/lib/bookingsApi';
import type { ReportAgency, ReportRepresentative, ReportTransaction } from './types';

type AgenciesReportProps = {
  transactions: ReportTransaction[];
  bookings: BookingRecord[];
  agencies: ReportAgency[];
  representatives: ReportRepresentative[];
};

type MonthlyRow = {
  id: string;
  name: string;
  months: number[];
  total: number;
};

const months = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μάι', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'];

const money = (value: number) =>
  `€${value.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AgenciesReport({
  transactions,
  bookings: _bookings,
  agencies,
  representatives,
}: AgenciesReportProps) {
  const [expandedRepresentativeIds, setExpandedRepresentativeIds] = useState<Record<string, boolean>>({});
  const incomeTransactions = transactions.filter((transaction) => transaction.type === 'income');

  const agencyRows = agencies
    .map((agency) => buildMonthlyRow(String(agency.id), agency.name, incomeTransactions, 'agency_id'))
    .filter((row) => row.total > 0)
    .sort((left, right) => right.total - left.total);

  const periodTotal = agencyRows.reduce((sum, row) => sum + row.total, 0);

  return (
    <div className="space-y-4">
      {agencyRows.map((agencyRow) => {
        const representativeRows = representatives
          .filter((representative) => String(representative.agency_id) === agencyRow.id)
          .map((representative) =>
            buildMonthlyRow(
              String(representative.id),
              representative.name,
              incomeTransactions,
              'representative_id'
            )
          )
          .filter((row) => row.total > 0)
          .sort((left, right) => right.total - left.total);

        return (
          <section key={agencyRow.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/70">
            <div className="flex flex-col gap-3 border-b border-zinc-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-semibold text-white">{agencyRow.name}</h3>
              <p className="text-sm font-medium text-zinc-200">
                Σύνολο: <span className="text-white">{money(agencyRow.total)}</span>
              </p>
            </div>

            <div className="space-y-5 p-5">
              <MonthGrid values={agencyRow.months} />

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Representatives
                </h4>
                {representativeRows.map((representativeRow) => {
                  const isExpanded = Boolean(expandedRepresentativeIds[representativeRow.id]);
                  return (
                    <div key={representativeRow.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedRepresentativeIds((current) => ({
                            ...current,
                            [representativeRow.id]: !current[representativeRow.id],
                          }))
                        }
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                      >
                        <span className="text-sm text-zinc-200">{representativeRow.name}</span>
                        <span className="text-sm font-medium text-white">
                          Σύνολο {money(representativeRow.total)}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-zinc-800 px-4 py-4">
                          <MonthGrid values={representativeRow.months} compact />
                        </div>
                      )}
                    </div>
                  );
                })}
                {representativeRows.length === 0 && (
                  <p className="text-sm text-zinc-500">Δεν υπάρχουν έσοδα αντιπροσώπων για την περίοδο.</p>
                )}
              </div>
            </div>
          </section>
        );
      })}

      {agencyRows.length === 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 text-sm text-zinc-500">
          Δεν βρέθηκαν έσοδα πρακτορείων.
        </div>
      )}

      <section className="rounded-2xl border border-zinc-700 bg-zinc-900/80 px-5 py-4">
        <p className="text-sm text-zinc-400">Σύνολο Περιόδου</p>
        <p className="mt-2 text-2xl font-semibold text-white">{money(periodTotal)}</p>
      </section>
    </div>
  );
}

function MonthGrid({ values, compact = false }: { values: number[]; compact?: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {months.map((month, index) => (
        <div
          key={month}
          className={`rounded-xl border border-zinc-800 bg-zinc-900/50 ${
            compact ? 'px-3 py-2.5' : 'px-4 py-3'
          }`}
        >
          <p className="text-xs text-zinc-500">{month}</p>
          <p className={`${compact ? 'mt-1 text-sm' : 'mt-1.5 text-base'} font-medium text-zinc-100`}>
            {money(values[index])}
          </p>
        </div>
      ))}
    </div>
  );
}

function buildMonthlyRow(
  id: string,
  name: string,
  transactions: ReportTransaction[],
  key: 'agency_id' | 'representative_id'
): MonthlyRow {
  const rowTransactions = transactions.filter((transaction) => transaction[key] === id);
  const monthlyRevenue = Array.from({ length: 12 }, () => 0);

  rowTransactions.forEach((transaction) => {
    const date = new Date(transaction.date);
    if (Number.isNaN(date.getTime())) return;
    monthlyRevenue[date.getMonth()] += transaction.amount;
  });

  return {
    id,
    name,
    months: monthlyRevenue,
    total: monthlyRevenue.reduce((sum, value) => sum + value, 0),
  };
}
