'use client';

import { Fragment, useState } from 'react';
import type { SupplierLedgerRow } from '@/lib/reportsApi';
import type { ReportTransaction } from './types';

type SuppliersReportProps = {
  transactions: ReportTransaction[];
  supplierLedger: SupplierLedgerRow[];
};

const paidMethods = ['cash', 'card', 'bank'];

const money = (value: number) =>
  `€${value.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function SuppliersReport({ transactions, supplierLedger }: SuppliersReportProps) {
  const [expandedSupplierId, setExpandedSupplierId] = useState<number | null>(null);
  const suppliersFromTransactions = Array.from(
    transactions.reduce((rows, transaction) => {
      if (!transaction.supplier_id) return rows;

      if (!rows.has(transaction.supplier_id)) {
        rows.set(transaction.supplier_id, {
          supplier_id: transaction.supplier_id,
          supplier_name: transaction.supplier_name || `Προμηθευτής #${transaction.supplier_id}`,
          total_credit_charges: 0,
          total_payments: 0,
          outstanding_balance: 0,
        });
      }

      return rows;
    }, new Map<number, SupplierLedgerRow>())
  ).map(([, supplier]) => supplier);

  const supplierRows = Array.from(
    [...supplierLedger, ...suppliersFromTransactions].reduce((rows, supplier) => {
      if (!rows.has(supplier.supplier_id)) {
        rows.set(supplier.supplier_id, supplier);
      }

      return rows;
    }, new Map<number, SupplierLedgerRow>())
  ).map(([, supplier]) => supplier);

  const rows = supplierRows
    .map((supplier) => {
      const supplierTransactions = transactions.filter(
        (transaction) => transaction.supplier_id === supplier.supplier_id
      );
      const totalPayments = supplierTransactions
        .filter(
          (transaction) =>
            (transaction.type === 'expense' || transaction.type === 'supplier_payment') &&
            paidMethods.includes(transaction.payment_method)
        )
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      const creditCharges = supplierTransactions
        .filter((transaction) => transaction.type === 'expense' && transaction.payment_method === 'credit')
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      const supplierPayments = supplierTransactions
        .filter((transaction) => transaction.type === 'supplier_payment')
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      return {
        ...supplier,
        total_credit_charges: creditCharges,
        total_payments: totalPayments,
        outstanding_balance: creditCharges - supplierPayments,
      };
    })
    .filter(
      (supplier) =>
        supplier.total_credit_charges !== 0 ||
        supplier.total_payments !== 0 ||
        supplier.outstanding_balance !== 0
    );

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800">
      <table className="w-full min-w-[760px] text-left">
        <thead className="bg-zinc-900/90">
          <tr>
            <th className="px-4 py-3 text-sm text-zinc-400">Προμηθευτής</th>
            <th className="px-4 py-3 text-sm text-zinc-400">Πληρωμένα</th>
            <th className="px-4 py-3 text-sm text-zinc-400">Υπόλοιπο Πίστωσης</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((supplier) => {
            const expanded = expandedSupplierId === supplier.supplier_id;
            const history = transactions
              .filter(
                (transaction) =>
                  transaction.supplier_id === supplier.supplier_id &&
                  ((transaction.type === 'expense' && transaction.payment_method === 'credit') ||
                    transaction.type === 'supplier_payment' ||
                    (transaction.type === 'expense' && paidMethods.includes(transaction.payment_method)))
              )
              .sort((left, right) => right.date.localeCompare(left.date));

            return (
              <Fragment key={supplier.supplier_id}>
                <tr
                  onClick={() => setExpandedSupplierId(expanded ? null : supplier.supplier_id)}
                  className="cursor-pointer border-t border-zinc-800 hover:bg-zinc-900/60"
                >
                  <td className="px-4 py-4 text-sm text-white">{supplier.supplier_name}</td>
                  <td className="px-4 py-4 text-sm text-zinc-200">{money(supplier.total_payments)}</td>
                  <td
                    className={`px-4 py-4 text-sm ${
                      supplier.outstanding_balance > 0 ? 'text-rose-300' : 'text-zinc-200'
                    }`}
                  >
                    {money(supplier.outstanding_balance)}
                  </td>
                </tr>
                {expanded && (
                  <tr className="border-t border-zinc-800 bg-zinc-950/80">
                    <td colSpan={3} className="p-4">
                      <div className="overflow-hidden rounded-2xl border border-zinc-800">
                        <table className="w-full text-left">
                          <thead className="bg-zinc-900/70">
                            <tr>
                              <th className="px-4 py-3 text-sm text-zinc-400">Ημερομηνία</th>
                              <th className="px-4 py-3 text-sm text-zinc-400">Τύπος</th>
                              <th className="px-4 py-3 text-sm text-zinc-400">Ποσό</th>
                              <th className="px-4 py-3 text-sm text-zinc-400">Σημειώσεις</th>
                            </tr>
                          </thead>
                          <tbody>
                            {history.map((transaction) => (
                              <tr key={transaction.id} className="border-t border-zinc-800">
                                <td className="px-4 py-3 text-sm text-zinc-200">{transaction.date}</td>
                                <td className="px-4 py-3 text-sm text-zinc-200">
                                  {transaction.type === 'supplier_payment'
                                    ? 'Πληρωμή Προμηθευτή'
                                    : transaction.payment_method === 'credit'
                                      ? 'Χρέωση Πίστωσης'
                                      : 'Πληρωμένο Έξοδο'}
                                </td>
                                <td className="px-4 py-3 text-sm text-zinc-200">{money(transaction.amount)}</td>
                                <td className="px-4 py-3 text-sm text-zinc-200">{transaction.notes || '-'}</td>
                              </tr>
                            ))}
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
      {rows.length === 0 && <p className="p-6 text-sm text-zinc-500">Δεν βρέθηκαν προμηθευτές.</p>}
    </div>
  );
}
