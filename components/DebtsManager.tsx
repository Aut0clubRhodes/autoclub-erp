'use client';

import { useEffect, useState } from 'react';
import {
  addDebt,
  deleteDebt,
  updateDebt,
  fetchDebts,
  recordDebtPayment,
  type DebtRecord
} from '@/lib/debtsApi';
import { fetchCars } from '@/lib/carsApi';
import type { SupplierRecord } from '@/lib/suppliersApi';

type DebtVehicle = {
  id: number | string;
  plate: string;
};

type ImportCar = {
  id: number | string;
  plate?: string | null;
  brand?: string | null;
  model?: string | null;
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
  console.log('DEBTS VEHICLES:', vehicles);
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingDebtId, setEditingDebtId] = useState<number | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [paymentDebt, setPaymentDebt] = useState<DebtRecord | null>(null);
  const [form, setForm] = useState(initialForm);
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);
  const [importFile, setImportFile] = useState<File | null>(null);

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

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
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
if (editingDebtId) {
  await updateDebt(editingDebtId, {
    title: form.title.trim(),
    supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
    car_id: form.car_id ? Number(form.car_id) : null,
    category: form.category,
    due_date: form.due_date || null,
    original_amount: Number(form.original_amount),
    notes: form.notes || null,
  });

  closeModal();
  await loadDebts();
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
const handleDeleteDebt = async (debtId: number) => {
  const confirmed = window.confirm('Να διαγραφεί η οφειλή;');

  if (!confirmed) return;

  const deleted = await deleteDebt(debtId);

  if (!deleted) {
    alert('Η οφειλή δεν διαγράφηκε.');
    return;
  }

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
      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={() => setShowImportModal(true)}
          className="rounded-2xl border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-sm font-semibold text-sky-200 transition hover:bg-sky-400/20"
        >
          Import Δοσολογίου
        </button>
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
            {[...debts]
  .sort((a, b) => {
    const dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
    const dateB = b.due_date ? new Date(b.due_date).getTime() : 0;

    return dateA - dateB;
  })
  .map((debt) => (
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
 onClick={() => {
  if (label === 'Διαγραφή') {
    handleDeleteDebt(Number(debt.id));
    return;
  }

  if (label === 'Επεξεργασία') {
    setEditingDebtId(Number(debt.id));

    setForm({
      title: debt.title || '',
      supplier_id: debt.supplier_id ? String(debt.supplier_id) : '',
      car_id: debt.car_id ? String(debt.car_id) : '',
      category: debt.category || '',
      due_date: debt.due_date || '',
      original_amount: String(debt.original_amount || ''),
      notes: debt.notes || '',
    });

    setShowModal(true);
  }
}}
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

      {showImportModal && (
        <DebtImportModal
          file={importFile}
          setFile={setImportFile}
          onClose={closeImportModal}
          onImported={loadDebts}
        />
      )}

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

function DebtImportModal({
  file,
  setFile,
  onClose,
  onImported,
}: {
  file: File | null;
  setFile: React.Dispatch<React.SetStateAction<File | null>>;
  onClose: () => void;
  onImported: () => Promise<void>;
}){
  const [cars, setCars] = useState<ImportCar[]>([]);
  const [selectedCarId, setSelectedCarId] = useState('');
  const previewColumns = ['Αρ. Δόσης', 'Ημερομηνία Πληρωμής', 'Ποσό Δόσης', 'Κεφάλαιο', 'Τόκος'];
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const toIsoDate = (date: string) => {
  const [day, month, year] = date.split('/');
  return `${year}-${month}-${day}`;
};
  const handleImportApprove = async () => {
  if (!selectedCarId || previewRows.length === 0) {
    return;
  }
  for (const row of previewRows)
    {
    const created = await addDebt({
      title: `Δόση ${row.installment}`,
      supplier_id: null,
      car_id: Number(selectedCarId),
      category: 'Δάνειο',
      due_date: toIsoDate(row.paymentDate),
     original_amount: Number(
  String(row.amount)
    .replace('€', '')
    .replace(',', '.')
    .trim()
),
      paid_amount: 0,
      notes: `Κεφάλαιο: ${row.capital} | Τόκος: ${row.interest}`,
    });
    console.log('CREATED', created);
  }

  alert('Οι δόσεις καταχωρήθηκαν.');
  onClose();
};
  useEffect(() => {
    fetchCars().then((records) => setCars(records as ImportCar[]));
  }, []);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="flex max-h-[86vh] w-[min(860px,92vw)] flex-col overflow-hidden rounded-[28px] border border-sky-300/15 bg-[linear-gradient(180deg,rgba(18,24,33,0.98),rgba(8,12,18,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.62)]">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300/70">OCR Import V1</p>
            <h2 className="mt-1 text-lg font-semibold text-white">Import Δοσολογίου Δανείου</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-transparent p-2 text-zinc-400 transition hover:border-white/[0.08] hover:bg-white/[0.05] hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Αυτοκίνητο">
              <select value={selectedCarId} onChange={(event) => setSelectedCarId(event.target.value)} className="input" required>
                <option value="">Επιλογή αυτοκινήτου</option>
                {cars.map((car) => (
                  <option key={car.id} value={car.id}>
                    {[car.plate, `${car.brand || ''} ${car.model || ''}`.trim()].filter(Boolean).join(' - ')}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Αρχείο Δοσολογίου">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(event) => {
                 setFile(event.target.files?.[0] || null);
                setPreviewRows([
  {
    installment: 1,
    paymentDate: '02/06/2026',
    amount: '922,33',
    capital: '721,58',
    interest: '50,75',
  },
  {
    installment: 2,
    paymentDate: '02/07/2026',
    amount: '772,33',
    capital: '676,46',
    interest: '95,87',
  },
  {
    installment: 3,
    paymentDate: '03/08/2026',
    amount: '772,33',
    capital: '675,70',
    interest: '96,63',
  },
  {
    installment: 4,
    paymentDate: '02/09/2026',
    amount: '772,33',
    capital: '687,02',
    interest: '85,31',
  },
  {
    installment: 5,
    paymentDate: '02/10/2026',
    amount: '772,33',
    capital: '692,38',
    interest: '79,95',
  },
  {
    installment: 6,
    paymentDate: '02/11/2026',
    amount: '120,00',
    capital: '42,97',
    interest: '77,03',
  },
  {
    installment: 7,
    paymentDate: '02/12/2026',
    amount: '120,00',
    capital: '45,79',
    interest: '74,21',
    },
]);
    }}
    
                
                className="block w-full text-sm text-zinc-300 file:mr-4 file:rounded-xl file:border-0 file:bg-sky-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black hover:file:bg-sky-400"
              />
            </Field>
          </div>

          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-300">
            {file ? `Επιλεγμένο αρχείο: ${file.name}` : 'Δεν έχει επιλεγεί αρχείο.'}
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-800">
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-4 py-3">
              <h3 className="text-sm font-semibold text-white">Προεπισκόπηση εισαγωγής</h3>
              <span className="text-xs text-zinc-500">OCR δεν είναι ενεργό ακόμα</span>
            </div>
           <div className="max-h-[320px] overflow-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-zinc-950/50">
                  <tr>
                    {previewColumns.map((column) => (
                      <th key={column} className="px-4 py-3 text-xs font-medium text-zinc-400">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
               <tbody>
  {previewRows.length > 0 ? (
    previewRows.map((row, index) => (
      <tr key={index} className="border-t border-zinc-800">
        <td className="px-4 py-3 text-sm text-zinc-200">
          {row.installment}
        </td>
        <td className="px-4 py-3 text-sm text-zinc-200">
          {row.paymentDate}
        </td>
        <td className="px-4 py-3 text-sm text-zinc-200">
          €{row.amount}
        </td>
        <td className="px-4 py-3 text-sm text-zinc-400">
          €{row.capital}
        </td>
        <td className="px-4 py-3 text-sm text-zinc-400">
          €{row.interest}
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td
        colSpan={previewColumns.length}
        className="px-4 py-8 text-center text-sm text-zinc-500"
      >
        Επιλέξτε αρχείο για προεπισκόπηση. Η OCR ανάλυση θα συνδεθεί σε επόμενο βήμα.
      </td>
    </tr>
  )}
</tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-white/[0.08] bg-black/20 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.04]">
            Ακύρωση
          </button>
         <button
  type="button"
  disabled={!selectedCarId || !file || previewRows.length === 0}
 onClick={handleImportApprove}
            className={
  !selectedCarId || !file || previewRows.length === 0
    ? "cursor-not-allowed rounded-2xl bg-sky-500/40 px-5 py-3 text-sm font-semibold text-black opacity-60"
    : "cursor-pointer rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-sky-400"
}
          >
            Έγκριση & Καταχώρηση
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
