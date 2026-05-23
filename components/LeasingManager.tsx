'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchCars } from '@/lib/carsApi';
import { addTransaction, deleteTransaction } from '@/lib/financeApi';
import {
  addLeasingContract,
  addLeasingPayment,
  deleteLeasingContract,
  fetchLeasingContracts,
  fetchLeasingPayments,
  updateLeasingContract,
  type LeasingContract,
  type LeasingStatus,
} from '@/lib/leasingApi';

const initialContractForm = {
  customer_name: '',
  car_id: '',
  tax_id: '',
  phone: '',
  vehicle_description: '',
  total_amount: '',
  down_payment: '',
  installments_count: '',
  start_date: new Date().toISOString().split('T')[0],
  payment_method: 'cash',
  notes: '',
};

const initialPaymentForm = {
  amount: '',
  payment_date: new Date().toISOString().split('T')[0],
  payment_method: 'cash',
  notes: '',
};

const paymentOptions = [
  { value: 'cash', label: 'Μετρητά' },
  { value: 'card', label: 'Κάρτα' },
  { value: 'bank', label: 'Τράπεζα' },
];

const statusLabels: Record<LeasingStatus, string> = {
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const money = (value: number) =>
  `€${Number(value || 0).toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type LeasingCar = {
  id: number;
  plate: string;
  brand: string;
  model: string;
};

export default function LeasingManager() {
  const [cars, setCars] = useState<LeasingCar[]>([]);
  const [contracts, setContracts] = useState<LeasingContract[]>([]);
  const [showContractModal, setShowContractModal] = useState(false);
  const [paymentContract, setPaymentContract] = useState<LeasingContract | null>(null);
  const [contractForm, setContractForm] = useState(initialContractForm);
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadContracts = async () => {
    setLoading(true);
    const [contractRows, carRows] = await Promise.all([fetchLeasingContracts(), fetchCars()]);
    setContracts(contractRows);
    setCars(
      (carRows || []).map((car: any) => ({
        id: Number(car.id),
        plate: car.plate || '',
        brand: car.brand || '',
        model: car.model || '',
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    loadContracts();
  }, []);

  const totals = useMemo(
    () =>
      contracts.reduce(
        (acc, contract) => {
          acc.total += Number(contract.total_amount || 0);
          acc.remaining += Number(contract.remaining_amount || 0);
          return acc;
        },
        { total: 0, remaining: 0 }
      ),
    [contracts]
  );

  const contractTotalAmount = Number(contractForm.total_amount || 0);
  const contractDownPayment = Number(contractForm.down_payment || 0);
  const contractInstallmentsCount = Number(contractForm.installments_count || 0);
  const contractRemainingAmount = Math.max(0, contractTotalAmount - contractDownPayment);
  const contractMonthlyPayment =
    contractInstallmentsCount > 0 ? contractRemainingAmount / contractInstallmentsCount : 0;
  const getCarLabel = (carId?: number | null) => {
    const car = cars.find((item) => item.id === Number(carId));
    return car ? `${car.plate} - ${car.brand} ${car.model}` : '-';
  };

  const openNewContract = () => {
    setContractForm({
      ...initialContractForm,
      start_date: new Date().toISOString().split('T')[0],
    });
    setShowContractModal(true);
  };

  const openPaymentModal = (contract: LeasingContract) => {
    setPaymentContract(contract);
    setPaymentForm({
      ...initialPaymentForm,
      payment_date: new Date().toISOString().split('T')[0],
    });
  };

  const recordPayment = async (
    contract: LeasingContract,
    amount: number,
    paymentDate: string,
    paymentMethod: string,
    notes: string | null,
    options: { isDownPayment?: boolean } = {}
  ) => {
    const transaction = await addTransaction({
      type: 'income',
      source: 'leasing',
      amount,
      date: paymentDate,
      payment_method: paymentMethod,
      car_id: contract.car_id ? Number(contract.car_id) : null,
      category: 'leasing',
      notes: notes || `Leasing payment: ${contract.customer_name}`,
    });

    if (!transaction) {
      return false;
    }

    const nextRemaining = Math.max(0, Number(contract.remaining_amount || 0) - amount);
    const nextStatus: LeasingStatus = nextRemaining <= 0 ? 'completed' : contract.status;
    const updated = await updateLeasingContract(contract.id, {
      remaining_amount: nextRemaining,
      status: nextStatus,
      ...(options.isDownPayment ? { down_payment_transaction_id: Number(transaction.id) } : {}),
    });

    if (!updated) {
      alert('Η πληρωμή αποθηκεύτηκε, αλλά δεν ενημερώθηκε το υπόλοιπο leasing.');
      return false;
    }

    if (!options.isDownPayment) {
      const payment = await addLeasingPayment({
        leasing_contract_id: contract.id,
        amount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        notes,
        transaction_id: Number(transaction.id),
      });

      if (!payment) {
        alert('Η κίνηση εσόδου δημιουργήθηκε, αλλά δεν αποθηκεύτηκε η πληρωμή leasing.');
        return false;
      }
    }

    return true;
  };

  const handleSaveContract = async () => {
    if (!contractForm.customer_name.trim()) {
      alert('Συμπληρώστε πελάτη.');
      return;
    }
    if (!contractForm.car_id) {
      alert('Επιλέξτε αυτοκίνητο.');
      return;
    }
    const selectedCar = cars.find((car) => car.id === Number(contractForm.car_id));
    const vehicleDescription =
      contractForm.vehicle_description.trim() ||
      (selectedCar ? `${selectedCar.plate} - ${selectedCar.brand} ${selectedCar.model}` : '');

    const totalAmount = Number(contractForm.total_amount || 0);
    const downPayment = Number(contractForm.down_payment || 0);
    const installmentsCount = Number(contractForm.installments_count || 0);
    const remainingAmount = Math.max(0, totalAmount - downPayment);
    const monthlyPayment = installmentsCount > 0 ? remainingAmount / installmentsCount : 0;

    if (totalAmount <= 0 || Number.isNaN(totalAmount)) {
      alert('Συμπληρώστε σωστό συνολικό ποσό.');
      return;
    }
    if (Number.isNaN(downPayment) || Number.isNaN(installmentsCount)) {
      alert('Τα ποσά πρέπει να είναι αριθμητικά.');
      return;
    }
    if (installmentsCount <= 0) {
      alert('Συμπληρώστε αριθμό δόσεων.');
      return;
    }

    setSaving(true);

    const contract = await addLeasingContract({
      customer_name: contractForm.customer_name.trim(),
      car_id: Number(contractForm.car_id),
      tax_id: contractForm.tax_id || null,
      phone: contractForm.phone || null,
      vehicle_description: vehicleDescription,
      total_amount: totalAmount,
      down_payment: downPayment,
      remaining_amount: totalAmount,
      installments_count: installmentsCount,
      monthly_payment: monthlyPayment,
      start_date: contractForm.start_date || null,
      notes: contractForm.notes || null,
      status: 'active',
    });

    if (!contract) {
      setSaving(false);
      return;
    }

    if (downPayment > 0) {
      await recordPayment(
        contract,
        downPayment,
        contractForm.start_date || new Date().toISOString().split('T')[0],
        contractForm.payment_method,
        `Προκαταβολή leasing: ${contract.customer_name}`,
        { isDownPayment: true }
      );
    }

    await loadContracts();
    setShowContractModal(false);
    setSaving(false);
  };

  const handleSavePayment = async () => {
    if (!paymentContract) return;

    const amount = Number(paymentForm.amount || 0);
    if (amount <= 0 || Number.isNaN(amount)) {
      alert('Συμπληρώστε σωστό ποσό δόσης.');
      return;
    }
    if (amount > Number(paymentContract.remaining_amount || 0)) {
      alert('Το ποσό δεν μπορεί να είναι μεγαλύτερο από το υπόλοιπο.');
      return;
    }

    setSaving(true);
    const success = await recordPayment(
      paymentContract,
      amount,
      paymentForm.payment_date,
      paymentForm.payment_method,
      paymentForm.notes || `Δόση leasing: ${paymentContract.customer_name}`
    );

    if (success) {
      await loadContracts();
      setPaymentContract(null);
    }
    setSaving(false);
  };

  const handleDeleteContract = async (contract: LeasingContract) => {
    if (!window.confirm(`Να διαγραφεί το leasing του πελάτη "${contract.customer_name}";`)) {
      return;
    }

    setSaving(true);
    const payments = await fetchLeasingPayments(contract.id);
    const transactionIds = Array.from(
      new Set(
        [
          contract.down_payment_transaction_id,
          ...payments.map((payment) => payment.transaction_id),
        ]
          .filter((id): id is number => Boolean(id))
          .map((id) => Number(id))
      )
    );

    for (const transactionId of transactionIds) {
      const deleted = await deleteTransaction(transactionId);
      if (!deleted) {
        console.error('Leasing transaction delete failed:', {
          contractId: contract.id,
          transactionId,
        });
        alert('Δεν διαγράφηκαν όλες οι οικονομικές κινήσεις του leasing.');
        setSaving(false);
        return;
      }
    }

    const deletedContract = await deleteLeasingContract(contract.id);
    if (!deletedContract) {
      alert('Το leasing δεν διαγράφηκε.');
      setSaving(false);
      return;
    }

    await loadContracts();
    setSaving(false);
  };

  return (
    <div className="space-y-5 text-white">
      <div className="flex flex-col gap-4 rounded-3xl border border-cyan-300/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(8,12,18,0.38)_45%,rgba(255,255,255,0.02))] px-5 py-4 shadow-[0_20px_54px_rgba(0,0,0,0.24)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/60">Contracts</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Leasing</h2>
          <p className="mt-1 text-sm text-zinc-400">Πελάτες, συμφωνίες leasing και καταχωρήσεις δόσεων.</p>
        </div>
        <button
          type="button"
          onClick={openNewContract}
          className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.08)] transition duration-200 hover:-translate-y-px hover:border-cyan-300/45 hover:bg-cyan-400/16"
        >
          + Νέο Leasing
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Συμφωνίες" value={String(contracts.length)} />
        <SummaryCard label="Σύνολο Συμφωνιών" value={money(totals.total)} />
        <SummaryCard label="Υπόλοιπα" value={money(totals.remaining)} />
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left">
            <thead className="bg-white/[0.025] text-[11px] uppercase tracking-[0.16em] text-zinc-500">
              <tr>
                <th className="px-4 py-3">Πελάτης</th>
                <th className="px-4 py-3">ΑΦΜ</th>
                <th className="px-4 py-3">Τηλέφωνο</th>
                <th className="px-4 py-3">Περιγραφή / Όχημα</th>
                <th className="px-4 py-3 text-right">Σύνολο</th>
                <th className="px-4 py-3 text-right">Προκαταβολή</th>
                <th className="px-4 py-3 text-right">Υπόλοιπο</th>
                <th className="px-4 py-3 text-right">Μηνιαία</th>
                <th className="px-4 py-3">Έναρξη</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ενέργειες</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sm text-zinc-500">
                    Φόρτωση...
                  </td>
                </tr>
              )}
              {!loading && contracts.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sm text-zinc-500">
                    Δεν υπάρχουν leasing agreements.
                  </td>
                </tr>
              )}
              {contracts.map((contract) => (
                <tr key={contract.id} className="border-t border-white/[0.055] transition duration-200 hover:bg-white/[0.035]">
                  <td className="px-4 py-4 text-sm font-semibold text-white">{contract.customer_name}</td>
                  <td className="px-4 py-4 text-sm text-zinc-300">{contract.tax_id || '-'}</td>
                  <td className="px-4 py-4 text-sm text-zinc-300">{contract.phone || '-'}</td>
                  <td className="px-4 py-4 text-sm text-zinc-300">{getCarLabel(contract.car_id)}</td>
                  <td className="px-4 py-4 text-right text-sm text-zinc-200">{money(contract.total_amount)}</td>
                  <td className="px-4 py-4 text-right text-sm text-zinc-200">{money(contract.down_payment)}</td>
                  <td className="px-4 py-4 text-right text-sm font-semibold text-cyan-100">{money(contract.remaining_amount)}</td>
                  <td className="px-4 py-4 text-right text-sm text-zinc-200">{money(contract.monthly_payment)}</td>
                  <td className="px-4 py-4 text-sm text-zinc-300">{contract.start_date || '-'}</td>
                  <td className="px-4 py-4 text-sm">
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-zinc-200">
                      {statusLabels[contract.status] || contract.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openPaymentModal(contract)}
                        disabled={contract.status !== 'active' || Number(contract.remaining_amount || 0) <= 0}
                        className="rounded-xl border border-emerald-400/24 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition duration-200 hover:-translate-y-px hover:border-emerald-300/38 hover:bg-emerald-400/18 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Καταχώρηση Δόσης
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteContract(contract)}
                        disabled={saving}
                        className="rounded-xl border border-rose-400/28 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200 transition duration-200 hover:-translate-y-px hover:border-rose-300/45 hover:bg-rose-400/18 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Διαγραφή
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showContractModal && (
        <Modal title="Νέο Leasing" onClose={() => setShowContractModal(false)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Πελάτης">
              <input value={contractForm.customer_name} onChange={(event) => setContractForm({ ...contractForm, customer_name: event.target.value })} className="input" />
            </Field>
            <Field label="ΑΦΜ">
              <input value={contractForm.tax_id} onChange={(event) => setContractForm({ ...contractForm, tax_id: event.target.value })} className="input" />
            </Field>
            <Field label="Τηλέφωνο">
              <input value={contractForm.phone} onChange={(event) => setContractForm({ ...contractForm, phone: event.target.value })} className="input" />
            </Field>
            <Field label="Περιγραφή / Όχημα">
              <select value={contractForm.car_id} onChange={(event) => setContractForm({ ...contractForm, car_id: event.target.value })} className="input">
                <option value="">Επιλογή αυτοκινήτου</option>
                {cars.map((car) => (
                  <option key={car.id} value={car.id}>
                    {car.plate} - {car.brand} {car.model}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Συνολικό ποσό συμφωνίας">
              <input value={contractForm.total_amount} onChange={(event) => setContractForm({ ...contractForm, total_amount: event.target.value })} className="input" />
            </Field>
            <Field label="Προκαταβολή">
              <input value={contractForm.down_payment} onChange={(event) => setContractForm({ ...contractForm, down_payment: event.target.value })} className="input" />
            </Field>
            <Field label="Αριθμός δόσεων">
              <input value={contractForm.installments_count} onChange={(event) => setContractForm({ ...contractForm, installments_count: event.target.value })} className="input" />
            </Field>
            <Field label="Μηνιαία δόση">
              <input value={money(contractMonthlyPayment)} readOnly className="input opacity-70" />
            </Field>
            <Field label="Ημερομηνία έναρξης">
              <input type="date" value={contractForm.start_date} onChange={(event) => setContractForm({ ...contractForm, start_date: event.target.value })} className="input" />
            </Field>
            <Field label="Τρόπος πληρωμής προκαταβολής">
              <select value={contractForm.payment_method} onChange={(event) => setContractForm({ ...contractForm, payment_method: event.target.value })} className="input">
                {paymentOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Περιγραφή / Σημείωση οχήματος">
            <input value={contractForm.vehicle_description} onChange={(event) => setContractForm({ ...contractForm, vehicle_description: event.target.value })} className="input" />
          </Field>
          <Field label="Σημειώσεις">
            <textarea value={contractForm.notes} onChange={(event) => setContractForm({ ...contractForm, notes: event.target.value })} className="input min-h-24" />
          </Field>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowContractModal(false)} className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.04]">
              Ακύρωση
            </button>
            <button type="button" onClick={handleSaveContract} disabled={saving} className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-cyan-300 disabled:opacity-55">
              {saving ? 'Αποθήκευση...' : 'Αποθήκευση'}
            </button>
          </div>
        </Modal>
      )}

      {paymentContract && (
        <Modal title={`Καταχώρηση Δόσης — ${paymentContract.customer_name}`} onClose={() => setPaymentContract(null)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Ποσό">
              <input value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} className="input" />
            </Field>
            <Field label="Ημερομηνία">
              <input type="date" value={paymentForm.payment_date} onChange={(event) => setPaymentForm({ ...paymentForm, payment_date: event.target.value })} className="input" />
            </Field>
            <Field label="Τρόπος πληρωμής">
              <select value={paymentForm.payment_method} onChange={(event) => setPaymentForm({ ...paymentForm, payment_method: event.target.value })} className="input">
                {paymentOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Υπόλοιπο">
              <input value={money(paymentContract.remaining_amount)} readOnly className="input opacity-70" />
            </Field>
          </div>
          <Field label="Σημειώσεις">
            <textarea value={paymentForm.notes} onChange={(event) => setPaymentForm({ ...paymentForm, notes: event.target.value })} className="input min-h-24" />
          </Field>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setPaymentContract(null)} className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.04]">
              Ακύρωση
            </button>
            <button type="button" onClick={handleSavePayment} disabled={saving} className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:opacity-55">
              {saving ? 'Καταχώρηση...' : 'Καταχώρηση Δόσης'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/[0.06] bg-white/[0.018] p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="flex max-h-[86vh] w-[min(820px,92vw)] flex-col overflow-hidden rounded-[28px] border border-cyan-300/15 bg-[linear-gradient(180deg,rgba(18,24,33,0.98),rgba(8,12,18,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.62)]">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-xl border border-transparent p-2 text-zinc-400 transition hover:border-white/[0.08] hover:bg-white/[0.05] hover:text-white">
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2 text-sm text-zinc-300">
      <span>{label}</span>
      {children}
    </label>
  );
}
