'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchCars } from '@/lib/carsApi';
import { addTransaction, fetchTransactions } from '@/lib/financeApi';
import { fetchServices, addService, type ServiceRecord } from '@/lib/servicesApi';
import { fetchSuppliers, type SupplierRecord } from '@/lib/suppliersApi';

type ServiceCar = {
  id: number;
  plate: string;
  brand: string;
  model: string;
  km: string;
};

type ServiceTransaction = {
  id: number;
  date: string;
  amount: number;
  source?: string | null;
  car_id?: number | null;
  notes?: string | null;
};

const paymentOptions = [
  { value: 'cash', label: 'Μετρητά' },
  { value: 'card', label: 'Κάρτα' },
  { value: 'bank', label: 'Τράπεζα' },
  { value: 'credit', label: 'Επί Πιστώσει' },
];

const initialForm = {
  car_id: '',
  service_date: new Date().toISOString().split('T')[0],
  km: '',
  description: '',
  next_service_km: '',
  next_service_date: '',
  notes: '',
  parts_supplier_id: '',
  parts_description: '',
  parts_amount: '',
  parts_payment_method: 'cash',
  labor_supplier_id: '',
  labor_amount: '',
  labor_payment_method: 'cash',
};

const money = (value: number) =>
  `€${value.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ServicesManager() {
  const [cars, setCars] = useState<ServiceCar[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [transactions, setTransactions] = useState<ServiceTransaction[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalRootReady, setModalRootReady] = useState(false);
  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);
  const [form, setForm] = useState(initialForm);

  const loadData = async () => {
    const [carRows, supplierRows, serviceRows, transactionRows] = await Promise.all([
      fetchCars(),
      fetchSuppliers(),
      fetchServices(),
      fetchTransactions(),
    ]);

    setCars(
      (carRows || []).map((car: any) => ({
        id: Number(car.id),
        plate: String(car.plate ?? ''),
        brand: String(car.brand ?? ''),
        model: String(car.model ?? ''),
        km: String(car.current_km ?? car.km ?? ''),
      }))
    );
    setSuppliers(supplierRows);
    setServices(serviceRows);
    setTransactions(
      (transactionRows || []).map((transaction: any) => ({
        id: Number(transaction.id),
        date: String(transaction.date ?? ''),
        amount: Number(transaction.amount) || 0,
        source: transaction.source ?? null,
        car_id: transaction.car_id ? Number(transaction.car_id) : null,
        notes: transaction.notes ?? null,
      }))
    );
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setModalRootReady(true);
  }, []);

  const serviceRows = useMemo(
    () =>
      services.map((service) => {
        const sameServiceTransactions = transactions.filter(
          (transaction) =>
            Number(transaction.car_id) === Number(service.car_id) && transaction.date === service.service_date
        );
        const partsCost = sameServiceTransactions
          .filter((transaction) => transaction.source === 'service_parts')
          .reduce((sum, transaction) => sum + transaction.amount, 0);
        const laborCost = sameServiceTransactions
          .filter((transaction) => transaction.source === 'service_labor')
          .reduce((sum, transaction) => sum + transaction.amount, 0);

        return {
          service,
          carPlate: cars.find((car) => car.id === Number(service.car_id))?.plate || `#${service.car_id}`,
          partsCost,
          laborCost,
          partsDescription:
            sameServiceTransactions.find((transaction) => transaction.source === 'service_parts')?.notes || '-',
        };
      }),
    [cars, services, transactions]
  );

  const selectedCar = cars.find((car) => car.id === selectedCarId) ?? null;

  const carRows = useMemo(
    () =>
      cars.map((car) => {
        const carServices = services.filter((service) => Number(service.car_id) === car.id);
        const latestService = carServices[0];

        return {
          car,
          latestServiceDate: latestService?.service_date || '-',
          serviceCount: carServices.length,
        };
      }),
    [cars, services]
  );

  const selectedCarServiceRows = useMemo(
    () =>
      serviceRows.filter(({ service }) => Number(service.car_id) === selectedCarId),
    [selectedCarId, serviceRows]
  );

  const serviceRowsByYear = useMemo(() => {
    const groups = new Map<string, typeof selectedCarServiceRows>();

    selectedCarServiceRows.forEach((row) => {
      const year = row.service.service_date?.slice(0, 4) || '-';
      const rowsForYear = groups.get(year) ?? [];
      rowsForYear.push(row);
      groups.set(year, rowsForYear);
    });

    return Array.from(groups.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [selectedCarServiceRows]);

  const openAddServiceModal = () => {
    setForm({
      ...initialForm,
      car_id: selectedCar ? String(selectedCar.id) : '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.car_id) {
      alert('Επιλέξτε αυτοκίνητο.');
      return;
    }
    if (!form.service_date) {
      alert('Συμπληρώστε ημερομηνία service.');
      return;
    }
    if (form.km && Number.isNaN(Number(form.km))) {
      alert('Τα χιλιόμετρα πρέπει να είναι αριθμός.');
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

    const service = await addService({
      car_id: Number(form.car_id),
      supplier_id: form.labor_supplier_id ? Number(form.labor_supplier_id) : form.parts_supplier_id ? Number(form.parts_supplier_id) : null,
      service_date: form.service_date,
      km: form.km ? Number(form.km) : null,
      service_type: 'service',
      description: form.description,
      cost: partsAmount + laborAmount,
      payment_method: laborAmount > 0 ? form.labor_payment_method : form.parts_payment_method || null,
      next_service_km: form.next_service_km ? Number(form.next_service_km) : null,
      notes: [
        form.notes,
        form.next_service_date ? `Επόμενο service ημερομηνία: ${form.next_service_date}` : '',
      ]
        .filter(Boolean)
        .join(' | ') || null,
    });

    if (!service) return;

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
        await loadData();
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
        await loadData();
        return;
      }
    }

    await loadData();
    setForm({
      ...initialForm,
      car_id: selectedCar ? String(selectedCar.id) : '',
    });
    setShowModal(false);
  };

  return (
    <div className="space-y-5 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Service</h1>
          <p className="mt-2 text-sm text-zinc-400">Ιστορικό συντήρησης και οικονομικές κινήσεις service.</p>
        </div>
        <button
          type="button"
          onClick={openAddServiceModal}
          className="rounded-2xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm font-semibold text-orange-200 hover:bg-orange-500/20"
        >
          + Καταχώρηση Service
        </button>
      </div>

      {selectedCar ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <button
                type="button"
                onClick={() => setSelectedCarId(null)}
                className="text-sm font-medium text-orange-200 transition hover:text-orange-100"
              >
                ← Πίσω στα αυτοκίνητα
              </button>
              <h2 className="mt-3 text-xl font-semibold text-white">Ιστορικό Service — {selectedCar.plate}</h2>
            </div>
          </div>

          {serviceRowsByYear.length === 0 ? (
            <div className="rounded-3xl border border-white/[0.08] bg-black/20 px-5 py-10 text-center text-sm text-zinc-400">
              Δεν υπάρχει ιστορικό service για αυτό το αυτοκίνητο.
            </div>
          ) : (
            <div className="space-y-4">
              {serviceRowsByYear.map(([year, yearRows]) => (
                <section key={year} className="overflow-hidden rounded-3xl border border-white/[0.08] bg-black/20">
                  <div className="border-b border-white/[0.06] bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white">
                    {year}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-left">
                      <thead>
                        <tr>
                          {[
                            'Ημερομηνία',
                            'Χλμ',
                            'Εργασία',
                            'Ανταλλακτικά',
                            'Κόστος Ανταλλακτικών',
                            'Κόστος Εργασίας',
                            'Σύνολο',
                          ].map((label) => (
                            <th key={label} className="px-4 py-3 text-xs font-medium text-zinc-400">
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {yearRows.map(({ service, partsCost, laborCost, partsDescription }) => (
                          <tr key={service.id} className="border-t border-white/[0.06]">
                            <td className="px-4 py-4 text-sm text-zinc-200">{service.service_date}</td>
                            <td className="px-4 py-4 text-sm text-zinc-200">{service.km || '-'}</td>
                            <td className="px-4 py-4 text-sm text-zinc-200">{service.description || '-'}</td>
                            <td className="px-4 py-4 text-sm text-zinc-200">{partsDescription}</td>
                            <td className="px-4 py-4 text-sm text-zinc-200">{money(partsCost)}</td>
                            <td className="px-4 py-4 text-sm text-zinc-200">{money(laborCost)}</td>
                            <td className="px-4 py-4 text-sm font-semibold text-white">
                              {money(partsCost + laborCost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-black/20">
          <table className="w-full min-w-[920px] text-left">
            <thead className="bg-white/[0.03]">
              <tr>
                {[
                  'Πινακίδα',
                  'Μάρκα',
                  'Μοντέλο',
                  'Χλμ',
                  'Τελευταίο Service',
                  'Σύνολο Service',
                  'Ενέργειες',
                ].map((label) => (
                  <th key={label} className="px-4 py-3 text-xs font-medium text-zinc-400">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carRows.map(({ car, latestServiceDate, serviceCount }) => (
                <tr key={car.id} className="border-t border-white/[0.06]">
                  <td className="px-4 py-4 text-sm font-medium text-white">{car.plate}</td>
                  <td className="px-4 py-4 text-sm text-zinc-200">{car.brand || '-'}</td>
                  <td className="px-4 py-4 text-sm text-zinc-200">{car.model || '-'}</td>
                  <td className="px-4 py-4 text-sm text-zinc-200">{car.km || '-'}</td>
                  <td className="px-4 py-4 text-sm text-zinc-200">{latestServiceDate}</td>
                  <td className="px-4 py-4 text-sm text-zinc-200">{serviceCount}</td>
                  <td className="px-4 py-4 text-sm">
                    <button
                      type="button"
                      onClick={() => setSelectedCarId(car.id)}
                      className="rounded-2xl border border-orange-400/25 bg-orange-400/10 px-3 py-2 text-xs font-medium text-orange-200 transition hover:bg-orange-400/20"
                    >
                      Ιστορικό Service
                    </button>
                  </td>
                </tr>
              ))}
              {carRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-500">
                    Δεν υπάρχουν αυτοκίνητα.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal &&
        modalRootReady &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
            <div className="flex max-h-[86vh] w-[min(860px,92vw)] flex-col overflow-hidden rounded-[28px] border border-orange-300/15 bg-[linear-gradient(180deg,rgba(18,24,33,0.98),rgba(8,12,18,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.62)]">
              <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-6 py-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-200/70">
                    Service
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-white">Καταχώρηση Service</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-transparent p-2 text-zinc-400 transition hover:border-white/[0.08] hover:bg-white/[0.05] hover:text-white"
                  aria-label="Κλείσιμο"
                >
                  ✕
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <div className="space-y-6">
                  <section className="space-y-4">
                    <SectionTitle>Βασικά Στοιχεία</SectionTitle>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Αυτοκίνητο">
                        <select value={form.car_id} onChange={(event) => setForm({ ...form, car_id: event.target.value })} className="input">
                          <option value="">Επιλογή αυτοκινήτου</option>
                          {cars.map((car) => (
                            <option key={car.id} value={car.id}>
                              {car.plate}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Ημερομηνία">
                        <input type="date" value={form.service_date} onChange={(event) => setForm({ ...form, service_date: event.target.value })} className="input" />
                      </Field>
                      <Field label="Χλμ">
                        <input value={form.km} onChange={(event) => setForm({ ...form, km: event.target.value })} className="input" />
                      </Field>
                      <Field label="Περιγραφή εργασίας">
                        <input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="input" />
                      </Field>
                    </div>
                    <Field label="Σημειώσεις">
                      <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="input min-h-24" />
                    </Field>
                  </section>

                  <section className="space-y-4">
                    <SectionTitle>Ανταλλακτικά</SectionTitle>
                    <div className="grid gap-4 md:grid-cols-2">
                      <SupplierSelect label="Προμηθευτής Ανταλλακτικών" value={form.parts_supplier_id} suppliers={suppliers} onChange={(value) => setForm({ ...form, parts_supplier_id: value })} />
                      <Field label="Ποσό Ανταλλακτικών">
                        <input value={form.parts_amount} onChange={(event) => setForm({ ...form, parts_amount: event.target.value })} className="input" />
                      </Field>
                      <Field label="Περιγραφή Ανταλλακτικών">
                        <input value={form.parts_description} onChange={(event) => setForm({ ...form, parts_description: event.target.value })} className="input" />
                      </Field>
                      <PaymentSelect label="Τρόπος Πληρωμής Ανταλλακτικών" value={form.parts_payment_method} onChange={(value) => setForm({ ...form, parts_payment_method: value })} />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <SectionTitle>Εργασία Συνεργείου</SectionTitle>
                    <div className="grid gap-4 md:grid-cols-2">
                      <SupplierSelect label="Συνεργείο / Προμηθευτής Εργασίας" value={form.labor_supplier_id} suppliers={suppliers} onChange={(value) => setForm({ ...form, labor_supplier_id: value })} />
                      <Field label="Ποσό Εργασίας">
                        <input value={form.labor_amount} onChange={(event) => setForm({ ...form, labor_amount: event.target.value })} className="input" />
                      </Field>
                      <PaymentSelect label="Τρόπος Πληρωμής Εργασίας" value={form.labor_payment_method} onChange={(value) => setForm({ ...form, labor_payment_method: value })} />
                    </div>
                  </section>
                </div>
              </div>

              <div className="flex shrink-0 justify-end gap-3 border-t border-white/[0.08] bg-black/20 px-6 py-4">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.04]">
                  Ακύρωση
                </button>
                <button type="button" onClick={handleSave} className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-400">
                  Αποθήκευση
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-white">{children}</h3>;
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
