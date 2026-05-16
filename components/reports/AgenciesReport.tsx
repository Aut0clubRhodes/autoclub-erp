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

const money = (value: number) =>
  `€${value.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AgenciesReport({
  transactions,
  bookings,
  agencies,
  representatives,
}: AgenciesReportProps) {
  const [expandedAgencyId, setExpandedAgencyId] = useState<string | null>(null);
  const [expandedRepresentativeId, setExpandedRepresentativeId] = useState<string | null>(null);
  const incomeTransactions = transactions.filter((transaction) => transaction.type === 'income');

  const rows = agencies
    .map((agency) => {
      const agencyTransactions = incomeTransactions.filter(
        (transaction) => transaction.agency_id === String(agency.id)
      );
      const agencyBookings = bookings.filter((booking) => booking.agency_id === agency.id);
      const revenue = agencyTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
      return {
        agency,
        revenue,
        bookingsCount: agencyBookings.length,
        averageBooking: agencyBookings.length ? revenue / agencyBookings.length : 0,
      };
    })
    .filter((row) => row.revenue > 0 || row.bookingsCount > 0)
    .sort((left, right) => right.revenue - left.revenue);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800">
      <table className="w-full min-w-[760px] text-left">
        <thead className="bg-zinc-900/90">
          <tr>
            <th className="px-4 py-3 text-sm text-zinc-400">Πρακτορείο</th>
            <th className="px-4 py-3 text-sm text-zinc-400">Τζίρος</th>
            <th className="px-4 py-3 text-sm text-zinc-400">Κρατήσεις</th>
            <th className="px-4 py-3 text-sm text-zinc-400">Μέσο Booking</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ agency, revenue, bookingsCount, averageBooking }) => {
            const isExpanded = expandedAgencyId === String(agency.id);
            const agencyRepresentatives = representatives.filter(
              (representative) => representative.agency_id === agency.id
            );

            return (
              <Fragment key={agency.id}>
                <tr
                  onClick={() => {
                    setExpandedAgencyId(isExpanded ? null : String(agency.id));
                    setExpandedRepresentativeId(null);
                  }}
                  className="cursor-pointer border-t border-zinc-800 hover:bg-zinc-900/60"
                >
                  <td className="px-4 py-4 text-sm text-white">{agency.name}</td>
                  <td className="px-4 py-4 text-sm text-zinc-200">{money(revenue)}</td>
                  <td className="px-4 py-4 text-sm text-zinc-200">{bookingsCount}</td>
                  <td className="px-4 py-4 text-sm text-zinc-200">{money(averageBooking)}</td>
                </tr>
                {isExpanded && (
                  <tr className="border-t border-zinc-800 bg-zinc-950/80">
                    <td colSpan={4} className="p-4">
                      <div className="overflow-hidden rounded-2xl border border-zinc-800">
                        <table className="w-full text-left">
                          <thead className="bg-zinc-900/70">
                            <tr>
                              <th className="px-4 py-3 text-sm text-zinc-400">Representative</th>
                              <th className="px-4 py-3 text-sm text-zinc-400">Τζίρος</th>
                              <th className="px-4 py-3 text-sm text-zinc-400">Κρατήσεις</th>
                              <th className="px-4 py-3 text-sm text-zinc-400">Μέσο Booking</th>
                            </tr>
                          </thead>
                          <tbody>
                            {agencyRepresentatives.map((representative) => {
                              const repTransactions = agencyTransactions(transactions, representative.id);
                              const repBookings = bookings.filter(
                                (booking) => booking.representative_id === representative.id
                              );
                              const repRevenue = repTransactions.reduce(
                                (sum, transaction) => sum + transaction.amount,
                                0
                              );
                              const repExpanded =
                                expandedRepresentativeId === String(representative.id);

                              return (
                                <Fragment key={representative.id}>
                                  <tr
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setExpandedRepresentativeId(
                                        repExpanded ? null : String(representative.id)
                                      );
                                    }}
                                    className="cursor-pointer border-t border-zinc-800 hover:bg-zinc-900/60"
                                  >
                                    <td className="px-4 py-3 text-sm text-white">{representative.name}</td>
                                    <td className="px-4 py-3 text-sm text-zinc-200">{money(repRevenue)}</td>
                                    <td className="px-4 py-3 text-sm text-zinc-200">{repBookings.length}</td>
                                    <td className="px-4 py-3 text-sm text-zinc-200">
                                      {money(repBookings.length ? repRevenue / repBookings.length : 0)}
                                    </td>
                                  </tr>
                                  {repExpanded && (
                                    <tr className="border-t border-zinc-800 bg-zinc-950">
                                      <td colSpan={4} className="p-4">
                                        <div className="space-y-2">
                                          {repTransactions
                                            .slice()
                                            .sort((left, right) => right.date.localeCompare(left.date))
                                            .map((transaction) => (
                                              <div
                                                key={transaction.id}
                                                className="grid gap-2 rounded-xl border border-zinc-800 px-4 py-3 text-sm text-zinc-300 md:grid-cols-[120px_120px_1fr]"
                                              >
                                                <span>{transaction.date}</span>
                                                <span>{money(transaction.amount)}</span>
                                                <span>{transaction.contract_number || transaction.notes || '-'}</span>
                                              </div>
                                            ))}
                                          {repTransactions.length === 0 && (
                                            <p className="text-sm text-zinc-500">Δεν υπάρχουν κινήσεις.</p>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p className="p-6 text-sm text-zinc-500">Δεν βρέθηκαν δεδομένα.</p>}
    </div>
  );
}

const agencyTransactions = (transactions: ReportTransaction[], representativeId: number) =>
  transactions.filter(
    (transaction) =>
      transaction.type === 'income' &&
      transaction.representative_id === String(representativeId)
  );
