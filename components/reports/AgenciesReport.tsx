'use client';

import { Fragment, useState } from 'react';
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
  const [expandedAgencyId, setExpandedAgencyId] = useState<string | null>(null);
  const incomeTransactions = transactions.filter((transaction) => transaction.type === 'income');

  const agencyRows = agencies
    .map((agency) => buildMonthlyRow(String(agency.id), agency.name, incomeTransactions, 'agency_id'))
    .filter((row) => row.total > 0)
    .sort((left, right) => right.total - left.total);

  const totalsRow = agencyRows.reduce(
    (totals, row) => ({
      months: totals.months.map((value, index) => value + row.months[index]),
      total: totals.total + row.total,
    }),
    { months: Array.from({ length: 12 }, () => 0), total: 0 }
  );

  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-800">
      <table className="w-full min-w-[1060px] border-separate border-spacing-y-1 text-left">
        <colgroup>
          <col className="w-[160px]" />
          {months.map((month) => (
            <col key={`col-${month}`} className="w-[70px]" />
          ))}
          <col className="w-[90px]" />
        </colgroup>
        <thead>
          <tr className="bg-zinc-900/95">
            <th className="px-3 py-2.5 text-sm text-zinc-400">Πρακτορείο</th>
            {months.map((month) => (
              <th key={month} className="px-2 py-2.5 text-center text-xs text-zinc-400">
                {month}
              </th>
            ))}
            <th className="px-3 py-2.5 text-right text-sm font-semibold text-white">Σύνολο</th>
          </tr>
        </thead>
        <tbody>
          {agencyRows.map((agencyRow) => {
            const isExpanded = expandedAgencyId === agencyRow.id;
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
              <Fragment key={agencyRow.id}>
                <tr
                  onClick={() => setExpandedAgencyId(isExpanded ? null : agencyRow.id)}
                  className="cursor-pointer bg-zinc-950 hover:bg-zinc-900/70"
                >
                  <td className="px-3 py-3 text-sm font-medium text-white">{agencyRow.name}</td>
                  {agencyRow.months.map((value, index) => (
                    <td key={`${agencyRow.id}-${months[index]}`} className="px-2 py-3 text-right text-xs text-zinc-200">
                      {money(value)}
                    </td>
                  ))}
                  <td className="bg-zinc-900/70 px-3 py-3 text-right text-sm font-semibold text-white">
                    {money(agencyRow.total)}
                  </td>
                </tr>
                {isExpanded &&
                  representativeRows.map((representativeRow) => (
                    <tr key={representativeRow.id} className="bg-zinc-950/70">
                      <td className="px-3 py-2.5 pl-6 text-xs text-zinc-300">{representativeRow.name}</td>
                      {representativeRow.months.map((value, index) => (
                        <td
                          key={`${representativeRow.id}-${months[index]}`}
                          className="px-2 py-2.5 text-right text-[11px] text-zinc-400"
                        >
                          {money(value)}
                        </td>
                      ))}
                      <td className="bg-zinc-900/40 px-3 py-2.5 text-right text-xs font-medium text-zinc-100">
                        {money(representativeRow.total)}
                      </td>
                    </tr>
                  ))}
              </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-zinc-900/95">
            <td className="px-3 py-3 text-sm font-semibold text-white">Σύνολο</td>
            {totalsRow.months.map((value, index) => (
              <td key={`total-${months[index]}`} className="px-2 py-3 text-right text-xs font-semibold text-white">
                {money(value)}
              </td>
            ))}
            <td className="bg-zinc-800 px-3 py-3 text-right text-sm font-semibold text-white">
              {money(totalsRow.total)}
            </td>
          </tr>
        </tfoot>
      </table>
      {agencyRows.length === 0 && <p className="p-6 text-sm text-zinc-500">Δεν βρέθηκαν έσοδα πρακτορείων.</p>}
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
