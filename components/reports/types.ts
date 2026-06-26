import type { BookingRecord } from '@/lib/bookingsApi';
import type { SupplierLedgerRow } from '@/lib/reportsApi';

export type ReportTransaction = {
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
  supplier_name?: string;
  category: string;
  notes: string;
  contract_number?: string;
  booking_id?: string;
  source?: string;
  agency?: string;
  representative?: string;
};

export type ReportAgency = {
  id: number;
  name: string;
};

export type ReportRepresentative = {
  id: number;
  name: string;
  agency_id: number;
};

export type ReportVehicle = {
  id: string;
  plate: string;
  category?: string;
  brand: string;
  model: string;
  year?: string;
  price?: string;
  purchase_date?: string;
  kteo_expiry?: string;
};

export type ReportsData = {
  transactions: ReportTransaction[];
  bookings: BookingRecord[];
  agencies: ReportAgency[];
  representatives: ReportRepresentative[];
  supplierLedger: SupplierLedgerRow[];
  vehicles: ReportVehicle[];
  onUpdateKteo: (
    vehicleId: string,
    kteoExpiry: string,
    expense?: { amount: number; paymentMethod: string }
  ) => Promise<boolean>;
  onAddIncome?: () => void;
  onAddExpense?: () => void;
};

export type ReportsFilters = {
  fromDate: string;
  toDate: string;
  paymentMethod: string;
  agencyId: string;
  representativeId: string;
  supplierId: string;
  carId: string;
};
