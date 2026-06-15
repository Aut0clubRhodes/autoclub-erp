'use client';

import { useState, useEffect, useRef, type FormEvent, type MouseEvent as ReactMouseEvent } from 'react';
import Image from 'next/image';
import { Bell, Menu, X } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Window from '@/components/Window';
import LoginScreen from '@/components/LoginScreen';
import FinanceOverview from '@/components/FinanceOverview';
import FinanceIncome from '@/components/FinanceIncome';
import FinanceExpenses from '@/components/FinanceExpenses';
import DebtsManager from '@/components/DebtsManager';
import BookingsManager from '@/components/BookingsManager';
import LeasingManager from '@/components/LeasingManager';
import FinancialEngine from '@/components/FinancialEngine';
import ReportsCenter from '@/components/reports/ReportsCenter';
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
import SettingsManager from '@/components/SettingsManager';
import MarketingManager from '@/components/MarketingManager';
import BookingEngineAdmin from '@/components/BookingEngineAdmin';
import ServicesManager from '@/components/ServicesManager';
import VehicleDocumentsManager from '@/components/VehicleDocumentsManager';
import AutoClubRhodesReservationsBoard from '@/components/AutoClubRhodesReservationsBoard';
import { supabase } from '@/lib/supabaseClient';
import {
  addIncomeEntry,
  updateIncomeEntry,
  updateIncomeTransactionLink,
} from '@/lib/incomeApi';
import {
  addBooking,
  fetchBookings,
  updateBookingTransactionLink,
  type BookingRecord,
} from '@/lib/bookingsApi';
import { fetchSuppliers, type SupplierRecord } from '@/lib/suppliersApi';
import { fetchSupplierLedger, type SupplierLedgerRow } from '@/lib/reportsApi';
import {
  fetchExpenseCategories,
  seedDefaultExpenseCategories,
  type ExpenseCategory,
} from '@/lib/expenseCategoriesApi';
import { fetchServicesByCarId, type ServiceRecord } from '@/lib/servicesApi';
import { fetchCarDocuments, getCarDocumentPublicUrl, type CarDocumentRecord } from '@/lib/carDocumentsApi';
import { fetchDebts, type DebtRecord } from '@/lib/debtsApi';
import { DEFAULT_VEHICLE_GROUP_CODES, fetchVehicleGroups } from '@/lib/vehicleGroupsApi';
import {
  fetchLatestNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRecord,
} from '@/lib/notificationsApi';
type WindowType =
  | 'Πίνακας'
  | 'Αυτοκίνητα'
  | 'Κρατήσεις'
  | 'Service'
  | 'Leasing'
  | 'Ταμείο'
  | 'Έσοδα'
  | 'Έξοδα'
  | 'Γραμμάτια'
  | 'Financial Engine'
  | 'Προμηθευτές'
  | 'Έγγραφα'
  | 'Κατηγορίες Εξόδων'
  | 'Αναφορές'
  | 'Πρακτορεία'
  | 'Marketing'
  | 'Booking Engine Admin'
  | 'Ρυθμίσεις'
  | null;

type WindowId = Exclude<WindowType, null>;
type AppRole = 'admin' | 'bookings';

type AuthSession = {
  user: {
    id: string;
    email?: string | null;
  };
} | null;

type OpenWindow = {
  id: WindowId;
  title: string;
  zIndex: number;
  isMinimized?: boolean;
};

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

type VehicleSortKey = 'category' | 'year';
type SortDirection = 'asc' | 'desc';
type VehicleSortState = {
  key: VehicleSortKey;
  direction: SortDirection;
} | null;

type LicenseViewerState = {
  vehicle: Vehicle;
  document?: CarDocumentRecord;
  url?: string;
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
  const [authLoading, setAuthLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 1023px)').matches;
  });
  const [isPhoneViewport, setIsPhoneViewport] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [bookingsMobileTab, setBookingsMobileTab] = useState<'dashboard' | 'bookings' | 'whatsapp'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('autoclub-sidebar-collapsed') === 'true';
  });
  const [openWindows, setOpenWindows] = useState<OpenWindow[]>([]);
  const [topZIndex, setTopZIndex] = useState(50);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const sidebarWidth = isSidebarCollapsed ? 72 : 250;
  const visibleWindows = openWindows.filter((windowItem) => !windowItem.isMinimized);
  const activeWindow = visibleWindows.length
    ? visibleWindows.reduce((topWindow, windowItem) => (windowItem.zIndex > topWindow.zIndex ? windowItem : topWindow), visibleWindows[0]).id
    : null;
  const hasOpenWindow = (windowId: WindowId) => openWindows.some((windowItem) => windowItem.id === windowId);
  const canOpenWindow = (windowId: WindowId | string) =>
    userRole === 'admin' || windowId === 'Κρατήσεις' || windowId === 'Πίνακας';

  useEffect(() => {
    document.documentElement.style.setProperty('--autoclub-sidebar-width', `${sidebarWidth}px`);
  }, [sidebarWidth]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const phoneMediaQuery = window.matchMedia('(max-width: 768px)');
    const updateViewportMode = () => {
      setIsMobileViewport(mediaQuery.matches);
      setIsPhoneViewport(phoneMediaQuery.matches);
      if (!phoneMediaQuery.matches) {
        setIsMobileMenuOpen(false);
      }
    };

    updateViewportMode();
    mediaQuery.addEventListener('change', updateViewportMode);
    phoneMediaQuery.addEventListener('change', updateViewportMode);
    window.addEventListener('orientationchange', updateViewportMode);
    return () => {
      mediaQuery.removeEventListener('change', updateViewportMode);
      phoneMediaQuery.removeEventListener('change', updateViewportMode);
      window.removeEventListener('orientationchange', updateViewportMode);
    };
  }, []);

  const loadNotifications = async () => {
    const latestNotifications = await fetchLatestNotifications();
    setNotifications(latestNotifications);
  };

  useEffect(() => {
    if (!userEmail) return;

    void loadNotifications();
    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [userEmail]);

  const unreadNotificationsCount = notifications.filter((notification) => notification.read === false).length;

  const handleNotificationClick = async (notification: NotificationRecord) => {
    if (notification.read === false) {
      setNotifications((currentNotifications) =>
        currentNotifications.map((currentNotification) =>
          currentNotification.id === notification.id ? { ...currentNotification, read: true } : currentNotification
        )
      );
      const updated = await markNotificationRead(notification.id);
      if (!updated) {
        await loadNotifications();
      }
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) => ({ ...notification, read: true }))
    );
    const updated = await markAllNotificationsRead();
    if (!updated) {
      await loadNotifications();
    }
  };

  const [showAddCar, setShowAddCar] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showIncomeNotes, setShowIncomeNotes] = useState(false);
  const [incomeCarSearch, setIncomeCarSearch] = useState('');
  const [isIncomeCarComboboxOpen, setIsIncomeCarComboboxOpen] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showSupplierPaymentModal, setShowSupplierPaymentModal] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [incomeForm, setIncomeForm] = useState({
    income_type: 'rental',
    date: new Date().toISOString().split('T')[0],
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
  const [vehicleGroups, setVehicleGroups] = useState<string[]>(DEFAULT_VEHICLE_GROUP_CODES);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [supplierLedger, setSupplierLedger] = useState<SupplierLedgerRow[]>([]);
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
  const [vehicleSort, setVehicleSort] = useState<VehicleSortState>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [editingPlate, setEditingPlate] = useState<string | null>(null);
  const [viewingPlate, setViewingPlate] = useState<string | null>(null);
  const [licenseViewer, setLicenseViewer] = useState<LicenseViewerState | null>(null);
  const [licenseZoom, setLicenseZoom] = useState(1);
  const [licenseRotation, setLicenseRotation] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadProfileRole = async (userId: string): Promise<AppRole> => {
      const { data, error } = await supabase.from('user_profiles').select('role').eq('id', userId).maybeSingle();

      if (error) {
        console.warn('Load user profile role warning:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
      }

      return data?.role === 'admin' ? 'admin' : 'bookings';
    };

    const applySession = async (session: AuthSession) => {
      if (!mounted) return;

      if (!session?.user) {
        setUserEmail(null);
        setUserRole(null);
        setOpenWindows([]);
        setAuthLoading(false);
        return;
      }

      setAuthLoading(true);
      const role = await loadProfileRole(session.user.id);
      if (!mounted) return;

      setUserEmail(session.user.email ?? null);
      setUserRole(role);
      setAuthLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => {
      void applySession(data.session as AuthSession);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session as AuthSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userEmail) {
      return;
    }

    const loadVehicleGroups = async () => {
      const groups = await fetchVehicleGroups();
      const activeCodes = groups
        .filter((group) => group.active)
        .map((group) => group.code)
        .filter(Boolean);

      setVehicleGroups(activeCodes.length > 0 ? activeCodes : DEFAULT_VEHICLE_GROUP_CODES);
    };

    loadVehicleGroups();
  }, [userEmail]);

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
  category: incomeForm.income_type,
  amount: Number(incomeForm.amount),
  date: incomeForm.date,
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
        date: new Date().toISOString().split('T')[0],
        amount: '',
        payment_method: 'cash',
        car_id: '',
        agency_id: '',
        representative_id: '',
        contract_number: '',
        notes: '',
      });

      setEditingIncomeId(null);
      setShowIncomeNotes(false);
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
  setShowIncomeNotes(false);
  setIncomeForm({
    income_type: transaction.source || 'rental',
    date: transaction.date || new Date().toISOString().split('T')[0],
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
    source: incomeForm.income_type,
    category: incomeForm.income_type,
    amount: Number(incomeForm.amount),
    date: incomeForm.date,
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
  const freshSuppliers = await fetchSuppliers();
  setSuppliers(freshSuppliers);
  if (
    expenseForm.supplier_id &&
    !freshSuppliers.some((supplier) => supplier.id === Number(expenseForm.supplier_id))
  ) {
    alert('Ο προμηθευτής δεν υπάρχει πλέον. Κάντε ανανέωση και επιλέξτε ξανά.');
    return;
  }

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
    if (!userEmail) {
      return;
    }

    if (
      openWindows.length === 0 ||
      hasOpenWindow('Αυτοκίνητα') ||
      hasOpenWindow('Έσοδα') ||
      hasOpenWindow('Έξοδα') ||
      hasOpenWindow('Αναφορές')
    ) {
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
  }, [openWindows, userEmail]);

  useEffect(() => {
    if (!userEmail) {
      return;
    }

    if (!hasOpenWindow('Αναφορές')) {
      return;
    }

    const loadReportsData = async () => {
      const [bookingRows, supplierLedgerRows] = await Promise.all([
        fetchBookings(),
        fetchSupplierLedger(),
      ]);

      setBookings(bookingRows);
      setSupplierLedger(supplierLedgerRows);
    };

    loadReportsData();
  }, [openWindows, userEmail]);

  useEffect(() => {
    if (!userEmail) {
      return;
    }

    const loadAgencyData = async () => {
      const [{ data: agencyRows }, { data: representativeRows }] = await Promise.all([
        supabase.from('agencies').select('*').order('name'),
        supabase.from('representatives').select('*').order('name'),
      ]);

      setAgencies(agencyRows || []);
      setRepresentatives(representativeRows || []);
    };

    loadAgencyData();
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) {
      return;
    }

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
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail || !showExpenseModal) return;

    fetchSuppliers().then(setSuppliers);
  }, [showExpenseModal, userEmail]);

  useEffect(() => {
    if (!userEmail) {
      return;
    }

    if (openWindows.length > 0 && !hasOpenWindow('Γραμμάτια') && !hasOpenWindow('Financial Engine')) {
      return;
    }

    fetchDebts().then(setDebts);
  }, [openWindows, userEmail]);

  useEffect(() => {
    if (!userEmail) {
      return;
    }

    if (
      openWindows.length > 0 &&
      !hasOpenWindow('Ταμείο') &&
      !hasOpenWindow('Έσοδα') &&
      !hasOpenWindow('Έξοδα') &&
      !hasOpenWindow('Αναφορές')
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
  }, [openWindows, userEmail]);

  useEffect(() => {
    if (!showIncomeModal) {
      setIncomeCarSearch('');
      setIsIncomeCarComboboxOpen(false);
    }
  }, [showIncomeModal]);

  const getWindowTitleForId = (windowId: WindowId) => {
    switch (windowId) {
      case 'Πίνακας':
        return 'ΚΡΑΤΗΣΕΙΣ AUTOCLUB-RHODES';
      case 'Αυτοκίνητα':
        return 'Διαχείριση Αυτοκινήτων';
      case 'Κρατήσεις':
        return 'Κρατήσεις';
      case 'Service':
        return 'Service';
      case 'Leasing':
        return 'Leasing';
      case 'Ταμείο':
        return 'Ταμείο';
      case 'Έσοδα':
        return 'Έσοδα';
      case 'Έξοδα':
        return 'Έξοδα';
      case 'Γραμμάτια':
        return 'Γραμμάτια';
      case 'Financial Engine':
        return 'Financial Engine';
      case 'Προμηθευτές':
        return 'Προμηθευτές';
      case 'Έγγραφα':
        return 'Έγγραφα';
      case 'Κατηγορίες Εξόδων':
        return 'Κατηγορίες Εξόδων';
      case 'Αναφορές':
        return 'Αναφορές';
      case 'Πρακτορεία':
        return 'Πρακτορεία';
      case 'Marketing':
        return 'Marketing';
      case 'Booking Engine Admin':
        return 'Booking Engine Admin';
      case 'Ρυθμίσεις':
        return 'Ρυθμίσεις';
      default:
        return '';
    }
  };

  const focusWindow = (windowId: WindowId) => {
    setTopZIndex((current) => {
      const nextZIndex = current + 1;
      setOpenWindows((currentWindows) =>
        currentWindows.map((windowItem) =>
          windowItem.id === windowId ? { ...windowItem, zIndex: nextZIndex, isMinimized: false } : windowItem
        )
      );
      return nextZIndex;
    });
  };

  const openWindow = (windowId: WindowId, title = getWindowTitleForId(windowId)) => {
    if (!canOpenWindow(windowId)) {
      return;
    }

    setTopZIndex((current) => {
      const nextZIndex = current + 1;
      setOpenWindows((currentWindows) => {
        const existingWindow = currentWindows.find((windowItem) => windowItem.id === windowId);

        if (existingWindow) {
          return currentWindows.map((windowItem) =>
            windowItem.id === windowId ? { ...windowItem, zIndex: nextZIndex, isMinimized: false } : windowItem
          );
        }

        return [...currentWindows, { id: windowId, title, zIndex: nextZIndex, isMinimized: false }];
      });
      return nextZIndex;
    });
    setShowAddCar(false);
  };

  const handleWindowOpen = (windowId: string) => {
    if (!canOpenWindow(windowId)) {
      return;
    }

    openWindow(windowId as WindowId);
  };

  const openHomepageIncome = () => {
    openWindow('Έσοδα');
    setIncomeForm((current) => ({
      ...current,
      date: new Date().toISOString().split('T')[0],
    }));
    setShowIncomeNotes(false);
    setShowIncomeModal(true);
  };

  const openHomepageExpense = () => {
    openWindow('Έξοδα');
    openAddExpenseModal();
  };

  const closeWindow = (windowId: WindowId) => {
    setOpenWindows((currentWindows) => currentWindows.filter((windowItem) => windowItem.id !== windowId));
    setShowAddCar(false);
    setShowExpenseModal(false);
    setEditingIncomeId(null);
    setEditingExpenseId(null);
  };

  const minimizeWindow = (windowId: WindowId) => {
    setOpenWindows((currentWindows) =>
      currentWindows.map((windowItem) =>
        windowItem.id === windowId ? { ...windowItem, isMinimized: true } : windowItem
      )
    );
  };

  useEffect(() => {
    if (userRole !== 'bookings') return;

    setOpenWindows((currentWindows) => currentWindows.filter((windowItem) => canOpenWindow(windowItem.id)));
  }, [userRole]);

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

  const openVehicleLicense = async (vehicle: Vehicle) => {
    const documents = await fetchCarDocuments(Number(vehicle.id));
    const licenseDocument = documents.find((document) => {
      const documentType = String(document.document_type || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

      return documentType.includes('αδεια') || documentType.includes('κυκλοφορ');
    });

    if (licenseDocument) {
      setLicenseZoom(1);
      setLicenseRotation(0);
      setLicenseViewer({
        vehicle,
        document: licenseDocument,
        url: getCarDocumentPublicUrl(licenseDocument.file_url),
      });
      return;
    }

    setLicenseZoom(1);
    setLicenseRotation(0);
    setLicenseViewer({ vehicle });
  };

  const closeViewCarModal = () => {
    setViewingPlate(null);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', {
        message: error.message,
        name: error.name,
        status: error.status,
      });
    }
  };

  const handleUpdateVehicleKteo = async (vehicleId: string, kteoExpiry: string) => {
    const vehicle = vehicles.find((item) => item.id === vehicleId);
    if (!vehicle) return false;

    const updatedCar = await updateCar(vehicle.id, {
      plate: vehicle.plate,
      category: vehicle.category,
      brand: vehicle.brand,
      model: vehicle.model,
      year: Number(vehicle.year || 0),
      current_km: Number(vehicle.km || 0),
      purchase_price: Number(String(vehicle.price).replace(/[^\d]/g, '')),
      vin: vehicle.vin,
      fuel: vehicle.fuel,
      engine_cc: vehicle.engine_cc,
      kteo_expiry: kteoExpiry,
      insurance_expiry: vehicle.insurance_expiry || undefined,
      road_tax_expiry: vehicle.road_tax_expiry || undefined,
    });

    if (!updatedCar) return false;

    setVehicles((current) =>
      current.map((item) => (item.id === vehicleId ? { ...item, kteo_expiry: kteoExpiry } : item))
    );
    return true;
  };

  const deleteVehicle = async (id: string) => {
  if (!window.confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το αυτοκίνητο;')) return;

  try {
  const deleted = await deleteCar(id);

  if (deleted.success) {
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
    return;
  }

  } catch (error) {
    console.log('Delete car request failed:', error);
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

  const sortedFilteredVehicles = vehicleSort
    ? [...filteredVehicles].sort((left, right) => {
        const direction = vehicleSort.direction === 'asc' ? 1 : -1;

        if (vehicleSort.key === 'category') {
          return direction * String(left.category || '').localeCompare(String(right.category || ''), 'el', {
            numeric: true,
            sensitivity: 'base',
          });
        }

        const leftYear = Number(left.year) || 0;
        const rightYear = Number(right.year) || 0;
        return direction * (leftYear - rightYear);
      })
    : filteredVehicles;

  const handleVehicleSort = (key: VehicleSortKey) => {
    setVehicleSort((current) => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }

      return { key, direction: key === 'year' ? 'desc' : 'asc' };
    });
  };

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
  const expenseTransactions = financeTransactions.filter((transaction) => {
    const paymentMethod = String(transaction.payment_method).toLowerCase();
    return (
      (transaction.type === 'expense' && ['cash', 'card', 'bank'].includes(paymentMethod)) ||
      transaction.type === 'supplier_payment'
    );
  });
  const latestIncomeTransactions = [...incomeTransactions]
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
    .slice(0, 4);
  const latestExpenseTransactions = [...expenseTransactions]
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
    .slice(0, 4);
  const openDebts = debts.filter((debt) => Number(debt.remaining_amount || 0) > 0 && debt.status !== 'paid');
  const openDebtsTotal = openDebts.reduce((sum, debt) => sum + Number(debt.remaining_amount || 0), 0);
  const dashboardToday = new Date();
  const dashboardTodayKey = [
    dashboardToday.getFullYear(),
    String(dashboardToday.getMonth() + 1).padStart(2, '0'),
    String(dashboardToday.getDate()).padStart(2, '0'),
  ].join('-');
  const homeAlertDebts = openDebts.filter(
    (debt) =>
      !String(debt.notes || '').includes('[service_inventory_item:') &&
      Boolean(debt.due_date) &&
      String(debt.due_date) <= dashboardTodayKey
  );
  const homeAlertDebtsTotal = homeAlertDebts.reduce(
    (sum, debt) => sum + Number(debt.remaining_amount || 0),
    0
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
  const totalExpensesCredit = 0;
  const totalIncome = sumAmount(incomeTransactions);
  const totalExpenses = sumAmount(expenseTransactions);
  const totalPaidOperationalExpenses = sumAmount(
    financeTransactions.filter(
      (transaction) =>
        transaction.type === 'expense' &&
        ['cash', 'card', 'bank'].includes(String(transaction.payment_method).toLowerCase())
    )
  );
  const totalSupplierPayments = sumAmount(supplierPaymentTransactions);
  const totalPaidExpenses = sumAmount(paidExpenseTransactions);
  const totalSupplierCredits =
    sumAmount(supplierCreditTransactions) + openDebtsTotal - sumAmount(supplierPaymentTransactions);
  const netTotal = totalIncome - totalPaidExpenses;
  const availableRepresentatives = representatives.filter(
    (representative) => String(representative.agency_id) === incomeForm.agency_id
  );
  const selectedIncomeVehicle = vehicles.find((vehicle) => String(vehicle.id) === String(incomeForm.car_id));
  const formatIncomeVehicleOption = (vehicle: Vehicle) =>
    [vehicle.plate, [vehicle.brand, vehicle.model].filter(Boolean).join(' ')]
      .filter(Boolean)
      .join(' — ');
  const selectedIncomeVehicleLabel = selectedIncomeVehicle
    ? formatIncomeVehicleOption(selectedIncomeVehicle)
    : '';
  const filteredIncomeVehicles = vehicles
    .filter((vehicle) => {
      const query = incomeCarSearch.trim().toLowerCase();

      if (!query) {
        return true;
      }

      return [vehicle.plate, vehicle.brand, vehicle.model]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    })
    .slice(0, 80);
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

  const upcomingKteoAlerts = vehicles
    .map((vehicle) => {
      if (!vehicle.kteo_expiry) return null;

      const expiry = new Date(vehicle.kteo_expiry);
      if (Number.isNaN(expiry.getTime())) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expiry.setHours(0, 0, 0, 0);

      const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry < 0 || daysUntilExpiry > 5) return null;

      return { vehicle, daysUntilExpiry };
    })
    .filter((alert): alert is { vehicle: Vehicle; daysUntilExpiry: number } => Boolean(alert))
    .sort((left, right) => left.daysUntilExpiry - right.daysUntilExpiry);

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

  const resolveWindowId = (windowId: WindowId | string, title?: string): WindowId | null => {
    const value = String(windowId || title || '');
    const knownWindows: WindowId[] = [
      'Πίνακας',
      'Αυτοκίνητα',
      'Κρατήσεις',
      'Service',
      'Leasing',
      'Ταμείο',
      'Έσοδα',
      'Έξοδα',
      'Γραμμάτια',
      'Financial Engine',
      'Προμηθευτές',
      'Έγγραφα',
      'Κατηγορίες Εξόδων',
      'Αναφορές',
      'Πρακτορεία',
      'Marketing',
      'Booking Engine Admin',
      'Ρυθμίσεις',
    ];

    return knownWindows.includes(value as WindowId) ? (value as WindowId) : null;
  };

  const renderWindowContent = (windowId: WindowId) => {
    switch (resolveWindowId(windowId)) {
  case 'Πίνακας':
    return <AutoClubRhodesReservationsBoard />;

  case 'Πρακτορεία':
    return (
      <AgenciesManager />
    );

  case 'Service':
    return <ServicesManager />;

  case 'Κρατήσεις':
    return <BookingsManager mobileMode={isPhoneViewport} mobileFocus="bookings" onNotificationsChanged={loadNotifications} />;

  case 'Leasing':
    return <LeasingManager />;

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
              vehicles={sortedFilteredVehicles}
              sort={vehicleSort}
              onSort={handleVehicleSort}
              onView={openViewCarModal}
              onViewLicense={openVehicleLicense}
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
            totalIncomeCash={totalIncomeCash}
            totalIncomeCard={totalIncomeCard}
            totalIncomeBank={totalIncomeBank}
            totalPaidExpenses={totalPaidExpenses}
            totalExpensesCash={totalExpensesCash}
            totalExpensesCard={totalExpensesCard}
            totalExpensesBank={totalExpensesBank}
            totalSupplierPayments={totalSupplierPayments}
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
      case 'Financial Engine':
        return <FinancialEngine transactions={transactionsWithAgencyNames} debts={debts} />;
      case 'Προμηθευτές':
        return <SuppliersManager onSuppliersChange={setSuppliers} />;
      case 'Έγγραφα':
        return <VehicleDocumentsManager />;
      case 'Κατηγορίες Εξόδων':
        return <ExpenseCategoriesManager />;
      case 'Marketing':
        return <MarketingManager />;
      case 'Booking Engine Admin':
        return <BookingEngineAdmin />;
      case 'Ρυθμίσεις':
        return <SettingsManager onSuppliersChange={setSuppliers} />;
      case 'Αναφορές':
        return (
          <ReportsCenter
            transactions={transactionsWithAgencyNames}
            bookings={bookings}
            agencies={agencies}
            representatives={representatives}
            supplierLedger={supplierLedger}
            vehicles={vehicles.map((vehicle) => ({
              id: vehicle.id,
              plate: vehicle.plate,
              brand: vehicle.brand,
              model: vehicle.model,
              kteo_expiry: vehicle.kteo_expiry,
            }))}
            onUpdateKteo={handleUpdateVehicleKteo}
          />
        );
      case 'Γραμμάτια':
        return <DebtsManager vehicles={vehicles} suppliers={suppliers} />;
      default:
        return null;
    }
  };

  const getWindowTitle = (windowId: WindowId) => {
    switch (windowId) {
      case 'Πίνακας':
        return 'ΚΡΑΤΗΣΕΙΣ AUTOCLUB-RHODES';
      case 'Αυτοκίνητα':
        return 'Διαχείριση Αυτοκινήτων';
      case 'Κρατήσεις':
        return 'Κρατήσεις';
      case 'Service':
        return 'Service';
      case 'Leasing':
        return 'Leasing';
      case 'Ταμείο':
        return 'Ταμείο';
      case 'Έσοδα':
        return 'Έσοδα';
      case 'Έξοδα':
        return 'Έξοδα';
      case 'Γραμμάτια':
        return 'Γραμμάτια';
      case 'Financial Engine':
        return 'Financial Engine';
      case 'Προμηθευτές':
        return 'Προμηθευτές';
      case 'Έγγραφα':
        return 'Έγγραφα';
      case 'Κατηγορίες Εξόδων':
        return 'Κατηγορίες Εξόδων';
      case 'Αναφορές':
        return 'Αναφορές';
       case 'Πρακτορεία':
  return 'Πρακτορεία';
      case 'Marketing':
        return 'Marketing / Promotions';
      case 'Booking Engine Admin':
        return 'Booking Engine Admin';
      case 'Ρυθμίσεις':
        return 'Ρυθμίσεις';
      default:
        return '';
    }
  };

  const getWindowActions = (windowId: WindowId) => {
    if (windowId === 'Αυτοκίνητα') {
      return (
        <button className="add-car-btn" type="button" onClick={openAddCarModal}>
          + Προσθήκη Αυτοκινήτου
        </button>
      );
    }
    if (windowId === 'Έσοδα') {
  return (
    <button
      className="rounded-2xl border border-sky-500 px-5 py-3 text-sm font-semibold text-sky-300 hover:bg-sky-500/10"
      type="button"
      onClick={() => {
        setIncomeForm((current) => ({
          ...current,
          date: new Date().toISOString().split('T')[0],
        }));
        setShowIncomeNotes(false);
        setShowIncomeModal(true);
      }}
    >
      + Καταχώρηση Εσόδου
    </button>
  );
}
    return null;
  };

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#08111a_0%,#050910_100%)] text-sm text-zinc-400">
        Φόρτωση...
      </main>
    );
  }

  if (!userEmail) {
    return <LoginScreen />;
  }

  if (userRole === 'bookings' && isMobileViewport) {
    return (
      <main
        className="fixed inset-0 z-[9999] flex h-[100dvh] w-[100dvw] max-w-none flex-col overflow-x-hidden overscroll-none bg-[linear-gradient(180deg,#07101a_0%,#050910_100%)] text-white"
        style={{ width: '100dvw', maxWidth: 'none' }}
      >
        <header className="relative flex h-[54px] w-[100dvw] flex-shrink-0 items-center justify-between border-b border-white/[0.08] bg-black/20 px-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-zinc-200"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="relative h-8 w-24">
            <Image src="/logo.png" alt="AUTOCLUB" fill priority className="object-cover object-center" sizes="96px" />
          </div>
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadNotificationsCount}
            isOpen={showNotifications}
            onToggle={() => setShowNotifications((current) => !current)}
            onMarkRead={handleNotificationClick}
            onMarkAllRead={handleMarkAllNotificationsRead}
            mobile
          />
        </header>

        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[12000] bg-black/62 backdrop-blur-sm" role="presentation" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="absolute inset-y-0 left-0 w-[min(82vw,290px)]" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute right-3 top-3 z-[12020] flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-zinc-950/80 text-zinc-200"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
              <Sidebar
                onWindowOpen={(windowId) => {
                  handleWindowOpen(windowId);
                  setIsMobileMenuOpen(false);
                }}
                activeWindow={activeWindow}
                userEmail={userEmail}
                userRole={userRole}
                onLogout={handleLogout}
                onNavigate={() => setIsMobileMenuOpen(false)}
                forceExpanded
              />
            </div>
          </div>
        )}

        <section className="min-h-0 w-[100dvw] flex-1 overflow-hidden pb-[calc(76px+env(safe-area-inset-bottom))]">
          <BookingsManager mobileMode mobileFocus={bookingsMobileTab} onNotificationsChanged={loadNotifications} />
        </section>

        <nav className="fixed bottom-0 left-0 right-0 z-[10000] grid w-[100dvw] grid-cols-3 gap-2 border-t border-white/[0.08] bg-black/70 px-2 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
          {[
            { id: 'dashboard', label: 'Πίνακας' },
            { id: 'bookings', label: 'Κρατήσεις' },
            { id: 'whatsapp', label: 'WhatsApp' },
          ].map((item) => {
            const isActive = bookingsMobileTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setBookingsMobileTab(item.id as 'dashboard' | 'bookings' | 'whatsapp')}
                className={`h-12 rounded-2xl border text-xs font-black transition ${
                  isActive
                    ? 'border-sky-300/35 bg-sky-300/14 text-sky-50'
                    : 'border-white/[0.055] bg-white/[0.02] text-zinc-400'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </main>
    );
  }

  return (
    <>
      {!isPhoneViewport && (
        <Sidebar
          onWindowOpen={handleWindowOpen}
          activeWindow={activeWindow}
          userEmail={userEmail}
          userRole={userRole}
          onLogout={handleLogout}
          onCollapsedChange={setIsSidebarCollapsed}
        />
      )}
      {isPhoneViewport && (
        <>
          <header className="fixed left-0 right-0 top-0 z-[9200] flex h-[64px] items-center justify-between border-b border-white/[0.08] bg-[linear-gradient(180deg,#07101a_0%,#050910_100%)] px-4 text-white">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035] text-zinc-200"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="relative h-10 w-28">
              <Image src="/logo.png" alt="AUTOCLUB" fill priority className="object-cover object-center" sizes="112px" />
            </div>
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadNotificationsCount}
              isOpen={showNotifications}
              onToggle={() => setShowNotifications((current) => !current)}
              onMarkRead={handleNotificationClick}
              onMarkAllRead={handleMarkAllNotificationsRead}
              mobile
            />
          </header>
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-[12000] bg-black/62 backdrop-blur-sm" role="presentation" onClick={() => setIsMobileMenuOpen(false)}>
              <div className="absolute inset-y-0 left-0 w-[min(82vw,290px)]" onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="absolute right-3 top-3 z-[12020] flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-zinc-950/80 text-zinc-200"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
                <Sidebar
                  onWindowOpen={(windowId) => {
                    handleWindowOpen(windowId);
                    setIsMobileMenuOpen(false);
                  }}
                  activeWindow={activeWindow}
                  userEmail={userEmail}
                  userRole={userRole}
                  onLogout={handleLogout}
                  onNavigate={() => setIsMobileMenuOpen(false)}
                  forceExpanded
                />
              </div>
            </div>
          )}
        </>
      )}
      <main
        className={`fixed bottom-0 right-0 overflow-hidden bg-[radial-gradient(circle_at_48%_42%,rgba(14,165,233,0.075),transparent_26%),radial-gradient(circle_at_62%_44%,rgba(34,197,94,0.045),transparent_24%),linear-gradient(180deg,#07101a_0%,#050910_100%)] transition-[left] duration-200 ${isPhoneViewport ? 'top-[64px]' : 'top-[52px]'}`}
        style={{ left: isPhoneViewport ? 0 : sidebarWidth }}
      >
        {openWindows.length > 0 && (
          <div
            className={`pointer-events-none fixed right-0 z-[9000] flex h-[52px] items-end border-b border-white/[0.06] bg-[linear-gradient(180deg,#07101a_0%,#050910_100%)] pl-3 transition-[left] duration-200 ${isPhoneViewport ? 'top-[64px]' : 'top-0'}`}
            style={{ left: isPhoneViewport ? 0 : sidebarWidth }}
          >
            <div className="pointer-events-auto flex max-w-full items-end gap-1 overflow-x-auto pt-2">
              {openWindows.map((windowItem) => {
                const isActiveTab = activeWindow === windowItem.id;
                const isMinimizedTab = Boolean(windowItem.isMinimized);
                const isBookingEngineAdminTab = windowItem.id === 'Booking Engine Admin';

                return (
                  <button
                    key={windowItem.id}
                    type="button"
                    onClick={() => focusWindow(windowItem.id)}
                    className={`group flex items-center rounded-t-xl border py-2 text-left text-xs font-semibold transition duration-200 ${
                      isBookingEngineAdminTab ? 'w-auto max-w-none flex-none gap-1 px-2' : 'max-w-[190px] gap-2 px-3'
                    } ${
                      isActiveTab
                        ? 'border-sky-300/25 border-b-transparent bg-[#08111a] text-white shadow-[0_-2px_18px_rgba(56,189,248,0.12)]'
                        : 'border-white/[0.045] bg-white/[0.025] text-zinc-500 hover:border-sky-300/16 hover:bg-white/[0.045] hover:text-zinc-200'
                    } ${isMinimizedTab ? 'opacity-55' : 'opacity-100'}`}
                  >
                    {isMinimizedTab && <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />}
                    <span className={isBookingEngineAdminTab ? 'whitespace-nowrap' : 'min-w-0 flex-1 truncate'}>
                      {windowItem.title || getWindowTitle(windowItem.id)}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        closeWindow(windowItem.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return;
                        event.preventDefault();
                        event.stopPropagation();
                        closeWindow(windowItem.id);
                      }}
                      className="rounded-md px-1.5 py-0.5 text-zinc-500 transition hover:bg-white/[0.08] hover:text-white"
                      aria-label={`Close ${windowItem.title || getWindowTitle(windowItem.id)}`}
                    >
                      ×
                    </span>
                  </button>
                );
              })}
              <div className="mb-2 ml-1 rounded-lg border border-white/[0.045] bg-white/[0.02] px-2.5 py-1.5 text-xs font-semibold text-zinc-500">
                +
              </div>
            </div>
          </div>
        )}

        {!isPhoneViewport && (
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadNotificationsCount}
            isOpen={showNotifications}
            onToggle={() => setShowNotifications((current) => !current)}
            onMarkRead={handleNotificationClick}
            onMarkAllRead={handleMarkAllNotificationsRead}
          />
        )}

        {/* Homepage with centered logo */}
        {openWindows.length === 0 && (
          <div className="flex h-full w-full items-center justify-center px-4 py-8">
            <div className="flex w-full max-w-[640px] flex-col items-center gap-3.5">
              <div className="relative flex h-[304px] w-[min(552px,84vw)] flex-col items-center justify-center transition duration-300 hover:-translate-y-0.5">
                <div className="absolute inset-10 rounded-full bg-sky-400/[0.07] blur-3xl" />
                <div className="absolute inset-20 translate-x-10 rounded-full bg-emerald-400/[0.045] blur-3xl" />
                <div className="absolute inset-0 rounded-[28px] border border-sky-200/[0.16] bg-[linear-gradient(135deg,rgba(56,189,248,0.065),rgba(9,18,29,0.74)_35%,rgba(34,197,94,0.045))] shadow-[0_0_34px_rgba(0,160,255,0.09),0_0_38px_rgba(75,220,100,0.055),inset_0_1px_0_rgba(255,255,255,0.055)] backdrop-blur-md" />
                <Image
                  src="/logo.png"
                  alt="AUTOCLUB"
                  fill
                  priority
                  className="relative object-cover object-center opacity-95"
                  sizes="552px"
                />
                <p className="absolute bottom-8 text-[11px] font-medium uppercase tracking-[0.28em] text-[#8e99a8]">
                  Enterprise Fleet ERP
                </p>
              </div>

              {userRole === 'admin' && (
                <>
              <div className="grid w-full max-w-[500px] gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={openHomepageIncome}
                  className="group rounded-2xl border border-emerald-300/18 bg-emerald-300/[0.045] px-3.5 py-2 text-center shadow-[0_0_18px_rgba(52,211,153,0.055)] transition duration-200 hover:-translate-y-px hover:border-emerald-300/28 hover:bg-emerald-300/[0.07] hover:shadow-[0_0_22px_rgba(52,211,153,0.09)]"
                >
                  <span className="block text-[9px] uppercase tracking-[0.16em] text-emerald-200/55">Quick entry</span>
                  <span className="mt-0.5 block text-[12px] font-semibold text-emerald-100">+ Καταχώρηση Εσόδου</span>
                </button>
                <button
                  type="button"
                  onClick={openHomepageExpense}
                  className="group rounded-2xl border border-rose-300/18 bg-rose-300/[0.045] px-3.5 py-2 text-center shadow-[0_0_18px_rgba(251,113,133,0.055)] transition duration-200 hover:-translate-y-px hover:border-rose-300/28 hover:bg-rose-300/[0.07] hover:shadow-[0_0_22px_rgba(251,113,133,0.09)]"
                >
                  <span className="block text-[9px] uppercase tracking-[0.16em] text-rose-200/55">Quick entry</span>
                  <span className="mt-0.5 block text-[12px] font-semibold text-rose-100">+ Καταχώρηση Εξόδου</span>
                </button>
              </div>

              <div className="grid w-full max-w-[600px] gap-2.5 lg:grid-cols-3">
                <button
                  type="button"
                  onClick={() => openWindow('Έσοδα')}
                  className="group cursor-pointer rounded-2xl border border-emerald-300/14 bg-white/[0.025] p-2.5 text-left shadow-[0_0_18px_rgba(52,211,153,0.04)] transition duration-200 hover:-translate-y-px hover:border-emerald-300/28 hover:bg-white/[0.04] hover:shadow-[0_0_24px_rgba(52,211,153,0.08)]"
                >
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-200/65">
                    Τελευταίες Καταχωρήσεις Εσόδων
                  </p>
                  <div className="mt-2.5 space-y-1.5">
                    {latestIncomeTransactions.length === 0 && <p className="text-xs text-zinc-500">Δεν υπάρχουν εγγραφές.</p>}
                    {latestIncomeTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-xl bg-black/18 px-2.5 py-1.5">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-white">
                            {transaction.contract_number || 'Χωρίς συμβόλαιο'}
                          </p>
                          <p className="text-[11px] text-zinc-500">{formatDate(transaction.date)}</p>
                        </div>
                        <p className="shrink-0 text-xs font-semibold text-emerald-200">{formatMoney(transaction.amount)}</p>
                      </div>
                    ))}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => openWindow('Έξοδα')}
                  className="group cursor-pointer rounded-2xl border border-rose-300/14 bg-white/[0.025] p-2.5 text-left shadow-[0_0_18px_rgba(251,113,133,0.04)] transition duration-200 hover:-translate-y-px hover:border-rose-300/28 hover:bg-white/[0.04] hover:shadow-[0_0_24px_rgba(251,113,133,0.08)]"
                >
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-rose-200/65">
                    Τελευταίες Καταχωρήσεις Εξόδων
                  </p>
                  <div className="mt-2.5 space-y-1.5">
                    {latestExpenseTransactions.length === 0 && <p className="text-xs text-zinc-500">Δεν υπάρχουν εγγραφές.</p>}
                    {latestExpenseTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-xl bg-black/18 px-2.5 py-1.5">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-white">
                            {transaction.category || transaction.supplier_name || transaction.supplier || '-'}
                          </p>
                          <p className="text-[11px] text-zinc-500">{formatDate(transaction.date)}</p>
                        </div>
                        <p className="shrink-0 text-xs font-semibold text-rose-200">{formatMoney(transaction.amount)}</p>
                      </div>
                    ))}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => openWindow('Γραμμάτια')}
                  className="group cursor-pointer rounded-2xl border border-amber-300/18 bg-amber-300/[0.04] p-2.5 text-left shadow-[0_0_20px_rgba(251,191,36,0.055)] transition duration-200 hover:-translate-y-px hover:border-amber-300/30 hover:bg-amber-300/[0.06] hover:shadow-[0_0_26px_rgba(251,191,36,0.1)]"
                >
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-amber-200/70">
                    Alert Γραμματίων
                  </p>
                  <div className="mt-2.5 rounded-xl border border-white/[0.055] bg-black/20 px-3 py-2.5 transition duration-200 group-hover:border-amber-200/12">
                    <p className="text-xl font-semibold text-amber-100">{formatMoney(homeAlertDebtsTotal)}</p>
                    <p className="mt-1 text-xs text-amber-200/60">
                      {homeAlertDebtsTotal > 0
                        ? `${homeAlertDebts.length} ληξιπρόθεσμα / σήμερα`
                        : '0 για σήμερα'}
                    </p>
                  </div>
                </button>
              </div>

              {upcomingKteoAlerts.length > 0 && (
                <div className="w-full max-w-[480px] rounded-2xl border border-amber-300/18 bg-amber-300/[0.045] px-3.5 py-2.5 shadow-[0_0_20px_rgba(251,191,36,0.065)] backdrop-blur-sm transition duration-200 hover:-translate-y-px hover:border-amber-300/26">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/70">
                    KTEO expires in 5 days
                  </p>
                  <div className="mt-2.5 space-y-1.5">
                    {upcomingKteoAlerts.map(({ vehicle, daysUntilExpiry }) => (
                      <div
                        key={vehicle.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-1.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{vehicle.plate}</p>
                          <p className="truncate text-xs text-zinc-400">
                            {vehicle.brand} {vehicle.model}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-amber-100">{formatDate(vehicle.kteo_expiry || '')}</p>
                          <p className="text-[11px] text-amber-200/60">
                            {daysUntilExpiry === 0 ? 'Σήμερα' : `σε ${daysUntilExpiry} ημέρες`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Floating Window */}
        {openWindows.map((windowItem) => {
          if (windowItem.isMinimized) return null;

          return (
            <Window
              key={windowItem.id}
              title={windowItem.title || getWindowTitle(windowItem.id)}
              onClose={() => closeWindow(windowItem.id)}
              onFocus={() => focusWindow(windowItem.id)}
              onMinimize={() => minimizeWindow(windowItem.id)}
              zIndex={windowItem.zIndex}
              titleActions={getWindowActions(windowItem.id)}
              fullscreen={windowItem.id === 'Κρατήσεις' || windowItem.id === 'Booking Engine Admin'}
              compactHeader={windowItem.id === 'Κρατήσεις'}
              initialWidth={windowItem.id === 'Αναφορές' ? 1320 : undefined}
              initialHeight={windowItem.id === 'Αναφορές' ? 792 : windowItem.id === 'Πίνακας' ? 760 : undefined}
              financeDashboard={windowItem.id === 'Ταμείο'}
              wide={windowItem.id === 'Πίνακας' || windowItem.id === 'Αυτοκίνητα' || windowItem.id === 'Ταμείο' || windowItem.id === 'Έσοδα' || windowItem.id === 'Έξοδα' || windowItem.id === 'Γραμμάτια' || windowItem.id === 'Financial Engine' || windowItem.id === 'Service' || windowItem.id === 'Leasing' || windowItem.id === 'Έγγραφα' || windowItem.id === 'Marketing' || windowItem.id === 'Booking Engine Admin' || windowItem.id === 'Ρυθμίσεις'}
            >
              {renderWindowContent(windowItem.id)}
            </Window>
          );
        })}
{showIncomeModal && (
  <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4">
    <div className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-[28px] bg-zinc-950 border border-zinc-800 shadow-2xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <h3 className="text-lg font-semibold text-white">Καταχώρηση Εσόδου</h3>
        <button
          type="button"
          onClick={() => {
            setShowIncomeModal(false);
            setEditingIncomeId(null);
            setShowIncomeNotes(false);
          }}
          className="text-zinc-400 hover:text-white transition-colors p-2 rounded-lg"
        >
          ✕
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-3">
        <label className="space-y-2 text-sm text-zinc-300 block">
          <span>Ημερομηνία</span>
          <input
            type="date"
            value={incomeForm.date}
            onChange={(event) => setIncomeForm({ ...incomeForm, date: event.target.value })}
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500"
          />
        </label>
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
  <div className="relative">
    <input
      value={isIncomeCarComboboxOpen ? incomeCarSearch : selectedIncomeVehicleLabel}
      onFocus={() => {
        setIncomeCarSearch('');
        setIsIncomeCarComboboxOpen(true);
      }}
      onChange={(event) => {
        setIncomeCarSearch(event.target.value);
        setIsIncomeCarComboboxOpen(true);
      }}
      onBlur={() => {
        window.setTimeout(() => setIsIncomeCarComboboxOpen(false), 120);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setIsIncomeCarComboboxOpen(false);
          setIncomeCarSearch('');
        }

        if (event.key === 'Enter' && isIncomeCarComboboxOpen && filteredIncomeVehicles[0]) {
          event.preventDefault();
          const vehicle = filteredIncomeVehicles[0];
          setIncomeForm({ ...incomeForm, car_id: String(vehicle.id) });
          setIncomeCarSearch(formatIncomeVehicleOption(vehicle));
          setIsIncomeCarComboboxOpen(false);
        }
      }}
      placeholder="Αναζήτηση με πινακίδα, μάρκα ή μοντέλο..."
      role="combobox"
      aria-expanded={isIncomeCarComboboxOpen}
      aria-controls="income-car-options"
      className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 pr-10 text-sm text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15"
    />

    {incomeForm.car_id ? (
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          setIncomeForm({ ...incomeForm, car_id: '' });
          setIncomeCarSearch('');
          setIsIncomeCarComboboxOpen(false);
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
        aria-label="Clear selected car"
      >
        ×
      </button>
    ) : null}

    {isIncomeCarComboboxOpen && (
      <div
        id="income-car-options"
        role="listbox"
        className="absolute z-[10020] mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-sky-300/20 bg-zinc-950 p-1.5 shadow-2xl shadow-black/40"
      >
        {filteredIncomeVehicles.length > 0 ? (
          filteredIncomeVehicles.map((vehicle) => {
            const label = formatIncomeVehicleOption(vehicle);
            const isSelected = String(vehicle.id) === String(incomeForm.car_id);

            return (
              <button
                key={vehicle.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setIncomeForm({ ...incomeForm, car_id: String(vehicle.id) });
                  setIncomeCarSearch(label);
                  setIsIncomeCarComboboxOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                  isSelected
                    ? 'bg-sky-400/15 text-sky-100'
                    : 'text-zinc-200 hover:bg-white/[0.055] hover:text-white'
                }`}
              >
                <span className="truncate font-semibold">{label}</span>
                <span className="shrink-0 text-[11px] text-zinc-500">#{vehicle.id}</span>
              </button>
            );
          })
        ) : (
          <div className="px-3 py-3 text-sm text-zinc-500">Δεν βρέθηκε αυτοκίνητο.</div>
        )}
      </div>
    )}
  </div>
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
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowIncomeNotes((current) => !current)}
            className="rounded-2xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
          >
            Προσθήκη Σημειώσεων
          </button>
          {showIncomeNotes && (
            <label className="space-y-2 text-sm text-zinc-300 block">
              <span>Σημειώσεις</span>
              <textarea
                value={incomeForm.notes}
                onChange={(event) => setIncomeForm({ ...incomeForm, notes: event.target.value })}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500 min-h-20"
              />
            </label>
          )}
        </div>

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
  <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4">
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
              <span>Αυτοκίνητο / Γενικό Έξοδο</span>
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
              <span className="block text-xs leading-relaxed text-zinc-500">
                Επιλέξτε αυτοκίνητο για άμεσο έξοδο ή Γενικό έξοδο επιχείρησης για έξοδο που θα κατανεμηθεί μόνο στο Report Αυτοκινήτων.
              </span>
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
            placeholder={
              expenseForm.car_id
                ? ''
                : 'Περιγραφή γενικού εξόδου, π.χ. λογιστής, ενοίκιο, χαρτικά'
            }
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
  <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4">
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
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4">
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
                      {(vehicleGroups.length > 0 ? vehicleGroups : DEFAULT_VEHICLE_GROUP_CODES).map((group) => (
                        <option key={group} value={group}>
                          {group}
                        </option>
                      ))}
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
                    <span>Ημερομηνία ΚΤΕΟ</span>
                    <input
                      type="date"
                      value={newVehicle.kteo_expiry || ''}
                      onChange={(event) => setNewVehicle({ ...newVehicle, kteo_expiry: event.target.value })}
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
            onUpdateKteo={handleUpdateVehicleKteo}
            transactions={transactions}
          />
        )}

        {licenseViewer && (
          <VehicleLicenseViewerModal
            viewer={licenseViewer}
            zoom={licenseZoom}
            rotation={licenseRotation}
            onZoomIn={() => setLicenseZoom((current) => Math.min(current + 0.15, 2.5))}
            onZoomOut={() => setLicenseZoom((current) => Math.max(current - 0.15, 0.5))}
            onRotateLeft={() => setLicenseRotation((current) => current - 90)}
            onRotateRight={() => setLicenseRotation((current) => current + 90)}
            onReset={() => {
              setLicenseZoom(1);
              setLicenseRotation(0);
            }}
            onClose={() => setLicenseViewer(null)}
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
function formatNotificationDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('el-GR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function NotificationBell({
  notifications,
  unreadCount,
  isOpen,
  onToggle,
  onMarkRead,
  onMarkAllRead,
  mobile = false,
}: {
  notifications: NotificationRecord[];
  unreadCount: number;
  isOpen: boolean;
  onToggle: () => void;
  onMarkRead: (notification: NotificationRecord) => void;
  onMarkAllRead: () => void;
  mobile?: boolean;
}) {
  return (
    <div className={mobile ? 'relative z-[9300]' : 'fixed right-4 top-2 z-[9100]'}>
      <button
        type="button"
        onClick={onToggle}
        className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-zinc-950/90 text-zinc-300 shadow-[0_12px_34px_rgba(0,0,0,0.35)] backdrop-blur transition duration-200 hover:-translate-y-px hover:border-sky-300/25 hover:bg-zinc-900 hover:text-white"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <>
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border border-zinc-950 bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.7)]" />
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full border border-zinc-950 bg-rose-500 px-1.5 py-0.5 text-center text-[10px] font-black leading-none text-white shadow-[0_0_16px_rgba(244,63,94,0.45)]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </>
        )}
      </button>

      {isOpen && (
        <div className={`${mobile ? 'fixed inset-x-3 top-[72px] max-h-[calc(100dvh-88px)] w-auto rounded-[24px]' : 'absolute right-0 mt-3 w-[360px] rounded-3xl'} overflow-hidden border border-white/[0.08] bg-zinc-950/96 shadow-[0_24px_70px_rgba(0,0,0,0.5)] backdrop-blur-xl`}>
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">Notifications</p>
              <p className="text-[11px] text-zinc-500">{unreadCount} unread</p>
            </div>
            <button
              type="button"
              onClick={onMarkAllRead}
              disabled={unreadCount === 0}
              className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-[11px] font-semibold text-zinc-300 transition hover:border-sky-300/25 hover:bg-sky-300/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Mark all read
            </button>
          </div>

          <div className={`${mobile ? 'max-h-[calc(100dvh-170px)]' : 'max-h-[420px]'} overflow-y-auto p-2`}>
            {notifications.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-6 text-center text-sm text-zinc-500">
                No notifications yet.
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => onMarkRead(notification)}
                    className={`w-full rounded-2xl border px-3.5 py-3 text-left transition duration-200 hover:-translate-y-px hover:border-sky-300/25 hover:bg-sky-300/[0.055] ${
                      notification.read
                        ? 'border-white/[0.045] bg-white/[0.02]'
                        : 'border-sky-300/20 bg-sky-300/[0.06] shadow-[0_0_18px_rgba(56,189,248,0.08)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{notification.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-400">{notification.message}</p>
                      </div>
                      {notification.read === false && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-300" />}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                      <span className="truncate">{notification.type.replace(/_/g, ' ')}</span>
                      <span className="shrink-0">{formatNotificationDate(notification.created_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VehiclesTable({
  vehicles,
  sort,
  onSort,
  onView,
  onViewLicense,
  onEdit,
  onDelete,
}: {
  vehicles: Vehicle[];
  sort: VehicleSortState;
  onSort: (key: VehicleSortKey) => void;
  onView: (plate: string) => void;
  onViewLicense: (vehicle: Vehicle) => void;
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
              <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">
                <SortableVehicleHeader label="Κατηγορία" sortKey="category" sort={sort} onSort={onSort} />
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Μάρκα</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Μοντέλο</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">
                <SortableVehicleHeader label="Έτος" sortKey="year" sort={sort} onSort={onSort} />
              </th>
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
                <td className="min-w-[430px] py-4 px-4 text-sm">
                  <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onView(vehicle.plate)}
                      className="rounded-2xl border border-sky-600 bg-zinc-900 px-3 py-2 text-xs text-sky-300 transition hover:bg-sky-500/10"
                    >
                      Προβολή
                    </button>
                    <button
                      type="button"
                      onClick={() => onViewLicense(vehicle)}
                      className="rounded-2xl border border-emerald-500/35 bg-emerald-500/[0.06] px-3 py-2 text-xs text-emerald-100 transition hover:border-emerald-400/50 hover:bg-emerald-500/12"
                    >
                      Προβολή Άδειας
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

function SortableVehicleHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: VehicleSortKey;
  sort: VehicleSortState;
  onSort: (key: VehicleSortKey) => void;
}) {
  const isActive = sort?.key === sortKey;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-left text-sm font-semibold text-zinc-300 transition hover:text-white"
    >
      <span>{label}</span>
      <span className={`text-[11px] ${isActive ? 'text-sky-300' : 'text-zinc-600'}`}>
        {isActive ? (sort.direction === 'asc' ? '↑' : '↓') : ''}
      </span>
    </button>
  );
}

function VehicleLicenseViewerModal({
  viewer,
  zoom,
  rotation,
  onZoomIn,
  onZoomOut,
  onRotateLeft,
  onRotateRight,
  onReset,
  onClose,
}: {
  viewer: LicenseViewerState;
  zoom: number;
  rotation: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const { vehicle, document, url } = viewer;
  const fileName = document?.file_name || '';
  const documentUrl = url || '';
  const isPdf =
    fileName.toLowerCase().endsWith('.pdf') ||
    documentUrl.toLowerCase().includes('.pdf');
  const isImage = Boolean(documentUrl) && !isPdf;
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    x: number;
    y: number;
  } | null>(null);

  const controlButtonClass =
    'rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-sky-300/25 hover:bg-sky-300/[0.08] hover:text-white';

  useEffect(() => {
    setPan({ x: 0, y: 0 });
  }, [document?.id, documentUrl]);

  const startPan = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!isImage) return;

    event.preventDefault();
    setIsPanning(true);
    panStartRef.current = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      x: pan.x,
      y: pan.y,
    };
  };

  const movePan = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!isPanning || !panStartRef.current) return;

    setPan({
      x: panStartRef.current.x + event.clientX - panStartRef.current.mouseX,
      y: panStartRef.current.y + event.clientY - panStartRef.current.mouseY,
    });
  };

  const stopPan = () => {
    setIsPanning(false);
    panStartRef.current = null;
  };

  const resetView = () => {
    setPan({ x: 0, y: 0 });
    onReset();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-5">
      <div className="premium-window-in flex h-[min(86vh,860px)] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-emerald-300/15 bg-[linear-gradient(180deg,rgba(18,24,33,0.98),rgba(8,12,18,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.65),0_0_42px_rgba(16,185,129,0.08)]">
        <div className="flex shrink-0 flex-col gap-4 border-b border-white/[0.08] px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200/65">
                Άδεια Κυκλοφορίας
              </p>
              <h3 className="mt-1 truncate text-xl font-semibold text-white">{vehicle.plate}</h3>
              <p className="mt-1 truncate text-sm text-zinc-400">
                {vehicle.brand} {vehicle.model}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-transparent p-2 text-zinc-400 transition hover:border-white/[0.08] hover:bg-white/[0.05] hover:text-white"
              aria-label="Κλείσιμο"
            >
              ×
            </button>
          </div>

          {document && (
            <div className="flex flex-wrap items-center gap-2">
              {isImage && (
                <>
                  <button type="button" onClick={onRotateLeft} className={controlButtonClass}>
                    ↺ Rotate left
                  </button>
                  <button type="button" onClick={onRotateRight} className={controlButtonClass}>
                    ↻ Rotate right
                  </button>
                  <button type="button" onClick={onZoomOut} className={controlButtonClass}>
                    − Zoom
                  </button>
                  <button type="button" onClick={onZoomIn} className={controlButtonClass}>
                    + Zoom
                  </button>
                  <button type="button" onClick={resetView} className={controlButtonClass}>
                    Reset view
                  </button>
                </>
              )}
              {documentUrl && (
                <>
                  <a href={documentUrl} target="_blank" rel="noopener noreferrer" className={controlButtonClass}>
                    Άνοιγμα σε νέα καρτέλα
                  </a>
                  <a href={documentUrl} download={fileName} target="_blank" rel="noopener noreferrer" className={controlButtonClass}>
                    Λήψη
                  </a>
                </>
              )}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-4 sm:p-5">
          {!document && (
            <div className="flex h-full items-center justify-center rounded-3xl border border-white/[0.07] bg-white/[0.025] px-6 py-12 text-center text-sm text-zinc-300">
              Δεν έχει ανέβει άδεια κυκλοφορίας για αυτό το όχημα.
            </div>
          )}

          {document && isImage && (
            <div
              className={`h-full overflow-hidden rounded-3xl border border-white/[0.07] bg-black/30 p-4 ${
                isPanning ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              onMouseDown={startPan}
              onMouseMove={movePan}
              onMouseUp={stopPan}
              onMouseLeave={stopPan}
            >
              <div className="flex min-h-full min-w-full items-center justify-center">
                <img
                  src={documentUrl}
                  alt={fileName || 'Άδεια Κυκλοφορίας'}
                  draggable={false}
                  className="block max-h-full max-w-full select-none rounded-2xl object-contain shadow-[0_24px_70px_rgba(0,0,0,0.45)] transition-transform duration-150"
                  style={{
                    transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center',
                  }}
                />
              </div>
            </div>
          )}

          {document && isPdf && (
            <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/[0.07] bg-black/30">
              <div className="border-b border-white/[0.06] px-4 py-3 text-xs text-zinc-400">
                Για PDF, η προβολή γίνεται μέσα στο ERP. Τα custom zoom/rotate ενδέχεται να εξαρτώνται από τον browser PDF viewer.
              </div>
              <iframe title={fileName || 'Άδεια Κυκλοφορίας'} src={documentUrl} className="min-h-0 flex-1 bg-zinc-950" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VehicleViewModal({
  vehicle,
  onClose,
  onUpdateKteo,
  transactions,
}: {
  vehicle: Vehicle;
  onClose: () => void;
  onUpdateKteo: (vehicleId: string, kteoExpiry: string) => Promise<boolean>;
  transactions: Transaction[];
}) {
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [showLicenseRegistrationModal, setShowLicenseRegistrationModal] = useState(false);
  const [showKteoModal, setShowKteoModal] = useState(false);
  const [showServiceHistoryModal, setShowServiceHistoryModal] = useState(false);
  const [nextKteoExpiry, setNextKteoExpiry] = useState(vehicle.kteo_expiry || '');
  const [savingKteo, setSavingKteo] = useState(false);
  const [selectedLicenseFile, setSelectedLicenseFile] = useState<File | null>(null);
  const [licenseDocuments, setLicenseDocuments] = useState<CarDocumentRecord[]>([]);
  const [loadingLicenseDocuments, setLoadingLicenseDocuments] = useState(false);
  const [modalSize, setModalSize] = useState({ width: 900, height: 620 });
  const resizeStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    width: number;
    height: number;
  } | null>(null);

  const startResize = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    resizeStartRef.current = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      width: modalSize.width,
      height: modalSize.height,
    };
  };

  useEffect(() => {
    fetchServicesByCarId(Number(vehicle.id)).then(setServices);
  }, [vehicle.id]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!resizeStartRef.current) return;

      const nextWidth = resizeStartRef.current.width + event.clientX - resizeStartRef.current.mouseX;
      const nextHeight = resizeStartRef.current.height + event.clientY - resizeStartRef.current.mouseY;
      const maxWidth = window.innerWidth - 80;
      const maxHeight = window.innerHeight - 80;

      setModalSize({
        width: Math.min(Math.max(nextWidth, 620), maxWidth),
        height: Math.min(Math.max(nextHeight, 420), maxHeight),
      });
    };

    const handleMouseUp = () => {
      resizeStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    setNextKteoExpiry(vehicle.kteo_expiry || '');
  }, [vehicle.kteo_expiry]);

  useEffect(() => {
    if (!showLicenseRegistrationModal) return;

    let isCurrent = true;

    const loadLicenseDocuments = async () => {
      setLoadingLicenseDocuments(true);
      const documents = await fetchCarDocuments(Number(vehicle.id));
      if (isCurrent) {
        setLicenseDocuments(documents);
        setLoadingLicenseDocuments(false);
      }
    };

    loadLicenseDocuments();

    return () => {
      isCurrent = false;
    };
  }, [showLicenseRegistrationModal, vehicle.id]);

  const saveKteoExpiry = async () => {
    if (!nextKteoExpiry) return;

    setSavingKteo(true);
    const updated = await onUpdateKteo(vehicle.id, nextKteoExpiry);
    setSavingKteo(false);

    if (updated) {
      setShowKteoModal(false);
    }
  };

  const serviceRowsByYear = services.reduce<Record<string, ServiceRecord[]>>((groups, service) => {
    const year = service.service_date?.slice(0, 4) || '-';
    groups[year] = groups[year] ? [...groups[year], service] : [service];
    return groups;
  }, {});

  const serviceYears = Object.keys(serviceRowsByYear).sort((left, right) => right.localeCompare(left));

  const getServiceCosts = (service: ServiceRecord) => {
    const matchingTransactions = transactions.filter(
      (transaction) =>
        String(transaction.car_id || '') === vehicle.id && transaction.date === service.service_date
    );

    const partsTransaction = matchingTransactions.find((transaction) => transaction.source === 'service_parts');
    const laborTransaction = matchingTransactions.find((transaction) => transaction.source === 'service_labor');

    return {
      partsDescription: partsTransaction?.notes || '-',
      partsCost: partsTransaction?.amount || 0,
      laborCost: laborTransaction?.amount || 0,
    };
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4">
      <div
        className="relative flex flex-col overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/30"
        style={{ width: modalSize.width, height: modalSize.height }}
      >
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
        <div className="min-h-0 flex-1 overflow-y-auto">
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
              <div className="space-y-3 bg-zinc-900 rounded-2xl p-3 border border-zinc-800">
                <div className="flex flex-wrap gap-2">           
                  <button
                    type="button"
                    onClick={() => setShowLicenseRegistrationModal(true)}
                    className="h-10 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] px-3.5 text-[13px] font-medium text-emerald-100 transition hover:bg-emerald-500/[0.14]"
                  >
                    Άδεια Κυκλοφορίας
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-700 pt-3">
                  <p className="text-xs text-zinc-400">
                    ΚΤΕΟ Λήξη: <span className="text-white">{vehicle.kteo_expiry || '-'}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowKteoModal(true)}
                    className="h-10 rounded-xl border border-amber-500/25 bg-amber-500/[0.08] px-3.5 text-[13px] font-medium text-amber-100 transition hover:bg-amber-500/[0.14]"
                  >
                    Ενημέρωση ΚΤΕΟ
                  </button>
                </div>
              </div>
            </div>

            {/* Ιστορικό Service Section */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Ιστορικό Service</h4>
              <div className="bg-zinc-900 rounded-2xl p-3 border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowServiceHistoryModal(true)}
                  className="h-10 rounded-xl border border-orange-500/25 bg-orange-500/[0.08] px-3.5 text-[13px] font-medium text-orange-100 transition hover:bg-orange-500/[0.14]"
                >
                  Ιστορικό Service
                </button>
              </div>
            </div>
          </div>
        </div>
        <div
          role="presentation"
          onMouseDown={startResize}
          className="absolute bottom-3 right-3 h-4 w-4 cursor-se-resize rounded-sm border-b-2 border-r-2 border-sky-200/70 opacity-50 transition hover:opacity-100"
        />
      </div>

      {showLicenseModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-5">
              <h3 className="text-lg font-semibold text-white">Άδεια Κυκλοφορίας — {vehicle.plate}</h3>
              <button type="button" onClick={() => setShowLicenseModal(false)} className="text-zinc-400 transition hover:text-white">
                ✕
              </button>
            </div>
            <div className="p-6 text-sm text-zinc-300">Δεν έχει καταχωρηθεί άδεια κυκλοφορίας.</div>
          </div>
        </div>
      )}

      {showLicenseRegistrationModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-emerald-300/15 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-5">
              <h3 className="text-lg font-semibold text-white">Καταχώρηση Άδειας Κυκλοφορίας — {vehicle.plate}</h3>
              <button type="button" onClick={() => setShowLicenseRegistrationModal(false)} className="text-zinc-400 transition hover:text-white">
                ✕
              </button>
            </div>
            <div className="space-y-5 p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block cursor-pointer rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-4 text-sm text-sky-100 transition hover:bg-sky-500/20">
                  <span className="block font-medium">Upload αρχείου</span>
                  <span className="mt-1 block text-xs text-sky-100/70">PDF ή εικόνα</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(event) => setSelectedLicenseFile(event.target.files?.[0] || null)}
                    className="sr-only"
                  />
                </label>
                <label className="block cursor-pointer rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100 transition hover:bg-emerald-500/20">
                  <span className="block font-medium">Camera / Λήψη φωτογραφίας</span>
                  <span className="mt-1 block text-xs text-emerald-100/70">Χρήση κάμερας συσκευής</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(event) => setSelectedLicenseFile(event.target.files?.[0] || null)}
                    className="sr-only"
                  />
                </label>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-300">
                {selectedLicenseFile ? (
                  <span>Επιλεγμένο αρχείο: {selectedLicenseFile.name}</span>
                ) : (
                  <span>Δεν έχει επιλεγεί αρχείο.</span>
                )}
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60">
                <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                  <h4 className="text-sm font-semibold text-white">Καταχωρημένα έγγραφα</h4>
                  {loadingLicenseDocuments && <span className="text-xs text-zinc-500">Φόρτωση...</span>}
                </div>
                {licenseDocuments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-left">
                      <thead className="bg-zinc-950/50">
                        <tr>
                          <th className="px-4 py-2 text-xs font-medium text-zinc-500">Τύπος</th>
                          <th className="px-4 py-2 text-xs font-medium text-zinc-500">Αρχείο</th>
                          <th className="px-4 py-2 text-xs font-medium text-zinc-500">Ενέργειες</th>
                        </tr>
                      </thead>
                      <tbody>
                        {licenseDocuments.map((document) => (
                          <tr key={document.id} className="border-t border-zinc-800/80">
                            <td className="px-4 py-2 text-xs text-zinc-300">{document.document_type}</td>
                            <td className="px-4 py-2 text-xs text-white">{document.file_name}</td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => window.open(getCarDocumentPublicUrl(document.file_url), '_blank', 'noopener,noreferrer')}
                                  className="h-8 rounded-xl border border-sky-500/35 bg-sky-500/5 px-3 text-xs font-medium text-sky-200 transition hover:bg-sky-500/15"
                                >
                                  Προβολή
                                </button>
                                <a
                                  href={getCarDocumentPublicUrl(document.file_url)}
                                  download={document.file_name}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex h-8 items-center rounded-xl border border-zinc-600 bg-zinc-800/30 px-3 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700/40"
                                >
                                  Download
                                </a>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="px-4 py-4 text-xs text-zinc-500">Δεν υπάρχουν καταχωρημένα έγγραφα.</p>
                )}
              </div>
              {/* TODO: Upload the selected license file to storage once document storage is introduced. */}
              <p className="text-xs text-zinc-500">
                Η αποθήκευση αρχείου θα συνδεθεί σε επόμενο βήμα με αποθηκευτικό χώρο εγγράφων.
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowLicenseRegistrationModal(false)}
                  className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm text-zinc-300 transition hover:bg-zinc-800"
                >
                  Κλείσιμο
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showKteoModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-sky-300/15 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-5">
              <h3 className="text-lg font-semibold text-white">Ενημέρωση ΚΤΕΟ — {vehicle.plate}</h3>
              <button type="button" onClick={() => setShowKteoModal(false)} className="text-zinc-400 transition hover:text-white">
                ✕
              </button>
            </div>
            <div className="space-y-5 p-6">
              <label className="block space-y-2 text-sm text-zinc-300">
                <span>Νέα ημερομηνία λήξης ΚΤΕΟ</span>
                <input
                  type="date"
                  value={nextKteoExpiry}
                  onChange={(event) => setNextKteoExpiry(event.target.value)}
                  className="input"
                />
              </label>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowKteoModal(false)} className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm text-zinc-300">
                  Ακύρωση
                </button>
                <button
                  type="button"
                  onClick={saveKteoExpiry}
                  disabled={!nextKteoExpiry || savingKteo}
                  className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Αποθήκευση
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showServiceHistoryModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className="flex max-h-[82vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-orange-300/15 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-5">
              <h3 className="text-lg font-semibold text-white">Ιστορικό Service — {vehicle.plate}</h3>
              <button type="button" onClick={() => setShowServiceHistoryModal(false)} className="text-zinc-400 transition hover:text-white">
                ✕
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              {services.length === 0 ? (
                <p className="text-sm text-zinc-400">Δεν υπάρχει ιστορικό service για αυτό το αυτοκίνητο.</p>
              ) : (
                <div className="space-y-4">
                  {serviceYears.map((year) => (
                    <section key={year} className="overflow-hidden rounded-2xl border border-zinc-800">
                      <div className="border-b border-zinc-800 bg-zinc-900/80 px-4 py-3 text-sm font-semibold text-white">
                        {year}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[860px] text-left">
                          <thead className="bg-zinc-900/50">
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
                            {serviceRowsByYear[year].map((service) => {
                              const { partsDescription, partsCost, laborCost } = getServiceCosts(service);

                              return (
                                <tr key={service.id} className="border-t border-zinc-800">
                                  <td className="px-4 py-3 text-sm text-zinc-200">{service.service_date}</td>
                                  <td className="px-4 py-3 text-sm text-zinc-200">{service.km || '-'}</td>
                                  <td className="px-4 py-3 text-sm text-zinc-200">{service.description || '-'}</td>
                                  <td className="px-4 py-3 text-sm text-zinc-200">{partsDescription}</td>
                                  <td className="px-4 py-3 text-sm text-zinc-200">{partsCost}</td>
                                  <td className="px-4 py-3 text-sm text-zinc-200">{laborCost}</td>
                                  <td className="px-4 py-3 text-sm font-semibold text-white">{partsCost + laborCost}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

