'use client';

import { useEffect, useState } from 'react';
import { addDebt, fetchDebts, recordDebtPayment, type DebtRecord } from '@/lib/debtsApi';
import type { SupplierRecord } from '@/lib/suppliersApi';

type DebtVehicle = {
  id: string;
  plate: string;
};

type DebtsManagerProps = {
  vehicles: DebtVehicle[];
  suppliers: SupplierRecord[];
};

const money = (value: number) =>
  `€${Number(value || 0).toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusLabels: Record<string, string> = {
  open: 'Ανοιχτή',
  partial: 'Μερικώς',
  paid: 'Πληρωμένη',
};

const statusClasses: Record<string, string> = {
  open: 'border-amber-400/25 bg-amber-400/10 text-amber-200',
  partial: 'border-sky-400/25 bg-sky-400/10 text-sky-200',
  paid: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
};

const categories = ['Δάνειο', 'Leasing', 'Γραμμάτιο', 'Κάρτα', 'Άλλο'];

const initialForm = {
  title: '',
  supplier_id: '',
  car_id: '',
  category: '',
  due_date: '',
  original_amount: '',
  notes: '',
};

const initialPaymentForm = {
  amount: '',
  date: new Date().toISOString().split('T')[0],
  payment_method: 'cash',
  notes: '',
};

export default function DebtsManager({ vehicles, suppliers }: DebtsManagerProps) {
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [paymentDebt, setPaymentDebt] = useState<DebtRecord | null>(null);
  const [form, setForm] = useState(initialForm);
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);

  const loadDebts = async () => {
    setDebts(await fetchDebts());
  };

  useEffect(() => {
    loadDebts();
  }, []);

  const showPlaceholder = () => {
    alert('Θα συνδεθεί στο επόμενο βήμα.');
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(initialForm);
  };

  const closePaymentModal = () => {
    setPaymentDebt(null);
    setPaymentForm(initialPaymentForm);
  };

  const handleSaveDebt = async () => {
    if (!form.title.trim()) {
      alert('Συμπληρώστε τίτλο.');
      return;
    }

    if (!form.original_amount || Number(form.original_amount) <= 0) {
      alert('Συμπληρώστε αρχικό ποσό.');
      return;
    }

    const created = await addDebt({
      title: form.title.trim(),
      supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      car_id: form.car_id ? Number(form.car_id) : null,
      category: form.category,
      due_date: form.due_date || null,
      original_amount: Number(form.original_amount),
      paid_amount: 0,
      notes: form.notes || null,
    });

    if (!created) {
      alert('Η οφειλή δεν αποθηκεύτηκε.');
      return;
    }

    closeModal();
    await loadDebts();
  };

  const handleSavePayment = async () => {
    if (!paymentDebt) return;

    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) {
      alert('Συμπληρώστε ποσό πληρωμής.');
      return;
    }

    if (amount > Number(paymentDebt.remaining_amount || 0)) {
      alert('Το ποσό πληρωμής δεν μπορεί να είναι μεγαλύτερο από το υπόλοιπο.');
      return;
    }

    const result = await recordDebtPayment(Number(paymentDebt.id), {
      amount,
      date: paymentForm.date,
      payment_method: paymentForm.payment_method,
    });

    if (!result.success) {
      if (result.expenseCreated) {
        alert('Η πληρωμή καταχωρήθηκε στα έξοδα αλλά δεν ενημερώθηκε η οφειλή.');
      }
      return;
    }

    closePaymentModal();
    await loadDebts();
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="rounded-2xl border border-fuchsia-400/30 bg-fuchsia-400/10 px-4 py-3 text-sm font-semibold text-fuchsia-200 transition hover:bg-fuchsia-400/20"
        >
          + Νέα Οφειλή
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <table className="w-full min-w-[1160px] text-left">
          <thead className="bg-zinc-900/90">
            <tr>
              {[
                'Ημ/νία Πληρωμής',
                'Τίτλος',
                'Αυτοκίνητο',
                'Φορέας',
                'Κατηγορία',
                'Αρχικό',
                'Πληρωμένο',
                'Υπόλοιπο',
                'Κατάσταση',
                'Ενέργειες',
              ].map((label) => (
                <th key={label} className="px-3 py-3 text-sm text-zinc-400">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {debts.map((debt) => (
              <tr key={debt.id} className="border-t border-zinc-800">
                <td className="whitespace-nowrap px-3 py-3 text-sm text-zinc-200">{debt.due_date || '-'}</td>
                <td className="px-3 py-3 text-sm font-medium text-white">{debt.title}</td>
                <td className="px-3 py-3 text-sm text-zinc-200">
                  {vehicles.find((vehicle) => Number(vehicle.id) === Number(debt.car_id))?.plate || '-'}
                </td>
                <td className="px-3 py-3 text-sm text-zinc-200">
                  {suppliers.find((supplier) => supplier.id === debt.supplier_id)?.name || '-'}
                </td>
                <td className="px-3 py-3 text-sm text-zinc-200">{debt.category || '-'}</td>
                <td className="px-3 py-3 text-right text-sm text-zinc-200">{money(debt.original_amount)}</td>
                <td className="px-3 py-3 text-right text-sm text-zinc-200">{money(debt.paid_amount)}</td>
                <td className="px-3 py-3 text-right text-sm text-zinc-200">{money(debt.remaining_amount)}</td>
                <td className="px-3 py-3 text-sm">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${statusClasses[debt.status] || 'border-zinc-700 bg-zinc-800 text-zinc-200'}`}>
                    {statusLabels[debt.status] || debt.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setPaymentDebt(debt)}
                      className="rounded-xl border border-fuchsia-400/25 bg-fuchsia-400/10 px-3 py-2 text-xs text-fuchsia-200 transition hover:bg-fuchsia-400/20"
                    >
                      Πληρωμή
                    </button>
                    {['Επεξεργασία', 'Διαγραφή'].map((label) => (
                      <button
                        key={`${debt.id}-${label}`}
                        type="button"
                        onClick={showPlaceholder}
                        className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-zinc-200 transition hover:bg-white/[0.07]"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {debts.length === 0 && <p className="p-6 text-sm text-zinc-500">Δεν υπάρχουν καταχωρημένες οφειλές.</p>}
      </div>

      {showModal && <DebtFormModal form={form} setForm={setForm} suppliers={suppliers} vehicles={vehicles} onClose={closeModal} onSave={handleSaveDebt} />}

      {paymentDebt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className="flex w-[min(520px,92vw)] flex-col overflow-hidden rounded-[28px] border border-fuchsia-300/15 bg-[linear-gradient(180deg,rgba(18,24,33,0.98),rgba(8,12,18,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.62)]">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5">
              <h2 className="text-lg font-semibold text-white">Πληρωμή Οφειλής</h2>
              <button type="button" onClick={closePaymentModal} className="rounded-xl border border-transparent p-2 text-zinc-400 transition hover:border-white/[0.08] hover:bg-white/[0.05] hover:text-white">
                ✕
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <Field label="Ποσό Πληρωμής">
                <input value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} className="input" />
              </Field>
              <Field label="Ημερομηνία">
                <input type="date" value={paymentForm.date} onChange={(event) => setPaymentForm({ ...paymentForm, date: event.target.value })} className="input" />
              </Field>
              <Field label="Τρόπος Πληρωμής">
                <select value={paymentForm.payment_method} onChange={(event) => setPaymentForm({ ...paymentForm, payment_method: event.target.value })} className="input">
                  <option value="cash">Μετρητά</option>
                  <option value="card">Κάρτα</option>
                  <option value="bank">Τράπεζα</option>
                </select>
              </Field>
              <Field label="Σημειώσεις">
                <textarea value={paymentForm.notes} onChange={(event) => setPaymentForm({ ...paymentForm, notes: event.target.value })} className="input min-h-24" />
              </Field>
            </div>
            <div className="flex justify-end gap-3 border-t border-white/[0.08] bg-black/20 px-6 py-4">
              <button type="button" onClick={closePaymentModal} className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.04]">
                Ακύρωση
              </button>
              <button type="button" onClick={handleSavePayment} className="rounded-2xl bg-fuchsia-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-fuchsia-400">
                Αποθήκευση
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DebtFormModal({
  form,
  setForm,
  suppliers,
  vehicles,
  onClose,
  onSave,
}: {
  form: typeof initialForm;
  setForm: React.Dispatch<React.SetStateAction<typeof initialForm>>;
  suppliers: SupplierRecord[];
  vehicles: DebtVehicle[];
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="flex max-h-[86vh] w-[min(760px,92vw)] flex-col overflow-hidden rounded-[28px] border border-fuchsia-300/15 bg-[linear-gradient(180deg,rgba(18,24,33,0.98),rgba(8,12,18,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.62)]">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5">
          <h2 className="text-lg font-semibold text-white">Νέα Οφειλή</h2>
          <button type="button" onClick={onClose} className="rounded-xl border border-transparent p-2 text-zinc-400 transition hover:border-white/[0.08] hover:bg-white/[0.05] hover:text-white">
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Τίτλος">
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="input" />
            </Field>
            <Field label="Φορέας">
              <select value={form.supplier_id} onChange={(event) => setForm({ ...form, supplier_id: event.target.value })} className="input">
                <option value="">Επιλογή φορέα</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Αυτοκίνητο">
              <select value={form.car_id} onChange={(event) => setForm({ ...form, car_id: event.target.value })} className="input">
                <option value="">Επιλογή αυτοκινήτου</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Κατηγορία">
              <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="input">
                <option value="">Επιλογή κατηγορίας</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ημ/νία Πληρωμής">
              <input type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} className="input" />
            </Field>
            <Field label="Αρχικό Ποσό">
              <input value={form.original_amount} onChange={(event) => setForm({ ...form, original_amount: event.target.value })} className="input" />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Σημειώσεις">
              <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="input min-h-24" />
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-white/[0.08] bg-black/20 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.04]">
            Ακύρωση
          </button>
          <button type="button" onClick={onSave} className="rounded-2xl bg-fuchsia-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-fuchsia-400">
            Αποθήκευση
          </button>
        </div>
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
