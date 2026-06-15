'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { deleteCar, fetchCars } from '@/lib/carsApi';
import { addDebt, deleteDebt, fetchDebts, type DebtRecord } from '@/lib/debtsApi';
import { fetchExpenseCategories, type ExpenseCategory } from '@/lib/expenseCategoriesApi';
import { addTransaction, deleteTransaction, fetchTransactions } from '@/lib/financeApi';
import {
  addServiceInventoryPurchase,
  addServiceInventoryUsage,
  adjustServiceInventoryStock,
  createServiceInventoryItem,
  deleteServiceInventoryItem,
  deleteServiceInventoryMovement,
  fetchServiceInventoryItems,
  fetchServiceInventoryMovements,
  reconcileServiceInventoryStock,
  type ServiceInventoryItem,
  type ServiceInventoryMovement,
  type ServiceInventoryType,
  updateServiceInventoryItem,
  updateServiceInventoryMovement,
} from '@/lib/serviceInventoryApi';
import {
  createServiceInventoryMaterialType,
  createServiceInventoryServiceType,
  deleteServiceInventoryServiceType,
  fetchServiceInventoryCatalog,
  linkServiceInventoryMaterialTypeToServiceType,
  type ServiceInventoryMaterialTypeRecord,
  type ServiceInventoryServiceTypeRecord,
  unlinkServiceInventoryMaterialTypeFromServiceType,
  updateServiceInventoryServiceType,
} from '@/lib/serviceInventoryMaterialTypesApi';
import { fetchServices, addService, updateService, deleteService, type ServiceRecord } from '@/lib/servicesApi';
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
  payment_method?: string | null;
  car_id?: number | null;
  supplier_id?: number | null;
  category?: string | null;
  service_id?: number | null;
  notes?: string | null;
};

type ComboboxOption = {
  value: string;
  label: string;
  searchText: string;
  description?: string;
};

type ServiceTab = 'history' | 'checklist' | 'inventory';
type ChecklistFilter = 'all' | 'pending' | 'done';
type ChecklistSortKey = 'plate' | 'brand' | 'model' | 'normalServiceDone' | 'tiresDone' | 'batteryDone' | 'lastAction' | 'overallStatus';
type ChecklistStatusKey = 'normalServiceDone' | 'tiresDone' | 'batteryDone';

const paymentOptions = [
  { value: 'cash', label: 'Μετρητά' },
  { value: 'card', label: 'Κάρτα' },
  { value: 'bank', label: 'Τράπεζα' },
  { value: 'credit', label: 'Επί Πιστώσει' },
];

const fallbackLaborCategories = ['Service', 'Ελαστικά', 'Φρένα', 'Μηχανικά', 'Ηλεκτρικά', 'Άλλο'];
const normalServiceType = 'Service / Λάδια';
const tireServiceType = 'Ελαστικά';
const batteryServiceType = 'Μπαταρία';
const baseServiceTypeCatalog: { name: string; materialTypes: { value: ServiceInventoryType; label: string }[] }[] = [
  {
    name: normalServiceType,
    materialTypes: [
      { value: 'oil', label: 'Λάδι' },
      { value: 'oil_filter', label: 'Φίλτρο λαδιού' },
      { value: 'air_filter', label: 'Φίλτρο αέρα' },
      { value: 'cabin_filter', label: 'Φίλτρο καμπίνας' },
    ],
  },
  {
    name: 'Φρένα',
    materialTypes: [
      { value: 'brakes', label: 'Τακάκια' },
      { value: 'discs', label: 'Δισκόπλακες' },
      { value: 'brake_fluid', label: 'Υγρά φρένων' },
    ],
  },
  {
    name: tireServiceType,
    materialTypes: [{ value: 'tire', label: 'Ελαστικά' }],
  },
  {
    name: batteryServiceType,
    materialTypes: [{ value: 'battery', label: 'Μπαταρία' }],
  },
  {
    name: 'Άλλο',
    materialTypes: [{ value: 'other', label: 'Άλλο' }],
  },
];
const baseInventoryTypeOptions: { value: ServiceInventoryType; label: string }[] = baseServiceTypeCatalog.flatMap(
  (serviceType) => serviceType.materialTypes
);

const serviceTypeToInventoryTypes: Record<string, ServiceInventoryType[]> = Object.fromEntries(
  baseServiceTypeCatalog.map((serviceType) => [serviceType.name, serviceType.materialTypes.map((materialType) => materialType.value)])
);

const inventoryExpenseCategoryByType: Record<ServiceInventoryType, string> = {
  oil: 'Service / Λάδια',
  oil_filter: 'Φίλτρο λαδιού',
  cabin_filter: 'Φίλτρο καμπίνας',
  air_filter: 'Φίλτρο αέρα',
  brakes: 'Τακάκια',
  discs: 'Δισκόπλακες',
  brake_fluid: 'Υγρά φρένων',
  belts: 'Ιμάντες',
  tire: 'Ελαστικά',
  battery: 'Μπαταρία',
  other: 'Αποθήκη Service',
};

const initialForm = {
  car_id: '',
  service_date: new Date().toISOString().split('T')[0],
  km: '',
  description: '',
  service_type: 'Service / Λάδια',
  inventory_item: '',
  inventory_quantity: '1',
  tire_count: '4',
  battery_source: '',
  battery_quantity: '1',
  next_service_km: '',
  next_service_date: '',
  notes: '',
  inventory_usages: [{ item_id: '', quantity: '1' }],
  parts_supplier_id: '',
  parts_category: 'Ανταλλακτικά',
  parts_description: '',
  parts_amount: '',
  parts_payment_method: 'cash',
  labor_supplier_id: '',
  labor_category: 'Service',
  labor_amount: '',
  labor_payment_method: 'cash',
};

const initialInventoryForm = {
  name: '',
  service_type: 'Service / Λάδια',
  type: 'tire' as ServiceInventoryType,
  brand: '',
  size_or_spec: '',
  supplier_id: '',
  unit_cost: '',
  quantity: '',
  payment_method: 'cash',
  notes: '',
};

const money = (value: number) =>
  `€${value.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const debtMarker = (key: string, id: number) => `[${key}:${id}]`;
const readDebtMarker = (notes: string | null | undefined, key: string) => {
  const match = String(notes || '').match(new RegExp(`\\[${key}:(\\d+)\\]`));
  return match ? Number(match[1]) : null;
};
const stripDebtMarkers = (notes: string | null | undefined) =>
  String(notes || '')
    .split('|')
    .map((part) => part.trim())
    .filter((part) => part && !/^\[[a-z_]+:\d+\]$/i.test(part))
    .join(' | ');

export default function ServicesManager() {
  const [cars, setCars] = useState<ServiceCar[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [inventoryItems, setInventoryItems] = useState<ServiceInventoryItem[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<ServiceInventoryMovement[]>([]);
  const [customServiceTypes, setCustomServiceTypes] = useState<ServiceInventoryServiceTypeRecord[]>([]);
  const [customMaterialTypes, setCustomMaterialTypes] = useState<ServiceInventoryMaterialTypeRecord[]>([]);
  const [materialTypeLinks, setMaterialTypeLinks] = useState<{ id: number; service_type_id: number; material_type_id: number }[]>([]);
  const [materialCatalogMissing, setMaterialCatalogMissing] = useState(false);
  const [transactions, setTransactions] = useState<ServiceTransaction[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalRootReady, setModalRootReady] = useState(false);
  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [activeServiceTab, setActiveServiceTab] = useState<ServiceTab>('history');
  const [checklistYear, setChecklistYear] = useState(String(new Date().getFullYear()));
  const [checklistFilter, setChecklistFilter] = useState<ChecklistFilter>('all');
  const [checklistSort, setChecklistSort] = useState<{ key: ChecklistSortKey; direction: 'asc' | 'desc' }>({
    key: 'plate',
    direction: 'asc',
  });
  const [checklistOverrides, setChecklistOverrides] = useState<Record<string, Partial<Record<ChecklistStatusKey, boolean>>>>({});
  const [editingChecklistKey, setEditingChecklistKey] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [inventoryForm, setInventoryForm] = useState(initialInventoryForm);
  const [isSavingInventory, setIsSavingInventory] = useState(false);
  const [editingInventoryItemId, setEditingInventoryItemId] = useState<number | null>(null);
  const [editingInventoryMovementId, setEditingInventoryMovementId] = useState<number | null>(null);
  const [showMaterialTypeModal, setShowMaterialTypeModal] = useState(false);
  const [newMaterialTypeName, setNewMaterialTypeName] = useState('');
  const [newServiceTypeName, setNewServiceTypeName] = useState('');
  const [editingServiceTypeId, setEditingServiceTypeId] = useState<number | null>(null);
  const [editingServiceTypeName, setEditingServiceTypeName] = useState('');
  const [selectedCatalogServiceTypeId, setSelectedCatalogServiceTypeId] = useState<number | null>(null);
  const [materialTypeMessage, setMaterialTypeMessage] = useState('');

  const loadData = async () => {
    const [carRows, supplierRows, serviceRows, transactionRows, categoryRows, inventoryRows, movementRows, debtRows, materialCatalog] = await Promise.all([
      fetchCars(),
      fetchSuppliers(),
      fetchServices(),
      fetchTransactions(),
      fetchExpenseCategories(),
      fetchServiceInventoryItems(),
      fetchServiceInventoryMovements(),
      fetchDebts(),
      fetchServiceInventoryCatalog(),
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
    setExpenseCategories(categoryRows);
    setServices(serviceRows);
    setDebts(debtRows);
    setInventoryItems(inventoryRows);
    setInventoryMovements(movementRows);
    setCustomServiceTypes(materialCatalog.serviceTypes);
    setCustomMaterialTypes(materialCatalog.materialTypes);
    setMaterialTypeLinks(materialCatalog.links);
    setMaterialCatalogMissing(materialCatalog.missingTables);
    setTransactions(
      (transactionRows || []).map((transaction: any) => ({
        id: Number(transaction.id),
        date: String(transaction.date ?? ''),
        amount: Number(transaction.amount) || 0,
        source: transaction.source ?? null,
        payment_method: transaction.payment_method ?? null,
        car_id: transaction.car_id ? Number(transaction.car_id) : null,
        supplier_id: transaction.supplier_id ? Number(transaction.supplier_id) : null,
        category: transaction.category ?? null,
        service_id: transaction.service_id ? Number(transaction.service_id) : null,
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

  useEffect(() => {
    setEditingChecklistKey(null);
  }, [checklistYear]);

  const serviceRows = useMemo(
    () =>
      services.map((service) => {
        const sameServiceTransactions = transactions.filter(
          (transaction) =>
            Number(transaction.service_id) === Number(service.id) ||
            (!transaction.service_id &&
              Number(transaction.car_id) === Number(service.car_id) &&
              transaction.date === service.service_date)
        );
        const sameServiceInventoryUsages = inventoryMovements.filter(
          (movement) => movement.movement_type === 'usage' && Number(movement.service_id) === Number(service.id)
        );
        const partsCost = sameServiceTransactions
          .filter((transaction) => transaction.source === 'service_parts')
          .reduce((sum, transaction) => sum + transaction.amount, 0) +
          sameServiceInventoryUsages.reduce((sum, movement) => sum + movement.total_cost, 0);
        const laborCost = sameServiceTransactions
          .filter((transaction) => transaction.source === 'service_labor')
          .reduce((sum, transaction) => sum + transaction.amount, 0);
        const inventoryDescription = sameServiceInventoryUsages
          .map((movement) => {
            const item = inventoryItems.find((inventoryItem) => inventoryItem.id === movement.item_id);
            return item ? `${item.name} x${movement.quantity}` : `Inventory #${movement.item_id} x${movement.quantity}`;
          })
          .join(', ');

        return {
          service,
          carPlate: cars.find((car) => car.id === Number(service.car_id))?.plate || `#${service.car_id}`,
          partsCost,
          laborCost,
          partsDescription:
            inventoryDescription ||
            sameServiceTransactions.find((transaction) => transaction.source === 'service_parts')?.notes ||
            '-',
        };
      }),
    [cars, inventoryItems, inventoryMovements, services, transactions]
  );

  const selectedCar = cars.find((car) => car.id === selectedCarId) ?? null;

  const laborCategoryOptions = useMemo(() => {
    const categoryNames = expenseCategories
      .map((category) => category.name)
      .filter((name): name is string => Boolean(name?.trim()));

    return Array.from(new Set([...categoryNames, ...fallbackLaborCategories]));
  }, [expenseCategories]);

  const inventoryTypeOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { value: ServiceInventoryType; label: string; id?: number }[] = [];

    const addOption = (option: { value: ServiceInventoryType; label: string; id?: number }) => {
      const normalizedValue = String(option.value).trim().toLowerCase();
      const normalizedLabel = option.label.trim().toLowerCase();
      if (!normalizedValue || !normalizedLabel || seen.has(normalizedValue) || seen.has(normalizedLabel)) return;
      seen.add(normalizedValue);
      seen.add(normalizedLabel);
      options.push(option);
    };

    baseInventoryTypeOptions.forEach(addOption);

    for (const customType of customMaterialTypes) {
      const label = customType.name.trim();
      if (!label) continue;

      const normalized = label.toLowerCase();
      if (seen.has(normalized)) continue;

      addOption({ value: label, label, id: customType.id });
    }

    return options;
  }, [customMaterialTypes]);

  const serviceTypeCatalogOptions = useMemo(() => {
    const seen = new Set<string>();
    const rows: { id?: number; name: string; isBase: boolean; materialTypes: { value: ServiceInventoryType; label: string; id?: number }[] }[] = [];

    if (customServiceTypes.length === 0) {
      for (const baseServiceType of baseServiceTypeCatalog) {
        const normalized = baseServiceType.name.toLowerCase();
        seen.add(normalized);
        rows.push({
          name: baseServiceType.name,
          isBase: true,
          materialTypes: baseServiceType.materialTypes,
        });
      }
    }

    for (const serviceType of customServiceTypes) {
      const name = serviceType.name.trim();
      if (!name) continue;

      const normalized = name.toLowerCase();
      const linkedMaterialIds = materialTypeLinks
        .filter((link) => Number(link.service_type_id) === Number(serviceType.id))
        .map((link) => Number(link.material_type_id));
      const linkedMaterials = linkedMaterialIds
        .map((materialTypeId) => {
          const materialType = customMaterialTypes.find((row) => Number(row.id) === materialTypeId);
          if (!materialType) return null;
          return { value: materialType.name, label: materialType.name, id: materialType.id };
        })
        .filter((row): row is { value: string; label: string; id: number } => Boolean(row));

      if (seen.has(normalized)) {
        const baseRow = rows.find((row) => row.name.toLowerCase() === normalized);
        if (baseRow) {
          const materialSeen = new Set(baseRow.materialTypes.flatMap((material) => [material.value.toLowerCase(), material.label.toLowerCase()]));
          for (const material of linkedMaterials) {
            const materialNormalized = material.label.toLowerCase();
            if (materialSeen.has(materialNormalized) || materialSeen.has(material.value.toLowerCase())) continue;
            materialSeen.add(materialNormalized);
            materialSeen.add(material.value.toLowerCase());
            baseRow.materialTypes.push(material);
          }
          if (!baseRow.id) baseRow.id = serviceType.id;
        }
        continue;
      }

      seen.add(normalized);
      rows.push({
        id: serviceType.id,
        name,
        isBase: Boolean(serviceType.is_base),
        materialTypes: linkedMaterials,
      });
    }

    return rows;
  }, [customMaterialTypes, customServiceTypes, materialTypeLinks]);

  const serviceTypeSelectOptions = useMemo(() => serviceTypeCatalogOptions.map((row) => row.name), [serviceTypeCatalogOptions]);

  useEffect(() => {
    if (selectedCatalogServiceTypeId || serviceTypeCatalogOptions.length === 0) return;
    setSelectedCatalogServiceTypeId(serviceTypeCatalogOptions[0].id ?? null);
  }, [selectedCatalogServiceTypeId, serviceTypeCatalogOptions]);

  const selectedCatalogServiceType =
    serviceTypeCatalogOptions.find((serviceType) => serviceType.id === selectedCatalogServiceTypeId) ||
    serviceTypeCatalogOptions[0] ||
    null;

  const selectedInventoryFormServiceType =
    serviceTypeCatalogOptions.find((serviceType) => serviceType.name === inventoryForm.service_type) ||
    serviceTypeCatalogOptions[0] ||
    null;
  const filteredInventoryTypeOptions = selectedInventoryFormServiceType?.materialTypes.length
    ? selectedInventoryFormServiceType.materialTypes
    : inventoryTypeOptions;

  useEffect(() => {
    if (filteredInventoryTypeOptions.length === 0) return;
    const hasSelectedType = filteredInventoryTypeOptions.some((option) => option.value === inventoryForm.type);
    if (!hasSelectedType) {
      setInventoryForm((current) => ({ ...current, type: filteredInventoryTypeOptions[0].value }));
    }
  }, [filteredInventoryTypeOptions, inventoryForm.type]);

  const selectedInventoryTypeLabel =
    inventoryTypeOptions.find((option) => option.value === inventoryForm.type)?.label || String(inventoryForm.type || '');
  const isTireInventoryType = selectedInventoryTypeLabel === 'Ελαστικά' || inventoryForm.type === 'tire';
  const isBatteryInventoryType = selectedInventoryTypeLabel === 'Μπαταρία' || inventoryForm.type === 'battery';
  const isOilInventoryType = selectedInventoryTypeLabel === 'Λάδι' || inventoryForm.type === 'oil';
  const inventorySpecLabel = isTireInventoryType
    ? 'Spec / Διάσταση'
    : isOilInventoryType
      ? 'Spec / Ιξώδες'
      : isBatteryInventoryType
        ? 'Spec / Διάσταση (προαιρετικό)'
        : 'Spec / Διάσταση (προαιρετικό)';

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

  const filteredCarRows = useMemo(() => {
    const query = serviceSearchTerm.trim().toLowerCase();
    if (!query) return carRows;

    return carRows.filter(({ car }) =>
      [car.plate, car.brand, car.model].some((value) => value.toLowerCase().includes(query))
    );
  }, [carRows, serviceSearchTerm]);

  const checklistYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1].map(String);
  }, []);

  const annualChecklistRows = useMemo(() => {
    const rows = cars.map((car) => {
      const yearServices = services.filter(
        (service) => Number(service.car_id) === car.id && String(service.service_date || '').startsWith(`${checklistYear}-`)
      );
      const override = checklistOverrides[`${checklistYear}:${car.id}`] || {};
      const latestService = [...yearServices].sort((first, second) =>
        String(second.service_date || '').localeCompare(String(first.service_date || ''))
      )[0];
      const baseNormalServiceDone = yearServices.some(
        (service) => service.service_type === normalServiceType || service.service_type === 'service' || !service.service_type
      );
      const baseTiresDone = yearServices.some((service) => service.service_type === tireServiceType);
      const baseBatteryDone = yearServices.some((service) => service.service_type === batteryServiceType);
      const normalServiceDone = override.normalServiceDone ?? baseNormalServiceDone;
      const tiresDone = override.tiresDone ?? baseTiresDone;
      const batteryDone = override.batteryDone ?? baseBatteryDone;
      const overallStatus: 'DONE' | 'ATTENTION' | 'PENDING' = normalServiceDone
        ? 'DONE'
        : tiresDone || batteryDone
          ? 'ATTENTION'
          : 'PENDING';

      return {
        car,
        normalServiceDone,
        tiresDone,
        batteryDone,
        lastAction: latestService ? `${latestService.service_date} · ${latestService.service_type || 'Service'}` : '-',
        latestService,
        overallStatus,
      };
    });

    const filteredRows =
      checklistFilter === 'done'
        ? rows.filter((row) => row.overallStatus === 'DONE')
        : checklistFilter === 'pending'
          ? rows.filter((row) => row.overallStatus !== 'DONE')
          : rows;

    const statusRank = { PENDING: 0, ATTENTION: 1, DONE: 2 };
    const sortedRows = [...filteredRows].sort((left, right) => {
      const getValue = (row: (typeof rows)[number]) => {
        switch (checklistSort.key) {
          case 'plate':
            return row.car.plate || '';
          case 'brand':
            return row.car.brand || '';
          case 'model':
            return row.car.model || '';
          case 'normalServiceDone':
            return row.normalServiceDone ? 1 : 0;
          case 'tiresDone':
            return row.tiresDone ? 1 : 0;
          case 'batteryDone':
            return row.batteryDone ? 1 : 0;
          case 'lastAction':
            return row.lastAction || '';
          case 'overallStatus':
            return statusRank[row.overallStatus];
          default:
            return '';
        }
      };

      const leftValue = getValue(left);
      const rightValue = getValue(right);
      const comparison =
        typeof leftValue === 'number' && typeof rightValue === 'number'
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue), 'el', { numeric: true });

      return checklistSort.direction === 'asc' ? comparison : -comparison;
    });

    return sortedRows;
  }, [cars, checklistFilter, checklistOverrides, checklistSort, checklistYear, services]);

  const handleChecklistSort = (key: ChecklistSortKey) => {
    setChecklistSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const startEditChecklistRow = (carId: number, statuses: Record<ChecklistStatusKey, boolean>) => {
    const rowKey = `${checklistYear}:${carId}`;
    setChecklistOverrides((current) => ({
      ...current,
      [rowKey]: {
        normalServiceDone: current[rowKey]?.normalServiceDone ?? statuses.normalServiceDone,
        tiresDone: current[rowKey]?.tiresDone ?? statuses.tiresDone,
        batteryDone: current[rowKey]?.batteryDone ?? statuses.batteryDone,
      },
    }));
    setEditingChecklistKey(rowKey);
  };

  const toggleChecklistOverride = (carId: number, statusKey: ChecklistStatusKey, value: boolean) => {
    const rowKey = `${checklistYear}:${carId}`;
    setChecklistOverrides((current) => ({
      ...current,
      [rowKey]: {
        ...current[rowKey],
        [statusKey]: value,
      },
    }));
  };

  const selectedServiceTypeCatalog = serviceTypeCatalogOptions.find((serviceType) => serviceType.name === form.service_type);
  const modalInventoryTypes = (selectedServiceTypeCatalog?.materialTypes.map((materialType) => materialType.value) ||
    serviceTypeToInventoryTypes[form.service_type] ||
    ['other']) as ServiceInventoryType[];
  const modalInventoryItems = inventoryItems.filter((item) => modalInventoryTypes.includes(item.type));
  const isTireService = form.service_type === tireServiceType;
  const isBatteryService = form.service_type === batteryServiceType;
  const isMultiMaterialService = !isTireService && !isBatteryService;
  const updateInventoryUsageRow = (index: number, updates: Partial<{ item_id: string; quantity: string }>) => {
    setForm((current) => ({
      ...current,
      inventory_usages: current.inventory_usages.map((row, rowIndex) => (rowIndex === index ? { ...row, ...updates } : row)),
    }));
  };

  const addInventoryUsageRow = () => {
    setForm((current) => ({
      ...current,
      inventory_usages: [...current.inventory_usages, { item_id: '', quantity: '1' }],
    }));
  };

  const removeInventoryUsageRow = (index: number) => {
    setForm((current) => ({
      ...current,
      inventory_usages:
        current.inventory_usages.length > 1
          ? current.inventory_usages.filter((_, rowIndex) => rowIndex !== index)
          : [{ item_id: '', quantity: '1' }],
    }));
  };

  const inventoryUsageRows =
    isMultiMaterialService
      ? form.inventory_usages
          .map((row) => ({
            item: inventoryItems.find((item) => String(item.id) === row.item_id) || null,
            quantity: Number(row.quantity || 0),
          }))
          .filter((row) => row.item)
      : form.inventory_item
        ? [
            {
              item: inventoryItems.find((item) => String(item.id) === form.inventory_item) || null,
              quantity: Number(isTireService ? form.tire_count || 0 : form.battery_quantity || 0),
            },
          ].filter((row) => row.item)
        : [];
  const inventoryUsageCost = inventoryUsageRows.reduce(
    (sum, row) => sum + (row.item ? row.item.unit_cost * row.quantity : 0),
    0
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
    setEditingServiceId(null);
    setForm({
      ...initialForm,
      car_id: selectedCar ? String(selectedCar.id) : '',
    });
    setShowModal(true);
  };

  const openAddServiceModalForCar = (carId: number) => {
    setEditingServiceId(null);
    setForm({
      ...initialForm,
      car_id: String(carId),
    });
    setShowModal(true);
  };

  const openEditServiceModal = ({
    service,
    partsCost,
    laborCost,
    partsDescription,
  }: {
    service: ServiceRecord;
    partsCost: number;
    laborCost: number;
    partsDescription: string;
  }) => {
    setEditingServiceId(service.id);
    setForm({
      ...initialForm,
      car_id: String(service.car_id),
      service_date: service.service_date,
      km: service.km ? String(service.km) : '',
      description: service.description || '',
      notes: service.notes || '',
      parts_description: partsDescription === '-' ? '' : partsDescription,
      parts_amount: String(partsCost || ''),
      labor_amount: String(laborCost || ''),
    });
    setShowModal(true);
  };

  const handleDeleteService = async (service: ServiceRecord) => {
    if (!window.confirm('Να διαγραφεί αυτή η καταχώρηση service;')) return;

    const linkedUsageMovements = inventoryMovements.filter(
      (movement) => movement.movement_type === 'usage' && Number(movement.service_id) === Number(service.id)
    );
    const linkedTransactions = transactions.filter(
      (transaction) =>
        Number(transaction.service_id) === Number(service.id) ||
        (!transaction.service_id &&
          Number(transaction.car_id) === Number(service.car_id) &&
          transaction.date === service.service_date &&
          (transaction.source === 'service_parts' || transaction.source === 'service_labor'))
    );
    const linkedServiceDebts = debts.filter((debt) => String(debt.notes || '').includes(debtMarker('service_labor', Number(service.id))));

    for (const movement of linkedUsageMovements) {
      const stockAdjusted = await adjustServiceInventoryStock(Number(movement.item_id), Number(movement.quantity) || 0);
      if (!stockAdjusted) {
        alert('Δεν έγινε επιστροφή stock. Η διαγραφή σταμάτησε.');
        return;
      }
      const movementDeleted = await deleteServiceInventoryMovement(Number(movement.id));
      if (!movementDeleted) {
        await adjustServiceInventoryStock(Number(movement.item_id), -(Number(movement.quantity) || 0));
        alert('Δεν διαγράφηκε η κίνηση αποθήκης. Η διαγραφή σταμάτησε.');
        return;
      }
    }

    for (const transaction of linkedTransactions) {
      const deleted = await deleteTransaction(Number(transaction.id));
      if (!deleted) {
        alert('Δεν διαγράφηκε συνδεδεμένη οικονομική κίνηση service. Η διαγραφή σταμάτησε.');
        await loadData();
        return;
      }
    }

    for (const debt of linkedServiceDebts) {
      const deleted = await deleteDebt(Number(debt.id));
      if (!deleted) {
        alert('Δεν διαγράφηκε συνδεδεμένη πίστωση προμηθευτή service. Η διαγραφή σταμάτησε.');
        await loadData();
        return;
      }
    }

    const result = await deleteService(service.id);
    if (!result.success) {
      alert('Δεν μπορεί να διαγραφεί το service. Ελέγξτε τις συνδεδεμένες κινήσεις.');
      return;
    }

    await loadData();
  };

  const handleDeleteCar = async (carId: number) => {
    if (!window.confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το αυτοκίνητο;')) return;

    const deleted = await deleteCar(String(carId));
    if (!deleted.success) {
      return;
    }

    await loadData();
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
    const selectedUsageItemIds = inventoryUsageRows.map((row) => Number(row.item?.id || 0)).filter(Boolean);
    if (new Set(selectedUsageItemIds).size !== selectedUsageItemIds.length) {
      alert('Δεν επιτρέπεται διπλή επιλογή του ίδιου υλικού στο ίδιο service.');
      return;
    }
    for (const usageRow of inventoryUsageRows) {
      if (!usageRow.item) continue;
      if (!usageRow.quantity || Number.isNaN(usageRow.quantity) || usageRow.quantity <= 0) {
        alert('Συμπληρώστε σωστή ποσότητα αποθήκης.');
        return;
      }
      if (usageRow.item.current_stock < usageRow.quantity) {
        alert('Δεν υπάρχει αρκετό stock για το επιλεγμένο είδος αποθήκης.');
        return;
      }
    }

    const partsAmount = 0;
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

    if (editingServiceId) {
      const updated = await updateService(editingServiceId, {
        service_date: form.service_date,
        km: form.km ? Number(form.km) : null,
        description: form.description,
        cost: partsAmount + laborAmount,
        notes: form.notes || null,
      });

      if (!updated) return;

      await loadData();
      setEditingServiceId(null);
      setShowModal(false);
      return;
    }

    const service = await addService({
      car_id: Number(form.car_id),
      supplier_id: form.labor_supplier_id ? Number(form.labor_supplier_id) : form.parts_supplier_id ? Number(form.parts_supplier_id) : null,
      service_date: form.service_date,
      km: form.km ? Number(form.km) : null,
      service_type: form.service_type,
      description: form.description,
      cost: partsAmount + laborAmount + inventoryUsageCost,
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

    for (const usageRow of inventoryUsageRows) {
      if (!usageRow.item || usageRow.quantity <= 0) continue;

      const usageMovement = await addServiceInventoryUsage({
        item_id: usageRow.item.id,
        car_id: Number(form.car_id),
        service_id: Number(service.id),
        quantity: usageRow.quantity,
        unit_cost: usageRow.item.unit_cost,
        notes: form.description || null,
      });

      if (!usageMovement) {
        alert('Το service αποθηκεύτηκε, αλλά απέτυχε η κίνηση χρήσης αποθήκης.');
        await loadData();
        return;
      }
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
        service_id: Number(service.id),
        category: form.parts_category || 'Ανταλλακτικά',
        notes: form.description || null,
      });
      if (!partsTransaction) {
        console.error('Service parts transaction creation failed after service row save.', { serviceId: service.id });
        alert('Το service αποθηκεύτηκε, αλλά απέτυχε η δημιουργία κίνησης ανταλλακτικών.');
        await loadData();
        return;
      }
    }

    if (laborAmount > 0 && form.labor_payment_method === 'credit') {
      const debt = await addDebt({
        title: `Service εργασίας: ${form.description || `Service #${service.id}`}`,
        supplier_id: Number(form.labor_supplier_id),
        car_id: Number(form.car_id),
        category: form.labor_category || 'Service',
        original_amount: laborAmount,
        paid_amount: 0,
        notes: [form.description, debtMarker('service_labor', Number(service.id))].filter(Boolean).join(' | '),
      });

      if (!debt) {
        console.error('Service labor supplier credit creation failed after service row save.', { serviceId: service.id });
        alert('Το service αποθηκεύτηκε, αλλά απέτυχε η πίστωση προμηθευτή εργασίας.');
        await loadData();
        return;
      }
    } else if (laborAmount > 0) {
      const laborTransaction = await addTransaction({
        type: 'expense',
        source: 'service_labor',
        amount: laborAmount,
        date: form.service_date,
        payment_method: form.labor_payment_method,
        supplier_id: Number(form.labor_supplier_id),
        car_id: Number(form.car_id),
        service_id: Number(service.id),
        category: form.labor_category || 'Service',
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

  const handleInventoryPurchase = async () => {
    const quantity = Number(inventoryForm.quantity || 0);
    const unitCost = Number(inventoryForm.unit_cost || 0);

    if (!inventoryForm.name.trim()) {
      alert('Συμπληρώστε όνομα είδους.');
      return;
    }
    if (!quantity || Number.isNaN(quantity) || quantity <= 0) {
      alert('Συμπληρώστε σωστή ποσότητα.');
      return;
    }
    if (Number.isNaN(unitCost) || unitCost < 0) {
      alert('Συμπληρώστε σωστό κόστος μονάδας.');
      return;
    }
    if (inventoryForm.payment_method === 'credit' && !inventoryForm.supplier_id) {
      alert('Επιλέξτε προμηθευτή για αγορά αποθήκης επί πιστώσει.');
      return;
    }

    setIsSavingInventory(true);
    const totalCost = quantity * unitCost;

    const normalizedName = inventoryForm.name.trim().toLowerCase();
    const normalizedBrand = inventoryForm.brand.trim().toLowerCase();
    const normalizedSpec = inventoryForm.size_or_spec.trim().toLowerCase();
    const supplierId = inventoryForm.supplier_id ? Number(inventoryForm.supplier_id) : null;
    const existingItem = inventoryItems.find(
      (item) =>
        item.name.trim().toLowerCase() === normalizedName &&
        item.type === inventoryForm.type &&
        String(item.brand || '').trim().toLowerCase() === normalizedBrand &&
        String(item.size_or_spec || '').trim().toLowerCase() === normalizedSpec &&
        Number(item.supplier_id || 0) === Number(supplierId || 0)
    );

    const createdNewItem = !existingItem;
    const item =
      existingItem ||
      (await createServiceInventoryItem({
        name: inventoryForm.name.trim(),
        type: inventoryForm.type,
        brand: inventoryForm.brand.trim() || null,
        size_or_spec: inventoryForm.size_or_spec.trim() || null,
        supplier_id: supplierId,
        unit_cost: unitCost,
      }));

    if (!item) {
      setIsSavingInventory(false);
      return;
    }

    let transactionId: number | null = null;
    let supplierDebtId: number | null = null;

    if (totalCost > 0 && inventoryForm.payment_method === 'credit') {
      const debt = await addDebt({
        title: `Αγορά αποθήκης: ${inventoryForm.name.trim()}`,
        supplier_id: Number(inventoryForm.supplier_id),
        category: inventoryExpenseCategoryByType[inventoryForm.type] || 'Αποθήκη Service',
        original_amount: totalCost,
        paid_amount: 0,
        notes: [inventoryForm.notes.trim(), debtMarker('service_inventory_item', Number(item.id))].filter(Boolean).join(' | '),
      });

      if (!debt) {
        if (createdNewItem) {
          await deleteServiceInventoryItem(Number(item.id));
        }
        alert('Απέτυχε η πίστωση προμηθευτή. Η αγορά αποθήκης δεν θα αυξήσει stock.');
        setIsSavingInventory(false);
        return;
      }
      supplierDebtId = Number(debt.id);
    } else if (totalCost > 0) {
      const transaction = await addTransaction({
        type: 'expense',
        source: 'service_inventory_purchase',
        amount: totalCost,
        date: new Date().toISOString().split('T')[0],
        payment_method: inventoryForm.payment_method,
        supplier_id: inventoryForm.supplier_id ? Number(inventoryForm.supplier_id) : null,
        category: inventoryExpenseCategoryByType[inventoryForm.type] || 'Αποθήκη Service',
        notes: inventoryForm.notes.trim() || inventoryForm.name.trim(),
      });

      if (!transaction) {
        if (createdNewItem) {
          await deleteServiceInventoryItem(Number(item.id));
        }
        alert('Απέτυχε η οικονομική κίνηση. Η αγορά αποθήκης δεν θα αυξήσει stock.');
        setIsSavingInventory(false);
        return;
      }
      transactionId = Number(transaction.id);
    }

    const movementNotes = [
      inventoryForm.notes.trim(),
      supplierDebtId ? debtMarker('supplier_debt', supplierDebtId) : '',
    ]
      .filter(Boolean)
      .join(' | ') || null;

    const movement = await addServiceInventoryPurchase({
      item_id: Number(item.id),
      quantity,
      unit_cost: unitCost,
      supplier_id: inventoryForm.supplier_id ? Number(inventoryForm.supplier_id) : null,
      payment_method: inventoryForm.payment_method,
      transaction_id: transactionId,
      notes: movementNotes,
    });

    if (!movement) {
      if (transactionId) {
        await deleteTransaction(transactionId);
      }
      if (supplierDebtId) {
        await deleteDebt(supplierDebtId);
      }
      if (createdNewItem) {
        await deleteServiceInventoryItem(Number(item.id));
      }
      setIsSavingInventory(false);
      return;
    }

    setInventoryForm(initialInventoryForm);
    await loadData();
    setIsSavingInventory(false);
  };

  const reversePurchaseMovement = async (movement: ServiceInventoryMovement) => {
    if (movement.movement_type !== 'purchase') return false;

    const item = inventoryItems.find((inventoryItem) => inventoryItem.id === Number(movement.item_id));
    const hasUsageHistory = inventoryMovements.some(
      (candidate) => Number(candidate.item_id) === Number(movement.item_id) && candidate.movement_type === 'usage'
    );

    if (hasUsageHistory) {
      alert('This item has service usage history. Delete is blocked or must be reversed carefully.');
      return false;
    }

    const reconciledStock = await reconcileServiceInventoryStock(Number(movement.item_id));
    const stockAdjusted =
      reconciledStock !== null && reconciledStock >= Number(movement.quantity || 0)
        ? await adjustServiceInventoryStock(Number(movement.item_id), -(Number(movement.quantity) || 0))
        : false;
    if (!stockAdjusted) {
      alert('Δεν υπάρχει αρκετό stock για ασφαλή αναστροφή αυτής της αγοράς.');
      return false;
    }

    const legacyCreditExpenseTransactions =
      movement.payment_method === 'credit'
        ? transactions.filter((transaction) => {
            const sameSource = transaction.source === 'service_inventory_purchase';
            const samePayment = transaction.payment_method === 'credit';
            const sameAmount = Math.abs(Number(transaction.amount || 0) - Number(movement.total_cost || 0)) < 0.01;
            const sameSupplier =
              !movement.supplier_id || !transaction.supplier_id || Number(transaction.supplier_id) === Number(movement.supplier_id);
            const sameDate = !movement.created_at || transaction.date === movement.created_at.slice(0, 10);
            const movementNote = String(movement.notes || '').split('|')[0].trim();
            const transactionNote = String(transaction.notes || '').trim();
            const noteMatches =
              !movementNote ||
              !transactionNote ||
              transactionNote === movementNote ||
              transactionNote === item?.name ||
              transactionNote.includes(movementNote);

            return sameSource && samePayment && sameAmount && sameSupplier && sameDate && noteMatches;
          })
        : [];

    if (movement.transaction_id) {
      const transactionDeleted = await deleteTransaction(Number(movement.transaction_id));
      if (!transactionDeleted) {
        await adjustServiceInventoryStock(Number(movement.item_id), Number(movement.quantity) || 0);
        alert('Δεν διαγράφηκε η συνδεδεμένη οικονομική κίνηση. Η αναστροφή ακυρώθηκε.');
        return false;
      }
    }

    if (movement.payment_method === 'credit') {
      for (const transaction of legacyCreditExpenseTransactions) {
        if (movement.transaction_id && Number(transaction.id) === Number(movement.transaction_id)) continue;
        const transactionDeleted = await deleteTransaction(Number(transaction.id));
        if (!transactionDeleted) {
          await adjustServiceInventoryStock(Number(movement.item_id), Number(movement.quantity) || 0);
          alert('Δεν διαγράφηκε παλιά λανθασμένη κίνηση εξόδου για πιστωτική αγορά αποθήκης.');
          return false;
        }
      }

      const supplierDebtId = readDebtMarker(movement.notes, 'supplier_debt');
      if (supplierDebtId) {
        const debtDeleted = await deleteDebt(supplierDebtId);
        if (!debtDeleted) {
          await adjustServiceInventoryStock(Number(movement.item_id), Number(movement.quantity) || 0);
          alert('Δεν διαγράφηκε η πίστωση προμηθευτή. Η αναστροφή ακυρώθηκε.');
          return false;
        }
      } else {
        console.warn('Credit inventory purchase movement has no supplier debt marker. Supplier credit may need manual cleanup.', {
          movementId: movement.id,
        });
      }
    } else if (!movement.transaction_id) {
      console.warn('Paid inventory purchase movement has no transaction_id. Only stock and movement will be reversed.', {
        movementId: movement.id,
      });
    }

    const movementDeleted = await deleteServiceInventoryMovement(Number(movement.id));
    if (!movementDeleted) {
      await adjustServiceInventoryStock(Number(movement.item_id), Number(movement.quantity) || 0);
      alert('Δεν διαγράφηκε η κίνηση αγοράς αποθήκης.');
      return false;
    }

    return true;
  };

  const handleDeletePurchaseMovement = async (movement: ServiceInventoryMovement) => {
    if (!window.confirm('Να διαγραφεί / αναστραφεί αυτή η αγορά αποθήκης;')) return;

    const reversed = await reversePurchaseMovement(movement);
    if (reversed) {
      await loadData();
    }
  };

  const handleCreateMaterialType = async () => {
    if (!selectedCatalogServiceType?.id) {
      setMaterialTypeMessage(
        materialCatalogMissing
          ? 'Τρέξτε πρώτα τη migration για service_inventory_service_types και service_inventory_material_types.'
          : 'Επιλέξτε τύπο service.'
      );
      return;
    }

    const cleanName = newMaterialTypeName.trim();
    if (!cleanName) {
      setMaterialTypeMessage('Συμπληρώστε όνομα τύπου υλικού.');
      return;
    }

    const normalized = cleanName.toLowerCase();
    const duplicateInSelectedService = selectedCatalogServiceType.materialTypes.some(
      (option) => option.value.toLowerCase() === normalized || option.label.toLowerCase() === normalized
    );
    if (duplicateInSelectedService) {
      setMaterialTypeMessage('Αυτός ο τύπος υλικού υπάρχει ήδη στον επιλεγμένο τύπο service.');
      return;
    }

    const existingMaterial = customMaterialTypes.find((type) => type.name.trim().toLowerCase() === normalized);
    if (existingMaterial) {
      if (!selectedCatalogServiceType.id) {
        setMaterialTypeMessage('Δεν υπάρχει id για τον επιλεγμένο τύπο service.');
        return;
      }

      const linked = await linkServiceInventoryMaterialTypeToServiceType(selectedCatalogServiceType.id, existingMaterial.id);
      if (!linked) {
        setMaterialTypeMessage('Δεν συνδέθηκε ο τύπος υλικού με τον τύπο service.');
        return;
      }
    } else {
      const created = await createServiceInventoryMaterialType(cleanName, selectedCatalogServiceType.id);
      if (!created.success) {
        setMaterialTypeMessage(
          created.reason === 'missing_table'
            ? 'Οι πίνακες service inventory catalog δεν υπάρχουν ακόμα στο Supabase. Τρέξτε τη migration και ξαναδοκιμάστε.'
            : created.reason === 'duplicate'
              ? 'Υπάρχει ήδη τύπος υλικού με αυτό το όνομα.'
              : 'Ο τύπος υλικού δεν αποθηκεύτηκε.'
        );
        return;
      }
    }

    setNewMaterialTypeName('');
    setMaterialTypeMessage('');
    await loadData();
  };

  const handleCreateServiceType = async () => {
    const cleanName = newServiceTypeName.trim();
    if (!cleanName) {
      setMaterialTypeMessage('Συμπληρώστε όνομα τύπου service.');
      return;
    }

    const duplicate = serviceTypeCatalogOptions.some((serviceType) => serviceType.name.toLowerCase() === cleanName.toLowerCase());
    if (duplicate) {
      setMaterialTypeMessage('Υπάρχει ήδη τύπος service με αυτό το όνομα.');
      return;
    }

    const created = await createServiceInventoryServiceType(cleanName);
    if (!created.success) {
      setMaterialTypeMessage(
        created.reason === 'missing_table'
          ? 'Ο πίνακας service_inventory_service_types δεν υπάρχει ακόμα στο Supabase. Τρέξτε τη migration.'
          : created.reason === 'duplicate'
            ? 'Υπάρχει ήδη τύπος service με αυτό το όνομα.'
            : 'Ο τύπος service δεν αποθηκεύτηκε.'
      );
      return;
    }

    setNewServiceTypeName('');
    setSelectedCatalogServiceTypeId(created.record.id);
    setMaterialTypeMessage('');
    await loadData();
  };

  const handleUpdateServiceType = async () => {
    if (!editingServiceTypeId) return;
    const cleanName = editingServiceTypeName.trim();
    if (!cleanName) {
      setMaterialTypeMessage('Συμπληρώστε όνομα τύπου service.');
      return;
    }

    const saved = await updateServiceInventoryServiceType(editingServiceTypeId, cleanName);
    if (!saved) {
      setMaterialTypeMessage('Ο τύπος service δεν ενημερώθηκε.');
      return;
    }

    setEditingServiceTypeId(null);
    setEditingServiceTypeName('');
    setMaterialTypeMessage('');
    await loadData();
  };

  const handleDeleteServiceType = async () => {
    if (!selectedCatalogServiceType?.id) {
      setMaterialTypeMessage('Δεν υπάρχει id για αυτόν τον τύπο service.');
      return;
    }

    if (!window.confirm('Θέλετε σίγουρα να διαγράψετε αυτόν τον τύπο service;')) return;

    const deleted = await deleteServiceInventoryServiceType(selectedCatalogServiceType.id);
    if (!deleted) {
      setMaterialTypeMessage('Ο τύπος service δεν διαγράφηκε.');
      return;
    }

    setSelectedCatalogServiceTypeId(null);
    setEditingServiceTypeId(null);
    setEditingServiceTypeName('');
    setMaterialTypeMessage('');
    await loadData();
  };

  const handleRemoveMaterialFromServiceType = async (materialTypeId?: number) => {
    if (!selectedCatalogServiceType?.id || !materialTypeId) {
      setMaterialTypeMessage('Δεν υπάρχει id για τον τύπο service ή το υλικό.');
      return;
    }

    const removed = await unlinkServiceInventoryMaterialTypeFromServiceType(selectedCatalogServiceType.id, materialTypeId);
    if (!removed) {
      setMaterialTypeMessage('Δεν αφαιρέθηκε ο τύπος υλικού από τον τύπο service.');
      return;
    }

    setMaterialTypeMessage('');
    await loadData();
  };
  const handleEditInventoryItem = (item: ServiceInventoryItem) => {
    const latestPurchase = inventoryMovements
      .filter((movement) => Number(movement.item_id) === Number(item.id) && movement.movement_type === 'purchase')
      .sort((left, right) => String(right.created_at || '').localeCompare(String(left.created_at || '')))[0];

    setEditingInventoryItemId(Number(item.id));
    setEditingInventoryMovementId(latestPurchase ? Number(latestPurchase.id) : null);
    const itemServiceType =
      serviceTypeCatalogOptions.find((serviceType) => serviceType.materialTypes.some((materialType) => materialType.value === item.type))
        ?.name || initialInventoryForm.service_type;
    setInventoryForm({
      name: item.name || '',
      service_type: itemServiceType,
      type: item.type,
      brand: item.brand || '',
      size_or_spec: item.size_or_spec || '',
      supplier_id: latestPurchase?.supplier_id ? String(latestPurchase.supplier_id) : item.supplier_id ? String(item.supplier_id) : '',
      unit_cost: String(latestPurchase?.unit_cost || item.unit_cost || ''),
      quantity: String(latestPurchase?.quantity || item.current_stock || ''),
      payment_method: latestPurchase?.payment_method || 'cash',
      notes: stripDebtMarkers(latestPurchase?.notes) || '',
    });
  };

  const handleUpdateInventoryItem = async () => {
    if (!editingInventoryItemId) return;

    const quantity = Number(inventoryForm.quantity || 0);
    const unitCost = Number(inventoryForm.unit_cost || 0);
    if (!inventoryForm.name.trim()) {
      alert('Συμπληρώστε όνομα υλικού.');
      return;
    }
    if (Number.isNaN(quantity) || quantity <= 0 || Number.isNaN(unitCost) || unitCost < 0) {
      alert('Ελέγξτε ποσότητα και τιμή μονάδας.');
      return;
    }
    if (inventoryForm.payment_method === 'credit' && !inventoryForm.supplier_id) {
      alert('Επιλέξτε προμηθευτή για αγορά αποθήκης επί πιστώσει.');
      return;
    }

    const purchaseMovement = editingInventoryMovementId
      ? inventoryMovements.find((movement) => Number(movement.id) === Number(editingInventoryMovementId))
      : null;
    const supplierId = inventoryForm.supplier_id ? Number(inventoryForm.supplier_id) : null;
    const totalCost = quantity * unitCost;

    const updated = await updateServiceInventoryItem(editingInventoryItemId, {
      name: inventoryForm.name.trim(),
      type: inventoryForm.type,
      brand: inventoryForm.brand.trim() || null,
      size_or_spec: inventoryForm.size_or_spec.trim() || null,
      supplier_id: supplierId,
      unit_cost: unitCost,
    });

    if (!updated) return;

    if (purchaseMovement) {
      const reconciledStock = await reconcileServiceInventoryStock(editingInventoryItemId);
      if (reconciledStock === null) return;

      const oldQuantity = Number(purchaseMovement.quantity || 0);
      const quantityDelta = quantity - oldQuantity;
      if (quantityDelta !== 0) {
        const stockAdjusted = await adjustServiceInventoryStock(editingInventoryItemId, quantityDelta);
        if (!stockAdjusted) {
          alert('Δεν υπάρχει αρκετό stock για τη μείωση αυτής της αγοράς.');
          await loadData();
          return;
        }
      }

      if (purchaseMovement.transaction_id) {
        const deleted = await deleteTransaction(Number(purchaseMovement.transaction_id));
        if (!deleted) {
          alert('Δεν διαγράφηκε η παλιά οικονομική κίνηση αγοράς.');
          await loadData();
          return;
        }
      }

      const oldDebtId = readDebtMarker(purchaseMovement.notes, 'supplier_debt');
      if (oldDebtId) {
        const deleted = await deleteDebt(oldDebtId);
        if (!deleted) {
          alert('Δεν διαγράφηκε η παλιά πίστωση προμηθευτή.');
          await loadData();
          return;
        }
      }

      const legacyCreditExpenseTransactions = transactions.filter((transaction) => {
        const sameSource = transaction.source === 'service_inventory_purchase';
        const samePayment = transaction.payment_method === 'credit';
        const sameAmount = Math.abs(Number(transaction.amount || 0) - Number(purchaseMovement.total_cost || 0)) < 0.01;
        const sameSupplier =
          !purchaseMovement.supplier_id || !transaction.supplier_id || Number(transaction.supplier_id) === Number(purchaseMovement.supplier_id);
        return sameSource && samePayment && sameAmount && sameSupplier;
      });

      for (const transaction of legacyCreditExpenseTransactions) {
        await deleteTransaction(Number(transaction.id));
      }

      let nextTransactionId: number | null = null;
      let nextDebtId: number | null = null;

      if (totalCost > 0 && inventoryForm.payment_method === 'credit') {
        const debt = await addDebt({
          title: `Αγορά αποθήκης: ${inventoryForm.name.trim()}`,
          supplier_id: Number(supplierId),
          category: inventoryExpenseCategoryByType[inventoryForm.type] || 'Αποθήκη Service',
          original_amount: totalCost,
          paid_amount: 0,
          notes: [inventoryForm.notes.trim(), debtMarker('service_inventory_item', editingInventoryItemId)].filter(Boolean).join(' | '),
        });

        if (!debt) {
          alert('Δεν δημιουργήθηκε νέα πίστωση προμηθευτή.');
          await loadData();
          return;
        }
        nextDebtId = Number(debt.id);
      } else if (totalCost > 0) {
        const transaction = await addTransaction({
          type: 'expense',
          source: 'service_inventory_purchase',
          amount: totalCost,
          date: purchaseMovement.created_at?.slice(0, 10) || new Date().toISOString().split('T')[0],
          payment_method: inventoryForm.payment_method,
          supplier_id: supplierId,
          category: inventoryExpenseCategoryByType[inventoryForm.type] || 'Αποθήκη Service',
          notes: inventoryForm.notes.trim() || inventoryForm.name.trim(),
        });

        if (!transaction) {
          alert('Δεν δημιουργήθηκε νέα οικονομική κίνηση αγοράς.');
          await loadData();
          return;
        }
        nextTransactionId = Number(transaction.id);
      }

      const movementNotes = [
        inventoryForm.notes.trim(),
        nextDebtId ? debtMarker('supplier_debt', nextDebtId) : '',
      ]
        .filter(Boolean)
        .join(' | ') || null;

      const movementUpdated = await updateServiceInventoryMovement(Number(purchaseMovement.id), {
        quantity,
        unit_cost: unitCost,
        total_cost: totalCost,
        supplier_id: supplierId,
        payment_method: inventoryForm.payment_method,
        transaction_id: nextTransactionId,
        notes: movementNotes,
      });

      if (!movementUpdated) {
        alert('Δεν ενημερώθηκε η κίνηση αγοράς αποθήκης.');
        await loadData();
        return;
      }
    }

    setEditingInventoryItemId(null);
    setEditingInventoryMovementId(null);
    setInventoryForm(initialInventoryForm);
    await loadData();
  };

  const handleDeleteInventoryItem = async (item: ServiceInventoryItem) => {
    if (!window.confirm('Να διαγραφεί αυτό το είδος αποθήκης και οι αγορές του;')) return;

    const itemMovements = inventoryMovements.filter((movement) => Number(movement.item_id) === Number(item.id));
    const hasUsageHistory = itemMovements.some((movement) => movement.movement_type === 'usage');
    if (hasUsageHistory) {
      alert('This item has service usage history. Delete is blocked or must be reversed carefully.');
      return;
    }

    for (const movement of itemMovements.filter((candidate) => candidate.movement_type === 'purchase')) {
      const reversed = await reversePurchaseMovement(movement);
      if (!reversed) {
        await loadData();
        return;
      }
    }

    const deleted = await deleteServiceInventoryItem(Number(item.id));
    if (!deleted) return;

    await loadData();
  };

  return (
    <div className="space-y-5 text-white">
      <div className="flex items-center justify-between rounded-3xl border border-orange-300/10 bg-[linear-gradient(135deg,rgba(249,115,22,0.08),rgba(8,12,18,0.36)_45%,rgba(255,255,255,0.02))] px-5 py-4 shadow-[0_20px_54px_rgba(0,0,0,0.24)] transition duration-200 hover:border-orange-200/16 hover:shadow-[0_24px_64px_rgba(0,0,0,0.28),0_0_34px_rgba(249,115,22,0.055)]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-200/65">Fleet maintenance</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Service</h1>
          <p className="mt-2 text-sm text-zinc-400">Ιστορικό συντήρησης και οικονομικές κινήσεις service.</p>
        </div>
        <button
          type="button"
          onClick={openAddServiceModal}
          className="erp-action-primary rounded-2xl border border-orange-400/30 bg-orange-400/10 px-4 py-3 text-sm font-semibold text-orange-100 shadow-[0_0_22px_rgba(249,115,22,0.08)] transition duration-200 hover:-translate-y-px hover:border-orange-300/45 hover:bg-orange-400/16 hover:shadow-[0_0_28px_rgba(249,115,22,0.13)]"
        >
          + Καταχώρηση Service
        </button>
      </div>

      <div className="flex flex-wrap gap-2 rounded-3xl border border-white/[0.06] bg-white/[0.02] p-2">
        {[
          { id: 'history' as const, label: 'Service History' },
          { id: 'checklist' as const, label: 'Annual Service Checklist' },
          { id: 'inventory' as const, label: 'Αποθήκη' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveServiceTab(tab.id)}
            className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition duration-200 ${
              activeServiceTab === tab.id
                ? 'border border-orange-300/25 bg-orange-400/12 text-orange-100 shadow-[0_0_24px_rgba(249,115,22,0.08)]'
                : 'border border-transparent text-zinc-400 hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-zinc-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeServiceTab === 'history' ? (
        selectedCar ? (
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
            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] px-5 py-10 text-center text-sm text-zinc-400 shadow-[0_18px_48px_rgba(0,0,0,0.22)]">
              Δεν υπάρχει ιστορικό service για αυτό το αυτοκίνητο.
            </div>
          ) : (
            <div className="space-y-4">
              {serviceRowsByYear.map(([year, yearRows]) => {
                const expanded = Boolean(expandedYears[year]);
                return (
                <section key={year} className="overflow-hidden rounded-3xl border border-white/[0.075] bg-white/[0.025] shadow-[0_18px_48px_rgba(0,0,0,0.22)] transition duration-200 hover:-translate-y-px hover:border-orange-200/14 hover:shadow-[0_22px_56px_rgba(0,0,0,0.26),0_0_28px_rgba(249,115,22,0.045)]">
                  <button
                    type="button"
                    onClick={() => setExpandedYears((current) => ({ ...current, [year]: !current[year] }))}
                    className="flex w-full items-center justify-between border-b border-white/[0.06] bg-white/[0.035] px-5 py-3 text-left text-sm font-semibold text-white transition hover:bg-orange-300/[0.045]"
                  >
                    <span>{year}</span>
                    <span className="text-zinc-400">{expanded ? '−' : '+'}</span>
                  </button>
                  {expanded && <div className="overflow-x-auto">
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
                            'Ενέργειες',
                          ].map((label) => (
                            <th key={label} className="px-4 py-3 text-xs font-medium text-zinc-400">
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {yearRows.map(({ service, partsCost, laborCost, partsDescription }) => (
                          <tr key={service.id} className="border-t border-white/[0.055] transition duration-200 hover:bg-white/[0.035]">
                            <td className="px-4 py-4 text-sm text-zinc-200">{service.service_date}</td>
                            <td className="px-4 py-4 text-sm text-zinc-200">{service.km || '-'}</td>
                            <td className="px-4 py-4 text-sm text-zinc-200">{service.description || '-'}</td>
                            <td className="px-4 py-4 text-sm text-zinc-200">{partsDescription}</td>
                            <td className="px-4 py-4 text-sm text-zinc-200">{money(partsCost)}</td>
                            <td className="px-4 py-4 text-sm text-zinc-200">{money(laborCost)}</td>
                            <td className="px-4 py-4 text-sm font-semibold text-white">
                              {money(partsCost + laborCost)}
                            </td>
                            <td className="px-4 py-4 text-sm">
                              <div className="flex items-center gap-2 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => openEditServiceModal({ service, partsCost, laborCost, partsDescription })}
                                  className="rounded-xl border border-sky-400/24 bg-sky-400/10 px-3 py-2 text-xs text-sky-200 transition duration-200 hover:-translate-y-px hover:border-sky-300/38 hover:bg-sky-400/18"
                                >
                                  Επεξεργασία
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteService(service)}
                                  className="rounded-xl border border-rose-400/24 bg-rose-400/10 px-3 py-2 text-xs text-rose-200 transition duration-200 hover:-translate-y-px hover:border-rose-300/38 hover:bg-rose-400/18"
                                >
                                  Διαγραφή
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>}
                </section>
              );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/[0.075] bg-white/[0.025] shadow-[0_18px_58px_rgba(0,0,0,0.24)] transition duration-200 hover:border-orange-200/12 hover:shadow-[0_22px_64px_rgba(0,0,0,0.28),0_0_30px_rgba(249,115,22,0.04)]">
          <div className="border-b border-white/[0.06] bg-white/[0.025] p-4">
            <input
              value={serviceSearchTerm}
              onChange={(event) => setServiceSearchTerm(event.target.value)}
              placeholder="Search by plate, brand, model..."
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-950/80 px-4 py-3 text-sm text-white outline-none transition duration-200 placeholder:text-zinc-600 focus:border-orange-400/55 focus:ring-2 focus:ring-orange-400/15"
            />
          </div>
          <table className="w-full min-w-[920px] text-left">
            <thead className="bg-white/[0.035]">
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
              {filteredCarRows.map(({ car, latestServiceDate, serviceCount }) => (
                <tr key={car.id} className="border-t border-white/[0.055] transition duration-200 hover:bg-white/[0.035]">
                  <td className="px-4 py-4 text-sm font-medium text-white">{car.plate}</td>
                  <td className="px-4 py-4 text-sm text-zinc-200">{car.brand || '-'}</td>
                  <td className="px-4 py-4 text-sm text-zinc-200">{car.model || '-'}</td>
                  <td className="px-4 py-4 text-sm text-zinc-200">{car.km || '-'}</td>
                  <td className="px-4 py-4 text-sm text-zinc-200">{latestServiceDate}</td>
                  <td className="px-4 py-4 text-sm text-zinc-200">{serviceCount}</td>
                  <td className="px-4 py-4 text-sm">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedCarId(car.id)}
                        className="erp-action-primary rounded-2xl border border-orange-400/24 bg-orange-400/10 px-3 py-2 text-xs font-medium text-orange-200 transition duration-200 hover:-translate-y-px hover:border-orange-300/38 hover:bg-orange-400/18"
                      >
                        Ιστορικό Service
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCar(car.id)}
                        className="rounded-2xl border border-rose-400/24 bg-rose-400/10 px-3 py-2 text-xs font-medium text-rose-200 transition duration-200 hover:-translate-y-px hover:border-rose-300/38 hover:bg-rose-400/18"
                      >
                        Διαγραφή
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCarRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-500">
                    {carRows.length === 0 ? 'Δεν υπάρχουν αυτοκίνητα.' : 'No vehicles match this search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )) : activeServiceTab === 'checklist' ? (
        <div className="overflow-hidden rounded-3xl border border-white/[0.075] bg-white/[0.025] shadow-[0_18px_58px_rgba(0,0,0,0.24)] transition duration-200 hover:border-orange-200/12 hover:shadow-[0_22px_64px_rgba(0,0,0,0.28),0_0_30px_rgba(249,115,22,0.04)]">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.06] bg-white/[0.025] p-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-200/65">Annual Service Checklist</p>
              <h2 className="mt-1 text-lg font-semibold text-white">Ετήσιος Έλεγχος Service</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="space-y-1 text-xs font-semibold text-zinc-400">
                <span className="block">Year</span>
                <select
                  value={checklistYear}
                  onChange={(event) => setChecklistYear(event.target.value)}
                  className="rounded-2xl border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-white outline-none transition duration-200 focus:border-orange-400/55 focus:ring-2 focus:ring-orange-400/15"
                >
                  {checklistYearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex rounded-2xl border border-white/[0.07] bg-black/25 p-1">
                {[
                  { value: 'all' as const, label: 'All' },
                  { value: 'pending' as const, label: 'Pending' },
                  { value: 'done' as const, label: 'Done' },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setChecklistFilter(filter.value)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition duration-200 ${
                      checklistFilter === filter.value
                        ? 'bg-orange-400/14 text-orange-100'
                        : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left">
              <thead className="bg-white/[0.035]">
                <tr>
                  {[
                    { label: 'Plate', key: 'plate' as const },
                    { label: 'Brand', key: 'brand' as const },
                    { label: 'Model', key: 'model' as const },
                    { label: 'Service / Λάδια', key: 'normalServiceDone' as const },
                    { label: 'Ελαστικά', key: 'tiresDone' as const },
                    { label: 'Μπαταρία', key: 'batteryDone' as const },
                    { label: 'Last Action', key: 'lastAction' as const },
                    { label: 'Overall Status', key: 'overallStatus' as const },
                  ].map((column) => (
                    <th key={column.key} className="px-4 py-3 text-xs font-medium text-zinc-400">
                      <button
                        type="button"
                        onClick={() => handleChecklistSort(column.key)}
                        className="inline-flex items-center gap-1 rounded-lg px-1 py-1 text-left transition hover:bg-white/[0.04] hover:text-zinc-100"
                      >
                        <span>{column.label}</span>
                        {checklistSort.key === column.key && (
                          <span className="text-orange-200">{checklistSort.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-xs font-medium text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {annualChecklistRows.map(({ car, normalServiceDone, tiresDone, batteryDone, lastAction, latestService, overallStatus }) => {
                  const rowKey = `${checklistYear}:${car.id}`;
                  const isEditingChecklist = editingChecklistKey === rowKey;

                  return (
                  <tr
                    key={car.id}
                    onDoubleClick={() => openAddServiceModalForCar(car.id)}
                    className="cursor-default border-t border-white/[0.055] transition duration-200 hover:bg-white/[0.035]"
                    title="Double click to add service"
                  >
                    <td className="px-4 py-4 text-sm font-semibold text-white">{car.plate}</td>
                    <td className="px-4 py-4 text-sm text-zinc-200">{car.brand || '-'}</td>
                    <td className="px-4 py-4 text-sm text-zinc-200">{car.model || '-'}</td>
                    <td className="px-4 py-4 text-sm">
                      {isEditingChecklist ? (
                        <ChecklistStatusToggle done={normalServiceDone} onChange={(value) => toggleChecklistOverride(car.id, 'normalServiceDone', value)} />
                      ) : (
                        <ChecklistBadge done={normalServiceDone} />
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      {isEditingChecklist ? (
                        <ChecklistStatusToggle done={tiresDone} onChange={(value) => toggleChecklistOverride(car.id, 'tiresDone', value)} />
                      ) : (
                        <ChecklistBadge done={tiresDone} />
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      {isEditingChecklist ? (
                        <ChecklistStatusToggle done={batteryDone} onChange={(value) => toggleChecklistOverride(car.id, 'batteryDone', value)} />
                      ) : (
                        <ChecklistBadge done={batteryDone} />
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-zinc-200">{lastAction}</td>
                    <td className="px-4 py-4 text-sm">
                      <OverallChecklistBadge status={overallStatus} />
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCarId(car.id);
                            setActiveServiceTab('history');
                            setExpandedYears((current) => ({ ...current, [checklistYear]: true }));
                          }}
                          className="rounded-xl border border-sky-400/24 bg-sky-400/10 px-3 py-2 text-xs font-semibold text-sky-200 transition duration-200 hover:-translate-y-px hover:border-sky-300/38 hover:bg-sky-400/18"
                        >
                          Προβολή
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditingChecklist) {
                              setEditingChecklistKey(null);
                              return;
                            }

                            startEditChecklistRow(car.id, { normalServiceDone, tiresDone, batteryDone });
                          }}
                          className="rounded-xl border border-orange-400/24 bg-orange-400/10 px-3 py-2 text-xs font-semibold text-orange-200 transition duration-200 hover:-translate-y-px hover:border-orange-300/38 hover:bg-orange-400/18"
                        >
                          {isEditingChecklist ? 'Τέλος' : 'Επεξεργασία'}
                        </button>
                        {latestService && (
                          <button
                            type="button"
                            onClick={() => handleDeleteService(latestService)}
                            className="rounded-xl border border-rose-400/24 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200 transition duration-200 hover:-translate-y-px hover:border-rose-300/38 hover:bg-rose-400/18"
                          >
                            Διαγραφή τελευταίου
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
                {annualChecklistRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-sm text-zinc-500">
                      Δεν υπάρχουν αυτοκίνητα για το επιλεγμένο φίλτρο.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
          <section className="rounded-3xl border border-white/[0.075] bg-white/[0.025] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.24)]">
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-200/65">Service inventory</p>
              <h2 className="mt-1 text-lg font-semibold text-white">Νέο είδος / αγορά</h2>
              <p className="mt-1 text-xs text-zinc-500">Η αγορά αυξάνει το stock και δημιουργεί μία οικονομική κίνηση.</p>
            </div>
            <div className="grid gap-3">
              <Field label="Όνομα Υλικού">
                <input value={inventoryForm.name} onChange={(event) => setInventoryForm({ ...inventoryForm, name: event.target.value })} className="input" />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Τύπος Service">
                  <select
                    value={inventoryForm.service_type}
                    onChange={(event) =>
                      setInventoryForm({
                        ...inventoryForm,
                        service_type: event.target.value,
                        type:
                          serviceTypeCatalogOptions.find((serviceType) => serviceType.name === event.target.value)?.materialTypes[0]?.value ||
                          inventoryForm.type,
                      })
                    }
                    className="input"
                  >
                    {serviceTypeSelectOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Τύπος Υλικού">
                  <select value={inventoryForm.type} onChange={(event) => setInventoryForm({ ...inventoryForm, type: event.target.value as ServiceInventoryType })} className="input">
                    {filteredInventoryTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Brand">
                  <input value={inventoryForm.brand} onChange={(event) => setInventoryForm({ ...inventoryForm, brand: event.target.value })} className="input" />
                </Field>
              </div>
              <Field label={inventorySpecLabel}>
                <input value={inventoryForm.size_or_spec} onChange={(event) => setInventoryForm({ ...inventoryForm, size_or_spec: event.target.value })} className="input" />
              </Field>
              <SupplierSelect
                label="Προμηθευτής"
                value={inventoryForm.supplier_id}
                suppliers={suppliers}
                onChange={(value) => setInventoryForm({ ...inventoryForm, supplier_id: value })}
                clearButtonLabel="Καθαρισμός προμηθευτή"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Ποσότητα">
                  <input value={inventoryForm.quantity} onChange={(event) => setInventoryForm({ ...inventoryForm, quantity: event.target.value })} className="input" />
                </Field>
                <Field label="Τιμή Μονάδας">
                  <input value={inventoryForm.unit_cost} onChange={(event) => setInventoryForm({ ...inventoryForm, unit_cost: event.target.value })} className="input" />
                </Field>
              </div>
              <Field label="Συνολικό Ποσό">
                <div className="input flex items-center text-sm font-bold text-orange-100">
                  {money((Number(inventoryForm.quantity || 0) || 0) * (Number(inventoryForm.unit_cost || 0) || 0))}
                </div>
              </Field>
              <PaymentSelect label="Τρόπος Πληρωμής" value={inventoryForm.payment_method} onChange={(value) => setInventoryForm({ ...inventoryForm, payment_method: value })} />
              <Field label="Σημειώσεις">
                <textarea value={inventoryForm.notes} onChange={(event) => setInventoryForm({ ...inventoryForm, notes: event.target.value })} className="input min-h-20" />
              </Field>
              <button
                type="button"
                onClick={editingInventoryItemId ? handleUpdateInventoryItem : handleInventoryPurchase}
                disabled={isSavingInventory}
                className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-bold text-black transition duration-200 hover:-translate-y-px hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingInventory ? 'Αποθήκευση...' : editingInventoryItemId ? 'Αποθήκευση αλλαγών' : 'Καταχώρηση αγοράς'}
              </button>
              {editingInventoryItemId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingInventoryItemId(null);
                    setInventoryForm(initialInventoryForm);
                  }}
                  className="rounded-2xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-300 transition duration-200 hover:-translate-y-px hover:bg-white/[0.04]"
                >
                  Ακύρωση επεξεργασίας
                </button>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-white/[0.075] bg-white/[0.025] shadow-[0_18px_58px_rgba(0,0,0,0.24)]">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] bg-white/[0.025] p-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Αποθήκη Service</h2>
                <p className="mt-1 text-xs text-zinc-500">Τρέχον stock ανά είδος. Η χρήση σε service μειώνει stock και καταγράφει κόστος στο συγκεκριμένο service.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMaterialTypeMessage('');
                  setNewMaterialTypeName('');
                  setNewServiceTypeName('');
                  setEditingServiceTypeId(null);
                  setEditingServiceTypeName('');
                  setSelectedCatalogServiceTypeId(serviceTypeCatalogOptions[0]?.id ?? null);
                  setShowMaterialTypeModal(true);
                }}
                className="rounded-xl border border-orange-400/24 bg-orange-400/10 px-3 py-2 text-xs font-semibold text-orange-200 transition duration-200 hover:-translate-y-px hover:border-orange-300/38 hover:bg-orange-400/18"
              >
                + Διαχείριση Τύπων Service
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-white/[0.035]">
                  <tr>
                    {['Τύπος', 'Είδος', 'Spec', 'Stock', 'Unit Cost', 'Προμηθευτής', 'Ενέργειες'].map((label) => (
                      <th key={label} className="px-4 py-3 text-xs font-medium text-zinc-400">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inventoryItems.filter((item) => Number(item.current_stock) > 0).map((item) => (
                    <tr key={item.id} className="border-t border-white/[0.055] transition duration-200 hover:bg-white/[0.035]">
                      <td className="px-4 py-4 text-sm text-zinc-200">{inventoryTypeOptions.find((option) => option.value === item.type)?.label || item.type}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-white">{item.name}</td>
                      <td className="px-4 py-4 text-sm text-zinc-200">{[item.brand, item.size_or_spec].filter(Boolean).join(' / ') || '-'}</td>
                      <td className="px-4 py-4 text-sm font-bold text-orange-100">{item.current_stock}</td>
                      <td className="px-4 py-4 text-sm text-zinc-200">{money(item.unit_cost)}</td>
                      <td className="px-4 py-4 text-sm text-zinc-200">{suppliers.find((supplier) => supplier.id === item.supplier_id)?.name || '-'}</td>
                      <td className="px-4 py-4 text-sm">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleEditInventoryItem(item)}
                            className="rounded-xl border border-sky-400/24 bg-sky-400/10 px-3 py-2 text-xs font-semibold text-sky-200 transition duration-200 hover:-translate-y-px hover:border-sky-300/38 hover:bg-sky-400/18"
                          >
                            Επεξεργασία
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteInventoryItem(item)}
                            className="rounded-xl border border-rose-400/24 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200 transition duration-200 hover:-translate-y-px hover:border-rose-300/38 hover:bg-rose-400/18"
                          >
                            Διαγραφή
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {inventoryItems.filter((item) => Number(item.current_stock) > 0).length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-500">Δεν υπάρχουν είδη αποθήκης.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-white/[0.075] bg-white/[0.025] shadow-[0_18px_58px_rgba(0,0,0,0.24)] xl:col-span-2">
            <div className="border-b border-white/[0.06] bg-white/[0.025] p-4">
              <h2 className="text-lg font-semibold text-white">Κινήσεις Αποθήκης</h2>
              <p className="mt-1 text-xs text-zinc-500">Αγορές αυξάνουν stock. Χρήσεις από service μειώνουν stock χωρίς δεύτερο έξοδο.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead className="bg-white/[0.035]">
                  <tr>
                    {['Ημερομηνία', 'Κίνηση', 'Είδος', 'Ποσότητα', 'Κόστος', 'Σημειώσεις', 'Ενέργειες'].map((label) => (
                      <th key={label} className="px-4 py-3 text-xs font-medium text-zinc-400">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inventoryMovements.slice(0, 12).map((movement) => {
                    const item = inventoryItems.find((inventoryItem) => inventoryItem.id === movement.item_id);
                    return (
                      <tr key={movement.id} className="border-t border-white/[0.055] transition duration-200 hover:bg-white/[0.035]">
                        <td className="px-4 py-4 text-sm text-zinc-200">{movement.created_at?.slice(0, 10) || '-'}</td>
                        <td className="px-4 py-4 text-sm">
                          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${
                            movement.movement_type === 'purchase'
                              ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-200'
                              : movement.movement_type === 'usage'
                                ? 'border-orange-300/25 bg-orange-400/10 text-orange-200'
                                : 'border-sky-300/25 bg-sky-400/10 text-sky-200'
                          }`}>
                            {movement.movement_type}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-white">{item?.name || `#${movement.item_id}`}</td>
                        <td className="px-4 py-4 text-sm text-zinc-200">{movement.quantity}</td>
                        <td className="px-4 py-4 text-sm text-zinc-200">{money(movement.total_cost)}</td>
                        <td className="px-4 py-4 text-sm text-zinc-400">{movement.notes || '-'}</td>
                        <td className="px-4 py-4 text-sm">
                          {movement.movement_type === 'purchase' ? (
                            <button
                              type="button"
                              onClick={() => handleDeletePurchaseMovement(movement)}
                              className="rounded-xl border border-rose-400/24 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200 transition duration-200 hover:-translate-y-px hover:border-rose-300/38 hover:bg-rose-400/18"
                            >
                              Διαγραφή
                            </button>
                          ) : (
                            <span className="text-xs text-zinc-600">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {inventoryMovements.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-500">Δεν υπάρχουν κινήσεις αποθήκης.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {showMaterialTypeModal &&
        modalRootReady &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
            <div className="w-[min(900px,94vw)] overflow-hidden rounded-[28px] border border-orange-300/14 bg-[linear-gradient(180deg,rgba(18,24,33,0.98),rgba(8,12,18,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.62),0_0_44px_rgba(249,115,22,0.06)]">
              <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-200/70">Service catalog</p>
                  <h2 className="mt-1 text-lg font-semibold text-white">Διαχείριση Τύπων Service</h2>
                  <p className="mt-1 text-xs text-zinc-500">Οργάνωσε κάθε τύπο service με τα δικά του υλικά αποθήκης.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMaterialTypeModal(false)}
                  className="rounded-xl px-3 py-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
                >
                  ×
                </button>
              </div>

              <div className="grid gap-4 p-5 lg:grid-cols-[300px_minmax(0,1fr)]">
                <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-white">Τύποι Service</h3>
                    {materialCatalogMissing && (
                      <span className="rounded-full border border-orange-300/24 bg-orange-400/10 px-2 py-1 text-[10px] font-bold text-orange-200">Fallback</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {serviceTypeCatalogOptions.map((serviceType) => {
                      const active = selectedCatalogServiceType?.name === serviceType.name;
                      return (
                        <button
                          key={serviceType.name}
                          type="button"
                          onClick={() => {
                            setSelectedCatalogServiceTypeId(serviceType.id ?? null);
                            setEditingServiceTypeId(null);
                            setEditingServiceTypeName('');
                            setMaterialTypeMessage('');
                          }}
                          className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition ${
                            active
                              ? 'border-orange-300/35 bg-orange-400/12 text-orange-100'
                              : 'border-white/[0.07] bg-black/20 text-zinc-300 hover:bg-white/[0.045] hover:text-white'
                          }`}
                        >
                          <span className="truncate">{serviceType.name}</span>
                          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-zinc-400">{serviceType.materialTypes.length}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 border-t border-white/[0.07] pt-3">
                    <p className="mb-2 text-xs font-semibold text-zinc-400">Νέος τύπος service</p>
                    <div className="flex gap-2">
                      <input
                        value={newServiceTypeName}
                        onChange={(event) => {
                          setNewServiceTypeName(event.target.value);
                          setMaterialTypeMessage('');
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') handleCreateServiceType();
                        }}
                        className="input h-10 flex-1 rounded-xl text-sm"
                        placeholder="π.χ. Φρένα"
                      />
                      <button
                        type="button"
                        onClick={handleCreateServiceType}
                        className="rounded-xl bg-orange-500 px-3 text-xs font-bold text-black transition hover:bg-orange-400"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-zinc-500">Επιλεγμένος τύπος service</p>
                      <h3 className="mt-1 text-base font-bold text-white">{selectedCatalogServiceType?.name || 'Τύπος service'}</h3>
                    </div>
                    {selectedCatalogServiceType?.id && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingServiceTypeId(selectedCatalogServiceType.id || null);
                            setEditingServiceTypeName(selectedCatalogServiceType.name);
                          }}
                          className="rounded-xl border border-sky-400/24 bg-sky-400/10 px-3 py-2 text-xs font-bold text-sky-200 transition hover:bg-sky-400/18"
                        >
                          Επεξεργασία
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteServiceType}
                          className="rounded-xl border border-rose-400/24 bg-rose-400/10 px-3 py-2 text-xs font-bold text-rose-200 transition hover:bg-rose-400/18"
                        >
                          Διαγραφή
                        </button>
                      </div>
                    )}
                  </div>

                  {editingServiceTypeId && (
                    <div className="mt-3 flex gap-2 rounded-2xl border border-sky-400/16 bg-sky-400/8 p-2">
                      <input
                        value={editingServiceTypeName}
                        onChange={(event) => setEditingServiceTypeName(event.target.value)}
                        className="input h-10 flex-1 rounded-xl text-sm"
                      />
                      <button type="button" onClick={handleUpdateServiceType} className="rounded-xl bg-sky-500 px-3 text-xs font-bold text-white">
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingServiceTypeId(null);
                          setEditingServiceTypeName('');
                        }}
                        className="rounded-xl border border-white/[0.08] px-3 text-xs font-bold text-zinc-300"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  <div className="mt-4 grid gap-2">
                    <p className="text-xs font-semibold text-zinc-400">Υλικά μέσα σε αυτόν τον τύπο service</p>
                    <div className="grid max-h-52 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                      {(selectedCatalogServiceType?.materialTypes || []).map((materialType) => (
                        <div
                          key={`${selectedCatalogServiceType?.name}-${materialType.value}`}
                          className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2"
                        >
                          <span className="truncate text-sm font-bold text-zinc-100">{materialType.label}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMaterialFromServiceType(materialType.id)}
                            className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-2 py-1 text-[10px] font-bold text-rose-200 transition hover:bg-rose-400/18"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      {(selectedCatalogServiceType?.materialTypes || []).length === 0 && (
                        <div className="rounded-xl border border-dashed border-white/[0.08] bg-black/16 px-3 py-4 text-sm font-semibold text-zinc-400">
                          Δεν υπάρχουν υλικά σε αυτόν τον τύπο service.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 border-t border-white/[0.07] pt-3">
                    <p className="mb-2 text-xs font-semibold text-zinc-400">Προσθήκη material type στον επιλεγμένο τύπο service</p>
                    <div className="flex gap-2">
                      <input
                        value={newMaterialTypeName}
                        onChange={(event) => {
                          setNewMaterialTypeName(event.target.value);
                          setMaterialTypeMessage('');
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') handleCreateMaterialType();
                          if (event.key === 'Escape') setShowMaterialTypeModal(false);
                        }}
                        className="input h-10 flex-1 rounded-xl text-sm"
                        placeholder="π.χ. Τακάκια"
                      />
                      <button
                        type="button"
                        onClick={handleCreateMaterialType}
                        className="rounded-xl bg-orange-500 px-4 text-xs font-bold text-black transition hover:bg-orange-400"
                      >
                        Add
                      </button>
                    </div>
                    {materialTypeMessage && <p className="mt-2 text-xs font-semibold text-orange-200">{materialTypeMessage}</p>}
                  </div>
                </section>
              </div>
            </div>
          </div>,
          document.body
        )}
      {showModal &&
        modalRootReady &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
            <div className="premium-window-in flex max-h-[86vh] w-[min(860px,92vw)] flex-col overflow-hidden rounded-[28px] border border-orange-300/14 bg-[linear-gradient(180deg,rgba(18,24,33,0.98),rgba(8,12,18,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.62),0_0_44px_rgba(249,115,22,0.06)]">
              <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-6 py-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-200/70">
                    Service
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-white">Καταχώρηση Service</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-transparent p-2 text-zinc-400 transition duration-200 hover:border-white/[0.08] hover:bg-white/[0.05] hover:text-white"
                  aria-label="Κλείσιμο"
                >
                  ✕
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <div className="space-y-5">
                  <section className="space-y-4 rounded-3xl border border-white/[0.055] bg-white/[0.018] p-4">
                    <SectionTitle>Βασικά Στοιχεία</SectionTitle>
                    <div className="grid gap-4 md:grid-cols-2">
                      <SearchableCombobox
                        label="Αυτοκίνητο"
                        value={form.car_id}
                        placeholder="Επιλογή αυτοκινήτου"
                        searchPlaceholder="Αναζήτηση πινακίδας / μάρκας / μοντέλου..."
                        options={cars.map((car) => ({
                          value: String(car.id),
                          label: `${car.plate} — ${car.brand} ${car.model}`.trim(),
                          description: car.km ? `${car.km} km` : undefined,
                          searchText: `${car.plate} ${car.brand} ${car.model}`,
                        }))}
                        onChange={(value) => setForm({ ...form, car_id: value })}
                      />
                      <Field label="Ημερομηνία">
                        <input type="date" value={form.service_date} onChange={(event) => setForm({ ...form, service_date: event.target.value })} className="input" />
                      </Field>
                      <Field label="Χλμ">
                        <input value={form.km} onChange={(event) => setForm({ ...form, km: event.target.value })} className="input" />
                      </Field>
                      <Field label="Περιγραφή εργασίας">
                        <input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="input" />
                      </Field>
                      <Field label="Τύπος Service">
                        <select
                          value={form.service_type}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              service_type: event.target.value,
                              inventory_item: '',
                              inventory_usages: [{ item_id: '', quantity: '1' }],
                            })
                          }
                          className="input"
                        >
                          {serviceTypeSelectOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </section>

                  <section className="space-y-4 rounded-3xl border border-white/[0.055] bg-white/[0.018] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <SectionTitle>Υλικά από αποθήκη</SectionTitle>
                      {isMultiMaterialService && (
                        <button
                          type="button"
                          onClick={addInventoryUsageRow}
                          className="rounded-xl border border-orange-400/24 bg-orange-400/10 px-3 py-2 text-xs font-semibold text-orange-200 transition hover:bg-orange-400/18"
                        >
                          + Προσθήκη υλικού
                        </button>
                      )}
                    </div>

                    {isMultiMaterialService ? (
                      <div className="space-y-3">
                        {form.inventory_usages.map((usageRow, index) => {
                          const selectedIds = form.inventory_usages
                            .map((row, rowIndex) => (rowIndex === index ? '' : row.item_id))
                            .filter(Boolean);
                          const availableItems = modalInventoryItems.filter((item) => !selectedIds.includes(String(item.id)) || String(item.id) === usageRow.item_id);

                          return (
                            <div key={index} className="grid gap-3 rounded-2xl border border-white/[0.06] bg-black/20 p-3 md:grid-cols-[minmax(0,1fr)_120px_auto] md:items-end">
                              <Field label="Υλικό">
                                <select value={usageRow.item_id} onChange={(event) => updateInventoryUsageRow(index, { item_id: event.target.value })} className="input">
                                  <option value="">Χωρίς επιλογή αποθήκης</option>
                                  {availableItems.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.name} — {item.size_or_spec || item.brand || 'Stock'} ({item.current_stock})
                                    </option>
                                  ))}
                                </select>
                              </Field>
                              <Field label="Ποσότητα">
                                <input
                                  type="number"
                                  min="1"
                                  value={usageRow.quantity}
                                  onChange={(event) => updateInventoryUsageRow(index, { quantity: event.target.value })}
                                  className="input"
                                />
                              </Field>
                              <button
                                type="button"
                                onClick={() => removeInventoryUsageRow(index)}
                                className="rounded-xl border border-rose-400/24 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/18"
                              >
                                Remove
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : isTireService ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Επιλογή ελαστικού από αποθήκη">
                          <select value={form.inventory_item} onChange={(event) => setForm({ ...form, inventory_item: event.target.value })} className="input">
                            <option value="">Χωρίς επιλογή αποθήκης</option>
                            {modalInventoryItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} — {item.size_or_spec || item.brand || 'Stock'} ({item.current_stock})
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Αριθμός ελαστικών">
                          <select value={form.tire_count} onChange={(event) => setForm({ ...form, tire_count: event.target.value })} className="input">
                            {['1', '2', '3', '4'].map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </Field>
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Επιλογή μπαταρίας από αποθήκη">
                          <select value={form.inventory_item} onChange={(event) => setForm({ ...form, inventory_item: event.target.value })} className="input">
                            <option value="">Χωρίς επιλογή αποθήκης</option>
                            {modalInventoryItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} — {item.size_or_spec || item.brand || 'Stock'} ({item.current_stock})
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Ποσότητα">
                          <input type="number" min="1" value={form.battery_quantity} onChange={(event) => setForm({ ...form, battery_quantity: event.target.value })} className="input" />
                        </Field>
                      </div>
                    )}
                  </section>

                  <section className="space-y-4 rounded-3xl border border-white/[0.055] bg-white/[0.018] p-4">
                    <SectionTitle>Εργασία Συνεργείου</SectionTitle>
                    <div className="grid gap-4 md:grid-cols-2">
                      <SupplierSelect
                        label="Συνεργείο / Προμηθευτής Εργασίας"
                        value={form.labor_supplier_id}
                        suppliers={suppliers}
                        onChange={(value) => setForm({ ...form, labor_supplier_id: value })}
                        clearButtonLabel="Καθαρισμός συνεργείου"
                      />
                      <CategorySelect label="Κατηγορία Εργασίας" value={form.labor_category} options={laborCategoryOptions} onChange={(value) => setForm({ ...form, labor_category: value })} />
                      <Field label="Ποσό Εργασίας">
                        <input value={form.labor_amount} onChange={(event) => setForm({ ...form, labor_amount: event.target.value })} className="input" />
                      </Field>
                      <PaymentSelect label="Τρόπος Πληρωμής Εργασίας" value={form.labor_payment_method} onChange={(value) => setForm({ ...form, labor_payment_method: value })} />
                    </div>
                  </section>
                </div>
              </div>

              <div className="flex shrink-0 justify-end gap-3 border-t border-white/[0.07] bg-black/20 px-6 py-4">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm text-zinc-300 transition duration-200 hover:-translate-y-px hover:bg-white/[0.04]">
                  Ακύρωση
                </button>
                <button type="button" onClick={handleSave} className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-black shadow-[0_0_24px_rgba(249,115,22,0.16)] transition duration-200 hover:-translate-y-px hover:bg-orange-400">
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

function ChecklistBadge({ done }: { done: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
        done
          ? 'border-emerald-300/30 bg-emerald-400/12 text-emerald-200'
          : 'border-orange-300/30 bg-orange-400/12 text-orange-200'
      }`}
    >
      {done ? 'DONE' : 'PENDING'}
    </span>
  );
}

function ChecklistStatusToggle({ done, onChange }: { done: boolean; onChange: (done: boolean) => void }) {
  return (
    <div className="inline-flex rounded-full border border-white/[0.08] bg-black/30 p-0.5">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
          done ? 'bg-emerald-400/18 text-emerald-100' : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200'
        }`}
      >
        DONE
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
          !done ? 'bg-orange-400/18 text-orange-100' : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200'
        }`}
      >
        PENDING
      </button>
    </div>
  );
}

function OverallChecklistBadge({ status }: { status: 'DONE' | 'ATTENTION' | 'PENDING' }) {
  const classes =
    status === 'DONE'
      ? 'border-emerald-300/30 bg-emerald-400/12 text-emerald-200'
      : status === 'ATTENTION'
        ? 'border-yellow-300/30 bg-yellow-400/12 text-yellow-100'
        : 'border-orange-300/30 bg-orange-400/12 text-orange-200';

  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${classes}`}>{status}</span>;
}

function SearchableCombobox({
  label,
  value,
  options,
  onChange,
  placeholder,
  searchPlaceholder,
  clearButtonLabel,
}: {
  label: string;
  value: string;
  options: ComboboxOption[];
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  clearButtonLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find((option) => option.value === value);
  const query = searchTerm.trim().toLowerCase();
  const filteredOptions = query
    ? options.filter((option) => option.searchText.toLowerCase().includes(query))
    : options;

  const selectOption = (nextValue: string) => {
    onChange(nextValue);
    setSearchTerm('');
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!(event.target instanceof Node)) return;
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative block space-y-2 text-sm text-zinc-300">
      <span>{label}</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
              event.preventDefault();
              setIsOpen(true);
            }
            if (event.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          className="input flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
          aria-expanded={isOpen}
        >
          <span className={selectedOption ? 'truncate text-zinc-100' : 'truncate text-zinc-500'}>
            {selectedOption?.label || placeholder}
          </span>
          <span className="text-xs text-zinc-500">⌄</span>
        </button>
        {clearButtonLabel && value && (
          <button
            type="button"
            onClick={() => selectOption('')}
            className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-400/10 text-lg font-semibold text-rose-200 transition duration-200 hover:-translate-y-px hover:border-rose-300/35 hover:bg-rose-400/16 hover:text-rose-100"
            aria-label={clearButtonLabel}
            title={clearButtonLabel}
          >
            ×
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-[10030] mt-2 overflow-hidden rounded-2xl border border-white/[0.12] bg-[#080d14] shadow-[0_22px_54px_rgba(0,0,0,0.62),0_0_24px_rgba(249,115,22,0.07)]">
          <div className="border-b border-white/[0.06] p-2">
            <input
              autoFocus
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setIsOpen(false);
                }
              }}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-white/[0.12] bg-black/45 px-3.5 py-2.5 text-sm font-medium text-zinc-50 outline-none transition duration-200 placeholder:text-zinc-400 focus:border-orange-300/45 focus:bg-black/55"
            />
          </div>

          {value && (
            <button
              type="button"
              onClick={() => selectOption('')}
              className="w-full border-b border-white/[0.06] px-3.5 py-2.5 text-left text-xs font-bold text-zinc-300 transition duration-200 hover:bg-white/[0.06] hover:text-white"
            >
              Καθαρισμός επιλογής
            </button>
          )}

          <div className="max-h-56 overflow-y-auto p-1.5">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-sm font-medium text-zinc-400">Δεν βρέθηκαν αποτελέσματα.</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectOption(option.value)}
                  className={`w-full rounded-xl px-3.5 py-3 text-left transition duration-200 hover:bg-orange-300/[0.11] hover:text-white ${
                    option.value === value ? 'bg-orange-300/[0.13] text-orange-50 ring-1 ring-orange-300/18' : 'text-zinc-100'
                  }`}
                >
                  <span className="block truncate text-[13px] font-bold leading-5 tracking-normal">{option.label}</span>
                  {option.description && (
                    <span className="mt-1 block truncate text-xs font-medium text-zinc-400">{option.description}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SupplierSelect({
  label,
  value,
  suppliers,
  onChange,
  clearButtonLabel,
}: {
  label: string;
  value: string;
  suppliers: SupplierRecord[];
  onChange: (value: string) => void;
  clearButtonLabel?: string;
}) {
  return (
    <SearchableCombobox
      label={label}
      value={value}
      placeholder="Επιλογή προμηθευτή"
      searchPlaceholder="Αναζήτηση προμηθευτή..."
      options={suppliers.map((supplier) => ({
        value: String(supplier.id),
        label: supplier.name,
        searchText: supplier.name,
      }))}
      onChange={onChange}
      clearButtonLabel={clearButtonLabel}
    />
  );
}

function CategorySelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <SearchableCombobox
      label={label}
      value={value}
      placeholder="Επιλογή κατηγορίας"
      searchPlaceholder="Αναζήτηση κατηγορίας..."
      options={options.map((option) => ({
        value: option,
        label: option,
        searchText: option,
      }))}
      onChange={onChange}
    />
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
