'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
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

type DebtSortKey =
  | 'due_date'
  | 'title'
  | 'supplier'
  | 'category'
  | 'original_amount'
  | 'paid_amount'
  | 'remaining_amount'
  | 'status';

type SortDirection = 'asc' | 'desc';

type RecurringDebtConfig = {
  monthlyAmount: number;
  firstPaymentDate: string;
  numberOfMonths: number;
  dates: string[];
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

const addMonthsToDate = (dateValue: string, monthOffset: number) => {
  const [year, month, day] = dateValue.split('-').map(Number);
  const targetMonth = new Date(Date.UTC(year, month - 1 + monthOffset, 1));
  const lastDay = new Date(
    Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)
  ).getUTCDate();

  targetMonth.setUTCDate(Math.min(day, lastDay));
  return targetMonth.toISOString().slice(0, 10);
};

const formatDate = (dateValue: string) =>
  new Intl.DateTimeFormat('el-GR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${dateValue}T00:00:00Z`));

const getRecurringTitlePattern = (title: string) =>
  title.trim().replace(/\s+\d{2}\/\d{4}$/, '').toLocaleLowerCase('el');

const getYearMonthIndex = (dateValue?: string | null) => {
  if (!dateValue) return null;
  const [year, month] = dateValue.split('-').map(Number);
  return Number.isFinite(year) && Number.isFinite(month) ? year * 12 + month : null;
};

export default function DebtsManager({ vehicles, suppliers }: DebtsManagerProps) {
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingDebtId, setEditingDebtId] = useState<number | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [paymentDebt, setPaymentDebt] = useState<DebtRecord | null>(null);
  const [form, setForm] = useState(initialForm);
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [sort, setSort] = useState<{ key: DebtSortKey; direction: SortDirection }>({
    key: 'due_date',
    direction: 'asc',
  });
  const saveInFlightRef = useRef(false);

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
    setEditingDebtId(null);
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

  const getGeneratedTitle = (dueDate?: string) => {
    const supplierName =
      suppliers.find((supplier) => Number(supplier.id) === Number(form.supplier_id))?.name ||
      'Χωρίς φορέα';
    const baseTitle = `${form.category || 'Γραμμάτιο'} - ${supplierName}`;

    if (!dueDate) return baseTitle;

    const [year, month] = dueDate.split('-');
    return `${baseTitle} ${month}/${year}`;
  };

  const handleSaveDebt = async (recurring?: RecurringDebtConfig) => {
    if (saveInFlightRef.current) return;
    saveInFlightRef.current = true;

    try {
      if (!recurring && (!form.original_amount || Number(form.original_amount) <= 0)) {
        alert('Συμπληρώστε αρχικό ποσό.');
        return;
      }

      if (editingDebtId) {
        await updateDebt(editingDebtId, {
          title: form.title.trim() || getGeneratedTitle(),
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

      if (recurring) {
        for (const dueDate of recurring.dates) {
          const created = await addDebt({
            title: form.title.trim() || getGeneratedTitle(dueDate),
            supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
            car_id: form.car_id ? Number(form.car_id) : null,
            category: form.category,
            due_date: dueDate,
            original_amount: recurring.monthlyAmount,
            paid_amount: 0,
            notes: form.notes || null,
          });

          if (!created) {
            alert('Η δημιουργία των μηνιαίων γραμματίων δεν ολοκληρώθηκε.');
            await loadDebts();
            return;
          }
        }

        closeModal();
        await loadDebts();
        return;
      }

      const created = await addDebt({
        title: form.title.trim() || getGeneratedTitle(),
        supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
        car_id: form.car_id ? Number(form.car_id) : null,
        category: form.category,
        due_date: form.due_date || null,
        original_amount: Number(form.original_amount),
        paid_amount: 0,
        notes: form.notes || null,
      });

      if (!created) {
        alert('Το γραμμάτιο δεν αποθηκεύτηκε.');
        return;
      }

      closeModal();
      await loadDebts();
    } finally {
      saveInFlightRef.current = false;
    }
  };
const handleDeleteDebt = async (debtId: number) => {
  const confirmed = window.confirm('Να διαγραφεί το γραμμάτιο;');

  if (!confirmed) return;

  const deleted = await deleteDebt(debtId);

  if (!deleted) {
    alert('Το γραμμάτιο δεν διαγράφηκε.');
    return;
  }

  await loadDebts();
};
  const handleSavePayment = async () => {
    if (!paymentDebt) return;

    const normalizedAmount = paymentForm.amount.trim().replace(',', '.');
    const amount = Number(normalizedAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
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
        alert('Η πληρωμή καταχωρήθηκε στα έξοδα αλλά δεν ενημερώθηκε το γραμμάτιο.');
      }
      return;
    }

    closePaymentModal();
    await loadDebts();
  };
  const visibleDebts = debts.filter(
    (debt) => !String(debt.notes || '').includes('[service_inventory_item:')
  );
  const sortedDebts = useMemo(() => {
    const direction = sort.direction === 'asc' ? 1 : -1;

    return [...visibleDebts].sort((left, right) => {
      const supplierName = (debt: DebtRecord) =>
        suppliers.find((supplier) => Number(supplier.id) === Number(debt.supplier_id))?.name || '';
      const values: Record<DebtSortKey, [string | number, string | number]> = {
        due_date: [left.due_date || '', right.due_date || ''],
        title: [left.title || '', right.title || ''],
        supplier: [supplierName(left), supplierName(right)],
        category: [left.category || '', right.category || ''],
        original_amount: [Number(left.original_amount || 0), Number(right.original_amount || 0)],
        paid_amount: [Number(left.paid_amount || 0), Number(right.paid_amount || 0)],
        remaining_amount: [Number(left.remaining_amount || 0), Number(right.remaining_amount || 0)],
        status: [statusLabels[left.status] || left.status, statusLabels[right.status] || right.status],
      };
      const [leftValue, rightValue] = values[sort.key];

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return direction * (leftValue - rightValue);
      }

      return direction * String(leftValue).localeCompare(String(rightValue), 'el', {
        numeric: true,
        sensitivity: 'base',
      });
    });
  }, [sort, suppliers, visibleDebts]);
  const installmentLabels = useMemo(() => {
    const groups = new Map<string, DebtRecord[]>();

    visibleDebts.forEach((debt) => {
      const key = [
        debt.supplier_id ?? '',
        debt.category ?? '',
        Number(debt.original_amount || 0).toFixed(2),
        getRecurringTitlePattern(debt.title || ''),
      ].join('|');
      groups.set(key, [...(groups.get(key) || []), debt]);
    });

    const labels = new Map<number, string>();

    groups.forEach((group) => {
      const ordered = [...group].sort((left, right) =>
        String(left.due_date || '').localeCompare(String(right.due_date || ''))
      );
      const looksMonthly =
        ordered.length > 1 &&
        ordered.every((debt, index) => {
          if (index === 0) return Boolean(debt.due_date);
          const previousMonth = getYearMonthIndex(ordered[index - 1].due_date);
          const currentMonth = getYearMonthIndex(debt.due_date);
          return previousMonth !== null && currentMonth !== null && currentMonth - previousMonth === 1;
        });

      if (!looksMonthly) return;

      ordered.forEach((debt, index) => {
        labels.set(Number(debt.id), `Δόση ${index + 1}/${ordered.length}`);
      });
    });

    return labels;
  }, [visibleDebts]);
  const visibleOutstandingTotal = useMemo(
    () =>
      visibleDebts.reduce((total, debt) => {
        const remaining = Number(debt.remaining_amount ?? debt.original_amount - debt.paid_amount);
        return remaining > 0 ? total + remaining : total;
      }, 0),
    [visibleDebts]
  );

  const handleSort = (key: DebtSortKey) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={() => setShowImportModal(true)}
          className="erp-action-primary rounded-2xl border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-sm font-semibold text-sky-200 transition hover:bg-sky-400/20"
        >
          Import Δοσολογίου
        </button>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="erp-action-primary rounded-2xl border border-fuchsia-400/30 bg-fuchsia-400/10 px-4 py-3 text-sm font-semibold text-fuchsia-200 transition hover:bg-fuchsia-400/20"
        >
          + Νέο Γραμμάτιο
        </button>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 shadow-sm">
        <span className="text-sm font-semibold text-amber-900">Σύνολο Υπολοίπων</span>
        <strong className="text-lg font-extrabold text-amber-950">{money(visibleOutstandingTotal)}</strong>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <table className="w-full min-w-[1160px] text-left">
          <thead className="bg-zinc-900/90">
            <tr>
              <SortableHeader label="Ημ/νία Πληρωμής" sortKey="due_date" sort={sort} onSort={handleSort} />
              <SortableHeader label="Τίτλος" sortKey="title" sort={sort} onSort={handleSort} />
              <th className="px-3 py-3 text-sm text-zinc-400">Αυτοκίνητο</th>
              <SortableHeader label="Φορέας" sortKey="supplier" sort={sort} onSort={handleSort} />
              <SortableHeader label="Κατηγορία" sortKey="category" sort={sort} onSort={handleSort} />
              <SortableHeader label="Αρχικό" sortKey="original_amount" sort={sort} onSort={handleSort} align="right" />
              <SortableHeader label="Πληρωμένο" sortKey="paid_amount" sort={sort} onSort={handleSort} align="right" />
              <SortableHeader label="Υπόλοιπο" sortKey="remaining_amount" sort={sort} onSort={handleSort} align="right" />
              <SortableHeader label="Κατάσταση" sortKey="status" sort={sort} onSort={handleSort} />
              <th className="px-3 py-3 text-sm text-zinc-400">Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
            {sortedDebts.map((debt) => (
              <tr key={debt.id} className="border-t border-zinc-800">
                <td className="whitespace-nowrap px-3 py-3 text-sm text-zinc-200">
                  {debt.due_date ? formatDate(debt.due_date) : '-'}
                </td>
                <td className="px-3 py-3 text-sm font-medium text-white">
                  <div>
                    {debt.title ||
                      `${debt.category || 'Γραμμάτιο'} - ${
                        suppliers.find((supplier) => Number(supplier.id) === Number(debt.supplier_id))?.name ||
                        'Χωρίς φορέα'
                      }`}
                  </div>
                  {installmentLabels.has(Number(debt.id)) && (
                    <div className="mt-0.5 text-[11px] font-semibold text-fuchsia-300/75">
                      {installmentLabels.get(Number(debt.id))}
                    </div>
                  )}
                </td>
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
                      className="erp-action-success rounded-xl border border-fuchsia-400/25 bg-fuchsia-400/10 px-3 py-2 text-xs text-fuchsia-200 transition hover:bg-fuchsia-400/20"
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
                        className={`rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-zinc-200 transition hover:bg-white/[0.07] ${
                          label === 'Διαγραφή' ? 'erp-action-danger' : 'erp-action-primary'
                        }`}
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
        {visibleDebts.length === 0 && <p className="p-6 text-sm text-zinc-500">Δεν υπάρχουν καταχωρημένα γραμμάτια.</p>}
      </div>

      {showModal && (
        <DebtFormModal
          form={form}
          setForm={setForm}
          suppliers={suppliers}
          vehicles={vehicles}
          isEditing={Boolean(editingDebtId)}
          onClose={closeModal}
          onSave={handleSaveDebt}
        />
      )}

      {showImportModal && (
        <DebtImportModal
          file={importFile}
          setFile={setImportFile}
          onClose={closeImportModal}
          onImported={loadDebts}
        />
      )}

      {paymentDebt && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className="flex w-[min(520px,92vw)] flex-col overflow-hidden rounded-[28px] border border-fuchsia-300/15 bg-[linear-gradient(180deg,rgba(18,24,33,0.98),rgba(8,12,18,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.62)]">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5">
              <h2 className="text-lg font-semibold text-white">Πληρωμή Γραμματίου</h2>
              <button type="button" onClick={closePaymentModal} className="rounded-xl border border-transparent p-2 text-zinc-400 transition hover:border-white/[0.08] hover:bg-white/[0.05] hover:text-white">
                ✕
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <Field label="Ποσό Πληρωμής">
                <input
                  inputMode="decimal"
                  value={paymentForm.amount}
                  onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })}
                  className="input"
                />
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
  isEditing,
  onClose,
  onSave,
}: {
  form: typeof initialForm;
  setForm: React.Dispatch<React.SetStateAction<typeof initialForm>>;
  suppliers: SupplierRecord[];
  vehicles: DebtVehicle[];
  isEditing: boolean;
  onClose: () => void;
  onSave: (recurring?: RecurringDebtConfig) => Promise<void>;
}) {
  const [isRecurring, setIsRecurring] = useState(false);
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [firstPaymentDate, setFirstPaymentDate] = useState('');
  const [numberOfMonths, setNumberOfMonths] = useState('');
  const [previewDates, setPreviewDates] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const submitInFlightRef = useRef(false);

  const calculatedEndDate =
    firstPaymentDate && Number(numberOfMonths) > 0
      ? addMonthsToDate(firstPaymentDate, Number(numberOfMonths) - 1)
      : '';

  const clearPreview = () => setPreviewDates([]);

  const handlePreview = () => {
    const amount = Number(monthlyAmount);
    const months = Number(numberOfMonths);

    if (!amount || amount <= 0 || !firstPaymentDate || !Number.isInteger(months) || months <= 0) {
      alert('Συμπληρώστε μηνιαίο ποσό, πρώτη ημερομηνία και έγκυρο αριθμό μηνών.');
      return;
    }

    setPreviewDates(Array.from({ length: months }, (_, index) => addMonthsToDate(firstPaymentDate, index)));
  };

  const handleSubmit = async () => {
    if (submitInFlightRef.current) return;

    if (isRecurring && previewDates.length === 0) {
      alert('Πατήστε πρώτα Προεπισκόπηση για να ελέγξετε τις μηνιαίες δόσεις.');
      return;
    }

    submitInFlightRef.current = true;
    setIsSaving(true);

    try {
      if (!isRecurring) {
        await onSave();
        return;
      }

      await onSave({
        monthlyAmount: Number(monthlyAmount),
        firstPaymentDate,
        numberOfMonths: Number(numberOfMonths),
        dates: previewDates,
      });
    } finally {
      submitInFlightRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      onWheel={(event) => event.stopPropagation()}
    >
      <div
        className="flex max-h-[86vh] w-[min(760px,92vw)] flex-col overflow-hidden rounded-[28px] border border-fuchsia-300/15 bg-[linear-gradient(180deg,rgba(18,24,33,0.98),rgba(8,12,18,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.62)]"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5">
          <h2 className="text-lg font-semibold text-white">
            {isEditing ? 'Επεξεργασία Γραμματίου' : 'Νέο Γραμμάτιο'}
          </h2>
          <button type="button" onClick={onClose} className="rounded-xl border border-transparent p-2 text-zinc-400 transition hover:border-white/[0.08] hover:bg-white/[0.05] hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Τίτλος (προαιρετικό)">
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Αυτόματη δημιουργία αν μείνει κενό"
                className="input"
              />
            </Field>
            <Field label="Φορέας">
              <SearchableCombobox
                value={form.supplier_id}
                onChange={(value) => setForm({ ...form, supplier_id: value })}
                placeholder="Επιλογή φορέα"
                searchPlaceholder="Αναζήτηση φορέα..."
                options={suppliers.map((supplier) => ({
                  value: String(supplier.id),
                  label: supplier.name,
                }))}
              />
            </Field>
            <Field label="Αυτοκίνητο">
              <SearchableCombobox
                value={form.car_id}
                onChange={(value) => setForm({ ...form, car_id: value })}
                placeholder="Επιλογή αυτοκινήτου"
                searchPlaceholder="Αναζήτηση πινακίδας..."
                options={vehicles.map((vehicle) => ({
                  value: String(vehicle.id),
                  label: vehicle.plate,
                }))}
              />
            </Field>
            <Field label="Κατηγορία">
              <SearchableCombobox
                value={form.category}
                onChange={(value) => setForm({ ...form, category: value })}
                placeholder="Επιλογή κατηγορίας"
                searchPlaceholder="Αναζήτηση κατηγορίας..."
                options={categories.map((category) => ({
                  value: category,
                  label: category,
                }))}
              />
            </Field>
            {!isRecurring && (
              <>
                <Field label="Ημ/νία Πληρωμής">
                  <input type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} className="input" />
                </Field>
                <Field label="Αρχικό Ποσό">
                  <input type="number" min="0" step="0.01" value={form.original_amount} onChange={(event) => setForm({ ...form, original_amount: event.target.value })} className="input" />
                </Field>
              </>
            )}
          </div>

          {!isEditing && (
            <div className="mt-5 rounded-2xl border border-fuchsia-300/15 bg-fuchsia-400/[0.05] p-4">
              <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-zinc-100">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(event) => {
                    setIsRecurring(event.target.checked);
                    clearPreview();
                  }}
                  className="h-4 w-4 accent-fuchsia-400"
                />
                Επαναλαμβανόμενες μηνιαίες πληρωμές
              </label>

              {isRecurring && (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Μηνιαίο ποσό">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={monthlyAmount}
                        onChange={(event) => {
                          setMonthlyAmount(event.target.value);
                          clearPreview();
                        }}
                        className="input"
                      />
                    </Field>
                    <Field label="Πρώτη πληρωμή">
                      <input
                        type="date"
                        value={firstPaymentDate}
                        onChange={(event) => {
                          setFirstPaymentDate(event.target.value);
                          clearPreview();
                        }}
                        className="input"
                      />
                    </Field>
                    <Field label="Αριθμός μηνών">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={numberOfMonths}
                        onChange={(event) => {
                          setNumberOfMonths(event.target.value);
                          clearPreview();
                        }}
                        className="input"
                      />
                    </Field>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-zinc-400">
                      Υπολογισμένη λήξη:{' '}
                      <span className="font-semibold text-zinc-200">
                        {calculatedEndDate ? formatDate(calculatedEndDate) : '-'}
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={handlePreview}
                      className="rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-400/20"
                    >
                      Προεπισκόπηση
                    </button>
                  </div>

                  {previewDates.length > 0 && (
                    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-black/20">
                      <div className="max-h-56 overflow-y-auto">
                        {previewDates.map((dueDate, index) => (
                          <div
                            key={dueDate}
                            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-white/[0.06] px-4 py-2.5 text-sm last:border-b-0"
                          >
                            <span className="font-semibold text-fuchsia-300">
                              Δόση {index + 1}/{previewDates.length}
                            </span>
                            <span className="text-zinc-300">{formatDate(dueDate)}</span>
                            <span className="font-semibold text-white">{money(Number(monthlyAmount))}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm">
                        <span className="text-zinc-300">
                          Σύνολο δόσεων: <strong className="text-white">{previewDates.length}</strong>
                        </span>
                        <span className="text-zinc-300">
                          Συνολικό ποσό:{' '}
                          <strong className="text-white">
                            {money(Number(monthlyAmount) * previewDates.length)}
                          </strong>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-4">
            <Field label="Σημειώσεις">
              <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="input min-h-24" />
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-white/[0.08] bg-black/20 px-6 py-4">
          <button type="button" onClick={onClose} disabled={isSaving} className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50">
            Ακύρωση
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="rounded-2xl bg-fuchsia-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKey: DebtSortKey;
  sort: { key: DebtSortKey; direction: SortDirection };
  onSort: (key: DebtSortKey) => void;
  align?: 'left' | 'right';
}) {
  const isActive = sort.key === sortKey;

  return (
    <th className={`px-3 py-3 text-sm text-zinc-400 ${align === 'right' ? 'text-right' : ''}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1.5 font-semibold transition hover:text-white ${
          align === 'right' ? 'ml-auto' : ''
        } ${isActive ? 'text-fuchsia-200' : ''}`}
      >
        {label}
        {isActive ? (
          sort.direction === 'asc' ? (
            <ChevronUp size={14} />
          ) : (
            <ChevronDown size={14} />
          )
        ) : (
          <ChevronDown size={14} className="opacity-30" />
        )}
      </button>
    </th>
  );
}

type ComboboxOption = {
  value: string;
  label: string;
};

function SearchableCombobox({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder: string;
  searchPlaceholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value);
  const filteredOptions = options.filter((option) =>
    option.label.toLocaleLowerCase('el').includes(query.trim().toLocaleLowerCase('el'))
  );

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setIsOpen((current) => !current);
          setQuery('');
        }}
        className="input flex w-full items-center justify-between gap-3 text-left"
      >
        <span className={selectedOption ? 'text-white' : 'text-zinc-500'}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown size={16} className="shrink-0 text-zinc-500" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-white/[0.1] bg-zinc-950 shadow-2xl">
          <div className="border-b border-white/[0.08] p-2">
            <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-zinc-900 px-3">
              <Search size={15} className="shrink-0 text-zinc-500" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-zinc-500"
              />
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto p-1.5">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
            >
              {placeholder}
              {!value && <Check size={15} />}
            </button>
            {filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium text-zinc-100 transition hover:bg-fuchsia-400/10 hover:text-fuchsia-100"
              >
                {option.label}
                {option.value === value && <Check size={15} className="text-fuchsia-300" />}
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-zinc-500">Δεν βρέθηκαν αποτελέσματα.</p>
            )}
          </div>
        </div>
      )}
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
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
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
    <div className="block space-y-2 text-sm text-zinc-300">
      <span>{label}</span>
      {children}
    </div>
  );
}
