'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Trash2, X } from 'lucide-react';
import { fetchCars } from '@/lib/carsApi';

type Vehicle = {
  id: string;
  plate: string;
  model: string;
  group: string;
};

type CarRow = {
  id: string | number;
  plate?: string | null;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
};

type PlanningType = 'contract' | 'reservation' | 'conflict';

type PlanningEntry = {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  type: PlanningType;
  label: string;
  startDate: string;
  endDate: string;
  pickupTime: string;
  returnTime: string;
  phone: string;
  notes: string;
};

type PlanningDraft = Omit<PlanningEntry, 'id' | 'vehicleId' | 'vehiclePlate'>;

type DragSelection = {
  vehicleId: string;
  startDay: number;
  currentDay: number;
};

type ResizeState = {
  entryId: string;
  vehicleId: string;
  edge: 'start' | 'end';
  initialDay: number;
  currentDay: number;
};

type MoveState = {
  entryId: string;
  sourceVehicleId: string;
  targetVehicleId: string;
  initialDay: number;
  currentDay: number;
  grabOffset: number;
  durationDays: number;
  moved: boolean;
};

const GROUP_ORDER = ['A', 'B', 'C', 'D', 'D1', 'D2', 'E', 'H', 'H1', 'H2', 'H3', 'H4', 'H5', 'K', 'K1', 'K2'];
const FLEET_CALENDAR_STORAGE_KEY = 'autoclub_fleet_calendar_blocks_v1';

const INITIAL_PLANNING_ENTRIES: PlanningEntry[] = [
  { id: 'reservation-1', vehicleId: '', vehiclePlate: 'PKA 1815', startDate: '2026-06-03', endDate: '2026-06-07', label: 'A. Novak', type: 'reservation', pickupTime: '', returnTime: '', phone: '', notes: '' },
  { id: 'contract-1', vehicleId: '', vehiclePlate: 'PKA 4581', startDate: '2026-06-02', endDate: '2026-06-06', label: 'M. Bernard', type: 'contract', pickupTime: '', returnTime: '', phone: '', notes: '' },
  { id: 'reservation-2', vehicleId: '', vehiclePlate: 'PKA 4581', startDate: '2026-06-12', endDate: '2026-06-15', label: 'L. Rossi', type: 'reservation', pickupTime: '', returnTime: '', phone: '', notes: '' },
  { id: 'contract-2', vehicleId: '', vehiclePlate: 'KYZ 1842', startDate: '2026-06-01', endDate: '2026-06-05', label: 'J. Martin', type: 'contract', pickupTime: '', returnTime: '', phone: '', notes: '' },
  { id: 'conflict-1', vehicleId: '', vehiclePlate: 'KYZ 1842', startDate: '2026-06-04', endDate: '2026-06-06', label: 'Conflict', type: 'conflict', pickupTime: '', returnTime: '', phone: '', notes: '' },
  { id: 'reservation-3', vehicleId: '', vehiclePlate: 'PKH 6128', startDate: '2026-06-06', endDate: '2026-06-11', label: 'P. Smith', type: 'reservation', pickupTime: '', returnTime: '', phone: '', notes: '' },
  { id: 'contract-3', vehicleId: '', vehiclePlate: 'KXI 9033', startDate: '2026-06-09', endDate: '2026-06-18', label: 'S. Weber', type: 'contract', pickupTime: '', returnTime: '', phone: '', notes: '' },
];

const DAY_WIDTH = 42;
const VEHICLE_COLUMN_WIDTH = 220;

const blockClasses: Record<PlanningType, string> = {
  contract: 'border-rose-300/45 bg-rose-500/80 shadow-[0_5px_16px_rgba(244,63,94,0.2)]',
  reservation: 'border-cyan-300/45 bg-cyan-500/75 shadow-[0_5px_16px_rgba(6,182,212,0.18)]',
  conflict: 'border-emerald-200/55 bg-emerald-500/85 shadow-[0_5px_16px_rgba(16,185,129,0.22)]',
};

const groupTints = [
  { row: 'bg-sky-300/[0.018]', header: 'bg-sky-300/[0.055]', label: 'text-sky-200/80' },
  { row: 'bg-emerald-300/[0.018]', header: 'bg-emerald-300/[0.05]', label: 'text-emerald-200/80' },
  { row: 'bg-violet-300/[0.018]', header: 'bg-violet-300/[0.05]', label: 'text-violet-200/80' },
  { row: 'bg-amber-300/[0.016]', header: 'bg-amber-300/[0.045]', label: 'text-amber-200/80' },
  { row: 'bg-cyan-300/[0.018]', header: 'bg-cyan-300/[0.05]', label: 'text-cyan-200/80' },
];

const normalizePlate = (plate: string) => plate.replace(/\s+/g, '').toUpperCase();
const padDatePart = (value: number) => String(value).padStart(2, '0');
const toIsoDate = (year: number, month: number, day: number) =>
  `${year}-${padDatePart(month + 1)}-${padDatePart(day)}`;
const dateToUtcTime = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};
const daysBetweenInclusive = (startDate: string, endDate: string) =>
  Math.max(1, Math.round((dateToUtcTime(endDate) - dateToUtcTime(startDate)) / 86_400_000) + 1);
const addDaysToIsoDate = (value: string, daysToAdd: number) => {
  const date = new Date(dateToUtcTime(value));
  date.setUTCDate(date.getUTCDate() + daysToAdd);
  return `${date.getUTCFullYear()}-${padDatePart(date.getUTCMonth() + 1)}-${padDatePart(date.getUTCDate())}`;
};

const emptyDraft = (startDate: string, endDate: string, type: PlanningType): PlanningDraft => ({
  type,
  label: '',
  startDate,
  endDate,
  pickupTime: '',
  returnTime: '',
  phone: '',
  notes: '',
});

export default function FleetCalendarPrototype() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date(2026, 5, 1));
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [planningEntries, setPlanningEntries] = useState<PlanningEntry[]>(INITIAL_PLANNING_ENTRIES);
  const [hasLoadedPlanningEntries, setHasLoadedPlanningEntries] = useState(false);
  const [dragSelection, setDragSelection] = useState<DragSelection | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [moveState, setMoveState] = useState<MoveState | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [modalVehicle, setModalVehicle] = useState<Vehicle | null>(null);
  const [draft, setDraft] = useState<PlanningDraft | null>(null);
  const [validationError, setValidationError] = useState('');
  const suppressBlockClickRef = useRef(false);
  const daysInMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const monthLabel = new Intl.DateTimeFormat('el-GR', { month: 'long', year: 'numeric' }).format(selectedMonth);
  const monthStart = toIsoDate(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
  const monthEnd = toIsoDate(selectedMonth.getFullYear(), selectedMonth.getMonth(), daysInMonth);

  useEffect(() => {
    let isMounted = true;

    const loadVehicles = async () => {
      setIsLoading(true);
      const carRows = (await fetchCars()) as CarRow[];
      if (!isMounted) return;

      setVehicles(
        carRows.map((car) => ({
          id: String(car.id),
          plate: String(car.plate || '').trim() || 'Χωρίς πινακίδα',
          model: [car.brand, car.model].filter(Boolean).join(' ').trim() || 'Χωρίς μοντέλο',
          group: String(car.category || '').trim().toUpperCase() || 'ΧΩΡΙΣ GROUP',
        })),
      );
      setIsLoading(false);
    };

    void loadVehicles();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      const storedEntries = window.localStorage.getItem(FLEET_CALENDAR_STORAGE_KEY);

      if (storedEntries !== null) {
        const parsedEntries = JSON.parse(storedEntries);
        if (Array.isArray(parsedEntries)) {
          setPlanningEntries(parsedEntries as PlanningEntry[]);
        }
      }
    } catch (error) {
      console.warn('Fleet Calendar localStorage load failed:', error);
    } finally {
      setHasLoadedPlanningEntries(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedPlanningEntries) return;

    try {
      window.localStorage.setItem(
        FLEET_CALENDAR_STORAGE_KEY,
        JSON.stringify(planningEntries),
      );
    } catch (error) {
      console.warn('Fleet Calendar localStorage save failed:', error);
    }
  }, [hasLoadedPlanningEntries, planningEntries]);

  const groupedVehicles = useMemo(() => {
    const orderIndex = new Map(GROUP_ORDER.map((group, index) => [group, index]));
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('el-GR');
    const visibleVehicles = vehicles.filter((vehicle) => {
      const matchesGroup = selectedGroup === 'ALL' || vehicle.group === selectedGroup;
      const matchesSearch =
        !normalizedSearch ||
        `${vehicle.plate} ${vehicle.model}`.toLocaleLowerCase('el-GR').includes(normalizedSearch);
      return matchesGroup && matchesSearch;
    });
    const sortedVehicles = visibleVehicles.sort((left, right) => {
      const leftOrder = orderIndex.get(left.group) ?? GROUP_ORDER.length;
      const rightOrder = orderIndex.get(right.group) ?? GROUP_ORDER.length;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      if (left.group !== right.group) return left.group.localeCompare(right.group, 'el');
      return left.plate.localeCompare(right.plate, 'el', { numeric: true });
    });

    return sortedVehicles.reduce<Array<{ group: string; vehicles: Vehicle[] }>>((groups, vehicle) => {
      const currentGroup = groups.at(-1);
      if (currentGroup?.group === vehicle.group) currentGroup.vehicles.push(vehicle);
      else groups.push({ group: vehicle.group, vehicles: [vehicle] });
      return groups;
    }, []);
  }, [searchTerm, selectedGroup, vehicles]);

  const entryBelongsToVehicle = (entry: PlanningEntry, vehicle: Vehicle) =>
    entry.vehicleId === vehicle.id ||
    (!entry.vehicleId && normalizePlate(entry.vehiclePlate) === normalizePlate(vehicle.plate));

  const getVisibleEntryRange = (entry: PlanningEntry) => {
    if (entry.endDate < monthStart || entry.startDate > monthEnd) return null;
    return {
      startDay: entry.startDate < monthStart ? 1 : Number(entry.startDate.slice(8, 10)),
      endDay: entry.endDate > monthEnd ? daysInMonth : Number(entry.endDate.slice(8, 10)),
    };
  };

  const rangeOverlapsVehicleEntry = (
    vehicle: Vehicle,
    startDate: string,
    endDate: string,
    ignoredEntryId?: string,
  ) =>
    planningEntries.some(
      (entry) =>
        entry.id !== ignoredEntryId &&
        entryBelongsToVehicle(entry, vehicle) &&
        entry.startDate <= endDate &&
        entry.endDate >= startDate,
    );

  const openCreateModal = (selection: DragSelection) => {
    const vehicle = vehicles.find((item) => item.id === selection.vehicleId);
    if (!vehicle) return;
    const startDay = Math.min(selection.startDay, selection.currentDay);
    const endDay = Math.max(selection.startDay, selection.currentDay);
    const startDate = toIsoDate(selectedMonth.getFullYear(), selectedMonth.getMonth(), startDay);
    const endDate = toIsoDate(selectedMonth.getFullYear(), selectedMonth.getMonth(), endDay);
    const hasOverlap = rangeOverlapsVehicleEntry(vehicle, startDate, endDate);

    setEditingEntryId(null);
    setModalVehicle(vehicle);
    setDraft(emptyDraft(startDate, endDate, hasOverlap ? 'conflict' : 'reservation'));
    setValidationError(hasOverlap ? 'Η επιλεγμένη περίοδος επικαλύπτει υπάρχουσα εγγραφή.' : '');
  };

  const openEditModal = (entry: PlanningEntry, vehicle: Vehicle) => {
    setEditingEntryId(entry.id);
    setModalVehicle(vehicle);
    setDraft({
      type: entry.type,
      label: entry.label,
      startDate: entry.startDate,
      endDate: entry.endDate,
      pickupTime: entry.pickupTime,
      returnTime: entry.returnTime,
      phone: entry.phone,
      notes: entry.notes,
    });
    setValidationError('');
  };

  const closeModal = () => {
    setDraft(null);
    setModalVehicle(null);
    setEditingEntryId(null);
    setValidationError('');
  };

  const saveEntry = () => {
    if (!draft || !modalVehicle) return;
    if (!draft.label.trim()) {
      setValidationError('Συμπληρώστε Customer / Label.');
      return;
    }
    if (!draft.startDate || !draft.endDate || draft.endDate < draft.startDate) {
      setValidationError('Η ημερομηνία λήξης δεν μπορεί να είναι πριν από την έναρξη.');
      return;
    }

    if (editingEntryId) {
      setPlanningEntries((entries) =>
        entries.map((entry) =>
          entry.id === editingEntryId
            ? { ...entry, ...draft, vehicleId: modalVehicle.id, vehiclePlate: modalVehicle.plate }
            : entry,
        ),
      );
    } else {
      setPlanningEntries((entries) => [
        ...entries,
        {
          id: `planning-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          vehicleId: modalVehicle.id,
          vehiclePlate: modalVehicle.plate,
          ...draft,
        },
      ]);
    }
    closeModal();
  };

  const deleteEntry = () => {
    if (!editingEntryId) return;
    setPlanningEntries((entries) => entries.filter((entry) => entry.id !== editingEntryId));
    closeModal();
  };

  const finishResize = (state: ResizeState) => {
    const resizedDate = toIsoDate(selectedMonth.getFullYear(), selectedMonth.getMonth(), state.currentDay);
    setPlanningEntries((entries) =>
      entries.map((entry) => {
        if (entry.id !== state.entryId) return entry;
        if (state.edge === 'start') {
          return { ...entry, startDate: resizedDate <= entry.endDate ? resizedDate : entry.endDate };
        }
        return { ...entry, endDate: resizedDate >= entry.startDate ? resizedDate : entry.startDate };
      }),
    );
  };

  const getMoveTarget = (state: MoveState) => {
    const maxStartDay = Math.max(1, daysInMonth - state.durationDays + 1);
    const startDay = Math.min(
      Math.max(state.currentDay - state.grabOffset, 1),
      maxStartDay,
    );
    const startDate = toIsoDate(selectedMonth.getFullYear(), selectedMonth.getMonth(), startDay);

    return {
      startDay,
      endDay: Math.min(startDay + state.durationDays - 1, daysInMonth),
      startDate,
      endDate: addDaysToIsoDate(startDate, state.durationDays - 1),
    };
  };

  const finishMove = (state: MoveState) => {
    if (!state.moved) return;
    const targetVehicle = vehicles.find((vehicle) => vehicle.id === state.targetVehicleId);
    if (!targetVehicle) return;
    const target = getMoveTarget(state);
    const hasOverlap = rangeOverlapsVehicleEntry(
      targetVehicle,
      target.startDate,
      target.endDate,
      state.entryId,
    );

    setPlanningEntries((entries) =>
      entries.map((entry) =>
        entry.id === state.entryId
          ? {
              ...entry,
              vehicleId: targetVehicle.id,
              vehiclePlate: targetVehicle.plate,
              startDate: target.startDate,
              endDate: target.endDate,
              type: hasOverlap ? 'conflict' : entry.type,
            }
          : entry,
      ),
    );
  };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const targetCell = document
        .elementsFromPoint(event.clientX, event.clientY)
        .find(
          (element): element is HTMLElement =>
            element instanceof HTMLElement &&
            Boolean(element.dataset.fleetVehicleId) &&
            Boolean(element.dataset.fleetDay),
        );

      if (!targetCell) return;
      const vehicleId = targetCell.dataset.fleetVehicleId || '';
      const day = Number(targetCell.dataset.fleetDay);
      if (!vehicleId || !Number.isFinite(day)) return;

      if (dragSelection?.vehicleId === vehicleId) {
        setDragSelection((current) => current ? { ...current, currentDay: day } : current);
      }
      if (resizeState?.vehicleId === vehicleId) {
        setResizeState((current) => current ? { ...current, currentDay: day } : current);
      }
      if (moveState) {
        setMoveState((current) =>
          current
            ? {
                ...current,
                targetVehicleId: vehicleId,
                currentDay: day,
                moved:
                  current.moved ||
                  vehicleId !== current.sourceVehicleId ||
                  day !== current.initialDay,
              }
            : current,
        );
      }
    };

    const handleMouseUp = () => {
      if (resizeState) {
        finishResize(resizeState);
        suppressBlockClickRef.current = resizeState.currentDay !== resizeState.initialDay;
      }
      else if (moveState) {
        finishMove(moveState);
        suppressBlockClickRef.current = moveState.moved;
      }
      else if (dragSelection) openCreateModal(dragSelection);
      setResizeState(null);
      setMoveState(null);
      setDragSelection(null);

      if (suppressBlockClickRef.current) {
        window.setTimeout(() => {
          suppressBlockClickRef.current = false;
        }, 0);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragSelection, moveState, resizeState]);

  const changeMonth = (offset: number) => {
    setSelectedMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
    setDragSelection(null);
    setResizeState(null);
    setMoveState(null);
  };

  return (
    <>
      <section
        className="flex h-full min-h-[420px] w-full select-none flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-[#07111a] shadow-[0_18px_55px_rgba(0,0,0,0.3)]"
      >
        <header className="shrink-0 border-b border-white/[0.07] bg-[#0a151f] px-3.5 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => changeMonth(-1)} className="flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.025] text-zinc-400 hover:border-cyan-300/20 hover:bg-cyan-300/[0.06] hover:text-white" aria-label="Προηγούμενος μήνας">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="min-w-[154px] text-center">
                <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-cyan-300/60">Fleet planning</p>
                <h2 className="mt-0.5 text-sm font-extrabold capitalize text-zinc-50">{monthLabel}</h2>
              </div>
              <button type="button" onClick={() => changeMonth(1)} className="flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.025] text-zinc-400 hover:border-cyan-300/20 hover:bg-cyan-300/[0.06] hover:text-white" aria-label="Επόμενος μήνας">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)} className="h-8 rounded-md border border-white/[0.08] bg-[#0d1823] px-2.5 text-[11px] font-semibold text-zinc-200 outline-none focus:border-cyan-300/30" aria-label="Φίλτρο group">
                <option value="ALL">Όλα τα groups</option>
                {GROUP_ORDER.map((group) => <option key={group} value={group}>Group {group}</option>)}
              </select>
              <label className="relative block">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
                <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Πινακίδα ή μοντέλο" className="h-8 w-48 rounded-md border border-white/[0.08] bg-[#0d1823] pl-8 pr-2.5 text-[11px] font-medium text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-300/30" />
              </label>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-white/[0.05] pt-2 text-[10px] font-bold text-zinc-400">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />Συμβόλαιο</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-cyan-500" />Κράτηση</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Conflict</span>
            <span className="ml-auto text-zinc-600">{groupedVehicles.reduce((total, group) => total + group.vehicles.length, 0)} / {vehicles.length} οχήματα</span>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto">
          <div className="min-w-max" style={{ width: VEHICLE_COLUMN_WIDTH + days.length * DAY_WIDTH }}>
            <div className="sticky top-0 z-30 grid h-12 border-b border-white/[0.08] bg-[#0a151f]" style={{ gridTemplateColumns: `${VEHICLE_COLUMN_WIDTH}px repeat(${days.length}, ${DAY_WIDTH}px)` }}>
              <div className="sticky left-0 z-40 flex items-center border-r border-white/[0.09] bg-[#0a151f] px-4 text-[10px] font-extrabold uppercase tracking-[0.12em] text-zinc-500">Όχημα</div>
              {days.map((day) => {
                const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day);
                const weekday = new Intl.DateTimeFormat('el-GR', { weekday: 'short' }).format(date);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                return (
                  <div key={day} className={`flex flex-col items-center justify-center border-r border-white/[0.055] ${isWeekend ? 'bg-white/[0.025]' : ''}`}>
                    <span className="text-[8px] font-bold uppercase text-zinc-600">{weekday}</span>
                    <span className="text-xs font-extrabold text-zinc-300">{day}</span>
                  </div>
                );
              })}
            </div>

            {isLoading ? (
              <div className="flex h-40 items-center justify-center text-xs font-semibold text-zinc-500">Φόρτωση οχημάτων...</div>
            ) : groupedVehicles.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-xs font-semibold text-zinc-500">Δεν υπάρχουν οχήματα για τα επιλεγμένα φίλτρα.</div>
            ) : (
              groupedVehicles.map((vehicleGroup, groupIndex) => {
                const tint = groupTints[groupIndex % groupTints.length];
                return (
                  <div key={vehicleGroup.group}>
                    <div className={`grid h-8 border-b border-white/[0.07] ${tint.header}`} style={{ gridTemplateColumns: `${VEHICLE_COLUMN_WIDTH}px repeat(${days.length}, ${DAY_WIDTH}px)` }}>
                      <div className={`sticky left-0 z-20 flex items-center border-r border-white/[0.08] bg-[#0c1721] px-4 text-[9px] font-black uppercase tracking-[0.14em] ${tint.label}`}>Group {vehicleGroup.group}<span className="ml-2 text-zinc-600">{vehicleGroup.vehicles.length}</span></div>
                      <div className={tint.header} style={{ gridColumn: `2 / span ${days.length}` }} />
                    </div>

                    {vehicleGroup.vehicles.map((vehicle) => {
                      const vehicleEntries = planningEntries
                        .filter(
                          (entry) =>
                            entryBelongsToVehicle(entry, vehicle) &&
                            !(moveState?.moved && entry.id === moveState.entryId),
                        )
                        .map((entry) => {
                          const range = getVisibleEntryRange(entry);
                          if (!range || resizeState?.entryId !== entry.id) return { entry, range };

                          return {
                            entry,
                            range:
                              resizeState.edge === 'start'
                                ? {
                                    startDay: Math.min(
                                      Math.max(resizeState.currentDay, 1),
                                      range.endDay,
                                    ),
                                    endDay: range.endDay,
                                  }
                                : {
                                    startDay: range.startDay,
                                    endDay: Math.max(
                                      Math.min(resizeState.currentDay, daysInMonth),
                                      range.startDay,
                                    ),
                                  },
                          };
                        })
                        .filter((item): item is { entry: PlanningEntry; range: { startDay: number; endDay: number } } => Boolean(item.range));
                      const selectionStart = dragSelection?.vehicleId === vehicle.id ? Math.min(dragSelection.startDay, dragSelection.currentDay) : null;
                      const selectionEnd = dragSelection?.vehicleId === vehicle.id ? Math.max(dragSelection.startDay, dragSelection.currentDay) : null;
                      const movingEntry = moveState
                        ? planningEntries.find((entry) => entry.id === moveState.entryId)
                        : null;
                      const movePreview =
                        moveState?.moved &&
                        moveState.targetVehicleId === vehicle.id &&
                        movingEntry
                          ? getMoveTarget(moveState)
                          : null;

                      return (
                        <div key={vehicle.id} className={`grid h-[62px] border-b border-white/[0.055] ${tint.row}`} style={{ gridTemplateColumns: `${VEHICLE_COLUMN_WIDTH}px repeat(${days.length}, ${DAY_WIDTH}px)` }}>
                          <div className={`sticky left-0 z-20 flex items-center justify-between border-r border-white/[0.09] bg-[#0b1620] px-4 shadow-[8px_0_18px_rgba(0,0,0,0.16)] ${tint.row}`}>
                            <div className="min-w-0">
                              <p className="text-xs font-extrabold text-zinc-100">{vehicle.plate}</p>
                              <p className="mt-0.5 truncate text-[10px] text-zinc-500">{vehicle.model}</p>
                            </div>
                            <span className="rounded border border-white/[0.09] bg-white/[0.035] px-1.5 py-0.5 text-[9px] font-extrabold text-zinc-300">{vehicle.group}</span>
                          </div>

                          {days.map((day) => {
                            const isSelected = selectionStart !== null && selectionEnd !== null && day >= selectionStart && day <= selectionEnd;
                            return (
                              <div
                                key={day}
                                data-fleet-vehicle-id={vehicle.id}
                                data-fleet-day={day}
                                onMouseDown={(event) => {
                                  if (event.button !== 0 || resizeState || moveState) return;
                                  event.preventDefault();
                                  setDragSelection({ vehicleId: vehicle.id, startDay: day, currentDay: day });
                                }}
                                className={`border-r border-white/[0.045] transition-colors ${isSelected ? 'bg-cyan-300/[0.16] shadow-[inset_0_0_0_1px_rgba(103,232,249,0.16)]' : 'hover:bg-white/[0.025]'}`}
                                style={{ gridColumn: day + 1, gridRow: 1 }}
                              />
                            );
                          })}

                          {vehicleEntries.map(({ entry, range }) => (
                            <button
                              key={entry.id}
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (suppressBlockClickRef.current) {
                                  suppressBlockClickRef.current = false;
                                  return;
                                }
                                openEditModal(entry, vehicle);
                              }}
                              onMouseDown={(event) => {
                                if (event.button !== 0 || resizeState) return;
                                event.preventDefault();
                                event.stopPropagation();
                                suppressBlockClickRef.current = false;
                                const rect = event.currentTarget.getBoundingClientRect();
                                const visibleDuration = Math.max(1, range.endDay - range.startDay + 1);
                                const cellWidth = rect.width / visibleDuration;
                                const grabOffset = Math.min(
                                  visibleDuration - 1,
                                  Math.max(0, Math.floor((event.clientX - rect.left) / cellWidth)),
                                );
                                setMoveState({
                                  entryId: entry.id,
                                  sourceVehicleId: vehicle.id,
                                  targetVehicleId: vehicle.id,
                                  initialDay: range.startDay + grabOffset,
                                  currentDay: range.startDay + grabOffset,
                                  grabOffset,
                                  durationDays: daysBetweenInclusive(entry.startDate, entry.endDate),
                                  moved: false,
                                });
                              }}
                              className={`group/block relative z-10 mx-0.5 my-2.5 flex cursor-grab items-center truncate rounded border px-2 text-left text-[10px] font-extrabold text-white active:cursor-grabbing ${blockClasses[entry.type]}`}
                              style={{ gridColumn: `${range.startDay + 1} / span ${range.endDay - range.startDay + 1}`, gridRow: 1 }}
                              title={`${entry.label}: ${entry.startDate} - ${entry.endDate}`}
                            >
                              <span
                                role="presentation"
                                onClick={(event) => event.stopPropagation()}
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  suppressBlockClickRef.current = false;
                                  setMoveState(null);
                                  setResizeState({
                                    entryId: entry.id,
                                    vehicleId: vehicle.id,
                                    edge: 'start',
                                    initialDay: range.startDay,
                                    currentDay: range.startDay,
                                  });
                                }}
                                className="absolute inset-y-0 left-0 w-2.5 cursor-ew-resize border-r border-white/25 bg-black/15 opacity-70 hover:bg-white/10 hover:opacity-100"
                              />
                              <span className="truncate px-1">{entry.label || 'Χωρίς label'}</span>
                              <span
                                role="presentation"
                                onClick={(event) => event.stopPropagation()}
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  suppressBlockClickRef.current = false;
                                  setMoveState(null);
                                  setResizeState({
                                    entryId: entry.id,
                                    vehicleId: vehicle.id,
                                    edge: 'end',
                                    initialDay: range.endDay,
                                    currentDay: range.endDay,
                                  });
                                }}
                                className="absolute inset-y-0 right-0 w-2.5 cursor-ew-resize border-l border-white/25 bg-black/15 opacity-70 hover:bg-white/10 hover:opacity-100"
                              />
                            </button>
                          ))}

                          {movePreview && movingEntry && (
                            <div
                              className={`pointer-events-none z-20 mx-0.5 my-2.5 flex items-center truncate rounded border border-dashed px-2 text-[10px] font-extrabold text-white opacity-75 ${blockClasses[movingEntry.type]}`}
                              style={{
                                gridColumn: `${movePreview.startDay + 1} / span ${movePreview.endDay - movePreview.startDay + 1}`,
                                gridRow: 1,
                              }}
                            >
                              <span className="truncate px-1">{movingEntry.label}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {draft && modalVehicle && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/72 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-cyan-200/[0.12] bg-[linear-gradient(180deg,#0d1823_0%,#08111a_100%)] shadow-[0_30px_100px_rgba(0,0,0,0.65)]">
            <div className="flex items-start justify-between border-b border-white/[0.07] px-5 py-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-300/65">{editingEntryId ? 'Edit planning entry' : 'New planning entry'}</p>
                <h3 className="mt-1 text-base font-extrabold text-white">{modalVehicle.plate} · {modalVehicle.model}</h3>
              </div>
              <button type="button" onClick={closeModal} className="flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.08] text-zinc-400 hover:bg-white/[0.05] hover:text-white" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-[10px] font-bold uppercase text-zinc-500">
                  Type
                  <select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as PlanningType })} className="h-10 w-full rounded-lg border border-white/[0.09] bg-[#101c28] px-3 text-xs font-semibold normal-case text-white outline-none focus:border-cyan-300/35">
                    <option value="contract">Συμβόλαιο</option>
                    <option value="reservation">Κράτηση</option>
                    <option value="conflict">Conflict</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-[10px] font-bold uppercase text-zinc-500">
                  Customer / Label
                  <input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} className="h-10 w-full rounded-lg border border-white/[0.09] bg-[#101c28] px-3 text-xs font-semibold normal-case text-white outline-none focus:border-cyan-300/35" />
                </label>
                <label className="space-y-1.5 text-[10px] font-bold uppercase text-zinc-500">
                  Start date
                  <input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} className="h-10 w-full rounded-lg border border-white/[0.09] bg-[#101c28] px-3 text-xs font-semibold normal-case text-white outline-none [color-scheme:dark] focus:border-cyan-300/35" />
                </label>
                <label className="space-y-1.5 text-[10px] font-bold uppercase text-zinc-500">
                  End date
                  <input type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} className="h-10 w-full rounded-lg border border-white/[0.09] bg-[#101c28] px-3 text-xs font-semibold normal-case text-white outline-none [color-scheme:dark] focus:border-cyan-300/35" />
                </label>
                <label className="space-y-1.5 text-[10px] font-bold uppercase text-zinc-500">
                  Pickup time
                  <input type="time" value={draft.pickupTime} onChange={(event) => setDraft({ ...draft, pickupTime: event.target.value })} className="h-10 w-full rounded-lg border border-white/[0.09] bg-[#101c28] px-3 text-xs font-semibold normal-case text-white outline-none [color-scheme:dark] focus:border-cyan-300/35" />
                </label>
                <label className="space-y-1.5 text-[10px] font-bold uppercase text-zinc-500">
                  Return time
                  <input type="time" value={draft.returnTime} onChange={(event) => setDraft({ ...draft, returnTime: event.target.value })} className="h-10 w-full rounded-lg border border-white/[0.09] bg-[#101c28] px-3 text-xs font-semibold normal-case text-white outline-none [color-scheme:dark] focus:border-cyan-300/35" />
                </label>
                <label className="space-y-1.5 text-[10px] font-bold uppercase text-zinc-500 sm:col-span-2">
                  Phone
                  <input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} className="h-10 w-full rounded-lg border border-white/[0.09] bg-[#101c28] px-3 text-xs font-semibold normal-case text-white outline-none focus:border-cyan-300/35" />
                </label>
                <label className="space-y-1.5 text-[10px] font-bold uppercase text-zinc-500 sm:col-span-2">
                  Notes
                  <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} rows={3} className="w-full resize-none rounded-lg border border-white/[0.09] bg-[#101c28] px-3 py-2.5 text-xs font-medium normal-case text-white outline-none focus:border-cyan-300/35" />
                </label>
              </div>
              {validationError && <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/[0.06] px-3 py-2 text-xs font-semibold text-amber-200">{validationError}</p>}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] bg-black/15 px-5 py-3.5">
              <div>
                {editingEntryId && (
                  <button type="button" onClick={deleteEntry} className="flex h-9 items-center gap-2 rounded-lg border border-rose-300/20 bg-rose-400/[0.07] px-3 text-xs font-bold text-rose-200 hover:bg-rose-400/[0.12]">
                    <Trash2 className="h-3.5 w-3.5" />Delete
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={closeModal} className="h-9 rounded-lg border border-white/[0.08] bg-white/[0.025] px-4 text-xs font-bold text-zinc-300 hover:bg-white/[0.05]">Cancel</button>
                <button type="button" onClick={saveEntry} className="h-9 rounded-lg border border-cyan-300/25 bg-cyan-400/15 px-4 text-xs font-extrabold text-cyan-100 hover:bg-cyan-400/22">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
