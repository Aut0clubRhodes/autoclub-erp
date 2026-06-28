'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type InvestmentDecisionPage = 'new' | 'library' | 'singleReport';
type InvestmentNavigationPage = Exclude<InvestmentDecisionPage, 'singleReport'>;

type InvestmentCategory =
  | 'Νέο Υποκατάστημα'
  | 'Αγορά Οχημάτων'
  | 'Πλατφόρμα Broker'
  | 'Καμπάνια Marketing'
  | 'Website / Booking Engine'
  | 'Συνεργείο'
  | 'Άλλο';

type BranchSharedExpense = {
  id: string;
  description: string;
  date?: string;
  category?: string;
  amount: string;
  allocationPercent: string;
};

type BranchExtraExpense = {
  id: string;
  description: string;
  monthlyAmount: string;
};

type ErpSharedExpense = {
  expenseId: string;
  date: string;
  category: string;
  description: string;
  amount: number;
};

type ErpExpenseCategoryTotal = {
  expenseId: string;
  category: string;
  total: number;
};

type ExpenseImportFilters = {
  fromDate: string;
  toDate: string;
  category: string;
  search: string;
};

type InvestmentForm = {
  investmentName: string;
  category: InvestmentCategory;
  description: string;
  setupCost: string;
  equipmentCost: string;
  vehiclesCost: string;
  technologyCost: string;
  licensesCost: string;
  otherInitialCost: string;
  rent: string;
  salaries: string;
  electricity: string;
  internet: string;
  marketing: string;
  insurance: string;
  fuel: string;
  maintenance: string;
  accounting: string;
  otherMonthlyCost: string;
  expectedBookings: string;
  averageBookingValue: string;
  extraRevenue: string;
  sensitivityDeviation: string;
  targetProfitMargin: string;
  competitionRisk: string;
  googleAdsRisk: string;
  staffRisk: string;
  seasonalityRisk: string;
  implementationCostRisk: string;
  operationalDifficultyRisk: string;
  legalTaxRisk: string;
  brandValue: string;
  newCustomersValue: string;
  repeatCustomersValue: string;
  seoPresenceValue: string;
  costReductionValue: string;
  expansionValue: string;
  competitiveAdvantageValue: string;
  branchTransferredVehicles: string;
  branchSeasonOperatingDays: string;
  branchSeasonMonths: string;
  branchAverageRentalDaysPerVehicle: string;
  branchAverageDailyRate: string;
  branchAverageBookingDuration: string;
  branchFleetOccupancy: string;
  branchNewRent: string;
  branchNewStaff: string;
  branchNewElectricity: string;
  branchNewInternetPhone: string;
  branchNewLocalMarketing: string;
  branchCleaningSupplies: string;
  branchTransportFuel: string;
  branchOtherExtraCosts: string;
  branchAccountingShared: string;
  branchAccountingAllocation: string;
  branchSoftwareShared: string;
  branchSoftwareAllocation: string;
  branchManagementShared: string;
  branchManagementAllocation: string;
  branchMarketingShared: string;
  branchMarketingAllocation: string;
  branchSharedExpenses: BranchSharedExpense[];
  branchExtraExpenses: BranchExtraExpense[];
  erpImportedSharedExpenses: ErpSharedExpense[];
  selectedErpSharedExpenseIds: string[];
  erpSharedExpenseAllocations: Record<string, string>;
  erpAppliedSharedExpenses: boolean;
};

type Scenario = {
  label: string;
  description: string;
  monthlyRevenue: number;
  monthlyCosts: number;
  monthlyProfit: number;
  yearlyProfit: number;
  roi: number;
  paybackMonths: number | null;
  tone: 'danger' | 'neutral' | 'success';
  seasonRevenue?: number;
  annualCosts?: number;
  seasonProfit?: number;
  breakEvenRentalDaysPerVehicle?: number;
};

type InvestmentAnalysis = {
  totalInitialInvestment: number;
  totalMonthlyCosts: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  yearlyProfit: number;
  roi: number;
  breakEvenBookings: number;
  paybackMonths: number | null;
  scenarios: Scenario[];
  investmentScore: number;
  baseInvestmentScore: number;
  riskScore: number;
  strategicScore: number;
  riskScore100: number;
  strategicScore100: number;
  decision: string;
  decisionExplanation: string;
  decisionReasons: string[];
  decisionTone: 'danger' | 'warning' | 'review' | 'success';
  branchMetrics?: BranchMetrics;
};

type BranchMetrics = {
  seasonRevenue: number;
  seasonProfit: number;
  rentalDaysPerVehicle: number;
  revenuePerVehicle: number;
  costPerVehicle: number;
  fleetOccupancy: number;
  seasonMonths: number;
  seasonCosts: number;
  allocatedSharedCosts: number;
  annualNewCosts: number;
  sharedCostsMonthly: number;
  sharedCostsSeason: number;
  sharedCostsAnnual: number;
  newExtraCostsMonthly: number;
  newExtraCostsSeason: number;
  newExtraCostsAnnual: number;
  breakEvenRentalDaysPerVehicle: number;
  isBranchModel: boolean;
};

type InvestmentDraft = {
  id: string;
  name: string;
  category: InvestmentCategory;
  description: string;
  form: InvestmentForm;
  analysis: InvestmentAnalysis;
  decision: string;
  score: number;
  createdAt: string;
  updatedAt: string;
};

type SectionId = 'basic' | 'branchModel' | 'initial' | 'costs' | 'revenue' | 'settings' | 'riskStrategic';

export const INVESTMENT_PAGE_STORAGE_KEY = 'investment_decision_active_page';
export const INVESTMENT_PAGE_EVENT = 'investment-decision-page-change';
const INVESTMENT_DRAFTS_STORAGE_KEY = 'autoclub_investment_drafts';

const categories: InvestmentCategory[] = [
  'Νέο Υποκατάστημα',
  'Αγορά Οχημάτων',
  'Πλατφόρμα Broker',
  'Καμπάνια Marketing',
  'Website / Booking Engine',
  'Συνεργείο',
  'Άλλο',
];

const pageLabels: Record<InvestmentNavigationPage, string> = {
  new: 'Νέα Επένδυση',
  library: 'Βιβλιοθήκη Επενδύσεων',
};

const scoreOptions = Array.from({ length: 11 }, (_, index) => String(index));

const riskFields: Array<{ field: keyof InvestmentForm; label: string }> = [
  { field: 'competitionRisk', label: 'Ανταγωνισμός' },
  { field: 'googleAdsRisk', label: 'Εξάρτηση από Google / Ads' },
  { field: 'staffRisk', label: 'Εξάρτηση από προσωπικό' },
  { field: 'seasonalityRisk', label: 'Εποχικότητα' },
  { field: 'implementationCostRisk', label: 'Κόστος υλοποίησης' },
  { field: 'operationalDifficultyRisk', label: 'Λειτουργική δυσκολία' },
  { field: 'legalTaxRisk', label: 'Νομικό / φορολογικό ρίσκο' },
];

const strategicFields: Array<{ field: keyof InvestmentForm; label: string }> = [
  { field: 'brandValue', label: 'Ενίσχυση Brand' },
  { field: 'newCustomersValue', label: 'Νέοι πελάτες' },
  { field: 'repeatCustomersValue', label: 'Repeat πελάτες' },
  { field: 'seoPresenceValue', label: 'SEO / Online παρουσία' },
  { field: 'costReductionValue', label: 'Μείωση λειτουργικού κόστους' },
  { field: 'expansionValue', label: 'Δυνατότητα επέκτασης' },
  { field: 'competitiveAdvantageValue', label: 'Ανταγωνιστικό πλεονέκτημα' },
];

const defaultBranchSharedExpenses: BranchSharedExpense[] = [];
const deprecatedFakeSharedExpenseIds = new Set([
  'accounting',
  'erp-software',
  'hosting',
  'management',
  'marketing-brand',
  'grammatia',
  'loans',
  'shared-accounting',
  'shared-software',
  'shared-hosting',
  'shared-management',
  'shared-marketing',
]);

const defaultBranchExtraExpenses: BranchExtraExpense[] = [
  { id: 'rent', description: 'Ενοίκιο', monthlyAmount: '' },
  { id: 'staff', description: 'Προσωπικό', monthlyAmount: '' },
  { id: 'electricity-water', description: 'Ρεύμα / Νερό', monthlyAmount: '' },
  { id: 'internet-phone', description: 'Internet / Τηλέφωνο', monthlyAmount: '' },
  { id: 'cleaning-supplies', description: 'Καθαρισμός / Αναλώσιμα', monthlyAmount: '' },
  { id: 'local-ads', description: 'Τοπική Διαφήμιση', monthlyAmount: '' },
  { id: 'transport-fuel', description: 'Μεταφορές / Καύσιμα', monthlyAmount: '' },
];

const defaultForm: InvestmentForm = {
  investmentName: '',
  category: 'Νέο Υποκατάστημα',
  description: '',
  setupCost: '',
  equipmentCost: '',
  vehiclesCost: '',
  technologyCost: '',
  licensesCost: '',
  otherInitialCost: '',
  rent: '',
  salaries: '',
  electricity: '',
  internet: '',
  marketing: '',
  insurance: '',
  fuel: '',
  maintenance: '',
  accounting: '',
  otherMonthlyCost: '',
  expectedBookings: '',
  averageBookingValue: '',
  extraRevenue: '',
  sensitivityDeviation: '15',
  targetProfitMargin: '20',
  competitionRisk: '0',
  googleAdsRisk: '0',
  staffRisk: '0',
  seasonalityRisk: '0',
  implementationCostRisk: '0',
  operationalDifficultyRisk: '0',
  legalTaxRisk: '0',
  brandValue: '0',
  newCustomersValue: '0',
  repeatCustomersValue: '0',
  seoPresenceValue: '0',
  costReductionValue: '0',
  expansionValue: '0',
  competitiveAdvantageValue: '0',
  branchTransferredVehicles: '',
  branchSeasonOperatingDays: '130',
  branchSeasonMonths: '6',
  branchAverageRentalDaysPerVehicle: '120',
  branchAverageDailyRate: '',
  branchAverageBookingDuration: '',
  branchFleetOccupancy: '70',
  branchNewRent: '',
  branchNewStaff: '',
  branchNewElectricity: '',
  branchNewInternetPhone: '',
  branchNewLocalMarketing: '',
  branchCleaningSupplies: '',
  branchTransportFuel: '',
  branchOtherExtraCosts: '',
  branchAccountingShared: 'Ναι',
  branchAccountingAllocation: '0',
  branchSoftwareShared: 'Ναι',
  branchSoftwareAllocation: '0',
  branchManagementShared: 'Ναι',
  branchManagementAllocation: '0',
  branchMarketingShared: 'Ναι',
  branchMarketingAllocation: '0',
  branchSharedExpenses: defaultBranchSharedExpenses,
  branchExtraExpenses: defaultBranchExtraExpenses,
  erpImportedSharedExpenses: [],
  selectedErpSharedExpenseIds: [],
  erpSharedExpenseAllocations: {},
  erpAppliedSharedExpenses: false,
};

const money = (value: number) =>
  `€${value.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const numberText = (value: number) => value.toLocaleString('el-GR', { maximumFractionDigits: 0 });

const percent = (value: number) =>
  `${value.toLocaleString('el-GR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

const toNumber = (value: string) => {
  const parsed = Number(String(value || '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

function calculatePaybackMonths(initialInvestment: number, monthlyProfit: number) {
  if (monthlyProfit <= 0) return null;
  return initialInvestment / monthlyProfit;
}

function calculateRoi(yearlyProfit: number, initialInvestment: number) {
  if (initialInvestment <= 0) return 0;
  return (yearlyProfit / initialInvestment) * 100;
}

function formatPayback(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Δεν αποσβένεται';
  return `${value.toLocaleString('el-GR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} μήνες`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function averageScore(values: string[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + toNumber(value), 0) / values.length;
}

type ReportsExpenseTransactionRow = {
  id: string | number;
  date: string | null;
  amount: number | string | null;
  payment_method: string | null;
  type: string | null;
  source: string | null;
  category: string | null;
  notes: string | null;
};

async function loadSharedExpensesFromReportsExpenses(): Promise<{ expenses: ErpSharedExpense[]; error?: string }> {
  if (!supabase) {
    return { expenses: [], error: 'Δεν βρέθηκε πηγή εξόδων από Αναφορές > Έξοδα.' };
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('id, date, amount, payment_method, type, source, category, notes')
    .in('type', ['expense', 'supplier_payment'])
    .order('date', { ascending: false });

  if (error) {
    console.error('INVESTMENT EXPENSE SOURCE ERROR', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return { expenses: [], error: 'Δεν βρέθηκε πηγή εξόδων από Αναφορές > Έξοδα.' };
  }

  const expenses = ((data || []) as ReportsExpenseTransactionRow[])
    .filter((transaction) => {
      const type = String(transaction.type || '');
      const paymentMethod = String(transaction.payment_method || '').toLowerCase();
      return (
        (type === 'expense' && ['cash', 'card', 'bank'].includes(paymentMethod)) ||
        type === 'supplier_payment'
      );
    })
    .map((transaction) => {
      const category = getReportsExpenseCategory(transaction);
      const description = transaction.notes || transaction.source || category;
      return {
        expenseId: String(transaction.id),
        date: transaction.date || '',
        category,
        description,
        amount: Number(transaction.amount || 0),
      };
    });

  return { expenses };
}

function getReportsExpenseCategory(transaction: ReportsExpenseTransactionRow) {
  if (transaction.type === 'supplier_payment') return 'Πληρωμές Προμηθευτών';
  return transaction.category || 'Χωρίς Κατηγορία';
}

function createExpenseCategoryId(category: string) {
  return `category:${category.trim().toLowerCase() || 'uncategorized'}`;
}

function buildExpenseCategoryTotals(expenses: ErpSharedExpense[]): ErpExpenseCategoryTotal[] {
  const totals = expenses.reduce((items, expense) => {
    const id = createExpenseCategoryId(expense.category);
    const current = items.get(id) || { expenseId: id, category: expense.category, total: 0 };
    current.total += expense.amount;
    items.set(id, current);
    return items;
  }, new Map<string, ErpExpenseCategoryTotal>());

  return Array.from(totals.values()).sort((left, right) => right.total - left.total);
}

function calculateBranchMetrics(form: InvestmentForm): BranchMetrics {
  const vehicles = toNumber(form.branchTransferredVehicles);
  const averageRentalDaysPerVehicle = toNumber(form.branchAverageRentalDaysPerVehicle);
  const averageDailyRate = toNumber(form.branchAverageDailyRate);
  const seasonMonths = toNumber(form.branchSeasonMonths);
  const seasonRevenue = vehicles * averageRentalDaysPerVehicle * averageDailyRate;
  const sharedCostsSeason = form.branchSharedExpenses.reduce(
    (sum, expense) => sum + toNumber(expense.amount) * (toNumber(expense.allocationPercent) / 100),
    0
  );
  const sharedCostsMonthly = seasonMonths > 0 ? sharedCostsSeason / seasonMonths : 0;
  const sharedCostsAnnual = sharedCostsSeason;
  const newExtraCostsMonthly = form.branchExtraExpenses.reduce((sum, expense) => sum + toNumber(expense.monthlyAmount), 0);
  const newExtraCostsSeason = newExtraCostsMonthly * seasonMonths;
  const newExtraCostsAnnual = newExtraCostsMonthly * 12;
  const seasonCosts = sharedCostsSeason + newExtraCostsSeason;
  const seasonProfit = seasonRevenue - seasonCosts;
  const breakEvenRentalDaysPerVehicle = vehicles > 0 && averageDailyRate > 0 ? seasonCosts / vehicles / averageDailyRate : 0;

  return {
    seasonRevenue,
    seasonProfit,
    rentalDaysPerVehicle: averageRentalDaysPerVehicle,
    revenuePerVehicle: vehicles > 0 ? seasonRevenue / vehicles : 0,
    costPerVehicle: vehicles > 0 ? seasonCosts / vehicles : 0,
    fleetOccupancy: toNumber(form.branchFleetOccupancy),
    seasonMonths,
    seasonCosts,
    allocatedSharedCosts: sharedCostsAnnual,
    annualNewCosts: newExtraCostsAnnual,
    sharedCostsMonthly,
    sharedCostsSeason,
    sharedCostsAnnual,
    newExtraCostsMonthly,
    newExtraCostsSeason,
    newExtraCostsAnnual,
    breakEvenRentalDaysPerVehicle,
    isBranchModel: true,
  };
}

function isInvestmentPage(value: unknown): value is InvestmentNavigationPage {
  return value === 'new' || value === 'library';
}

function readInitialPage(): InvestmentDecisionPage {
  if (typeof window === 'undefined') return 'new';
  const saved = window.localStorage.getItem(INVESTMENT_PAGE_STORAGE_KEY);
  return isInvestmentPage(saved) ? saved : 'new';
}

function readInvestmentDrafts(): InvestmentDraft[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(INVESTMENT_DRAFTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((draft) => ({
          ...draft,
          form: normalizeInvestmentForm(draft.form),
        }))
      : [];
  } catch {
    return [];
  }
}

function normalizeInvestmentForm(form: Partial<InvestmentForm> | undefined): InvestmentForm {
  const merged = { ...defaultForm, ...(form || {}) };
  return {
    ...merged,
    branchSharedExpenses: Array.isArray(form?.branchSharedExpenses)
      ? form.branchSharedExpenses.map((expense) => {
          const legacyExpense = expense as BranchSharedExpense & { monthlyAmount?: string };
          return {
            ...legacyExpense,
            amount: legacyExpense.amount ?? legacyExpense.monthlyAmount ?? '',
          };
        }).filter((expense) => !deprecatedFakeSharedExpenseIds.has(expense.id))
      : defaultBranchSharedExpenses,
    branchExtraExpenses: Array.isArray(form?.branchExtraExpenses)
      ? form.branchExtraExpenses
      : defaultBranchExtraExpenses,
    erpImportedSharedExpenses: Array.isArray(form?.erpImportedSharedExpenses)
      ? form.erpImportedSharedExpenses.filter((expense) => !deprecatedFakeSharedExpenseIds.has(expense.expenseId))
      : [],
    selectedErpSharedExpenseIds: Array.isArray(form?.selectedErpSharedExpenseIds) ? form.selectedErpSharedExpenseIds : [],
    erpSharedExpenseAllocations: form?.erpSharedExpenseAllocations || {},
  };
}

function writeInvestmentDrafts(drafts: InvestmentDraft[]) {
  window.localStorage.setItem(INVESTMENT_DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
}

function createDraftId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `investment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('el-GR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildAnalysis(form: InvestmentForm): InvestmentAnalysis {
  const isBranchModel = true;
  const genericInitialInvestment =
    toNumber(form.setupCost) +
    toNumber(form.equipmentCost) +
    toNumber(form.vehiclesCost) +
    toNumber(form.technologyCost) +
    toNumber(form.licensesCost) +
    toNumber(form.otherInitialCost);
  const branchInitialInvestment =
    toNumber(form.setupCost) +
    toNumber(form.equipmentCost) +
    toNumber(form.licensesCost) +
    toNumber(form.technologyCost) +
    toNumber(form.otherInitialCost);
  const totalInitialInvestment = isBranchModel ? branchInitialInvestment : genericInitialInvestment;

  const genericTotalMonthlyCosts =
    toNumber(form.rent) +
    toNumber(form.salaries) +
    toNumber(form.electricity) +
    toNumber(form.internet) +
    toNumber(form.marketing) +
    toNumber(form.insurance) +
    toNumber(form.fuel) +
    toNumber(form.maintenance) +
    toNumber(form.accounting) +
    toNumber(form.otherMonthlyCost);

  const expectedBookings = toNumber(form.expectedBookings);
  const averageBookingValue = toNumber(form.averageBookingValue);
  const genericMonthlyRevenue = expectedBookings * averageBookingValue + toNumber(form.extraRevenue);
  const branchMetrics = isBranchModel ? calculateBranchMetrics(form) : undefined;
  const totalMonthlyCosts = branchMetrics && branchMetrics.seasonMonths > 0 ? branchMetrics.seasonCosts / branchMetrics.seasonMonths : genericTotalMonthlyCosts;
  const monthlyRevenue = branchMetrics && branchMetrics.seasonMonths > 0 ? branchMetrics.seasonRevenue / branchMetrics.seasonMonths : genericMonthlyRevenue;
  const monthlyProfit = branchMetrics && branchMetrics.seasonMonths > 0 ? branchMetrics.seasonProfit / branchMetrics.seasonMonths : monthlyRevenue - totalMonthlyCosts;
  const yearlyProfit = branchMetrics ? branchMetrics.seasonProfit : monthlyProfit * 12;
  const roi = calculateRoi(yearlyProfit, totalInitialInvestment);
  const breakEvenBookings = branchMetrics
    ? branchMetrics.breakEvenRentalDaysPerVehicle
    : averageBookingValue > 0
      ? totalMonthlyCosts / averageBookingValue
      : 0;
  const paybackMonths = calculatePaybackMonths(totalInitialInvestment, monthlyProfit);
  const deviation = toNumber(form.sensitivityDeviation) / 100;
  const targetProfitMargin = toNumber(form.targetProfitMargin);

  const createScenario = (
    label: string,
    description: string,
    revenue: number,
    costs: number,
    tone: Scenario['tone']
  ): Scenario => {
    const scenarioMonthlyProfit = revenue - costs;
    const scenarioYearlyProfit = scenarioMonthlyProfit * 12;
    return {
      label,
      description,
      monthlyRevenue: revenue,
      monthlyCosts: costs,
      monthlyProfit: scenarioMonthlyProfit,
      yearlyProfit: scenarioYearlyProfit,
      roi: calculateRoi(scenarioYearlyProfit, totalInitialInvestment),
      paybackMonths: calculatePaybackMonths(totalInitialInvestment, scenarioMonthlyProfit),
      tone,
    };
  };

  const createBranchScenario = (
    label: string,
    description: string,
    rateFactor: number,
    rentalDaysFactor: number,
    costsFactor: number,
    tone: Scenario['tone']
  ): Scenario => {
    const vehicles = toNumber(form.branchTransferredVehicles);
    const scenarioRentalDaysPerVehicle = toNumber(form.branchAverageRentalDaysPerVehicle) * rentalDaysFactor;
    const scenarioDailyRate = toNumber(form.branchAverageDailyRate) * rateFactor;
    const scenarioSeasonRevenue =
      vehicles *
      scenarioRentalDaysPerVehicle *
      scenarioDailyRate;
    const scenarioSeasonCosts = (branchMetrics?.seasonCosts || 0) * costsFactor;
    const scenarioSeasonProfit = scenarioSeasonRevenue - scenarioSeasonCosts;
    const seasonMonths = branchMetrics?.seasonMonths || 0;
    return {
      label,
      description,
      monthlyRevenue: seasonMonths > 0 ? scenarioSeasonRevenue / seasonMonths : 0,
      monthlyCosts: seasonMonths > 0 ? scenarioSeasonCosts / seasonMonths : 0,
      monthlyProfit: seasonMonths > 0 ? scenarioSeasonProfit / seasonMonths : 0,
      yearlyProfit: scenarioSeasonProfit,
      roi: calculateRoi(scenarioSeasonProfit, totalInitialInvestment),
      paybackMonths: calculatePaybackMonths(totalInitialInvestment, seasonMonths > 0 ? scenarioSeasonProfit / seasonMonths : 0),
      tone,
      seasonRevenue: scenarioSeasonRevenue,
      annualCosts: scenarioSeasonCosts,
      seasonProfit: scenarioSeasonProfit,
      breakEvenRentalDaysPerVehicle: vehicles > 0 && scenarioDailyRate > 0 ? scenarioSeasonCosts / vehicles / scenarioDailyRate : 0,
    };
  };

  const scenarios = branchMetrics
    ? [
        createBranchScenario(
          'ΑΠΑΙΣΙΟΔΟΞΟ',
          `Τιμή -${form.sensitivityDeviation}%, ημέρες -${form.sensitivityDeviation}%, κόστος +${form.sensitivityDeviation}%`,
          1 - deviation,
          1 - deviation,
          1 + deviation,
          'danger'
        ),
        createBranchScenario('ΡΕΑΛΙΣΤΙΚΟ', 'Τρέχον μοντέλο υποκαταστήματος', 1, 1, 1, 'neutral'),
        createBranchScenario(
          'ΑΙΣΙΟΔΟΞΟ',
          `Τιμή +${form.sensitivityDeviation}%, ημέρες +${form.sensitivityDeviation}%, κόστος -${toNumber(form.sensitivityDeviation) / 2}%`,
          1 + deviation,
          1 + deviation,
          1 - deviation / 2,
          'success'
        ),
      ]
    : [
        createScenario(
          'ΑΠΑΙΣΙΟΔΟΞΟ',
          `Έσοδα -${form.sensitivityDeviation}%, έξοδα +${form.sensitivityDeviation}%`,
          monthlyRevenue * (1 - deviation),
          totalMonthlyCosts * (1 + deviation),
          'danger'
        ),
        createScenario('ΡΕΑΛΙΣΤΙΚΟ', 'Τρέχουσες εκτιμήσεις', monthlyRevenue, totalMonthlyCosts, 'neutral'),
        createScenario(
          'ΑΙΣΙΟΔΟΞΟ',
          `Έσοδα +${form.sensitivityDeviation}%, έξοδα -${toNumber(form.sensitivityDeviation) / 2}%`,
          monthlyRevenue * (1 + deviation),
          totalMonthlyCosts * (1 - deviation / 2),
          'success'
        ),
      ];

  const pessimisticProfit = scenarios[0].monthlyProfit;
  const roiScore = clamp((Math.max(0, roi) / Math.max(targetProfitMargin, 1)) * 35, 0, 35);
  const paybackScore = paybackMonths === null ? 0 : clamp(((36 - paybackMonths) / 36) * 25, 0, 25);
  const profitScore = clamp((monthlyProfit / Math.max(totalMonthlyCosts, 1)) * 20, 0, 20);
  const sensitivityScore = pessimisticProfit > 0 ? 20 : clamp((pessimisticProfit / Math.max(monthlyProfit, 1)) * 20, 0, 20);
  const baseInvestmentScore = clamp(roiScore + paybackScore + profitScore + sensitivityScore, 0, 100);
  const riskScore = averageScore(riskFields.map(({ field }) => String(form[field] || '0')));
  const strategicScore = averageScore(strategicFields.map(({ field }) => String(form[field] || '0')));
  const riskScore100 = riskScore * 10;
  const strategicScore100 = strategicScore * 10;
  const investmentScore = Math.round(clamp(baseInvestmentScore - riskScore100 * 0.2 + strategicScore100 * 0.15, 0, 100));

  let decision = 'ΚΑΛΗ ΕΠΕΝΔΥΣΗ';
  let decisionExplanation = 'Η επένδυση περνά τα βασικά κριτήρια απόδοσης, ρίσκου και στρατηγικής αξίας.';
  let decisionTone: InvestmentAnalysis['decisionTone'] = 'success';
  const decisionReasons: string[] = [];

  if (monthlyProfit <= 0) {
    decision = 'ΜΗΝ ΕΠΕΝΔΥΣΕΙΣ';
    decisionExplanation = 'Το μηνιαίο αποτέλεσμα είναι μηδενικό ή αρνητικό.';
    decisionTone = 'danger';
  } else if (riskScore100 >= 75 && strategicScore100 < 60) {
    decision = 'ΥΨΗΛΟ ΡΙΣΚΟ / ΠΕΡΙΜΕΝΕ';
    decisionExplanation = 'Το ρίσκο είναι υψηλό και δεν αντισταθμίζεται αρκετά από στρατηγική αξία.';
    decisionTone = 'warning';
  } else if (paybackMonths !== null && paybackMonths > 36) {
    decision = 'ΧΡΕΙΑΖΕΤΑΙ ΑΝΑΘΕΩΡΗΣΗ';
    decisionExplanation = 'Ο χρόνος απόσβεσης ξεπερνά τους 36 μήνες και αυξάνει το ρίσκο.';
    decisionTone = 'warning';
  } else if (roi < targetProfitMargin) {
    decision = 'ΧΑΜΗΛΗ ΑΠΟΔΟΣΗ / ΕΛΕΓΧΟΣ';
    decisionExplanation = 'Το ROI είναι χαμηλότερο από το επιθυμητό περιθώριο απόδοσης.';
    decisionTone = 'review';
  }

  if (monthlyProfit <= 0) {
    decisionReasons.push('Το μηνιαίο κέρδος είναι αρνητικό ή μηδενικό.');
  } else {
    decisionReasons.push('Το μηνιαίο κέρδος είναι θετικό.');
  }
  if (paybackMonths !== null && paybackMonths > 36) {
    decisionReasons.push('Ο χρόνος απόσβεσης ξεπερνά τους 36 μήνες.');
  }
  if (riskScore100 >= 75) {
    decisionReasons.push('Το ρίσκο είναι υψηλό.');
  }
  if (strategicScore100 >= 60) {
    decisionReasons.push('Η στρατηγική αξία βελτιώνει την τελική βαθμολογία.');
  }
  if (roi >= targetProfitMargin) {
    decisionReasons.push('Το ROI είναι πάνω από τον στόχο.');
  } else {
    decisionReasons.push('Το ROI είναι κάτω από τον στόχο.');
  }

  return {
    totalInitialInvestment,
    totalMonthlyCosts,
    monthlyRevenue,
    monthlyProfit,
    yearlyProfit,
    roi,
    breakEvenBookings,
    paybackMonths,
    scenarios,
    investmentScore,
    baseInvestmentScore,
    riskScore,
    strategicScore,
    riskScore100,
    strategicScore100,
    decision,
    decisionExplanation,
    decisionReasons: decisionReasons.slice(0, 5),
    decisionTone,
    branchMetrics,
  };
}

export default function InvestmentDecisionEngine() {
  const [activePage, setActivePage] = useState<InvestmentDecisionPage>(readInitialPage);
  const [form, setForm] = useState<InvestmentForm>(defaultForm);
  const [drafts, setDrafts] = useState<InvestmentDraft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [reportDraftId, setReportDraftId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>({
    basic: true,
    branchModel: true,
    initial: true,
    costs: false,
    revenue: true,
    settings: false,
    riskStrategic: false,
  });

  useEffect(() => {
    const syncPage = () => {
      const saved = window.localStorage.getItem(INVESTMENT_PAGE_STORAGE_KEY);
      if (isInvestmentPage(saved)) setActivePage(saved);
    };

    window.addEventListener(INVESTMENT_PAGE_EVENT, syncPage);
    window.addEventListener('storage', syncPage);
    syncPage();

    return () => {
      window.removeEventListener(INVESTMENT_PAGE_EVENT, syncPage);
      window.removeEventListener('storage', syncPage);
    };
  }, []);

  useEffect(() => {
    setDrafts(readInvestmentDrafts());
  }, []);

  const analysis = useMemo(() => buildAnalysis(form), [form]);

  const updateForm = <K extends keyof InvestmentForm>(field: K, value: InvestmentForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const selectPage = (page: InvestmentNavigationPage) => {
    setActivePage(page);
    window.localStorage.setItem(INVESTMENT_PAGE_STORAGE_KEY, page);
    window.dispatchEvent(new Event(INVESTMENT_PAGE_EVENT));
  };

  const toggleSection = (section: SectionId) => {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }));
  };

  const resetForm = () => {
      setForm(defaultForm);
    setActiveDraftId(null);
    setSaveMessage('');
  };

  const saveDraft = () => {
    const now = new Date().toISOString();
    const name = form.investmentName.trim() || 'Νέα Επένδυση';
    const currentDraft = activeDraftId ? drafts.find((draft) => draft.id === activeDraftId) : undefined;
    const draft: InvestmentDraft = {
      id: currentDraft?.id || createDraftId(),
      name,
      category: form.category,
      description: form.description,
      form,
      analysis,
      decision: analysis.decision,
      score: analysis.investmentScore,
      createdAt: currentDraft?.createdAt || now,
      updatedAt: now,
    };
    const nextDrafts = currentDraft
      ? drafts.map((item) => (item.id === currentDraft.id ? draft : item))
      : [draft, ...drafts];

    writeInvestmentDrafts(nextDrafts);
    setDrafts(nextDrafts);
    setActiveDraftId(draft.id);
    setSaveMessage('Το πρόχειρο αποθηκεύτηκε τοπικά.');
  };

  const openDraft = (draft: InvestmentDraft) => {
    setForm(draft.form);
    setActiveDraftId(draft.id);
    setSaveMessage('');
    selectPage('new');
  };

  const openReport = (draft: InvestmentDraft) => {
    setReportDraftId(draft.id);
    setActivePage('singleReport');
  };

  const backToLibrary = () => {
    setActivePage('library');
  };

  const deleteDraft = (draftId: string) => {
    if (!window.confirm('Να διαγραφεί αυτό το πρόχειρο;')) return;
    const nextDrafts = drafts.filter((draft) => draft.id !== draftId);
    writeInvestmentDrafts(nextDrafts);
    setDrafts(nextDrafts);
    if (activeDraftId === draftId) {
      setActiveDraftId(null);
    }
  };

  const clearAllDrafts = () => {
    if (!window.confirm('Να διαγραφούν όλα τα τοπικά πρόχειρα;')) return;
    writeInvestmentDrafts([]);
    setDrafts([]);
    setActiveDraftId(null);
  };

  const content =
    activePage === 'new' ? (
      <NewInvestmentPage
        form={form}
        analysis={analysis}
        openSections={openSections}
        onToggleSection={toggleSection}
        onUpdateForm={updateForm}
        onReset={resetForm}
        onSaveDraft={saveDraft}
        saveMessage={saveMessage}
      />
    ) : activePage === 'library' ? (
      <InvestmentLibraryPage
        drafts={drafts}
        onOpenDraft={openDraft}
        onOpenReport={openReport}
        onDeleteDraft={deleteDraft}
        onClearAll={clearAllDrafts}
      />
    ) : (
      <SingleInvestmentReportPage
        draft={drafts.find((draft) => draft.id === reportDraftId)}
        onBack={backToLibrary}
      />
    );

  return (
    <div className="min-h-full w-full bg-slate-100 px-4 py-4 text-slate-950">
      <div className="w-full space-y-4">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-700">Phase 1</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">ΜΗΧΑΝΗ ΑΞΙΟΛΟΓΗΣΗΣ ΕΠΕΝΔΥΣΕΩΝ</h1>
            <p className="mt-1 max-w-3xl text-sm font-semibold text-slate-600">
              Αξιολόγηση νέων επενδύσεων με ROI, Break-even, Χρόνο Απόσβεσης και Ανάλυση Ευαισθησίας.
            </p>
          </div>
        </section>

        <div
          className={`grid w-full items-start gap-4 ${
            activePage === 'new'
              ? 'lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_400px] 2xl:grid-cols-[220px_minmax(0,1fr)_420px]'
              : 'lg:grid-cols-[220px_minmax(0,1fr)]'
          }`}
        >
          <InvestmentSidebar activePage={activePage} onSelectPage={selectPage} />
          <main className="min-w-0 w-full overflow-visible">{content}</main>
          {activePage === 'new' && <ResultsRail analysis={analysis} />}
        </div>
      </div>
    </div>
  );
}

function InvestmentSidebar({
  activePage,
  onSelectPage,
}: {
  activePage: InvestmentDecisionPage;
  onSelectPage: (page: InvestmentNavigationPage) => void;
}) {
  return (
    <aside className="sticky top-20 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
      <p className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Ενότητες</p>
      <nav className="space-y-1">
        {(Object.keys(pageLabels) as InvestmentNavigationPage[]).map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onSelectPage(page)}
            className={`flex h-10 w-full items-center rounded-2xl px-3 text-left text-sm font-black transition ${
              activePage === page
                ? 'bg-sky-800 text-white shadow-[0_8px_18px_rgba(7,89,133,0.22)]'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
            }`}
          >
            {pageLabels[page]}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function DashboardPage({ drafts }: { drafts: InvestmentDraft[] }) {
  const total = drafts.length;
  const averageRoi = total ? drafts.reduce((sum, draft) => sum + draft.analysis.roi, 0) / total : 0;
  const averageScore = total ? drafts.reduce((sum, draft) => sum + draft.score, 0) / total : 0;
  const averageRisk = total ? drafts.reduce((sum, draft) => sum + (draft.analysis.riskScore100 || 0), 0) / total : 0;
  const averageStrategic = total ? drafts.reduce((sum, draft) => sum + (draft.analysis.strategicScore100 || 0), 0) / total : 0;
  const highRisk = drafts.filter((draft) => draft.score < 50 || draft.decision.includes('ΜΗΝ ΕΠΕΝΔΥΣΕΙΣ')).length;
  const recentDrafts = [...drafts]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);
  const dashboardCards = [
    ['Συνολικές Επενδύσεις', String(total), 'neutral'],
    ['Ενεργές Επενδύσεις', String(total), 'income'],
    ['Ολοκληρωμένες', '0', 'neutral'],
    ['Μέσο ROI', percent(averageRoi), 'neutral'],
    ['Μέσο Investment Score', `${Math.round(averageScore)}/100`, 'neutral'],
    ['Μέσο Ρίσκο', percent(averageRisk), 'danger'],
    ['Μέση Στρατηγική Αξία', percent(averageStrategic), 'income'],
    ['Υψηλού Ρίσκου', String(highRisk), 'danger'],
  ] as const;

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        {dashboardCards.map(([label, value, tone]) => (
          <DashboardCard key={label} label={label} value={value} tone={tone} />
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-950">Τελευταίες Επενδύσεις</h2>
            <p className="text-xs font-semibold text-slate-500">Η βιβλιοθήκη θα γεμίσει όταν συνδεθεί αποθήκευση.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase text-slate-600">Phase 1</span>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs font-black uppercase text-slate-600">
              <tr>
                <th className="px-3 py-2">Όνομα</th>
                <th className="px-3 py-2">Κατηγορία</th>
                <th className="px-3 py-2">ROI</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Απόφαση</th>
                <th className="px-3 py-2">Κατάσταση</th>
              </tr>
            </thead>
            <tbody>
              {recentDrafts.length ? (
                recentDrafts.map((draft) => (
                  <tr key={draft.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-black text-slate-900">{draft.name}</td>
                    <td className="px-3 py-2 font-semibold text-slate-700">{draft.category}</td>
                    <td className="px-3 py-2 font-black text-slate-900">{percent(draft.analysis.roi)}</td>
                    <td className="px-3 py-2 font-black text-slate-900">{draft.score}</td>
                    <td className="px-3 py-2 font-black text-slate-900">{draft.decision}</td>
                    <td className="px-3 py-2 font-semibold text-emerald-700">Ενεργή</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm font-semibold text-slate-500">
                    Δεν υπάρχουν αποθηκευμένες επενδύσεις ακόμα.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function NewInvestmentPage({
  form,
  analysis,
  openSections,
  onToggleSection,
  onUpdateForm,
  onReset,
  onSaveDraft,
  saveMessage,
}: {
  form: InvestmentForm;
  analysis: InvestmentAnalysis;
  openSections: Record<SectionId, boolean>;
  onToggleSection: (section: SectionId) => void;
  onUpdateForm: <K extends keyof InvestmentForm>(field: K, value: InvestmentForm[K]) => void;
  onReset: () => void;
  onSaveDraft: () => void;
  saveMessage: string;
}) {
  return (
    <div className="min-w-0 w-full space-y-2.5 overflow-visible">
      <InvestmentActionBar onReset={onReset} onSaveDraft={onSaveDraft} saveMessage={saveMessage} />
      <InvestmentBranchModel
        form={form}
        analysis={analysis}
        openSections={openSections}
        onToggleSection={onToggleSection}
        onUpdateForm={onUpdateForm}
      />
    </div>
  );
}

function InvestmentActionBar({
  onReset,
  onSaveDraft,
  saveMessage,
}: {
  onReset: () => void;
  onSaveDraft: () => void;
  saveMessage: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Νέα Ανάλυση</p>
        <p className="text-sm font-semibold text-slate-700">Συμπληρώστε το μοντέλο νέου υποκαταστήματος / επένδυσης.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onReset} className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm font-black text-slate-800 transition hover:bg-slate-100">
          Νέα Ανάλυση
        </button>
        <button type="button" className="h-9 rounded-xl bg-sky-800 px-3 text-sm font-black text-white transition hover:bg-sky-900">
          Υπολογισμός
        </button>
        <button type="button" onClick={onReset} className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm font-black text-slate-800 transition hover:bg-slate-100">
          Καθαρισμός
        </button>
        <button type="button" onClick={onSaveDraft} className="h-9 rounded-xl bg-emerald-700 px-3 text-sm font-black text-white transition hover:bg-emerald-800">
          Αποθήκευση Πρόχειρου
        </button>
      </div>
      {saveMessage && <p className="text-sm font-black text-emerald-700">{saveMessage}</p>}
    </div>
  );
}

function BasicInvestmentFields({
  form,
  open,
  onToggle,
  onUpdateForm,
}: {
  form: InvestmentForm;
  open: boolean;
  onToggle: () => void;
  onUpdateForm: <K extends keyof InvestmentForm>(field: K, value: InvestmentForm[K]) => void;
}) {
  return (
    <CollapsibleSection title="Βασικά Στοιχεία" open={open} onToggle={onToggle}>
      <FieldGrid>
        <TextField label="Όνομα Επένδυσης" value={form.investmentName} onChange={(value) => onUpdateForm('investmentName', value)} />
        <SelectField label="Κατηγορία" value={form.category} options={categories} onChange={(value) => onUpdateForm('category', value as InvestmentCategory)} />
        <TextField label="Περιγραφή" value={form.description} onChange={(value) => onUpdateForm('description', value)} />
      </FieldGrid>
    </CollapsibleSection>
  );
}

function BranchInitialInvestmentSection({
  form,
  onUpdateForm,
}: {
  form: InvestmentForm;
  onUpdateForm: <K extends keyof InvestmentForm>(field: K, value: InvestmentForm[K]) => void;
}) {
  return (
    <CollapsibleSection title="Αρχική Επένδυση" open onToggle={() => undefined}>
      <FieldGrid>
        <NumberField label="Διαμόρφωση / Ανακαίνιση" value={form.setupCost} onChange={(value) => onUpdateForm('setupCost', value)} />
        <NumberField label="Εξοπλισμός" value={form.equipmentCost} onChange={(value) => onUpdateForm('equipmentCost', value)} />
        <NumberField label="Άδειες / Νομικά" value={form.licensesCost} onChange={(value) => onUpdateForm('licensesCost', value)} />
        <NumberField label="Τεχνολογία / Website" value={form.technologyCost} onChange={(value) => onUpdateForm('technologyCost', value)} />
        <NumberField label="Άλλο αρχικό κόστος" value={form.otherInitialCost} onChange={(value) => onUpdateForm('otherInitialCost', value)} />
      </FieldGrid>
    </CollapsibleSection>
  );
}

function InvestmentBranchModel({
  form,
  analysis,
  openSections,
  onToggleSection,
  onUpdateForm,
}: {
  form: InvestmentForm;
  analysis: InvestmentAnalysis;
  openSections: Record<SectionId, boolean>;
  onToggleSection: (section: SectionId) => void;
  onUpdateForm: <K extends keyof InvestmentForm>(field: K, value: InvestmentForm[K]) => void;
}) {
  return (
    <>
      <BasicInvestmentFields form={form} open={openSections.basic} onToggle={() => onToggleSection('basic')} onUpdateForm={onUpdateForm} />
      <BranchInitialInvestmentSection form={form} onUpdateForm={onUpdateForm} />
      <ErpImportPanel
        form={form}
        onUpdateForm={onUpdateForm}
      />
      <CollapsibleSection title="Στόλος & Απόδοση" open={openSections.branchModel} onToggle={() => onToggleSection('branchModel')}>
        <BranchFleetSeasonSection form={form} onUpdateForm={onUpdateForm} />
      </CollapsibleSection>
      <BranchExtraCostsSection form={form} onUpdateForm={onUpdateForm} />
      <CollapsibleSection title="Ρυθμίσεις" open={openSections.settings} onToggle={() => onToggleSection('settings')}>
        <FieldGrid>
          <SelectField label="Απόκλιση Ευαισθησίας %" value={form.sensitivityDeviation} options={['10', '15', '20']} onChange={(value) => onUpdateForm('sensitivityDeviation', value)} />
          <SelectField label="Στόχος Περιθωρίου Κέρδους %" value={form.targetProfitMargin} options={['10', '15', '20', '25']} onChange={(value) => onUpdateForm('targetProfitMargin', value)} />
        </FieldGrid>
      </CollapsibleSection>
      <CollapsibleSection title="Ανάλυση Ρίσκου & Στρατηγικής Αξίας" open={openSections.riskStrategic} onToggle={() => onToggleSection('riskStrategic')}>
        <div className="grid gap-3 xl:grid-cols-2">
          <ScoreFieldGroup title="Ρίσκο" fields={riskFields} form={form} onUpdateForm={onUpdateForm} />
          <ScoreFieldGroup title="Στρατηγική Αξία" fields={strategicFields} form={form} onUpdateForm={onUpdateForm} />
        </div>
      </CollapsibleSection>
      <BranchCalculationSection analysis={analysis} />
    </>
  );
}

function InvestmentLibraryPage({
  drafts,
  onOpenDraft,
  onOpenReport,
  onDeleteDraft,
  onClearAll,
}: {
  drafts: InvestmentDraft[];
  onOpenDraft: (draft: InvestmentDraft) => void;
  onOpenReport: (draft: InvestmentDraft) => void;
  onDeleteDraft: (draftId: string) => void;
  onClearAll: () => void;
}) {
  const sortedDrafts = [...drafts].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-950">ΒΙΒΛΙΟΘΗΚΗ ΕΠΕΝΔΥΣΕΩΝ</h2>
          <p className="text-sm font-semibold text-slate-600">Εδώ θα εμφανίζονται οι αποθηκευμένες επενδύσεις.</p>
        </div>
        <button
          type="button"
          onClick={onClearAll}
          disabled={!drafts.length}
          className="h-9 rounded-xl border border-rose-200 bg-white px-3 text-sm font-black text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-white"
        >
          Καθαρισμός Όλων
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs font-black uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">Όνομα</th>
              <th className="px-3 py-2">Κατηγορία</th>
              <th className="px-3 py-2">ROI</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Ρίσκο</th>
              <th className="px-3 py-2">Στρατηγική Αξία</th>
              <th className="px-3 py-2">Απόφαση</th>
              <th className="px-3 py-2">Μηνιαίο Κέρδος</th>
              <th className="px-3 py-2">Ενημερώθηκε</th>
              <th className="px-3 py-2 text-right">Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
            {sortedDrafts.length ? (
              sortedDrafts.map((draft) => (
                <tr key={draft.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-black text-slate-900">{draft.name}</td>
                  <td className="px-3 py-2 font-semibold text-slate-700">{draft.category}</td>
                  <td className="px-3 py-2 font-black text-slate-900">{percent(draft.analysis.roi)}</td>
                  <td className="px-3 py-2 font-black text-slate-900">{draft.score}</td>
                  <td className="px-3 py-2 font-black text-rose-700">{percent(draft.analysis.riskScore100 || 0)}</td>
                  <td className="px-3 py-2 font-black text-emerald-700">{percent(draft.analysis.strategicScore100 || 0)}</td>
                  <td className="px-3 py-2 font-black text-slate-900">{draft.decision}</td>
                  <td className={`px-3 py-2 font-black ${draft.analysis.monthlyProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {money(draft.analysis.monthlyProfit)}
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-600">{formatDateTime(draft.updatedAt)}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => onOpenDraft(draft)} className="h-8 rounded-lg bg-sky-800 px-3 text-xs font-black text-white transition hover:bg-sky-900">
                        Άνοιγμα
                      </button>
                      <button type="button" onClick={() => onOpenReport(draft)} className="h-8 rounded-lg border border-sky-200 bg-sky-50 px-3 text-xs font-black text-sky-800 transition hover:bg-sky-100">
                        Αναφορά
                      </button>
                      <button type="button" onClick={() => onDeleteDraft(draft.id)} className="h-8 rounded-lg border border-rose-200 bg-white px-3 text-xs font-black text-rose-700 transition hover:bg-rose-50">
                        Διαγραφή
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-sm font-semibold text-slate-500">
                  Δεν υπάρχουν αποθηκευμένα πρόχειρα ακόμα.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function InvestmentReportsPage({ drafts }: { drafts: InvestmentDraft[] }) {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [decisionFilter, setDecisionFilter] = useState('all');
  const [minScore, setMinScore] = useState('');
  const [maxRisk, setMaxRisk] = useState('');

  const categoriesForFilter = Array.from(new Set(drafts.map((draft) => draft.category))).sort();
  const decisionsForFilter = Array.from(new Set(drafts.map((draft) => draft.decision))).sort();

  const filteredDrafts = drafts
    .filter((draft) => categoryFilter === 'all' || draft.category === categoryFilter)
    .filter((draft) => decisionFilter === 'all' || draft.decision === decisionFilter)
    .filter((draft) => !minScore || draft.score >= toNumber(minScore))
    .filter((draft) => !maxRisk || (draft.analysis.riskScore100 || 0) <= toNumber(maxRisk))
    .sort((a, b) => b.score - a.score);

  const bestInvestment = filteredDrafts[0];
  const worstInvestment = filteredDrafts[filteredDrafts.length - 1];
  const highestRoi = maxBy(filteredDrafts, (draft) => draft.analysis.roi);
  const fastestPayback = minBy(
    filteredDrafts.filter((draft) => draft.analysis.paybackMonths !== null),
    (draft) => draft.analysis.paybackMonths ?? Number.POSITIVE_INFINITY
  );
  const highestRisk = maxBy(filteredDrafts, (draft) => draft.analysis.riskScore100 || 0);
  const highestStrategic = maxBy(filteredDrafts, (draft) => draft.analysis.strategicScore100 || 0);
  const warnings = buildInvestmentWarnings(filteredDrafts);

  const exportJson = () => {
    const payload = filteredDrafts.map((draft) => ({
      id: draft.id,
      name: draft.name,
      category: draft.category,
      roi: draft.analysis.roi,
      monthlyProfit: draft.analysis.monthlyProfit,
      yearlyProfit: draft.analysis.yearlyProfit,
      paybackMonths: draft.analysis.paybackMonths,
      riskScore: draft.analysis.riskScore100,
      strategicValue: draft.analysis.strategicScore100,
      score: draft.score,
      decision: draft.decision,
      updatedAt: draft.updatedAt,
    }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `investment-report-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!drafts.length) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-black text-slate-950">ΑΝΑΦΟΡΕΣ ΕΠΕΝΔΥΣΕΩΝ</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">Δεν υπάρχουν αποθηκευμένες επενδύσεις για αναφορές.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-950">ΑΝΑΦΟΡΕΣ ΕΠΕΝΔΥΣΕΩΝ</h2>
          <p className="text-sm font-semibold text-slate-600">Σύγκριση ROI, Break-even, Payback και Risk από τοπικά πρόχειρα.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportJson} className="h-9 rounded-xl bg-sky-800 px-3 text-sm font-black text-white transition hover:bg-sky-900">
            Εξαγωγή JSON
          </button>
          <button type="button" onClick={() => window.print()} className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm font-black text-slate-800 transition hover:bg-slate-100">
            Εκτύπωση Αναφοράς
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <ReportSummaryCard label="Καλύτερη Επένδυση" value={bestInvestment?.name || '-'} detail={bestInvestment ? `${bestInvestment.score}/100` : '-'} />
        <ReportSummaryCard label="Χειρότερη Επένδυση" value={worstInvestment?.name || '-'} detail={worstInvestment ? `${worstInvestment.score}/100` : '-'} tone="danger" />
        <ReportSummaryCard label="Υψηλότερο ROI" value={highestRoi?.name || '-'} detail={highestRoi ? percent(highestRoi.analysis.roi) : '-'} tone="success" />
        <ReportSummaryCard label="Ταχύτερη Απόσβεση" value={fastestPayback?.name || '-'} detail={fastestPayback ? formatPayback(fastestPayback.analysis.paybackMonths) : '-'} />
        <ReportSummaryCard label="Υψηλότερο Ρίσκο" value={highestRisk?.name || '-'} detail={highestRisk ? percent(highestRisk.analysis.riskScore100 || 0) : '-'} tone="danger" />
        <ReportSummaryCard label="Υψηλότερη Στρατηγική Αξία" value={highestStrategic?.name || '-'} detail={highestStrategic ? percent(highestStrategic.analysis.strategicScore100 || 0) : '-'} tone="success" />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h3 className="text-base font-black text-slate-950">ΣΥΓΚΡΙΣΗ ΕΠΕΝΔΥΣΕΩΝ</h3>
            <p className="text-xs font-semibold text-slate-500">Προεπιλεγμένη ταξινόμηση: Score φθίνουσα.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <SelectFilter label="Κατηγορία" value={categoryFilter} options={['all', ...categoriesForFilter]} onChange={setCategoryFilter} allLabel="Όλες" />
            <SelectFilter label="Απόφαση" value={decisionFilter} options={['all', ...decisionsForFilter]} onChange={setDecisionFilter} allLabel="Όλες" />
            <NumberFilter label="Ελάχιστο Score" value={minScore} onChange={setMinScore} />
            <NumberFilter label="Μέγιστο Ρίσκο" value={maxRisk} onChange={setMaxRisk} />
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs font-black uppercase text-slate-600">
              <tr>
                <th className="px-3 py-2">Όνομα</th>
                <th className="px-3 py-2">Κατηγορία</th>
                <th className="px-3 py-2">ROI</th>
                <th className="px-3 py-2">Μηνιαίο Κέρδος</th>
                <th className="px-3 py-2">Ετήσιο Κέρδος</th>
                <th className="px-3 py-2">Απόσβεση</th>
                <th className="px-3 py-2">Ρίσκο</th>
                <th className="px-3 py-2">Στρατηγική Αξία</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Απόφαση</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrafts.length ? (
                filteredDrafts.map((draft) => (
                  <tr key={draft.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-black text-slate-900">{draft.name}</td>
                    <td className="px-3 py-2 font-semibold text-slate-700">{draft.category}</td>
                    <td className="px-3 py-2 font-black text-slate-900">{percent(draft.analysis.roi)}</td>
                    <td className={`px-3 py-2 font-black ${draft.analysis.monthlyProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{money(draft.analysis.monthlyProfit)}</td>
                    <td className={`px-3 py-2 font-black ${draft.analysis.yearlyProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{money(draft.analysis.yearlyProfit)}</td>
                    <td className="px-3 py-2 font-semibold text-slate-700">{formatPayback(draft.analysis.paybackMonths)}</td>
                    <td className="px-3 py-2 font-black text-rose-700">{percent(draft.analysis.riskScore100 || 0)}</td>
                    <td className="px-3 py-2 font-black text-emerald-700">{percent(draft.analysis.strategicScore100 || 0)}</td>
                    <td className="px-3 py-2 font-black text-slate-900">{draft.score}</td>
                    <td className="px-3 py-2 font-black text-slate-900">{draft.decision}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-sm font-semibold text-slate-500">
                    Δεν βρέθηκαν επενδύσεις με τα επιλεγμένα φίλτρα.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-black text-slate-950">ΚΑΤΑΤΑΞΗ ΕΠΕΝΔΥΣΕΩΝ</h3>
          <div className="mt-3 space-y-2">
            {filteredDrafts.slice(0, 5).map((draft, index) => (
              <div key={draft.id} className="grid grid-cols-[42px_minmax(0,1fr)_80px_90px_minmax(140px,auto)] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-sky-800 text-sm font-black text-white">{index + 1}</span>
                <span className="truncate font-black text-slate-900">{draft.name}</span>
                <span className="font-black text-slate-900">{draft.score}</span>
                <span className="font-black text-slate-900">{percent(draft.analysis.roi)}</span>
                <span className="text-sm font-black text-slate-700">{draft.decision}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-black text-slate-950">ΠΡΟΕΙΔΟΠΟΙΗΣΕΙΣ</h3>
          <div className="mt-3 space-y-2">
            {warnings.length ? (
              warnings.map((warning) => (
                <div key={`${warning.draftId}-${warning.message}`} className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="text-sm font-black text-amber-900">{warning.message}</p>
                  <p className="text-xs font-semibold text-amber-800">{warning.name}</p>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-4 text-sm font-black text-emerald-800">
                Δεν υπάρχουν προειδοποιήσεις για τα επιλεγμένα φίλτρα.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function SingleInvestmentReportPage({
  draft,
  onBack,
}: {
  draft?: InvestmentDraft;
  onBack: () => void;
}) {
  if (!draft) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-black text-slate-950">ΑΝΑΦΟΡΑ ΕΠΕΝΔΥΣΗΣ</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">Δεν επιλέχθηκε επένδυση για αναφορά.</p>
        <button type="button" onClick={onBack} className="mt-4 h-9 rounded-xl bg-sky-800 px-4 text-sm font-black text-white transition hover:bg-sky-900">
          Πίσω στη Βιβλιοθήκη
        </button>
      </section>
    );
  }

  const { analysis, form } = draft;
  const executiveCards = [
    ['Συνολική Αρχική Επένδυση', money(analysis.totalInitialInvestment), 'neutral'],
    ['Μηνιαία Έσοδα', money(analysis.monthlyRevenue), 'success'],
    ['Μηνιαία Έξοδα', money(analysis.totalMonthlyCosts), 'danger'],
    ['Μηνιαίο Κέρδος', money(analysis.monthlyProfit), analysis.monthlyProfit >= 0 ? 'success' : 'danger'],
    ['Ετήσιο Κέρδος', money(analysis.yearlyProfit), analysis.yearlyProfit >= 0 ? 'success' : 'danger'],
    ['ROI', percent(analysis.roi), 'neutral'],
    ['Απόσβεση', formatPayback(analysis.paybackMonths), 'neutral'],
    ['Break-even Κρατήσεις', numberText(analysis.breakEvenBookings), 'neutral'],
    ['Ρίσκο', percent(analysis.riskScore100 || 0), 'danger'],
    ['Στρατηγική Αξία', percent(analysis.strategicScore100 || 0), 'success'],
    ['Investment Score', `${draft.score}/100`, 'neutral'],
    ['Απόφαση', draft.decision, analysis.decisionTone === 'success' ? 'success' : analysis.decisionTone === 'danger' ? 'danger' : 'neutral'],
  ] as const;

  return (
    <section className="investment-report-print space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .investment-report-print, .investment-report-print * { visibility: visible !important; }
          .investment-report-print { position: absolute; inset: 0 auto auto 0; width: 100%; border: 0 !important; box-shadow: none !important; background: #fff !important; }
          .investment-report-actions { display: none !important; }
          .investment-report-avoid-break { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div className="investment-report-actions flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">ΑΝΑΦΟΡΑ ΕΠΕΝΔΥΣΗΣ</h2>
          <p className="text-sm font-semibold text-slate-600">Αναλυτική εικόνα από τοπικό πρόχειρο επένδυσης.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onBack} className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm font-black text-slate-800 transition hover:bg-slate-100">
            Πίσω στη Βιβλιοθήκη
          </button>
          <button type="button" onClick={() => window.print()} className="h-9 rounded-xl bg-sky-800 px-3 text-sm font-black text-white transition hover:bg-sky-900">
            Εκτύπωση / PDF
          </button>
        </div>
      </div>

      <div className="investment-report-avoid-break rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <ReportInfo label="Όνομα" value={draft.name} />
          <ReportInfo label="Κατηγορία" value={draft.category} />
          <ReportInfo label="Ημερομηνία δημιουργίας" value={formatDateTime(draft.createdAt)} />
          <ReportInfo label="Τελευταία ενημέρωση" value={formatDateTime(draft.updatedAt)} />
          <ReportInfo label="Περιγραφή" value={draft.description || '-'} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        {executiveCards.map(([label, value, tone]) => (
          <ReportSummaryCard key={label} label={label} value={value} detail="" tone={tone} />
        ))}
      </div>

      <ReportSection title="ΟΙΚΟΝΟΜΙΚΗ ΑΝΑΛΥΣΗ">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <ReportMetric label="Total initial investment" value={money(analysis.totalInitialInvestment)} />
          <ReportMetric label="Total monthly costs" value={money(analysis.totalMonthlyCosts)} />
          <ReportMetric label="Monthly revenue" value={money(analysis.monthlyRevenue)} />
          <ReportMetric label="Monthly profit" value={money(analysis.monthlyProfit)} />
          <ReportMetric label="Yearly profit" value={money(analysis.yearlyProfit)} />
          <ReportMetric label="ROI" value={percent(analysis.roi)} />
          <ReportMetric label="Break-even bookings" value={numberText(analysis.breakEvenBookings)} />
          <ReportMetric label="Payback period" value={formatPayback(analysis.paybackMonths)} />
        </div>
      </ReportSection>

      <ReportSection title="ΑΝΑΛΥΣΗ ΕΥΑΙΣΘΗΣΙΑΣ">
        <div className="grid gap-3 xl:grid-cols-3">
          {analysis.scenarios.map((scenario) => (
            <ScenarioCard key={scenario.label} scenario={scenario} />
          ))}
        </div>
      </ReportSection>

      <ReportSection title="ΡΙΣΚΟ & ΣΤΡΑΤΗΓΙΚΗ ΑΞΙΑ">
        <div className="grid gap-3 xl:grid-cols-2">
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3">
            <h4 className="text-sm font-black uppercase text-rose-900">Risk Score: {percent(analysis.riskScore100 || 0)}</h4>
            <div className="mt-2 space-y-1">
              {riskFields.map(({ field, label }) => (
                <ReportScaleRow key={String(field)} label={label} value={String(form[field] || '0')} />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
            <h4 className="text-sm font-black uppercase text-emerald-900">Strategic Value: {percent(analysis.strategicScore100 || 0)}</h4>
            <div className="mt-2 space-y-1">
              {strategicFields.map(({ field, label }) => (
                <ReportScaleRow key={String(field)} label={label} value={String(form[field] || '0')} />
              ))}
            </div>
          </div>
        </div>
      </ReportSection>

      <ReportSection title="ΣΥΜΠΕΡΑΣΜΑ">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-black text-slate-950">{draft.decision}</p>
              <p className="text-sm font-semibold text-slate-600">{analysis.decisionExplanation}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-2 text-center shadow-sm">
              <p className="text-[10px] font-black uppercase text-slate-500">Investment Score</p>
              <p className="text-2xl font-black text-slate-950">{draft.score}</p>
            </div>
          </div>
          <ul className="mt-3 space-y-1 text-sm font-bold text-slate-700">
            {analysis.decisionReasons.map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
        </div>
      </ReportSection>
    </section>
  );
}

function ResultsRail({ analysis }: { analysis: InvestmentAnalysis }) {
  const branchMetrics = analysis.branchMetrics;

  return (
    <aside className="sticky top-4 min-w-0 w-full space-y-2.5 overflow-visible">
      <DecisionCard
        decision={analysis.decision}
        explanation={analysis.decisionExplanation}
        reasons={analysis.decisionReasons}
        tone={analysis.decisionTone}
        score={analysis.investmentScore}
      />
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {branchMetrics ? (
          <>
            <ResultCard label="Αρχική Επένδυση" value={money(analysis.totalInitialInvestment)} />
            <ResultCard label="Έσοδα Σεζόν" value={money(branchMetrics.seasonRevenue)} tone="income" />
            <ResultCard label="Συνολικά Έξοδα Σεζόν" value={money(branchMetrics.seasonCosts)} tone="expense" />
            <ResultCard label="Κέρδος Σεζόν" value={money(branchMetrics.seasonProfit)} tone={branchMetrics.seasonProfit >= 0 ? 'income' : 'danger'} />
            <ResultCard label="Μηνιαίο Κέρδος Σεζόν" value={money(analysis.monthlyProfit)} tone={analysis.monthlyProfit >= 0 ? 'income' : 'danger'} />
            <ResultCard label="ROI" value={percent(analysis.roi)} />
            <ResultCard label="Break-even μέρες / όχημα" value={numberText(branchMetrics.breakEvenRentalDaysPerVehicle)} />
            <ResultCard label="Χρόνος Απόσβεσης" value={formatPayback(analysis.paybackMonths)} />
            <ResultCard label="Investment Score" value={`${analysis.investmentScore}/100`} />
          </>
        ) : (
          <>
            <ResultCard label="Συνολική Αρχική Επένδυση" value={money(analysis.totalInitialInvestment)} />
            <ResultCard label="Μηνιαία Έσοδα" value={money(analysis.monthlyRevenue)} tone="income" />
            <ResultCard label="Μηνιαία Έξοδα" value={money(analysis.totalMonthlyCosts)} tone="expense" />
            <ResultCard label="Μηνιαίο Κέρδος" value={money(analysis.monthlyProfit)} tone={analysis.monthlyProfit >= 0 ? 'income' : 'danger'} />
            <ResultCard label="Ετήσιο Κέρδος" value={money(analysis.yearlyProfit)} tone={analysis.yearlyProfit >= 0 ? 'income' : 'danger'} />
            <ResultCard label="ROI" value={percent(analysis.roi)} />
            <ResultCard label="Κρατήσεις Break-even" value={numberText(analysis.breakEvenBookings)} />
            <ResultCard label="Χρόνος Απόσβεσης" value={formatPayback(analysis.paybackMonths)} />
            <ResultCard label="Βαθμός Ρίσκου" value={percent(analysis.riskScore100)} tone={analysis.riskScore100 >= 75 ? 'danger' : 'warning'} />
            <ResultCard label="Στρατηγική Αξία" value={percent(analysis.strategicScore100)} tone="income" />
          </>
        )}
      </div>
    </aside>
  );
}

function ReportSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="investment-report-avoid-break rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-slate-700">{title}</h3>
      {children}
    </section>
  );
}

function ReportInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-base font-black text-slate-950">{value}</p>
    </div>
  );
}

function ReportScaleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white/80 px-3 py-1.5 text-sm">
      <span className="font-bold text-slate-700">{label}</span>
      <span className="font-black text-slate-950">{value}/10</span>
    </div>
  );
}

function maxBy<T>(items: T[], getValue: (item: T) => number) {
  return items.reduce<T | undefined>((best, item) => {
    if (!best) return item;
    return getValue(item) > getValue(best) ? item : best;
  }, undefined);
}

function minBy<T>(items: T[], getValue: (item: T) => number) {
  return items.reduce<T | undefined>((best, item) => {
    if (!best) return item;
    return getValue(item) < getValue(best) ? item : best;
  }, undefined);
}

function buildInvestmentWarnings(drafts: InvestmentDraft[]) {
  return drafts.flatMap((draft) => {
    const targetProfitMargin = toNumber(draft.form.targetProfitMargin);
    const warnings: Array<{ draftId: string; name: string; message: string }> = [];

    if (draft.analysis.monthlyProfit <= 0) {
      warnings.push({ draftId: draft.id, name: draft.name, message: 'Αρνητικό ή μηδενικό μηνιαίο κέρδος' });
    }
    if (draft.analysis.paybackMonths !== null && draft.analysis.paybackMonths > 36) {
      warnings.push({ draftId: draft.id, name: draft.name, message: 'Αργή απόσβεση πάνω από 36 μήνες' });
    }
    if ((draft.analysis.riskScore100 || 0) >= 75) {
      warnings.push({ draftId: draft.id, name: draft.name, message: 'Πολύ υψηλό ρίσκο' });
    }
    if (targetProfitMargin > 0 && draft.analysis.roi < targetProfitMargin) {
      warnings.push({ draftId: draft.id, name: draft.name, message: 'ROI κάτω από τον στόχο' });
    }

    return warnings;
  });
}

function ReportSummaryCard({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  detail: string;
  tone?: 'neutral' | 'success' | 'danger';
}) {
  const toneClass = tone === 'success' ? 'text-emerald-700' : tone === 'danger' ? 'text-rose-700' : 'text-slate-950';
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-base font-black ${toneClass}`}>{value}</p>
      <p className="mt-1 text-sm font-black text-slate-600">{detail}</p>
    </div>
  );
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
  allLabel,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  allLabel: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === 'all' ? allLabel : option}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberFilter({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-600">{label}</span>
      <input
        type="number"
        min="0"
        max="100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
      />
    </label>
  );
}

function PlaceholderPage({ title, text }: { title: string; text: string }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700">Phase 1</p>
      <h2 className="mt-2 text-xl font-black text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold text-slate-600">
        {text}
      </p>
    </section>
  );
}

function ScoreFieldGroup({
  title,
  fields,
  form,
  onUpdateForm,
}: {
  title: string;
  fields: Array<{ field: keyof InvestmentForm; label: string }>;
  form: InvestmentForm;
  onUpdateForm: <K extends keyof InvestmentForm>(field: K, value: InvestmentForm[K]) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <h3 className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-700">{title}</h3>
      <div className="space-y-2">
        {fields.map(({ field, label }) => (
          <label key={String(field)} className="grid grid-cols-[minmax(0,1fr)_78px] items-center gap-3">
            <span className="text-sm font-bold text-slate-700">{label}</span>
            <select
              value={String(form[field] || '0')}
              onChange={(event) => onUpdateForm(field, event.target.value as InvestmentForm[typeof field])}
              className="h-9 rounded-xl border border-slate-300 bg-white px-2 text-sm font-black text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            >
              {scoreOptions.map((option) => (
                <option key={option} value={option}>
                  {option}/10
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}

function ErpImportPanel({
  form,
  onUpdateForm,
}: {
  form: InvestmentForm;
  onUpdateForm: <K extends keyof InvestmentForm>(field: K, value: InvestmentForm[K]) => void;
}) {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseSourceLoading, setExpenseSourceLoading] = useState(false);
  const [expenseSourceError, setExpenseSourceError] = useState('');
  const [filters, setFilters] = useState<ExpenseImportFilters>({ fromDate: '', toDate: '', category: '', search: '' });
  const expenseCategories = Array.from(new Set(form.erpImportedSharedExpenses.map((expense) => expense.category))).sort((left, right) => left.localeCompare(right, 'el'));
  const allCategoryTotals = buildExpenseCategoryTotals(form.erpImportedSharedExpenses);
  const filteredExpenses = form.erpImportedSharedExpenses.filter((expense) => {
    const matchesFrom = !filters.fromDate || expense.date >= filters.fromDate;
    const matchesTo = !filters.toDate || expense.date <= filters.toDate;
    const matchesCategory = !filters.category || expense.category === filters.category;
    const search = filters.search.trim().toLowerCase();
    const matchesSearch =
      !search ||
      expense.category.toLowerCase().includes(search) ||
      expense.description.toLowerCase().includes(search) ||
      expense.date.toLowerCase().includes(search);
    return matchesFrom && matchesTo && matchesCategory && matchesSearch;
  });
  const categoryTotals = buildExpenseCategoryTotals(filteredExpenses);
  const selectedCategoryTotals = categoryTotals.filter((expense) => form.selectedErpSharedExpenseIds.includes(expense.expenseId));

  const importSharedExpenses = async () => {
    setIsExpenseModalOpen(true);
    setExpenseSourceLoading(true);
    setExpenseSourceError('');
    const { expenses, error } = await loadSharedExpensesFromReportsExpenses();
    const availableCategoryIds = new Set(buildExpenseCategoryTotals(expenses).map((expense) => expense.expenseId));
    const selectedFromSavedRows = form.branchSharedExpenses
      .map((expense) => expense.id)
      .filter((id) => availableCategoryIds.has(id));
    const selectedFromCurrentState = form.selectedErpSharedExpenseIds.filter((id) => availableCategoryIds.has(id));
    const nextSelectedIds = Array.from(new Set([...selectedFromCurrentState, ...selectedFromSavedRows]));
    onUpdateForm('erpImportedSharedExpenses', expenses);
    onUpdateForm('selectedErpSharedExpenseIds', nextSelectedIds);
    onUpdateForm(
      'erpSharedExpenseAllocations',
      expenses.reduce<Record<string, string>>((allocations, expense) => {
        const categoryId = createExpenseCategoryId(expense.category);
        allocations[categoryId] = form.erpSharedExpenseAllocations[categoryId] || '100';
        return allocations;
      }, { ...form.erpSharedExpenseAllocations })
    );
    onUpdateForm('erpAppliedSharedExpenses', false);
    setExpenseSourceLoading(false);
    setExpenseSourceError(error || (expenses.length ? '' : 'Δεν βρέθηκε πηγή εξόδων από Αναφορές > Έξοδα.'));
  };

  const buildSelectedSharedExpenseRows = (allocations: Record<string, string>, selectedIds = form.selectedErpSharedExpenseIds) =>
    categoryTotals.filter((expense) => selectedIds.includes(expense.expenseId)).map((expense) => ({
      id: expense.expenseId,
      category: expense.category,
      description: expense.category,
      amount: String(expense.total),
      allocationPercent: allocations[expense.expenseId] || '100',
    }));

  const updateSharedAllocation = (expenseId: string, value: string) => {
    const nextAllocations = { ...form.erpSharedExpenseAllocations, [expenseId]: value };
    onUpdateForm('erpSharedExpenseAllocations', nextAllocations);
    if (form.erpAppliedSharedExpenses) {
      onUpdateForm('branchSharedExpenses', buildSelectedSharedExpenseRows(nextAllocations));
    }
  };

  const toggleSharedExpense = (expenseId: string) => {
    const current = form.selectedErpSharedExpenseIds;
    const nextSelectedIds = current.includes(expenseId) ? current.filter((item) => item !== expenseId) : [...current, expenseId];
    onUpdateForm('selectedErpSharedExpenseIds', nextSelectedIds);
    if (form.erpAppliedSharedExpenses) {
      onUpdateForm('branchSharedExpenses', buildSelectedSharedExpenseRows(form.erpSharedExpenseAllocations, nextSelectedIds));
    }
  };

  const applySelectedSharedExpenses = () => {
    onUpdateForm('branchSharedExpenses', buildSelectedSharedExpenseRows(form.erpSharedExpenseAllocations));
    onUpdateForm('erpAppliedSharedExpenses', true);
    setIsExpenseModalOpen(false);
  };
  const selectedCalculatedTotal = selectedCategoryTotals.reduce(
    (sum, expense) => sum + expense.total * (toNumber(form.erpSharedExpenseAllocations[expense.expenseId] || '100') / 100),
    0
  );
  const seasonMonths = toNumber(form.branchSeasonMonths);
  const selectedCalculatedMonthly = seasonMonths > 0 ? selectedCalculatedTotal / seasonMonths : 0;

  return (
    <CollapsibleSection title="Σύνδεση με ERP" open onToggle={() => undefined}>
      <div className="space-y-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <h3 className="text-sm font-black uppercase tracking-[0.14em] text-amber-900">Σύνδεση με ERP</h3>
          <p className="mt-1 text-sm font-semibold text-amber-900">
            Το Investment Decision διαβάζει δεδομένα μόνο για προσομοίωση. Δεν τροποποιεί ποτέ πραγματικά δεδομένα.
          </p>
          <p className="mt-2 text-xs font-black text-amber-900">
            Τα δεδομένα χρησιμοποιούνται μόνο για προσομοίωση. Το ERP δεν τροποποιείται.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <ErpImportButton label="Εισαγωγή Κοινών Εξόδων" onClick={importSharedExpenses} />
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <ErpImportSummaryCard title="Κοινά Έξοδα" primary={`${allCategoryTotals.length} κατηγορίες`} lines={[form.erpImportedSharedExpenses.length ? money(allCategoryTotals.reduce((sum, item) => sum + item.total, 0)) + ' σύνολο περιόδου' : 'Δεν έγινε εισαγωγή']} />
          <ErpImportSummaryCard
            title="Επιλεγμένα"
            primary={`${form.selectedErpSharedExpenseIds.length} κατηγορίες`}
            lines={[
              `Υπολογιζόμενο / σεζόν: ${money(selectedCalculatedTotal)}`,
              `Υπολογιζόμενο / μήνα: ${money(selectedCalculatedMonthly)}`,
              `Υπολογιζόμενο / έτος: ${money(selectedCalculatedTotal)}`,
              form.erpAppliedSharedExpenses ? 'Εφαρμόστηκαν στον υπολογισμό' : 'Δεν εφαρμόστηκαν ακόμα',
            ]}
          />
        </div>

        <ErpStatusBadges
          imported={form.erpImportedSharedExpenses.length}
          selected={form.selectedErpSharedExpenseIds.length}
          applied={form.erpAppliedSharedExpenses}
        />

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900">
          Τα δεδομένα είναι read-only και χρησιμοποιούνται μόνο για προσομοίωση.
        </div>

        {expenseSourceError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-800">
            {expenseSourceError}
          </div>
        )}

        {isExpenseModalOpen && (
          <ErpExpenseImportModal
            expenses={categoryTotals}
            categories={expenseCategories}
            filters={filters}
            loading={expenseSourceLoading}
            error={expenseSourceError}
            selectedIds={form.selectedErpSharedExpenseIds}
            allocations={form.erpSharedExpenseAllocations}
            selectedTotal={selectedCalculatedTotal}
            onFilterChange={(field, value) => setFilters((current) => ({ ...current, [field]: value }))}
            onToggle={toggleSharedExpense}
            onAllocationChange={updateSharedAllocation}
            onApply={applySelectedSharedExpenses}
            onClose={() => setIsExpenseModalOpen(false)}
          />
        )}
      </div>
    </CollapsibleSection>
  );
}

function ErpStatusBadges({ imported, selected, applied }: { imported: number; selected: number; applied: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <ErpStatusBadge label="Εισήχθησαν" value={String(imported)} active={imported > 0} />
      <ErpStatusBadge label="Επιλέχθηκαν" value={String(selected)} active={selected > 0} />
      <ErpStatusBadge label="Εφαρμόστηκαν" value={applied ? 'Ναι' : 'Όχι'} active={applied} />
    </div>
  );
}

function ErpStatusBadge({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
      {label}
      <span>{value}</span>
    </span>
  );
}

function ErpExpenseImportModal({
  expenses,
  categories,
  filters,
  loading,
  error,
  selectedIds,
  allocations,
  selectedTotal,
  onFilterChange,
  onToggle,
  onAllocationChange,
  onApply,
  onClose,
}: {
  expenses: ErpExpenseCategoryTotal[];
  categories: string[];
  filters: ExpenseImportFilters;
  loading: boolean;
  error: string;
  selectedIds: string[];
  allocations: Record<string, string>;
  selectedTotal: number;
  onFilterChange: (field: keyof ExpenseImportFilters, value: string) => void;
  onToggle: (id: string) => void;
  onAllocationChange: (id: string, value: string) => void;
  onApply: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-black uppercase tracking-[0.14em] text-slate-950">Εισαγωγή Κοινών Εξόδων</h3>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Πηγή: Οικονομικά → Αναφορές → Έξοδα. Εμφανίζονται σύνολα ανά κατηγορία για την επιλεγμένη περίοδο.
            </p>
          </div>
          <button type="button" onClick={onClose} className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">
            Κλείσιμο
          </button>
        </div>

        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black text-amber-900">
          Τα δεδομένα είναι read-only και χρησιμοποιούνται μόνο για προσομοίωση.
        </div>
        <div className="border-b border-sky-100 bg-sky-50 px-4 py-2 text-xs font-bold text-sky-900">
          Τα ποσά προέρχονται από τα σύνολα της επιλεγμένης περιόδου στις Αναφορές → Έξοδα. Στις εισαγόμενες κατηγορίες, το “έτος” σημαίνει περίοδος φίλτρου.
        </div>

        <div className="grid gap-2 border-b border-slate-200 p-4 md:grid-cols-4">
          <label className="text-xs font-black uppercase tracking-wide text-slate-600">
            Από ημερομηνία
            <input type="date" value={filters.fromDate} onChange={(event) => onFilterChange('fromDate', event.target.value)} className="mt-1 h-9 w-full rounded-xl border border-slate-300 px-2 text-sm font-bold text-slate-900" />
          </label>
          <label className="text-xs font-black uppercase tracking-wide text-slate-600">
            Έως ημερομηνία
            <input type="date" value={filters.toDate} onChange={(event) => onFilterChange('toDate', event.target.value)} className="mt-1 h-9 w-full rounded-xl border border-slate-300 px-2 text-sm font-bold text-slate-900" />
          </label>
          <label className="text-xs font-black uppercase tracking-wide text-slate-600">
            Κατηγορία
            <select value={filters.category} onChange={(event) => onFilterChange('category', event.target.value)} className="mt-1 h-9 w-full rounded-xl border border-slate-300 bg-white px-2 text-sm font-bold text-slate-900">
              <option value="">Όλες</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-black uppercase tracking-wide text-slate-600">
            Αναζήτηση
            <input type="search" value={filters.search} onChange={(event) => onFilterChange('search', event.target.value)} className="mt-1 h-9 w-full rounded-xl border border-slate-300 px-2 text-sm font-bold text-slate-900" placeholder="Κατηγορία ή περιγραφή" />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {loading && <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-700">Φόρτωση εξόδων...</p>}
          {!loading && error && <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-800">{error}</p>}
          {!loading && !error && expenses.length === 0 && <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-700">Δεν βρέθηκαν έξοδα με τα τρέχοντα φίλτρα.</p>}
          {!loading && !error && expenses.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[920px] text-left text-xs">
                <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-2 py-2">Επιλογή</th>
                    <th className="px-2 py-2">Κατηγορία</th>
                    <th className="px-2 py-2 text-right">Σύνολο Περιόδου</th>
                    <th className="px-2 py-2">Ποσοστό Επιβάρυνσης %</th>
                    <th className="px-2 py-2 text-right">Υπολογιζόμενο Ποσό</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => {
                    const allocation = allocations[expense.expenseId] || '100';
                    const calculated = expense.total * (toNumber(allocation) / 100);
                    return (
                      <tr key={expense.expenseId} className="border-t border-slate-100 bg-white">
                        <td className="px-2 py-2">
                          <input type="checkbox" checked={selectedIds.includes(expense.expenseId)} onChange={() => onToggle(expense.expenseId)} />
                        </td>
                        <td className="px-2 py-2 font-black text-slate-900">{expense.category}</td>
                        <td className="px-2 py-2 text-right font-black text-slate-900">{money(expense.total)}</td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={allocation}
                            onChange={(event) => onAllocationChange(expense.expenseId, event.target.value)}
                            className="h-8 w-24 rounded-lg border border-slate-300 px-2 text-xs font-black text-slate-900"
                          />
                        </td>
                        <td className="px-2 py-2 text-right font-black text-slate-900">{money(calculated)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-black text-slate-800">
            Επιλεγμένα: {selectedIds.length} • Υπολογιζόμενο σύνολο: {money(selectedTotal)}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm font-black text-slate-700 transition hover:bg-slate-100">
              Άκυρο
            </button>
            <button
              type="button"
              onClick={onApply}
              disabled={!selectedIds.length}
              className="h-9 rounded-xl bg-sky-800 px-3 text-sm font-black text-white transition hover:bg-sky-900 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Χρήση Επιλεγμένων Εξόδων
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErpImportButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-slate-200 bg-white p-3 text-left text-sm font-black text-slate-800 shadow-sm transition hover:border-sky-300 hover:bg-sky-50"
    >
      {label}
      <span className="mt-1 block text-xs font-semibold text-slate-500">Ανάγνωση από Αναφορές → Έξοδα</span>
    </button>
  );
}

function ErpImportSummaryCard({ title, primary, lines }: { title: string; primary: string; lines: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{primary}</p>
      <div className="mt-2 space-y-0.5">
        {lines.map((line) => (
          <p key={line} className="text-xs font-semibold text-slate-600">{line}</p>
        ))}
      </div>
    </div>
  );
}

function BranchFleetSeasonSection({
  form,
  onUpdateForm,
}: {
  form: InvestmentForm;
  onUpdateForm: <K extends keyof InvestmentForm>(field: K, value: InvestmentForm[K]) => void;
}) {
  const vehicles = toNumber(form.branchTransferredVehicles);
  const totalRentalDays = vehicles * toNumber(form.branchAverageRentalDaysPerVehicle);
  const seasonRevenue = totalRentalDays * toNumber(form.branchAverageDailyRate);
  const seasonMonths = toNumber(form.branchSeasonMonths);
  const branchMetrics = calculateBranchMetrics(form);

  return (
    <div className="space-y-3">
      <FieldGrid>
        <NumberField label="Αριθμός οχημάτων" value={form.branchTransferredVehicles} onChange={(value) => onUpdateForm('branchTransferredVehicles', value)} />
        <NumberField label="Μήνες λειτουργίας σεζόν" value={form.branchSeasonMonths} onChange={(value) => onUpdateForm('branchSeasonMonths', value)} />
        <NumberField label="Ημέρες λειτουργίας σεζόν" value={form.branchSeasonOperatingDays} onChange={(value) => onUpdateForm('branchSeasonOperatingDays', value)} />
        <NumberField
          label="Συνολικές μέρες που θα δουλέψει κάθε όχημα στη σεζόν"
          helperText="Παράδειγμα: αν κάθε όχημα δουλέψει περίπου 150 μέρες μέσα στη σεζόν, γράψε 150, όχι 7."
          value={form.branchAverageRentalDaysPerVehicle}
          onChange={(value) => onUpdateForm('branchAverageRentalDaysPerVehicle', value)}
        />
        <NumberField label="Μέση ημερήσια τιμή" value={form.branchAverageDailyRate} onChange={(value) => onUpdateForm('branchAverageDailyRate', value)} />
        <NumberField label="Πληρότητα στόλου %" value={form.branchFleetOccupancy} onChange={(value) => onUpdateForm('branchFleetOccupancy', value)} />
      </FieldGrid>
      <BranchSummaryCard
        title="Σύνοψη Απόδοσης"
        items={[
          ['Συνολικές ημέρες ενοικίασης', numberText(totalRentalDays)],
          ['Έσοδα σεζόν', money(seasonRevenue)],
          ['Μηνιαία έσοδα σεζόν', money(seasonMonths > 0 ? seasonRevenue / seasonMonths : 0)],
          ['Έσοδα / όχημα', money(vehicles > 0 ? seasonRevenue / vehicles : 0)],
          ['Κέρδος σεζόν', money(branchMetrics.seasonProfit)],
          ['Κέρδος / όχημα', money(vehicles > 0 ? branchMetrics.seasonProfit / vehicles : 0)],
        ]}
      />
    </div>
  );
}

function BranchExtraCostsSection({
  form,
  onUpdateForm,
}: {
  form: InvestmentForm;
  onUpdateForm: <K extends keyof InvestmentForm>(field: K, value: InvestmentForm[K]) => void;
}) {
  const updateExtraExpense = (id: string, field: keyof BranchExtraExpense, value: string) => {
    onUpdateForm(
      'branchExtraExpenses',
      form.branchExtraExpenses.map((expense) => (expense.id === id ? { ...expense, [field]: value } : expense))
    );
  };
  const addExtraExpense = () => {
    onUpdateForm('branchExtraExpenses', [
      ...form.branchExtraExpenses,
      { id: createDraftId(), description: '', monthlyAmount: '' },
    ]);
  };
  const deleteExtraExpense = (id: string) => {
    onUpdateForm('branchExtraExpenses', form.branchExtraExpenses.filter((expense) => expense.id !== id));
  };
  const seasonMonths = toNumber(form.branchSeasonMonths);
  const newExpensesMonthly = form.branchExtraExpenses.reduce((sum, expense) => sum + toNumber(expense.monthlyAmount), 0);

  return (
    <CollapsibleSection title="Νέα Επιπλέον Έξοδα" open onToggle={() => undefined}>
      <div className="space-y-2">
        <div className="hidden grid-cols-[minmax(180px,1fr)_160px_36px] gap-2 px-2 text-[10px] font-black uppercase tracking-wide text-slate-500 md:grid">
          <span>Περιγραφή εξόδου</span>
          <span>Μηνιαίο ποσό</span>
          <span />
        </div>
        {form.branchExtraExpenses.map((expense) => (
          <div key={expense.id} className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 md:grid-cols-[minmax(180px,1fr)_160px_36px] md:items-end">
            <TextField label="Περιγραφή εξόδου" value={expense.description} onChange={(value) => updateExtraExpense(expense.id, 'description', value)} />
            <NumberField label="Μηνιαίο ποσό" value={expense.monthlyAmount} onChange={(value) => updateExtraExpense(expense.id, 'monthlyAmount', value)} />
            <button type="button" onClick={() => deleteExtraExpense(expense.id)} className="h-9 rounded-xl border border-rose-200 bg-white text-sm font-black text-rose-700 transition hover:bg-rose-50">
              ×
            </button>
          </div>
        ))}
        <button type="button" onClick={addExtraExpense} className="h-9 rounded-xl border border-sky-200 bg-sky-50 px-3 text-sm font-black text-sky-800 transition hover:bg-sky-100">
          + Προσθήκη νέου εξόδου
        </button>
        <BranchSummaryCard
          title="Σύνοψη Νέων Εξόδων"
          items={[
            ['Νέα έξοδα / μήνα', money(newExpensesMonthly)],
            ['Νέα έξοδα / σεζόν', money(newExpensesMonthly * seasonMonths)],
            ['Νέα έξοδα / έτος', money(newExpensesMonthly * 12)],
          ]}
          note="Τα νέα μηνιαία έξοδα υπολογίζονται για τους μήνες λειτουργίας της σεζόν. Το ετήσιο ποσό εμφανίζεται μόνο ως σύγκριση."
        />
      </div>
    </CollapsibleSection>
  );
}

function BranchSummaryCard({ title, items, note }: { title: string; items: Array<[string, string]>; note?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <h4 className="text-xs font-black uppercase tracking-[0.16em] text-slate-700">{title}</h4>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
          </div>
        ))}
      </div>
      {note && <p className="mt-2 text-xs font-semibold text-slate-500">{note}</p>}
    </div>
  );
}

function BranchCalculationSection({ analysis }: { analysis: InvestmentAnalysis }) {
  const metrics = analysis.branchMetrics;

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-700">Υπολογισμός</h3>
      <div className="rounded-2xl border border-sky-100 bg-sky-50 p-3">
        <h4 className="text-sm font-black uppercase tracking-[0.14em] text-sky-900">Τι υπολογίζει το μοντέλο</h4>
        <p className="mt-1 text-sm font-semibold text-sky-900/80">
          Το μοντέλο υπολογίζει μόνο το επιπλέον οικονομικό αποτέλεσμα του νέου υποκαταστήματος. Δεν ξαναμετράει έξοδα που ήδη πληρώνει η κεντρική επιχείρηση, εκτός αν οριστεί ποσοστό επιβάρυνσης.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <ResultCard label="Αρχική Επένδυση" value={money(analysis.totalInitialInvestment)} />
        <ResultCard label="Έσοδα Σεζόν" value={money(metrics?.seasonRevenue || 0)} tone="income" />
        <ResultCard label="Συνολικά Έξοδα Σεζόν" value={money(metrics?.seasonCosts || 0)} tone="expense" />
        <ResultCard label="Κέρδος Σεζόν" value={money(metrics?.seasonProfit || 0)} tone={(metrics?.seasonProfit || 0) >= 0 ? 'income' : 'danger'} />
        <ResultCard label="Κοινά Έξοδα / Σεζόν" value={money(metrics?.sharedCostsSeason || 0)} tone="expense" />
        <ResultCard label="Νέα Έξοδα / Σεζόν" value={money(metrics?.newExtraCostsSeason || 0)} tone="expense" />
        <ResultCard label="Break-even μέρες / όχημα" value={numberText(metrics?.breakEvenRentalDaysPerVehicle || 0)} />
        <ResultCard label="Μηνιαίο Κέρδος Σεζόν" value={money(analysis.monthlyProfit)} tone={analysis.monthlyProfit >= 0 ? 'income' : 'danger'} />
        <ResultCard label="ROI" value={percent(analysis.roi)} />
      </div>
      <div>
        <h4 className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-700">Ανάλυση Ευαισθησίας</h4>
        <div className="grid gap-3 xl:grid-cols-3">
          {analysis.scenarios.map((scenario) => (
            <BranchScenarioCard key={scenario.label} scenario={scenario} />
          ))}
        </div>
      </div>
    </section>
  );
}

function DashboardCard({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'income' | 'danger' }) {
  const toneClass = tone === 'income' ? 'text-emerald-700' : tone === 'danger' ? 'text-rose-700' : 'text-slate-950';
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-black ${toneClass}`}>{value}</p>
    </div>
  );
}

function ModeCard({ title, description, active = false, disabled = false }: { title: string; description: string; active?: boolean; disabled?: boolean }) {
  return (
    <div className={`rounded-2xl border bg-white p-3 shadow-sm ${active ? 'border-cyan-500 ring-2 ring-cyan-100' : 'border-slate-200'} ${disabled ? 'opacity-60' : ''}`}>
      <p className="text-sm font-black uppercase tracking-wide text-slate-950">{title}</p>
      <p className="mt-1 text-xs font-semibold text-slate-600">{description}</p>
      <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
        {active ? 'Ενεργό' : 'Ανενεργό'}
      </span>
    </div>
  );
}

function CollapsibleSection({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-700">{title}</span>
        <span className="text-lg font-black text-slate-500">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="border-t border-slate-100 px-4 py-3">{children}</div>}
    </section>
  );
}

function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-600">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
      />
    </label>
  );
}

function NumberField({ label, value, onChange, helperText }: { label: string; value: string; onChange: (value: string) => void; helperText?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-600">{label}</span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
      />
      {helperText && <span className="mt-1 block text-xs font-semibold text-slate-500">{helperText}</span>}
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ResultCard({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'income' | 'expense' | 'danger' | 'warning' }) {
  const toneClass =
    tone === 'income'
      ? 'text-emerald-700'
      : tone === 'expense' || tone === 'danger'
        ? 'text-rose-700'
        : tone === 'warning'
          ? 'text-amber-700'
          : 'text-slate-950';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-black ${toneClass}`}>{value}</p>
    </div>
  );
}

function DecisionCard({
  decision,
  explanation,
  reasons,
  tone,
  score,
}: {
  decision: string;
  explanation: string;
  reasons: string[];
  tone: InvestmentAnalysis['decisionTone'];
  score: number;
}) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
      : tone === 'danger'
        ? 'border-rose-300 bg-rose-50 text-rose-900'
        : tone === 'warning'
          ? 'border-orange-300 bg-orange-50 text-orange-900'
          : 'border-amber-300 bg-amber-50 text-amber-900';
  const dot = tone === 'success' ? '🟢' : tone === 'danger' ? '🔴' : '🟡';
  const scoreTone =
    score >= 70
      ? 'text-emerald-700 border-emerald-300'
      : score >= 45
        ? 'text-orange-700 border-orange-300'
        : 'text-rose-700 border-rose-300';

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.16em] opacity-75">Αυτόματη Απόφαση</p>
      <div className="mt-3 flex items-center gap-4">
        <div className={`grid h-24 w-24 shrink-0 place-items-center rounded-full border-[8px] bg-white ${scoreTone}`}>
          <span className="text-2xl font-black">{score}</span>
        </div>
        <div>
          <p className="text-xl font-black uppercase">
            <span className="mr-2">{dot}</span>
            {decision}
          </p>
          <p className="mt-1 text-sm font-semibold opacity-80">{explanation}</p>
          <p className="mt-2 text-xs font-black uppercase opacity-70">Βαθμολογία Επένδυσης 0-100</p>
        </div>
      </div>
      {reasons.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-current/15 pt-3 text-xs font-bold opacity-85">
          {reasons.map((reason) => (
            <li key={reason}>• {reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ScenarioCard({ scenario }: { scenario: Scenario }) {
  const toneClass =
    scenario.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50/70'
      : scenario.tone === 'danger'
        ? 'border-rose-200 bg-rose-50/70'
        : 'border-slate-200 bg-slate-50';

  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-950">{scenario.label}</p>
          <p className="text-xs font-semibold text-slate-600">{scenario.description}</p>
        </div>
        <p className={`text-sm font-black ${scenario.monthlyProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
          {money(scenario.monthlyProfit)}
        </p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
        <ScenarioMetric label="Μηνιαία Έσοδα" value={money(scenario.monthlyRevenue)} />
        <ScenarioMetric label="Μηνιαία Έξοδα" value={money(scenario.monthlyCosts)} />
        <ScenarioMetric label="Μηνιαίο Κέρδος" value={money(scenario.monthlyProfit)} />
        <ScenarioMetric label="Ετήσιο Κέρδος" value={money(scenario.yearlyProfit)} />
        <ScenarioMetric label="ROI" value={percent(scenario.roi)} />
        <ScenarioMetric label="Απόσβεση" value={formatPayback(scenario.paybackMonths)} />
      </div>
    </div>
  );
}

function BranchScenarioCard({ scenario }: { scenario: Scenario }) {
  const toneClass =
    scenario.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50/70'
      : scenario.tone === 'danger'
        ? 'border-rose-200 bg-rose-50/70'
        : 'border-slate-200 bg-slate-50';

  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-950">{scenario.label}</p>
          <p className="text-xs font-semibold text-slate-600">{scenario.description}</p>
        </div>
        <p className={`text-sm font-black ${Number(scenario.seasonProfit || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
          {money(scenario.seasonProfit || 0)}
        </p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
        <ScenarioMetric label="Έσοδα Σεζόν" value={money(scenario.seasonRevenue || 0)} />
        <ScenarioMetric label="Συνολικά Έξοδα Σεζόν" value={money(scenario.annualCosts || 0)} />
        <ScenarioMetric label="Κέρδος Σεζόν" value={money(scenario.seasonProfit || 0)} />
        <ScenarioMetric label="ROI" value={percent(scenario.roi)} />
        <ScenarioMetric label="Break-even μέρες / όχημα" value={numberText(scenario.breakEvenRentalDaysPerVehicle || 0)} />
      </div>
    </div>
  );
}

function ScenarioMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/70 bg-white/70 px-2.5 py-1.5">
      <p className="text-[10px] font-black uppercase text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}
