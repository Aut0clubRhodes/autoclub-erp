'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { fetchCars } from '@/lib/carsApi';
import { addTransaction } from '@/lib/financeApi';
import { addService } from '@/lib/servicesApi';
import { fetchSuppliers, type SupplierRecord } from '@/lib/suppliersApi';

type ServiceCar = {
  id: number;
  plate: string;
  brand: string;
  model: string;
};

const paymentOptions = [
  { value: 'cash', label: 'Μετρητά' },
  { value: 'card', label: 'Κάρτα' },
  { value: 'bank', label: 'Τράπεζα' },
  { value: 'credit', label: 'Επί Πιστώσει' },
];

const createInitialForm = () => ({
  car_id: '',
  service_date: new Date().toISOString().split('T')[0],
  km: '',
  description: '',
  notes: '',
  parts_supplier_id: '',
  parts_description: '',
  parts_amount: '',
  parts_payment_method: 'cash',
  labor_supplier_id: '',
  labor_amount: '',
  labor_payment_method: 'cash',
});

export default function ServiceEntryPage() {
  const [cars, setCars] = useState<ServiceCar[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [form, setForm] = useState(createInitialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const loadReferences = async () => {
      const [carRows, supplierRows] = await Promise.all([fetchCars(), fetchSuppliers()]);
      setCars(
        (carRows || []).map((car: any) => ({
          id: Number(car.id),
          plate: car.plate || '',
          brand: car.brand || '',
          model: car.model || '',
        }))
      );
      setSuppliers(supplierRows || []);
      setLoading(false);
    };

    loadReferences();
  }, []);

  const handleSave = async () => {
    setSuccessMessage('');

    if (!form.car_id) {
      alert('Επιλέξτε αυτοκίνητο.');
      return;
    }
    if (!form.service_date) {
      alert('Συμπληρώστε ημερομηνία service.');
      return;
    }
    if (!form.description) {
      alert('Συμπληρώστε περιγραφή εργασίας.');
      return;
    }

    const partsAmount = Number(form.parts_amount || 0);
    const laborAmount = Number(form.labor_amount || 0);
    if (Number.isNaN(partsAmount) || Number.isNaN(laborAmount)) {
      alert('Τα ποσά πρέπει να είναι αριθμητικά.');
      return;
    }
    if (partsAmount > 0 && !form.parts_supplier_id) {
      alert('Επιλέξτε προμηθευτή ανταλλακτικών.');
      return;
    }
    if (laborAmount > 0 && !form.labor_supplier_id) {
      alert('Επιλέξτε συνεργείο / προμηθευτή εργασίας.');
      return;
    }
    if (partsAmount > 0 && !form.parts_payment_method) {
      alert('Επιλέξτε τρόπο πληρωμής ανταλλακτικών.');
      return;
    }
    if (laborAmount > 0 && !form.labor_payment_method) {
      alert('Επιλέξτε τρόπο πληρωμής εργασίας.');
      return;
    }

    setSaving(true);

    const service = await addService({
      car_id: Number(form.car_id),
      supplier_id: form.labor_supplier_id
        ? Number(form.labor_supplier_id)
        : form.parts_supplier_id
          ? Number(form.parts_supplier_id)
          : null,
      service_date: form.service_date,
      km: form.km ? Number(form.km) : null,
      service_type: 'service',
      description: form.description,
      cost: partsAmount + laborAmount,
      payment_method: laborAmount > 0 ? form.labor_payment_method : form.parts_payment_method || null,
      next_service_km: null,
      notes: form.notes || null,
    });

    if (!service) {
      setSaving(false);
      return;
    }

    if (partsAmount > 0) {
      const partsTransaction = await addTransaction({
        type: 'expense',
        source: 'service_parts',
        amount: partsAmount,
        date: form.service_date,
        payment_method: form.parts_payment_method,
        supplier_id: Number(form.parts_supplier_id),
        car_id: Number(form.car_id),
        category: 'Ανταλλακτικά',
        notes: form.parts_description || form.description || null,
      });

      if (!partsTransaction) {
        console.error('Service parts transaction creation failed after service row save.', { serviceId: service.id });
        alert('Το service αποθηκεύτηκε, αλλά απέτυχε η δημιουργία κίνησης ανταλλακτικών.');
        setSaving(false);
        return;
      }
    }

    if (laborAmount > 0) {
      const laborTransaction = await addTransaction({
        type: 'expense',
        source: 'service_labor',
        amount: laborAmount,
        date: form.service_date,
        payment_method: form.labor_payment_method,
        supplier_id: Number(form.labor_supplier_id),
        car_id: Number(form.car_id),
        category: 'Service',
        notes: form.description || null,
      });

      if (!laborTransaction) {
        console.error('Service labor transaction creation failed after service row save.', { serviceId: service.id });
        alert('Το service αποθηκεύτηκε, αλλά απέτυχε η δημιουργία κίνησης εργασίας.');
        setSaving(false);
        return;
      }
    }

    setForm(createInitialForm());
    setSuccessMessage('Το service αποθηκεύτηκε επιτυχώς.');
    setSaving(false);
  };

  return (
    <main className="min-h-screen w-full overflow-y-auto bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,22,0.12),transparent_28%),linear-gradient(180deg,#07101a_0%,#050910_100%)] px-4 py-6 text-white">
      <div className="mx-auto flex w-full max-w-[700px] flex-col gap-5">
        <header className="flex flex-col items-center gap-3 text-center">
          <div className="relative h-[72px] w-[170px]">
            <div className="absolute inset-4 rounded-full bg-orange-400/[0.08] blur-2xl" />
            <Image src="/logo.png" alt="AUTOCLUB" fill priority className="relative object-cover object-center" sizes="170px" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-200/70">
              QR Service Entry
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Καταχώρηση Service</h1>
          </div>
        </header>

        <section className="overflow-hidden rounded-[28px] border border-orange-300/14 bg-[linear-gradient(180deg,rgba(18,24,33,0.96),rgba(8,12,18,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
          <div className="space-y-5 p-5 sm:p-6">
            {successMessage && (
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] px-4 py-3 text-sm font-medium text-emerald-100">
                {successMessage}
              </div>
            )}

            {loading ? (
              <p className="py-8 text-center text-sm text-zinc-400">Φόρτωση...</p>
            ) : (
              <>
                <FormSection title="Βασικά Στοιχεία">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Αυτοκίνητο">
                      <select value={form.car_id} onChange={(event) => setForm({ ...form, car_id: event.target.value })} className="input">
                        <option value="">Επιλογή αυτοκινήτου</option>
                        {cars.map((car) => (
                          <option key={car.id} value={car.id}>
                            {car.plate} - {car.brand} {car.model}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Ημερομηνία">
                      <input type="date" value={form.service_date} onChange={(event) => setForm({ ...form, service_date: event.target.value })} className="input" />
                    </Field>
                    <Field label="Χλμ">
                      <input inputMode="numeric" value={form.km} onChange={(event) => setForm({ ...form, km: event.target.value })} className="input" />
                    </Field>
                    <Field label="Περιγραφή εργασίας">
                      <input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="input" />
                    </Field>
                  </div>
                  <Field label="Σημειώσεις">
                    <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="input min-h-24" />
                  </Field>
                </FormSection>

                <FormSection title="Ανταλλακτικά">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SupplierSelect label="Προμηθευτής Ανταλλακτικών" value={form.parts_supplier_id} suppliers={suppliers} onChange={(value) => setForm({ ...form, parts_supplier_id: value })} />
                    <Field label="Ποσό Ανταλλακτικών">
                      <input inputMode="decimal" value={form.parts_amount} onChange={(event) => setForm({ ...form, parts_amount: event.target.value })} className="input" />
                    </Field>
                    <Field label="Περιγραφή Ανταλλακτικών">
                      <input value={form.parts_description} onChange={(event) => setForm({ ...form, parts_description: event.target.value })} className="input" />
                    </Field>
                    <PaymentSelect label="Τρόπος Πληρωμής Ανταλλακτικών" value={form.parts_payment_method} onChange={(value) => setForm({ ...form, parts_payment_method: value })} />
                  </div>
                </FormSection>

                <FormSection title="Εργασία Συνεργείου">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SupplierSelect label="Συνεργείο / Προμηθευτής Εργασίας" value={form.labor_supplier_id} suppliers={suppliers} onChange={(value) => setForm({ ...form, labor_supplier_id: value })} />
                    <Field label="Ποσό Εργασίας">
                      <input inputMode="decimal" value={form.labor_amount} onChange={(event) => setForm({ ...form, labor_amount: event.target.value })} className="input" />
                    </Field>
                    <PaymentSelect label="Τρόπος Πληρωμής Εργασίας" value={form.labor_payment_method} onChange={(value) => setForm({ ...form, labor_payment_method: value })} />
                  </div>
                </FormSection>
              </>
            )}
          </div>

          <div className="border-t border-white/[0.07] bg-black/20 p-5 sm:p-6">
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || saving}
              className="w-full rounded-2xl bg-orange-500 px-5 py-3.5 text-sm font-semibold text-black shadow-[0_0_24px_rgba(249,115,22,0.16)] transition duration-200 hover:-translate-y-px hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {saving ? 'Αποθήκευση...' : 'Αποθήκευση Service'}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-3xl border border-white/[0.055] bg-white/[0.018] p-4">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {children}
    </section>
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

function SupplierSelect({
  label,
  value,
  suppliers,
  onChange,
}: {
  label: string;
  value: string;
  suppliers: SupplierRecord[];
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="input">
        <option value="">Επιλογή προμηθευτή</option>
        {suppliers.map((supplier) => (
          <option key={supplier.id} value={supplier.id}>
            {supplier.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

function PaymentSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="input">
        {paymentOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
