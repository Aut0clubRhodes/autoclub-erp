'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Image from 'next/image';
import Sidebar from '@/components/Sidebar';
import Window from '@/components/Window';
import FinanceOverview from '@/components/FinanceOverview';
import FinanceIncome from '@/components/FinanceIncome';
import FinanceExpenses from '@/components/FinanceExpenses';
import { fetchCars, addCar, deleteCar, updateCar } from '@/lib/carsApi';
import {
  fetchTransactions,
  addTransaction,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  deleteIncomeFull,
} from '@/lib/financeApi';
import AgenciesManager from '@/components/AgenciesManager';
import SuppliersManager from '@/components/SuppliersManager';
import ExpenseCategoriesManager from '@/components/ExpenseCategoriesManager';
import { supabase } from '@/lib/supabaseClient';
import {
  addIncomeEntry,
  updateIncomeEntry,
  updateIncomeTransactionLink,
} from '@/lib/incomeApi';
import { addBooking, updateBookingTransactionLink } from '@/lib/bookingsApi';
import { fetchSuppliers, type SupplierRecord } from '@/lib/suppliersApi';
import {
  fetchExpenseCategories,
  seedDefaultExpenseCategories,
  type ExpenseCategory,
} from '@/lib/expenseCategoriesApi';
type WindowType =
  | 'Αυτοκίνητα'
  | 'Ταμείο'
  | 'Έσοδα'
  | 'Έξοδα'
  | 'Προμηθευτές'
  | 'Κατηγορίες Εξόδων'
  | 'Αναφορές'
  | 'Πρακτορεία'
  | null;

type Vehicle = {
  id: string;
  plate: string;
  category: string;
  brand: string;
  model: string;
  year: string;
  km: string;
  price: string;
  vin?: string;
  fuel?: string;
  engine_cc?: string;
  kteo_expiry?: string;
  insurance_expiry?: string;
  road_tax_expiry?: string;
};

type Transaction = {
  id: string;
  date: string;
  amount: number;
  payment_method: string;
  type: string;
  car_id: string;
  car_plate: string;
  agency_id: string;
  representative_id: string;
  supplier_id?: number | null;
  supplier: string;
  supplier_name?: string;
  category: string;
  notes: string;
  contract_number?: string;
  income_entry_id?: string;
  booking_id?: string;
  source?: string;
  agency?: string;
  representative?: string;
};

type Agency = {
  id: number;
  name: string;
};

type Representative = {
  id: number;
  name: string;
  agency_id: number;
};

type RevenueByAgencyRow = {
  agencyId: string;
  agencyName: string;
  totalRevenue: number;
  cash: number;
  card: number;
  bank: number;
  credit: number;
  transactionsCount: number;
};

const initialVehicles: Vehicle[] = [
  {
    id: '1',
    plate: 'PKA1815',
    category: 'A',
    brand: 'Peugeot',
    model: '108',
    year: '2019',
    km: '85,240',
    price: '€18,500',
    vin: '',
    fuel: '',
    engine_cc: '',
    kteo_expiry: '',
    insurance_expiry: '',
    road_tax_expiry: '',
  },
  {
    id: '2',
    plate: 'PKA4421',
    category: 'B',
    brand: 'Fiat',
    model: 'Panda',
    year: '2020',
    km: '62,100',
    price: '€14,200',
    vin: '',
    fuel: '',
    engine_cc: '',
    kteo_expiry: '',
    insurance_expiry: '',
    road_tax_expiry: '',
  },
  {
    id: '3',
    plate: 'PKA7712',
    category: 'A',
    brand: 'Toyota',
    model: 'Aygo',
    year: '2021',
    km: '41,650',
    price: '€16,800',
    vin: '',
    fuel: '',
    engine_cc: '',
    kteo_expiry: '',
    insurance_expiry: '',
    road_tax_expiry: '',
  },
];

export default function Home() {
  const [activeWindow, setActiveWindow] = useState<WindowType>(null);
  const [showAddCar, setShowAddCar] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showSupplierPaymentModal, setShowSupplierPaymentModal] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [incomeForm, setIncomeForm] = useState({
    income_type: 'rental',
    amount: '',
    payment_method: 'cash',
    car_id: '',
    agency_id: '',
    representative_id: '',
    contract_number: '',
    notes: '',
  });
  const [expenseForm, setExpenseForm] = useState({
    movement_type: 'expense',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    supplier_id: '',
    car_id: '',
    category: '',
    notes: '',
  });
  const [supplierPaymentForm, setSupplierPaymentForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    supplier_id: '',
    payment_method: 'cash',
    notes: '',
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [newVehicle, setNewVehicle] = useState<Vehicle>({
    id: '',
    plate: '',
    category: '',
    brand: '',
    model: '',
    year: '',
    km: '',
    price: '',
    vin: '',
    fuel: '',
    engine_cc: '',
    kteo_expiry: '',
    insurance_expiry: '',
    road_tax_expiry: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [editingPlate, setEditingPlate] = useState<string | null>(null);
  const [viewingPlate, setViewingPlate] = useState<string | null>(null);
const handleAddIncome = async () => {
  if (!incomeForm.amount) {
    console.warn('Amount is required');
    return;
  }

  try {
    const booking =
      incomeForm.income_type === 'rental'
        ? await addBooking({
            car_id: incomeForm.car_id ? Number(incomeForm.car_id) : null,
            amount: Number(incomeForm.amount),
            payment_method: incomeForm.payment_method,
            agency_id: incomeForm.agency_id ? Number(incomeForm.agency_id) : null,
            representative_id: incomeForm.representative_id
              ? Number(incomeForm.representative_id)
              : null,
            contract_number: incomeForm.contract_number || null,
            income_type: 'rental',
          })
        : null;

    if (incomeForm.income_type === 'rental' && !booking) {
      console.error('Failed to create booking');
      return;
    }

    const incomeEntry = await addIncomeEntry({
  income_type: incomeForm.income_type,
  amount: Number(incomeForm.amount),
  payment_method: incomeForm.payment_method,
  car_id: incomeForm.car_id ? Number(incomeForm.car_id) : null,
  agency_id: incomeForm.agency_id ? Number(incomeForm.agency_id) : null,
  representative_id: incomeForm.representative_id ? Number(incomeForm.representative_id) : null,
  contract_number: incomeForm.contract_number || null,
  notes: incomeForm.notes || null,
});

if (!incomeEntry) {
  console.error('Failed to create income entry');
  return;
}

console.log('CREATED INCOME ENTRY ID', incomeEntry.id);

const newTransaction = await addTransaction({
  type: 'income',
  source: incomeForm.income_type,
  amount: Number(incomeForm.amount),
  date: new Date().toISOString().split('T')[0],
  payment_method: incomeForm.payment_method,
  car_id: incomeForm.car_id ? Number(incomeForm.car_id) : null,
  agency_id: incomeForm.agency_id ? Number(incomeForm.agency_id) : null,
  representative_id: incomeForm.representative_id ? Number(incomeForm.representative_id) : null,
  contract_number: incomeForm.contract_number || null,
  notes: incomeForm.notes || null,
  income_entry_id: incomeEntry.id,
  booking_id: booking?.id ?? null,
});

if (newTransaction?.id) {
  console.log('CREATED TRANSACTION ID', newTransaction.id);
  await updateIncomeTransactionLink(
    incomeEntry.id,
    newTransaction.id
  );
  console.log('LINKED INCOME ENTRY TO TRANSACTION', {
    income_entry_id: incomeEntry.id,
    transaction_id: newTransaction.id,
  });

  if (booking?.id) {
    await updateBookingTransactionLink(
      booking.id,
      newTransaction.id
    );
  }
}

    // Success if we get data back or if we get true (insert succeeded but no data returned)
    if (newTransaction) {
      console.log('Transaction saved successfully:', newTransaction);
      
      const updatedTransactions = await fetchTransactions();
      setTransactions(
        (updatedTransactions || []).map((transaction: any) => ({
          id: String(transaction.id ?? ''),
          date: transaction.date ?? '',
          amount: Number(transaction.amount) || 0,
          payment_method: String(transaction.payment_method ?? ''),
          type: String(transaction.type ?? ''),
          car_id: transaction.car_id ?? null,
         car_plate: transaction.car_id
  ? vehicles.find((vehicle: any) => String(vehicle.id) === String(transaction.car_id))?.plate || `#${transaction.car_id}`
  : '-',
          agency_id: transaction.agency_id ? String(transaction.agency_id) : '',
          representative_id: transaction.representative_id ? String(transaction.representative_id) : '',
          supplier_id: transaction.supplier_id ? Number(transaction.supplier_id) : null,
          supplier: String(transaction.supplier ?? ''),
          category: String(transaction.category ?? ''),
          notes: String(transaction.notes ?? ''),
          contract_number: String(transaction.contract_number ?? ''),
          income_entry_id: transaction.income_entry_id ? String(transaction.income_entry_id) : '',
          booking_id: transaction.booking_id ? String(transaction.booking_id) : '',
          source: transaction.source ? String(transaction.source) : undefined,
          agency: transaction.agency ? String(transaction.agency) : undefined,
          representative: transaction.representative ? String(transaction.representative) : undefined,
        }))
      );

      setIncomeForm({
        income_type: 'rental',
        amount: '',
        payment_method: 'cash',
        car_id: '',
        agency_id: '',
        representative_id: '',
        contract_number: '',
        notes: '',
      });

      setEditingIncomeId(null);
      setShowIncomeModal(false);
    } else {
      console.error('Failed to add transaction - Supabase returned error or no response');
    }
  } catch (error) {
    console.error('Error adding income:', error);
  }
};

const reloadTransactions = async () => {
  const updatedTransactions = await fetchTransactions();
  setTransactions(
    (updatedTransactions || []).map((transaction: any) => ({
      id: String(transaction.id ?? ''),
      date: transaction.date ?? '',
      amount: Number(transaction.amount) || 0,
      payment_method: String(transaction.payment_method ?? ''),
      type: String(transaction.type ?? ''),
      car_id: transaction.car_id ?? null,
      car_plate: transaction.car_id
        ? vehicles.find((vehicle: any) => String(vehicle.id) === String(transaction.car_id))?.plate ||
          `#${transaction.car_id}`
        : '-',
      agency_id: transaction.agency_id ? String(transaction.agency_id) : '',
      representative_id: transaction.representative_id ? String(transaction.representative_id) : '',
      supplier_id: transaction.supplier_id ? Number(transaction.supplier_id) : null,
      supplier: String(transaction.supplier ?? ''),
      category: String(transaction.category ?? ''),
      notes: String(transaction.notes ?? ''),
      contract_number: String(transaction.contract_number ?? ''),
      income_entry_id: transaction.income_entry_id ? String(transaction.income_entry_id) : '',
      booking_id: transaction.booking_id ? String(transaction.booking_id) : '',
      source: transaction.source ? String(transaction.source) : undefined,
      agency: transaction.agency ? String(transaction.agency) : undefined,
      representative: transaction.representative ? String(transaction.representative) : undefined,
    }))
  );
};

const handleEditIncome = (transaction: Transaction) => {
  setEditingIncomeId(transaction.id);
  setIncomeForm({
    income_type: transaction.source || 'rental',
    amount: String(transaction.amount || ''),
    payment_method: transaction.payment_method || 'cash',
    car_id: transaction.car_id ? String(transaction.car_id) : '',
    agency_id: transaction.agency_id || '',
    representative_id: transaction.representative_id || '',
    contract_number: transaction.contract_number || '',
    notes: transaction.notes || '',
  });
  setShowIncomeModal(true);
};

const handleDeleteIncome = async (transaction: Transaction) => {
  const result = await deleteIncomeFull(Number(transaction.id));
  if (result.error) {
    console.error('Income delete RPC error:', result.error);
    return;
  }

  await reloadTransactions();
};

const handleSaveIncome = async () => {
  if (!editingIncomeId) {
    await handleAddIncome();
    return;
  }

  const updated = await updateTransaction(Number(editingIncomeId), {
    amount: Number(incomeForm.amount),
    payment_method: incomeForm.payment_method,
    car_id: incomeForm.car_id ? Number(incomeForm.car_id) : null,
    agency_id: incomeForm.agency_id ? Number(incomeForm.agency_id) : null,
    representative_id: incomeForm.representative_id ? Number(incomeForm.representative_id) : null,
    contract_number: incomeForm.contract_number || null,
    notes: incomeForm.notes || null,
  });

  if (!updated) return;

  const originalTransaction = transactions.find((transaction) => transaction.id === editingIncomeId);
  if (originalTransaction?.income_entry_id) {
    await updateIncomeEntry(Number(originalTransaction.income_entry_id), {
      amount: Number(incomeForm.amount),
      payment_method: incomeForm.payment_method,
      car_id: incomeForm.car_id ? Number(incomeForm.car_id) : null,
      agency_id: incomeForm.agency_id ? Number(incomeForm.agency_id) : null,
      representative_id: incomeForm.representative_id
        ? Number(incomeForm.representative_id)
        : null,
      contract_number: incomeForm.contract_number || null,
      notes: incomeForm.notes || null,
    });
  }

  await reloadTransactions();
  setEditingIncomeId(null);
  setShowIncomeModal(false);
};

const handleAddExpense = async () => {
  if (!expenseForm.amount) {
    console.warn('Amount is required');
    return;
  }

  // Financial expenses are stored in transactions; the Expenses tab does not use the legacy expenses table.
  const newTransaction = await addTransaction({
    type: 'expense',
    source: 'expense',
    amount: Number(expenseForm.amount),
    date: expenseForm.date,
    payment_method: expenseForm.payment_method,
    supplier_id: expenseForm.supplier_id ? Number(expenseForm.supplier_id) : null,
    car_id: expenseForm.car_id ? Number(expenseForm.car_id) : null,
    category: expenseForm.category || undefined,
    notes: expenseForm.notes || null,
  });

  if (!newTransaction) {
    console.error('Failed to add expense transaction');
    return;
  }

  const updatedTransactions = await fetchTransactions();
  setTransactions(
    (updatedTransactions || []).map((transaction: any) => ({
      id: String(transaction.id ?? ''),
      date: transaction.date ?? '',
      amount: Number(transaction.amount) || 0,
      payment_method: String(transaction.payment_method ?? ''),
      type: String(transaction.type ?? ''),
      car_id: transaction.car_id ?? null,
      car_plate: transaction.car_id
        ? vehicles.find((vehicle: any) => String(vehicle.id) === String(transaction.car_id))?.plate ||
          `#${transaction.car_id}`
        : '-',
      agency_id: transaction.agency_id ? String(transaction.agency_id) : '',
      representative_id: transaction.representative_id ? String(transaction.representative_id) : '',
      supplier_id: transaction.supplier_id ? Number(transaction.supplier_id) : null,
      supplier: String(transaction.supplier ?? ''),
      category: String(transaction.category ?? ''),
      notes: String(transaction.notes ?? ''),
      contract_number: String(transaction.contract_number ?? ''),
      agency: transaction.agency ? String(transaction.agency) : undefined,
      representative: transaction.representative ? String(transaction.representative) : undefined,
    }))
  );

  setExpenseForm({
    movement_type: 'expense',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    supplier_id: '',
    car_id: '',
    category: '',
    notes: '',
  });
  setEditingExpenseId(null);
  setShowExpenseModal(false);
};

const handleEditExpense = (transaction: Transaction) => {
  if (transaction.type === 'supplier_payment') {
    setEditingExpenseId(transaction.id);
    setSupplierPaymentForm({
      amount: String(transaction.amount || ''),
      date: transaction.date || new Date().toISOString().split('T')[0],
      supplier_id: transaction.supplier_id ? String(transaction.supplier_id) : '',
      payment_method: transaction.payment_method || 'cash',
      notes: transaction.notes || '',
    });
    setShowSupplierPaymentModal(true);
    return;
  }

  setEditingExpenseId(transaction.id);
  setExpenseForm({
    movement_type: 'expense',
    amount: String(transaction.amount || ''),
    date: transaction.date || new Date().toISOString().split('T')[0],
    payment_method: transaction.payment_method || 'cash',
    supplier_id: transaction.supplier_id ? String(transaction.supplier_id) : '',
    car_id: transaction.car_id ? String(transaction.car_id) : '',
    category: transaction.category || '',
    notes: transaction.notes || '',
  });
  setShowExpenseModal(true);
};

const openAddExpenseModal = () => {
  setEditingExpenseId(null);
  setExpenseForm({
    movement_type: 'expense',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    supplier_id: '',
    car_id: '',
    category: '',
    notes: '',
  });
  setShowExpenseModal(true);
};

const openSupplierPaymentModal = () => {
  setEditingExpenseId(null);
  setSupplierPaymentForm({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    supplier_id: '',
    payment_method: 'cash',
    notes: '',
  });
  setShowSupplierPaymentModal(true);
};

const handleDeleteExpense = async (transaction: Transaction) => {
  const deleted = await deleteTransaction(Number(transaction.id));
  if (!deleted) return;

  await reloadTransactions();
};

const handleSaveExpense = async () => {
  if (!editingExpenseId) {
    await handleAddExpense();
    return;
  }

  const updated = await updateTransaction(Number(editingExpenseId), {
    type: 'expense',
    source: 'expense',
    amount: Number(expenseForm.amount),
    date: expenseForm.date,
    payment_method: expenseForm.payment_method,
    supplier_id: expenseForm.supplier_id ? Number(expenseForm.supplier_id) : null,
    car_id: expenseForm.car_id ? Number(expenseForm.car_id) : null,
    category: expenseForm.category || null,
    notes: expenseForm.notes || null,
  });

  if (!updated) return;

  await reloadTransactions();
  setEditingExpenseId(null);
  setShowExpenseModal(false);
};

const handleSaveSupplierPayment = async () => {
  if (!supplierPaymentForm.amount || Number(supplierPaymentForm.amount) <= 0) {
    console.warn('Supplier payment amount must be greater than zero');
    return;
  }

  if (!supplierPaymentForm.supplier_id) {
    console.warn('Supplier is required');
    return;
  }

  if (!supplierPaymentForm.payment_method) {
    console.warn('Payment method is required');
    return;
  }

  if (!['cash', 'card', 'bank'].includes(supplierPaymentForm.payment_method)) {
    console.warn('Invalid supplier payment method');
    return;
  }

  if (!editingExpenseId) {
    const created = await addTransaction({
      type: 'supplier_payment',
      source: 'supplier_payment',
      amount: Number(supplierPaymentForm.amount),
      date: supplierPaymentForm.date,
      payment_method: supplierPaymentForm.payment_method,
      supplier_id: Number(supplierPaymentForm.supplier_id),
      notes: supplierPaymentForm.notes || null,
    });

    if (!created) {
      console.error('Failed to add supplier payment transaction');
      return;
    }
  } else {
    const updated = await updateTransaction(Number(editingExpenseId), {
      type: 'supplier_payment',
      source: 'supplier_payment',
      amount: Number(supplierPaymentForm.amount),
      date: supplierPaymentForm.date,
      payment_method: supplierPaymentForm.payment_method,
      supplier_id: Number(supplierPaymentForm.supplier_id),
      car_id: null,
      category: null,
      notes: supplierPaymentForm.notes || null,
    });

    if (!updated) return;
  }

  await reloadTransactions();
  setEditingExpenseId(null);
  setShowSupplierPaymentModal(false);
};
  useEffect(() => {
    if (activeWindow === 'Αυτοκίνητα' || activeWindow === 'Έσοδα' || activeWindow === 'Έξοδα') {
      const loadCars = async () => {
        const cars = await fetchCars();
        const mappedCars = cars.map((car: any) => ({
          id: String(car.id),
          plate: car.plate || '',
          category: car.category || '',
          brand: car.brand || '',
          model: car.model || '',
          year: String(car.year || '0'),
          km: String(car.current_km || '0'),
          price: String(car.purchase_price || '€0'),
          vin: car.vin || '',
          fuel: car.fuel || '',
          engine_cc: car.engine_cc || '',
          kteo_expiry: car.kteo_expiry || '',
          insurance_expiry: car.insurance_expiry || '',
          road_tax_expiry: car.road_tax_expiry || '',
        }));
        setVehicles(mappedCars);
      };
      loadCars();
    }
  }, [activeWindow]);

  useEffect(() => {
    const loadAgencyData = async () => {
      const [{ data: agencyRows }, { data: representativeRows }] = await Promise.all([
        supabase.from('agencies').select('*').order('name'),
        supabase.from('representatives').select('*').order('name'),
      ]);

      setAgencies(agencyRows || []);
      setRepresentatives(representativeRows || []);
    };

    loadAgencyData();
  }, []);

  useEffect(() => {
    const loadExpenseReferences = async () => {
      const loadedSuppliers = await fetchSuppliers();
      const loadedCategories = await fetchExpenseCategories();

      setSuppliers(loadedSuppliers);
      if (loadedCategories.length === 0) {
        setExpenseCategories(await seedDefaultExpenseCategories());
        return;
      }

      setExpenseCategories(loadedCategories);
    };

    loadExpenseReferences();
  }, []);

  useEffect(() => {
    if (
      activeWindow !== 'Ταμείο' &&
      activeWindow !== 'Έσοδα' &&
      activeWindow !== 'Έξοδα' &&
      activeWindow !== 'Αναφορές'
    ) {
      return;
    }

    const loadFinanceTransactions = async () => {
      const transactionRows = await fetchTransactions();
      const carsData = await fetchCars();
      setTransactions(
        (transactionRows || []).map((transaction: any) => ({
          id: String(transaction.id ?? ''),
          date: transaction.date ?? '',
          amount: Number(transaction.amount) || 0,
          payment_method: String(transaction.payment_method ?? ''),
          type: String(transaction.type ?? ''),
          car_id: transaction.car_id ?? null,
       car_plate: transaction.car_id
  ? carsData.find((vehicle: any) => String(vehicle.id) === String(transaction.car_id))?.plate || `#${transaction.car_id}`
  : '-',
          agency_id: transaction.agency_id ? String(transaction.agency_id) : '',
          representative_id: transaction.representative_id ? String(transaction.representative_id) : '',
          supplier_id: transaction.supplier_id ? Number(transaction.supplier_id) : null,
          supplier: String(transaction.supplier ?? ''),
          category: String(transaction.category ?? ''),
          notes: String(transaction.notes ?? ''),
          contract_number: String(transaction.contract_number ?? ''),
          income_entry_id: transaction.income_entry_id ? String(transaction.income_entry_id) : '',
          booking_id: transaction.booking_id ? String(transaction.booking_id) : '',
          source: transaction.source ? String(transaction.source) : undefined,
          agency: transaction.agency ? String(transaction.agency) : undefined,
          representative: transaction.representative ? String(transaction.representative) : undefined,
        }))
      );
    };

    loadFinanceTransactions();
  }, [activeWindow]);

  const handleWindowOpen = (windowId: string) => {
    setActiveWindow(windowId as WindowType);
    setShowAddCar(false);
  };

  const handleWindowClose = () => {
    setActiveWindow(null);
    setShowAddCar(false);
    setShowExpenseModal(false);
    setEditingIncomeId(null);
    setEditingExpenseId(null);
  };

  const openAddCarModal = () => {
    setEditingPlate(null);
    setViewingPlate(null);
    setNewVehicle({
      id: '',
      plate: '',
      category: '',
      brand: '',
      model: '',
      year: '',
      km: '',
      price: '',
      vin: '',
      fuel: '',
      engine_cc: '',
      kteo_expiry: '',
      insurance_expiry: '',
      road_tax_expiry: '',
    });
    setShowAddCar(true);
  };

  const openEditCarModal = (plate: string) => {
    const vehicle = vehicles.find((item) => item.plate === plate);
    if (!vehicle) return;
    setNewVehicle(vehicle);
    setEditingPlate(plate);
    setViewingPlate(null);
    setShowAddCar(true);
  };

  const openViewCarModal = (plate: string) => {
    setViewingPlate(plate);
  };

  const closeViewCarModal = () => {
    setViewingPlate(null);
  };

  const deleteVehicle = async (id: string) => {
  if (!window.confirm('Σίγουρα θέλετε να διαγράψετε αυτό το όχημα;')) return;

  const deleted = await deleteCar(id);

  if (deleted) {
    const updatedCars = await fetchCars();

    setVehicles(
      updatedCars.map((car: any) => ({
        id: String(car.id),
        plate: car.plate || '',
        category: car.category || '',
        brand: car.brand || '',
        model: car.model || '',
        year: String(car.year || ''),
        km: String(car.current_km || ''),
        price: String(car.purchase_price || ''),
        vin: car.vin || '',
        fuel: car.fuel || '',
        engine_cc: car.engine_cc || '',
        kteo_expiry: car.kteo_expiry || '',
        insurance_expiry: car.insurance_expiry || '',
        road_tax_expiry: car.road_tax_expiry || '',
    }))
  );
  }
};
  const closeAddCarModal = () => {
    setShowAddCar(false);
    setEditingPlate(null);
    setNewVehicle({
      id: '',
      plate: '',
      category: '',
      brand: '',
      model: '',
      year: '',
      km: '',
      price: '',
      vin: '',
      fuel: '',
      engine_cc: '',
      kteo_expiry: '',
      insurance_expiry: '',
      road_tax_expiry: '',
    });
  };

  const saveNewVehicle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newVehicle.plate || !newVehicle.brand || !newVehicle.model) {
      return;
    }
 if (editingPlate) {
  const updatedCar = await updateCar(newVehicle.id, {
    plate: newVehicle.plate,
    category: newVehicle.category,
    brand: newVehicle.brand,
    model: newVehicle.model,
    year: Number(newVehicle.year || 0),
    current_km: Number(newVehicle.km || 0),
    purchase_price: Number(String(newVehicle.price).replace(/[^\d]/g, '')),
    vin: newVehicle.vin,
    fuel: newVehicle.fuel,
    engine_cc: newVehicle.engine_cc,
    kteo_expiry: newVehicle.kteo_expiry || undefined,
    insurance_expiry: newVehicle.insurance_expiry || undefined,
    road_tax_expiry: newVehicle.road_tax_expiry || undefined,
  });

  if (updatedCar) {
    const updatedCars = await fetchCars();

    setVehicles(
      updatedCars.map((car: any) => ({
        id: String(car.id),
        plate: car.plate || '',
        category: car.category || '',
        brand: car.brand || '',
        model: car.model || '',
        year: String(car.year || ''),
        km: String(car.current_km || ''),
        price: String(car.purchase_price || ''),
        vin: car.vin || '',
        fuel: car.fuel || '',
        engine_cc: car.engine_cc || '',
        kteo_expiry: car.kteo_expiry || '',
        insurance_expiry: car.insurance_expiry || '',
        road_tax_expiry: car.road_tax_expiry || '',
      }))
    );
  }
    } else {
  const insertedCar = await addCar({
    plate: newVehicle.plate,
    category: newVehicle.category,
    brand: newVehicle.brand,
    model: newVehicle.model,
    year: Number(newVehicle.year || 0),
    current_km: Number(newVehicle.km || 0),
    purchase_price: Number(String(newVehicle.price).replace(/[^\d]/g, '')),
    vin: newVehicle.vin,
    fuel: newVehicle.fuel,
    engine_cc: newVehicle.engine_cc,
  kteo_expiry: newVehicle.kteo_expiry || undefined,
insurance_expiry: newVehicle.insurance_expiry || undefined,
road_tax_expiry: newVehicle.road_tax_expiry || undefined,
  });
  if (insertedCar) {
  const updatedCars = await fetchCars();

  setVehicles(
    updatedCars.map((car: any) => ({
      id: String(car.id),
      plate: car.plate || '',
      category: car.category || '',
      brand: car.brand || '',
      model: car.model || '',
      year: String(car.year || ''),
      km: String(car.current_km || ''),
      price: String(car.purchase_price || ''),
      vin: car.vin || '',
      fuel: car.fuel || '',
      engine_cc: car.engine_cc || '',
      kteo_expiry: car.kteo_expiry || '',
      insurance_expiry: car.insurance_expiry || '',
      road_tax_expiry: car.road_tax_expiry || '',
    }))
  );
}  
  }
    setShowAddCar(false);
    setEditingPlate(null);
    setNewVehicle({
      id: '',
      plate: '',
      category: '',
      brand: '',
      model: '',
      year: '',
      km: '',
      price: '',
      vin: '',
      fuel: '',
      engine_cc: '',
      kteo_expiry: '',
      insurance_expiry: '',
      road_tax_expiry: '',
    });
  };

  const filteredVehicles = vehicles.filter((vehicle) => {
    const query = searchTerm.toLowerCase();
    return (
      vehicle.plate.toLowerCase().includes(query) ||
      vehicle.category.toLowerCase().includes(query) ||
      vehicle.brand.toLowerCase().includes(query) ||
      vehicle.model.toLowerCase().includes(query)
    );
  });

  const transactionsWithAgencyNames = transactions.map((transaction) => ({
    ...transaction,
    agency:
      transaction.agency ||
      agencies.find((agency) => String(agency.id) === transaction.agency_id)?.name,
    representative:
      transaction.representative ||
      representatives.find(
        (representative) => String(representative.id) === transaction.representative_id
      )?.name,
    supplier_name:
      transaction.supplier_id
        ? suppliers.find((supplier) => supplier.id === transaction.supplier_id)?.name
        : undefined,
  }));

  const financeTransactions = transactionsWithAgencyNames.filter((transaction) => {
    const transactionDate = new Date(transaction.date);
    if (fromDate) {
      const from = new Date(fromDate);
      if (transactionDate < from) {
        return false;
      }
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      if (transactionDate > to) {
        return false;
      }
    }
    return true;
  });

  const incomeTransactions = financeTransactions.filter((transaction) => transaction.type === 'income');
  // Expenses UI is sourced only from transactions rows.
  const expenseTransactions = financeTransactions.filter(
    (transaction) => transaction.type === 'expense' || transaction.type === 'supplier_payment'
  );
  const paidExpenseTransactions = financeTransactions.filter((transaction) => {
    const paymentMethod = String(transaction.payment_method).toLowerCase();
    return (
      (transaction.type === 'expense' && ['cash', 'card', 'bank'].includes(paymentMethod)) ||
      (transaction.type === 'supplier_payment' &&
        ['cash', 'card', 'bank'].includes(paymentMethod))
    );
  });
  const supplierCreditTransactions = financeTransactions.filter(
    (transaction) =>
      transaction.type === 'expense' &&
      String(transaction.payment_method).toLowerCase() === 'credit'
  );
  const supplierPaymentTransactions = financeTransactions.filter(
    (transaction) => transaction.type === 'supplier_payment'
  );

  const sumAmount = (items: Transaction[]) => items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const sumMethod = (items: Transaction[], method: string) =>
    sumAmount(items.filter((transaction) => String(transaction.payment_method).toLowerCase() === method));

  const totalIncomeCash = sumMethod(incomeTransactions, 'cash');
  const totalIncomeCard = sumMethod(incomeTransactions, 'card');
  const totalIncomeBank = sumMethod(incomeTransactions, 'bank');
  const totalExpensesCash = sumMethod(expenseTransactions, 'cash');
  const totalExpensesCard = sumMethod(expenseTransactions, 'card');
  const totalExpensesBank = sumMethod(expenseTransactions, 'bank');
  const totalExpensesCredit = sumMethod(expenseTransactions, 'credit');
  const totalIncome = sumAmount(incomeTransactions);
  const totalExpenses = sumAmount(financeTransactions.filter((transaction) => transaction.type === 'expense'));
  const totalPaidExpenses = sumAmount(paidExpenseTransactions);
  const totalSupplierCredits =
    sumAmount(supplierCreditTransactions) - sumAmount(supplierPaymentTransactions);
  const netTotal = totalIncome - totalPaidExpenses;
  const availableRepresentatives = representatives.filter(
    (representative) => String(representative.agency_id) === incomeForm.agency_id
  );
  const revenueByAgency = incomeTransactions
    .filter((transaction) => transaction.agency_id)
    .reduce<Record<string, RevenueByAgencyRow>>((rows, transaction) => {
      const agencyId = transaction.agency_id;
      const currentRow = rows[agencyId] || {
        agencyId,
        agencyName:
          agencies.find((agency) => String(agency.id) === agencyId)?.name ||
          `Πρακτορείο #${agencyId}`,
        totalRevenue: 0,
        cash: 0,
        card: 0,
        bank: 0,
        credit: 0,
        transactionsCount: 0,
      };
      const amount = Number(transaction.amount) || 0;
      const paymentMethod = String(transaction.payment_method).toLowerCase();

      currentRow.totalRevenue += amount;
      currentRow.transactionsCount += 1;

      if (paymentMethod === 'cash') currentRow.cash += amount;
      if (paymentMethod === 'card') currentRow.card += amount;
      if (paymentMethod === 'bank') currentRow.bank += amount;
      if (paymentMethod === 'credit') currentRow.credit += amount;

      rows[agencyId] = currentRow;
      return rows;
    }, {});
  const revenueByAgencyRows = Object.values(revenueByAgency).sort(
    (left, right) => right.totalRevenue - left.totalRevenue
  );

  const formatMoney = (value: number) =>
    `€${value.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('el-GR');
  };

  const formatPaymentMethod = (method: string) => {
    const paymentMethods: { [key: string]: string } = {
      cash: 'Μετρητά',
      card: 'Κάρτα',
      bank: 'Τράπεζα',
      credit: 'Επί Πιστώσει',
      other: 'Άλλο',
    };
    return paymentMethods[method] || '-';
  };

  const formatRelatedValue = (label: string, id: string) =>
    id ? `${label} #${id}` : '-';

  const renderWindowContent = () => {
    switch (activeWindow) {
  case 'Πρακτορεία':
    return (
      <AgenciesManager />
    );

  case 'Αυτοκίνητα':
    return (
          <div className="space-y-4">
            <div className="w-full max-w-3xl">
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Αναζήτηση με πινακίδα, μάρκα, μοντέλο ή κατηγορία"
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
            <VehiclesTable
              vehicles={filteredVehicles}
              onView={openViewCarModal}
              onEdit={openEditCarModal}
              onDelete={deleteVehicle}
            />
          </div>
        );
      case 'Ταμείο':
        return (
          <FinanceOverview
            fromDate={fromDate}
            toDate={toDate}
            setFromDate={setFromDate}
            setToDate={setToDate}
            totalIncome={totalIncome}
            totalPaidExpenses={totalPaidExpenses}
            totalSupplierCredits={totalSupplierCredits}
            netTotal={netTotal}
          />
        );
      case 'Έσοδα':
        return (
          <FinanceIncome
            incomeTransactions={incomeTransactions}
            onEditIncome={handleEditIncome}
            onDeleteIncome={handleDeleteIncome}
          />
        );
      case 'Έξοδα':
        return (
          <FinanceExpenses
            expenseTransactions={expenseTransactions}
            onAddExpense={openAddExpenseModal}
            onAddSupplierPayment={openSupplierPaymentModal}
            onEditExpense={handleEditExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        );
      case 'Προμηθευτές':
        return <SuppliersManager />;
      case 'Κατηγορίες Εξόδων':
        return <ExpenseCategoriesManager />;
      case 'Αναφορές':
        return (
          <div className="space-y-5">
            <section className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">Revenue by Agency</h2>
                  <p className="mt-1 text-sm text-zinc-500">Έσοδα ανά πρακτορείο.</p>
                </div>
                <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-zinc-300">
                    <span>Από</span>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(event) => setFromDate(event.target.value)}
                      onClick={(event) => event.currentTarget.showPicker?.()}
                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-zinc-300">
                    <span>Έως</span>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(event) => setToDate(event.target.value)}
                      onClick={(event) => event.currentTarget.showPicker?.()}
                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    />
                  </label>
                </div>
              </div>
            </section>

            <div className="overflow-x-auto rounded-3xl border border-zinc-800 bg-zinc-950/60">
              <table className="min-w-[900px] w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80">
                    <th className="px-4 py-3 text-sm text-zinc-400">Agency</th>
                    <th className="px-4 py-3 text-sm text-zinc-400">Total Revenue</th>
                    <th className="px-4 py-3 text-sm text-zinc-400">Cash</th>
                    <th className="px-4 py-3 text-sm text-zinc-400">Card</th>
                    <th className="px-4 py-3 text-sm text-zinc-400">Bank</th>
                    <th className="px-4 py-3 text-sm text-zinc-400">Credit</th>
                    <th className="px-4 py-3 text-sm text-zinc-400">Transactions Count</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueByAgencyRows.map((row) => (
                    <tr key={row.agencyId} className="border-b border-zinc-800 hover:bg-zinc-900/60">
                      <td className="px-4 py-4 text-sm text-zinc-200">{row.agencyName}</td>
                      <td className="px-4 py-4 text-sm text-white">{formatMoney(row.totalRevenue)}</td>
                      <td className="px-4 py-4 text-sm text-zinc-200">{formatMoney(row.cash)}</td>
                      <td className="px-4 py-4 text-sm text-zinc-200">{formatMoney(row.card)}</td>
                      <td className="px-4 py-4 text-sm text-zinc-200">{formatMoney(row.bank)}</td>
                      <td className="px-4 py-4 text-sm text-zinc-200">{formatMoney(row.credit)}</td>
                      <td className="px-4 py-4 text-sm text-zinc-200">{row.transactionsCount}</td>
                    </tr>
                  ))}
                  {revenueByAgencyRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-sm text-zinc-400">
                        Δεν βρέθηκαν έσοδα πρακτορείων.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getWindowTitle = () => {
    switch (activeWindow) {
      case 'Αυτοκίνητα':
        return 'Διαχείριση Αυτοκινήτων';
      case 'Ταμείο':
        return 'Ταμείο';
      case 'Έσοδα':
        return 'Έσοδα';
      case 'Έξοδα':
        return 'Έξοδα';
      case 'Προμηθευτές':
        return 'Προμηθευτές';
      case 'Κατηγορίες Εξόδων':
        return 'Κατηγορίες Εξόδων';
      case 'Αναφορές':
        return 'Αναφορές';
       case 'Πρακτορεία':
  return 'Πρακτορεία';
      default:
        return '';
    }
  };

  const getWindowActions = () => {
    if (activeWindow === 'Αυτοκίνητα') {
      return (
        <button className="add-car-btn" type="button" onClick={openAddCarModal}>
          + Προσθήκη Αυτοκινήτου
        </button>
      );
    }
    if (activeWindow === 'Έσοδα') {
  return (
    <button
      className="rounded-2xl border border-sky-500 px-5 py-3 text-sm font-semibold text-sky-300 hover:bg-sky-500/10"
      type="button"
      onClick={() => setShowIncomeModal(true)}
    >
      + Καταχώρηση Εσόδου
    </button>
  );
}
    return null;
  };

  return (
    <>
      <Sidebar onWindowOpen={handleWindowOpen} activeWindow={activeWindow} />
      <main className="flex-1 relative bg-zinc-950">
        {/* Homepage with centered logo */}
        {!activeWindow && (
          <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
            <div className="relative w-[500px] h-[500px] flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="AUTOCLUB"
                fill
                priority
                className="object-contain opacity-60 drop-shadow-2xl"
                sizes="500px"
              />
            </div>
          </div>
        )}

        {/* Floating Window */}
        {activeWindow && (
          <Window
            title={getWindowTitle()}
            onClose={handleWindowClose}
            titleActions={getWindowActions()}
          >
            {renderWindowContent()}
          </Window>
        )}
{showIncomeModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div className="w-full max-w-md rounded-[28px] bg-zinc-950 border border-zinc-800 shadow-2xl">
      <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
        <h3 className="text-lg font-semibold text-white">Καταχώρηση Εσόδου</h3>
        <button
          type="button"
          onClick={() => {
            setShowIncomeModal(false);
            setEditingIncomeId(null);
          }}
          className="text-zinc-400 hover:text-white transition-colors p-2 rounded-lg"
        >
          ✕
        </button>
      </div>

      <div className="p-6 space-y-4">
        <label className="space-y-2 text-sm text-zinc-300 block">
  <span>Τύπος Εσόδου</span>

  <select
    value={incomeForm.income_type}
    onChange={(event) =>
      setIncomeForm({
        ...incomeForm,
        income_type: event.target.value,
      })
    }
    className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500"
  >
    <option value="rental">Ενοικίαση Αυτοκινήτου</option>
    <option value="car_sale">Πώληση Αυτοκινήτου</option>
    <option value="other_income">Άλλο Έσοδο</option>
  </select>
</label>
        <label className="space-y-2 text-sm text-zinc-300 block">
          <span>Ποσό</span>
          <input
            value={incomeForm.amount}
            onChange={(event) => setIncomeForm({ ...incomeForm, amount: event.target.value })}
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500"
          />
        </label>

        <label className="space-y-2 text-sm text-zinc-300 block">
          <span>Τρόπος Πληρωμής</span>
          <select
            value={incomeForm.payment_method}
            onChange={(event) => setIncomeForm({ ...incomeForm, payment_method: event.target.value })}
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500"
          >
            <option value="cash">Μετρητά</option>
            <option value="card">Κάρτα</option>
            <option value="bank">Τράπεζα</option>
            <option value="credit">Επί Πιστώσει</option>
            <option value="other">Άλλο</option>
          </select>
        </label>
<label className="space-y-2 text-sm text-zinc-300 block">
  <span>Αυτοκίνητο</span>
  <select
    value={incomeForm.car_id}
    onChange={(event) => setIncomeForm({ ...incomeForm, car_id: event.target.value })}
    className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500"
  >
    <option value="">Επιλογή αυτοκινήτου</option>
    {vehicles.map((vehicle) => (
      <option key={vehicle.id} value={vehicle.id}>
        {vehicle.plate}
      </option>
    ))}
  </select>
</label>

<label className="space-y-2 text-sm text-zinc-300 block">
  <span>Πρακτορείο</span>
  <select
    value={incomeForm.agency_id}
    onChange={(event) =>
      setIncomeForm({
        ...incomeForm,
        agency_id: event.target.value,
        representative_id: '',
      })
    }
    className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500"
  >
    <option value="">Επιλογή πρακτορείου</option>
    {agencies.map((agency) => (
      <option key={agency.id} value={agency.id}>
        {agency.name}
      </option>
    ))}
  </select>
</label>

<label className="space-y-2 text-sm text-zinc-300 block">
  <span>Αντιπρόσωπος</span>
  <select
    value={incomeForm.representative_id}
    onChange={(event) => setIncomeForm({ ...incomeForm, representative_id: event.target.value })}
    className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500"
  >
    <option value="">Επιλογή αντιπροσώπου</option>
    {availableRepresentatives.map((representative) => (
      <option key={representative.id} value={representative.id}>
        {representative.name}
      </option>
    ))}
  </select>
</label>
<label className="space-y-2 text-sm text-zinc-300 block">
  <span>Αριθμός Συμβολαίου</span>
  <input
    value={incomeForm.contract_number}
    onChange={(event) =>
      setIncomeForm({
        ...incomeForm,
        contract_number: event.target.value,
      })
    }
    placeholder="π.χ. RA-2026-0152"
    className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500"
  />
</label>
        <label className="space-y-2 text-sm text-zinc-300 block">
          <span>Σημειώσεις</span>
          <textarea
            value={incomeForm.notes}
            onChange={(event) => setIncomeForm({ ...incomeForm, notes: event.target.value })}
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500 min-h-24"
          />
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setShowIncomeModal(false);
              setEditingIncomeId(null);
            }}
            className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm text-zinc-300"
          >
            Ακύρωση
          </button>

          <button
            type="button"
            onClick={handleSaveIncome}
            className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-400"
          >
            Αποθήκευση
          </button>
        </div>
      </div>
    </div>
  </div>
)}
{showExpenseModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div className="w-full max-w-md rounded-[28px] bg-zinc-950 border border-zinc-800 shadow-2xl">
      <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
        <h3 className="text-lg font-semibold text-white">Καταχώρηση Εξόδου</h3>
        <button
          type="button"
          onClick={() => {
            setShowExpenseModal(false);
            setEditingExpenseId(null);
          }}
          className="text-zinc-400 hover:text-white transition-colors p-2 rounded-lg"
        >
          ✕
        </button>
      </div>

      <div className="p-6 space-y-4">
        <label className="space-y-2 text-sm text-zinc-300 block">
          <span>Ποσό</span>
          <input
            value={expenseForm.amount}
            onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })}
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-rose-500"
          />
        </label>

        <label className="space-y-2 text-sm text-zinc-300 block">
          <span>Ημερομηνία</span>
          <input
            type="date"
            value={expenseForm.date}
            onChange={(event) => setExpenseForm({ ...expenseForm, date: event.target.value })}
            onClick={(event) => event.currentTarget.showPicker?.()}
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-rose-500"
          />
        </label>

        <label className="space-y-2 text-sm text-zinc-300 block">
          <span>Τρόπος Πληρωμής</span>
          <select
            value={expenseForm.payment_method}
            onChange={(event) =>
              setExpenseForm({ ...expenseForm, payment_method: event.target.value })
            }
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-rose-500"
          >
            <option value="cash">Μετρητά</option>
            <option value="card">Κάρτα</option>
            <option value="bank">Τράπεζα</option>
            <option value="credit">Επί Πιστώσει</option>
          </select>
        </label>

        <label className="space-y-2 text-sm text-zinc-300 block">
          <span>Προμηθευτής</span>
          <select
            value={expenseForm.supplier_id}
            onChange={(event) => setExpenseForm({ ...expenseForm, supplier_id: event.target.value })}
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-rose-500"
          >
            <option value="">Επιλογή προμηθευτή</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </label>

        <>
          <label className="space-y-2 text-sm text-zinc-300 block">
              <span>Αυτοκίνητο</span>
              <select
                value={expenseForm.car_id}
                onChange={(event) => setExpenseForm({ ...expenseForm, car_id: event.target.value })}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-rose-500"
              >
                <option value="">Γενικό έξοδο επιχείρησης</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate}
                  </option>
                ))}
              </select>
          </label>

          <label className="space-y-2 text-sm text-zinc-300 block">
              <span>Κατηγορία</span>
              <select
                value={expenseForm.category}
                onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value })}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-rose-500"
              >
                <option value="">Επιλογή κατηγορίας</option>
                {expenseCategories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
          </label>
        </>

        <label className="space-y-2 text-sm text-zinc-300 block">
          <span>Σημειώσεις</span>
          <textarea
            value={expenseForm.notes}
            onChange={(event) => setExpenseForm({ ...expenseForm, notes: event.target.value })}
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-rose-500 min-h-24"
          />
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setShowExpenseModal(false);
              setEditingExpenseId(null);
            }}
            className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm text-zinc-300"
          >
            Ακύρωση
          </button>

          <button
            type="button"
            onClick={handleSaveExpense}
            className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-500"
          >
            Αποθήκευση
          </button>
        </div>
      </div>
    </div>
  </div>
)}
{showSupplierPaymentModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div className="w-full max-w-md rounded-[28px] bg-zinc-950 border border-zinc-800 shadow-2xl">
      <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
        <h3 className="text-lg font-semibold text-white">Πληρωμή Προμηθευτή</h3>
        <button
          type="button"
          onClick={() => {
            setShowSupplierPaymentModal(false);
            setEditingExpenseId(null);
          }}
          className="text-zinc-400 hover:text-white transition-colors p-2 rounded-lg"
        >
          ×
        </button>
      </div>

      <div className="p-6 space-y-4">
        <label className="space-y-2 text-sm text-zinc-300 block">
          <span>Ποσό</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={supplierPaymentForm.amount}
            onChange={(event) =>
              setSupplierPaymentForm({ ...supplierPaymentForm, amount: event.target.value })
            }
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-rose-500"
          />
        </label>

        <label className="space-y-2 text-sm text-zinc-300 block">
          <span>Ημερομηνία</span>
          <input
            type="date"
            value={supplierPaymentForm.date}
            onChange={(event) =>
              setSupplierPaymentForm({ ...supplierPaymentForm, date: event.target.value })
            }
            onClick={(event) => event.currentTarget.showPicker?.()}
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-rose-500"
          />
        </label>

        <label className="space-y-2 text-sm text-zinc-300 block">
          <span>Προμηθευτής</span>
          <select
            value={supplierPaymentForm.supplier_id}
            onChange={(event) =>
              setSupplierPaymentForm({ ...supplierPaymentForm, supplier_id: event.target.value })
            }
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-rose-500"
          >
            <option value="">Επιλογή προμηθευτή</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm text-zinc-300 block">
          <span>Τρόπος Πληρωμής</span>
          <select
            value={supplierPaymentForm.payment_method}
            onChange={(event) =>
              setSupplierPaymentForm({
                ...supplierPaymentForm,
                payment_method: event.target.value,
              })
            }
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-rose-500"
          >
            <option value="cash">Μετρητά</option>
            <option value="card">Κάρτα</option>
            <option value="bank">Τράπεζα</option>
          </select>
        </label>

        <label className="space-y-2 text-sm text-zinc-300 block">
          <span>Σημειώσεις</span>
          <textarea
            value={supplierPaymentForm.notes}
            onChange={(event) =>
              setSupplierPaymentForm({ ...supplierPaymentForm, notes: event.target.value })
            }
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-rose-500 min-h-24"
          />
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setShowSupplierPaymentModal(false);
              setEditingExpenseId(null);
            }}
            className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm text-zinc-300"
          >
            Ακύρωση
          </button>

          <button
            type="button"
            onClick={handleSaveSupplierPayment}
            className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-500"
          >
            Αποθήκευση
          </button>
        </div>
      </div>
    </div>
  </div>
)}
        {showAddCar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-2xl rounded-[28px] bg-zinc-950 border border-zinc-800 shadow-2xl shadow-black/30 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
                <h3 className="text-lg font-semibold text-white">
                  {editingPlate ? 'Επεξεργασία Αυτοκινήτου' : 'Νέο Αυτοκίνητο'}
                </h3>
                <button
                  type="button"
                  onClick={closeAddCarModal}
                  className="text-zinc-400 hover:text-white transition-colors p-2 rounded-lg"
                >
                  ✕
                </button>
              </div>
              <form className="p-6 space-y-5" onSubmit={saveNewVehicle}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-zinc-300">
                    <span>Πινακίδα</span>
                    <input
                      value={newVehicle.plate}
                      onChange={(event) => setNewVehicle({ ...newVehicle, plate: event.target.value })}
                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-zinc-300">
                    <span>Κατηγορία</span>
                    <select
                      value={newVehicle.category}
                      onChange={(event) => setNewVehicle({ ...newVehicle, category: event.target.value })}
                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    >
                      <option value="">Επιλέξτε</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                      <option value="E">E</option>
                      <option value="H">H</option>
                      <option value="H1">H1</option>
                      <option value="H2">H2</option>
                      <option value="H3">H3</option>
                      <option value="H4">H4</option>
                      <option value="H5">H5</option>
                      <option value="K">K</option>
                      <option value="K1">K1</option>
                      <option value="K2">K2</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm text-zinc-300">
                    <span>Μάρκα</span>
                    <input
                      value={newVehicle.brand}
                      onChange={(event) => setNewVehicle({ ...newVehicle, brand: event.target.value })}
                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-zinc-300">
                    <span>Μοντέλο</span>
                    <input
                      value={newVehicle.model}
                      onChange={(event) => setNewVehicle({ ...newVehicle, model: event.target.value })}
                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-zinc-300">
                    <span>Έτος</span>
                    <input
                      value={newVehicle.year}
                      onChange={(event) => setNewVehicle({ ...newVehicle, year: event.target.value })}
                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-zinc-300">
                    <span>Χλμ</span>
                    <input
                      value={newVehicle.km}
                      onChange={(event) => setNewVehicle({ ...newVehicle, km: event.target.value })}
                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-zinc-300">
                    <span>Τιμή Αγοράς</span>
                    <input
                      value={newVehicle.price}
                      onChange={(event) => setNewVehicle({ ...newVehicle, price: event.target.value })}
                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    />
                  </label>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeAddCarModal}
                    className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
                  >
                    Ακύρωση
                  </button>
                  <button type="submit" className="add-car-btn w-full sm:w-auto">
                    Αποθήκευση
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {viewingPlate && (
          <VehicleViewModal
            vehicle={vehicles.find((v) => v.plate === viewingPlate)!}
            onClose={closeViewCarModal}
          />
        )}
      </main>
    </>
  );
}
function formatEuro(value: string) {
  const numericValue = Number(String(value).replace(/[^\d.]/g, ''));

  if (!numericValue) {
    return '€0';
  }

  return `€${numericValue.toLocaleString()}`;
}
function VehiclesTable({
  vehicles,
  onView,
  onEdit,
  onDelete,
}: {
  vehicles: Vehicle[];
  onView: (plate: string) => void;
  onEdit: (plate: string) => void;
  onDelete: (plate: string) => void;
}) {
  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-700">
              <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Πινακίδα</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Κατηγορία</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Μάρκα</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Μοντέλο</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Έτος</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Χλμ</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Τιμή Αγοράς</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => (
              <tr key={vehicle.plate} className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                <td className="py-4 px-4 text-sm text-zinc-200 font-mono">{vehicle.plate}</td>
                <td className="py-4 px-4 text-sm text-zinc-200">{vehicle.category}</td>
                <td className="py-4 px-4 text-sm text-zinc-200">{vehicle.brand}</td>
                <td className="py-4 px-4 text-sm text-zinc-200">{vehicle.model}</td>
                <td className="py-4 px-4 text-sm text-zinc-200">{vehicle.year}</td>
                <td className="py-4 px-4 text-sm text-zinc-200">{vehicle.km}</td>
                <td className="py-4 px-4 text-sm text-zinc-200 font-medium">{formatEuro(vehicle.price)}</td>
                <td className="py-4 px-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onView(vehicle.plate)}
                      className="rounded-2xl border border-sky-600 bg-zinc-900 px-3 py-2 text-xs text-sky-300 transition hover:bg-sky-500/10"
                    >
                      Προβολή
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(vehicle.plate)}
                      className="rounded-2xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white transition hover:bg-zinc-800"
                    >
                      Επεξεργασία
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(vehicle.id)}
                      className="rounded-2xl border border-rose-600 bg-zinc-900 px-3 py-2 text-xs text-rose-300 transition hover:bg-rose-500/10"
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
  );
}

function VehicleViewModal({
  vehicle,
  onClose,
}: {
  vehicle: Vehicle;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-4xl rounded-[28px] bg-zinc-950 border border-zinc-800 shadow-2xl shadow-black/30 overflow-hidden max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h3 className="text-lg font-semibold text-white">Φάκελος Αυτοκινήτου</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-2 rounded-lg"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          <div className="p-5 space-y-6">
            {/* Βασικά Στοιχεία Section */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Βασικά Στοιχεία</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-zinc-900 rounded-2xl p-3 border border-zinc-800">
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Πινακίδα</p>
                  <p className="text-xs font-mono text-white">{vehicle.plate}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Κατηγορία</p>
                  <p className="text-xs text-white">{vehicle.category}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Μάρκα</p>
                  <p className="text-xs text-white">{vehicle.brand}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Μοντέλο</p>
                  <p className="text-xs text-white">{vehicle.model}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Έτος</p>
                  <p className="text-xs text-white">{vehicle.year}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Χλμ</p>
                  <p className="text-xs text-white">{vehicle.km}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Τιμή Αγοράς</p>
                  <p className="text-xs text-white">{formatEuro(vehicle.price)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-1">VIN</p>
                  <p className="text-xs text-zinc-400">-</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Κυβικά</p>
                  <p className="text-xs text-zinc-400">-</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Καύσιμο</p>
                  <p className="text-xs text-zinc-400">-</p>
                </div>
              </div>
            </div>

            {/* Έγγραφα Section */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Έγγραφα</h4>
              <div className="space-y-2 bg-zinc-900 rounded-2xl p-3 border border-zinc-800">
                <button className="w-full rounded-2xl border border-zinc-700 bg-zinc-850 px-3 py-2 text-xs text-zinc-300 transition hover:bg-zinc-800">
                  Άδεια Κυκλοφορίας
                </button>
                <button className="w-full rounded-2xl border border-zinc-700 bg-zinc-850 px-3 py-2 text-xs text-zinc-300 transition hover:bg-zinc-800">
                  ΚΤΕΟ
                </button>
                <div className="pt-2 border-t border-zinc-700">
                  <p className="text-xs text-zinc-400 mb-1">ΚΤΕΟ Λήξη</p>
                  <p className="text-xs text-zinc-400">-</p>
                </div>
              </div>
            </div>

            {/* Ιστορικό Service Section */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Ιστορικό Service</h4>
              <div className="bg-zinc-900 rounded-2xl p-3 border border-zinc-800">
                <p className="text-xs text-zinc-400">Δεν υπάρχουν ακόμα καταχωρήσεις service για αυτό το όχημα.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

