'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  CalendarDays,
  Car,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderArchive,
  LayoutDashboard,
  ListTree,
  Network,
  ReceiptText,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Truck,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import {
  createVehicleGroup,
  deleteVehicleGroup,
  fetchVehicleGroups,
  updateVehicleGroup,
  type VehicleGroupRecord,
} from '@/lib/vehicleGroupsApi';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  tone: string;
  chip: string;
  children?: NavItem[];
}

interface NavSection {
  title: string;
  items: NavItem[];
  collapsible?: boolean;
}

interface SidebarProps {
  onWindowOpen?: (windowId: string) => void;
  activeWindow?: string | null;
  userEmail?: string | null;
  userRole?: 'admin' | 'bookings' | null;
  onLogout?: () => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'ΛΕΙΤΟΥΡΓΙΑ',
    items: [
      { label: 'Πίνακας', href: '/dashboard', icon: LayoutDashboard, tone: 'text-sky-300', chip: 'border-sky-400/25 bg-sky-400/10' },
      { label: 'Κρατήσεις', href: '/bookings', icon: CalendarDays, tone: 'text-violet-300', chip: 'border-violet-400/25 bg-violet-400/10' },
      { label: 'Αυτοκίνητα', href: '/cars', icon: Car, tone: 'text-emerald-300', chip: 'border-emerald-400/25 bg-emerald-400/10' },
      { label: 'Service', href: '/services', icon: Wrench, tone: 'text-orange-300', chip: 'border-orange-400/25 bg-orange-400/10' },
      { label: 'Leasing', href: '/leasing', icon: FileText, tone: 'text-cyan-300', chip: 'border-cyan-400/25 bg-cyan-400/10' },
    ],
  },
  {
    title: 'ΟΙΚΟΝΟΜΙΚΑ',
    items: [
      {
        label: 'Ταμείο',
        href: '/finance',
        icon: Wallet,
        tone: 'text-cyan-300',
        chip: 'border-cyan-400/25 bg-cyan-400/10',
        children: [
          { label: 'Έσοδα', href: '/finance/income', icon: TrendingUp, tone: 'text-emerald-300', chip: 'border-emerald-400/25 bg-emerald-400/10' },
          { label: 'Έξοδα', href: '/finance/expenses', icon: TrendingDown, tone: 'text-rose-300', chip: 'border-rose-400/25 bg-rose-400/10' },
          { label: 'Γραμμάτια', href: '/finance/debts', icon: ReceiptText, tone: 'text-fuchsia-300', chip: 'border-fuchsia-400/25 bg-fuchsia-400/10' },
        ],
      },
      { label: 'Financial Engine', href: '/financial-engine', icon: Activity, tone: 'text-cyan-300', chip: 'border-cyan-400/25 bg-cyan-400/10' },
      { label: 'Αναφορές', href: '/reports', icon: BarChart3, tone: 'text-amber-300', chip: 'border-amber-400/25 bg-amber-400/10' },
    ],
  },
  {
    title: 'ΣΥΣΤΗΜΑ',
    collapsible: true,
    items: [
      { label: 'Προμηθευτές', href: '/suppliers', icon: Truck, tone: 'text-violet-300', chip: 'border-violet-400/25 bg-violet-400/10' },
      { label: 'Πρακτορεία', href: '/agencies', icon: Network, tone: 'text-cyan-300', chip: 'border-cyan-400/25 bg-cyan-400/10' },
      { label: 'Έγγραφα', href: '/vehicle-documents', icon: FolderArchive, tone: 'text-sky-300', chip: 'border-sky-400/25 bg-sky-400/10' },
      { label: 'Κατηγορίες Οχημάτων', href: '/vehicle-groups', icon: ListTree, tone: 'text-emerald-300', chip: 'border-emerald-400/25 bg-emerald-400/10' },
      { label: 'Κατηγορίες Εξόδων', href: '/expense-categories', icon: ListTree, tone: 'text-amber-300', chip: 'border-amber-400/25 bg-amber-400/10' },
      { label: 'Ρυθμίσεις', href: '/settings', icon: SlidersHorizontal, tone: 'text-slate-300', chip: 'border-slate-400/20 bg-slate-400/10' },
    ],
  },
];

const WINDOW_ITEMS = [
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
  'Αναφορές',
  'Πρακτορεία',
  'Έγγραφα',
  'Κατηγορίες Εξόδων',
];

export default function Sidebar({ onWindowOpen, activeWindow, userEmail, userRole, onLogout, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname();
  const [systemOpen, setSystemOpen] = useState(true);
  const [financeOpen, setFinanceOpen] = useState(true);
  const [showVehicleGroupsPanel, setShowVehicleGroupsPanel] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('autoclub-sidebar-collapsed') === 'true';
  });
  const visibleNavSections =
    userRole === 'bookings'
      ? NAV_SECTIONS.map((section) => ({
          ...section,
          collapsible: false,
          items: section.items.filter((item) => item.href === '/dashboard' || item.href === '/bookings'),
        })).filter((section) => section.items.length > 0)
      : NAV_SECTIONS;

  useEffect(() => {
    window.localStorage.setItem('autoclub-sidebar-collapsed', String(isCollapsed));
    document.documentElement.style.setProperty('--autoclub-sidebar-width', isCollapsed ? '72px' : '250px');
  }, [isCollapsed]);

  const toggleCollapsed = () => {
    const next = !isCollapsed;

    setIsCollapsed(next);
    window.localStorage.setItem('autoclub-sidebar-collapsed', String(next));
    document.documentElement.style.setProperty('--autoclub-sidebar-width', next ? '72px' : '250px');
    onCollapsedChange?.(next);
  };

  const handleItemClick = (item: NavItem) => {
    if (item.label === 'Κατηγορίες Οχημάτων') {
      setShowVehicleGroupsPanel(true);
      return;
    }

    if (WINDOW_ITEMS.includes(item.label) && onWindowOpen) {
      onWindowOpen(item.label);
    }
  };

  const renderItem = (item: NavItem, nested = false) => {
    const isWindowItem = WINDOW_ITEMS.includes(item.label);
    const hasChildren = Boolean(item.children?.length);
    const childIsActive = item.children?.some(
      (child) => activeWindow === child.label || pathname === child.href || pathname.startsWith(`${child.href}/`)
    );
    const isVehicleGroupsItem = item.label === 'Κατηγορίες Οχημάτων';
    const isActive = isWindowItem
      ? activeWindow === item.label
      : isVehicleGroupsItem
        ? showVehicleGroupsPanel
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;
    const className = `group relative flex min-h-[35px] w-full items-center ${isCollapsed ? 'justify-center gap-0 px-1.5' : 'gap-1.5 px-2'} rounded-xl border py-0.5 text-left transition duration-200 hover:-translate-y-px ${
      isActive || (hasChildren && childIsActive)
        ? 'border-sky-300/25 bg-sky-300/[0.08] text-white shadow-[0_0_0_1px_rgba(125,211,252,0.12),0_16px_30px_rgba(14,165,233,0.12)] before:absolute before:left-0 before:top-2 before:h-[calc(100%-1rem)] before:w-1 before:rounded-full before:bg-sky-300'
        : 'border-transparent text-zinc-300/90 hover:border-sky-100/[0.08] hover:bg-white/[0.035] hover:text-white'
    }`;
    const childClassName = `group relative ${isCollapsed ? 'mx-auto flex w-full justify-center gap-0 px-1.5' : 'ml-5 flex w-[calc(100%-1.25rem)] gap-1.5 px-2'} min-h-[28px] items-center rounded-xl border py-0.5 text-left transition duration-200 hover:-translate-y-px ${
      isActive
        ? 'border-sky-300/20 bg-sky-300/[0.07] text-white'
        : 'border-transparent text-zinc-400 hover:border-sky-100/[0.06] hover:bg-white/[0.03] hover:text-zinc-100'
    }`;

    const content = (
      <>
        <span
          className={`flex h-[28px] w-[28px] items-center justify-center rounded-[9px] border transition duration-200 ${item.chip} ${
            isActive || (hasChildren && childIsActive) ? 'shadow-[0_0_16px_rgba(56,189,248,0.10)]' : 'group-hover:shadow-[0_0_12px_rgba(255,255,255,0.06)]'
          }`}
        >
          <Icon className={`h-[15px] w-[15px] ${item.tone}`} strokeWidth={1.9} />
        </span>
        {!isCollapsed && <span className="text-[11px] font-medium leading-none tracking-[0.005em]">{item.label}</span>}
      </>
    );
    const childContent = (
      <>
        <span
          className={`flex h-[22px] w-[22px] items-center justify-center rounded-lg border transition duration-200 ${item.chip} ${
            isActive ? 'shadow-[0_0_12px_rgba(56,189,248,0.08)]' : 'group-hover:shadow-[0_0_10px_rgba(255,255,255,0.05)]'
          }`}
        >
          <Icon className={`h-[11px] w-[11px] ${item.tone}`} strokeWidth={1.9} />
        </span>
        {!isCollapsed && <span className="text-[10.5px] font-medium leading-none tracking-[0.005em]">{item.label}</span>}
      </>
    );

    if (hasChildren) {
      return (
        <div key={item.href} className="space-y-1">
          <div className="relative">
            <button
              type="button"
              onClick={() => handleItemClick(item)}
              className={`${className} ${isCollapsed ? '' : 'pr-11'}`}
              title={isCollapsed ? item.label : undefined}
            >
              {content}
            </button>
            {!isCollapsed && (
              <button
                type="button"
                onClick={(event) => {
                event.stopPropagation();
                setFinanceOpen((current) => !current);
              }}
              className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg border border-white/[0.04] bg-white/[0.016] text-[11px] text-zinc-500 transition hover:border-sky-300/18 hover:bg-sky-300/[0.07] hover:text-white"
              aria-label="Toggle finance menu"
            >
              <span className={`transition ${financeOpen ? 'rotate-180' : ''}`}>⌄</span>
              </button>
            )}
          </div>
          <div
            className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
              isCollapsed || financeOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="space-y-0.5 pt-0.5">{item.children?.map((child) => renderItem(child, true))}</div>
            </div>
          </div>
        </div>
      );
    }

    if (isVehicleGroupsItem) {
      return (
        <button
          key={item.href}
          type="button"
          onClick={() => handleItemClick(item)}
          className={nested ? childClassName : className}
          title={isCollapsed ? item.label : undefined}
        >
          {nested ? childContent : content}
        </button>
      );
    }

    if (isWindowItem) {
      return (
        <button
          key={item.href}
          type="button"
          onClick={() => handleItemClick(item)}
          className={nested ? childClassName : className}
          title={isCollapsed ? item.label : undefined}
        >
          {nested ? childContent : content}
        </button>
      );
    }

    return (
      <Link key={item.href} href={item.href} className={nested ? childClassName : className} title={isCollapsed ? item.label : undefined}>
        {nested ? childContent : content}
      </Link>
    );
  };

  return (
    <>
    <aside className={`fixed bottom-0 left-0 top-0 z-[9000] flex shrink-0 flex-col border-r border-white/[0.06] bg-[linear-gradient(180deg,#07101a_0%,#050910_100%)] text-white shadow-[18px_0_48px_rgba(0,0,0,0.22)] transition-[width] duration-200 ${isCollapsed ? 'w-[72px]' : 'w-[250px]'}`}>
      <div className={`border-b border-sky-100/[0.04] ${isCollapsed ? 'px-2 pb-2 pt-3' : 'px-4 pb-2.5 pt-3.5 sm:px-4 sm:pb-3 sm:pt-4'}`}>
        <div className="mb-2 flex items-center justify-end">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] text-zinc-300 transition hover:border-sky-300/25 hover:bg-sky-300/[0.08] hover:text-white"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
        <div className={`relative mx-auto ${isCollapsed ? 'h-9 w-9' : 'h-[52px] w-[132px] sm:h-[58px] sm:w-[148px]'}`}>
          <div className="absolute inset-4 rounded-full bg-sky-400/[0.065] blur-2xl" />
          <Image src="/logo.png" alt="AUTOCLUB" fill priority className="relative object-cover object-center" sizes="176px" />
        </div>
        {!isCollapsed && <p className="mt-1 text-center text-[9px] font-medium uppercase tracking-[0.22em] text-[#8e99a8]">
          Enterprise Fleet ERP
        </p>}
      </div>

      <nav className={`autoclub-sidebar-scroll flex-1 overflow-y-auto ${isCollapsed ? 'space-y-1 px-2 py-2' : 'space-y-2 px-2.5 py-2.5 sm:px-3'}`}>
        {visibleNavSections.map((section) => {
          const isSystem = section.collapsible;
          const isOpen = !isSystem || systemOpen;

          return (
            <div key={section.title} className="space-y-0.5">
              {isCollapsed ? null : isSystem ? (
                <button
                  type="button"
                  onClick={() => setSystemOpen((current) => !current)}
                  className="flex w-full items-center justify-between px-2 text-[8.5px] font-semibold uppercase tracking-[0.15em] text-[#8e99a8] transition hover:text-zinc-200"
                >
                  <span>{section.title}</span>
                  <span className={`text-xs transition ${systemOpen ? 'rotate-180' : ''}`}>⌄</span>
                </button>
              ) : (
                <div className="px-2 text-[8.5px] font-semibold uppercase tracking-[0.15em] text-[#8e99a8]">
                  {section.title}
                </div>
              )}

              {(isOpen || isCollapsed) && <div className="space-y-0.5">{section.items.map((item) => renderItem(item))}</div>}
            </div>
          );
        })}
      </nav>

      <div className={`border-t border-sky-100/[0.04] ${isCollapsed ? 'px-2 py-2' : 'px-3 py-2'}`}>
        <div className={`flex items-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.016] px-2 py-2 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-sky-300/14 bg-sky-300/[0.06] text-[11px] font-semibold text-white">
            A
          </div>
          {!isCollapsed && <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-[#f4f7fb]">AutoClub</p>
            <p className="truncate text-[10px] text-[#8e99a8]">{userEmail || 'Administrator'}</p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-sky-200/55">{userRole || 'admin'}</p>
          </div>}
        </div>
        {onLogout && !isCollapsed && (
          <button
            type="button"
            onClick={onLogout}
            className="mt-2 w-full rounded-xl border border-white/[0.055] bg-white/[0.016] px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:border-rose-300/22 hover:bg-rose-300/[0.07] hover:text-white"
          >
            Αποσύνδεση
          </button>
        )}
        {!isCollapsed && <p className="mt-2 text-center text-[9px] uppercase tracking-[0.14em] text-zinc-600">v1.0.0</p>}
      </div>
    </aside>
    {showVehicleGroupsPanel && <VehicleGroupsPanel onClose={() => setShowVehicleGroupsPanel(false)} />}
    </>
  );
}

function VehicleGroupsPanel({ onClose }: { onClose: () => void }) {
  const [groups, setGroups] = useState<VehicleGroupRecord[]>([]);
  const [newCode, setNewCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadGroups = async () => {
    setIsLoading(true);
    const nextGroups = await fetchVehicleGroups();
    setGroups(nextGroups);
    setIsLoading(false);
  };

  useEffect(() => {
    void Promise.resolve().then(loadGroups);
  }, []);

  const handleCreateGroup = async () => {
    const code = newCode.trim().toUpperCase();

    if (!code) return;

    const created = await createVehicleGroup(code);

    if (!created) {
      setMessage('Η κατηγορία δεν αποθηκεύτηκε.');
      return;
    }

    setNewCode('');
    setMessage('Η κατηγορία προστέθηκε.');
    await loadGroups();
  };

  const handleToggleGroup = async (group: VehicleGroupRecord) => {
    const updated = await updateVehicleGroup(group.id, { active: !group.active });

    if (!updated) {
      setMessage('Η κατηγορία δεν ενημερώθηκε.');
      return;
    }

    setMessage('');
    await loadGroups();
  };

  const handleDeleteGroup = async (group: VehicleGroupRecord) => {
    if (!window.confirm(`Να διαγραφεί η κατηγορία "${group.code}";`)) return;

    const deleted = await deleteVehicleGroup(group.id);

    if (!deleted) {
      setMessage('Η κατηγορία δεν διαγράφηκε.');
      return;
    }

    setMessage('');
    await loadGroups();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
      <section className="flex max-h-[82vh] w-[min(720px,94vw)] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(145deg,#09111d_0%,#050910_100%)] text-white shadow-[0_30px_110px_rgba(0,0,0,0.58)]">
        <header className="flex flex-shrink-0 items-start justify-between border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200/70">VEHICLE GROUPS</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Κατηγορίες Οχημάτων</h2>
            <p className="mt-1 text-xs text-zinc-500">Global groups for bookings and vehicle categories.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto p-5">
          <div className="mb-4 flex gap-2">
            <input
              value={newCode}
              onChange={(event) => setNewCode(event.target.value)}
              placeholder="Νέα κατηγορία, π.χ. D1"
              className="min-w-0 flex-1 rounded-2xl border border-white/[0.08] bg-zinc-950/80 px-4 py-2.5 text-sm font-semibold text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-300/45"
            />
            <button
              type="button"
              onClick={handleCreateGroup}
              className="rounded-2xl border border-emerald-300/35 bg-emerald-400/15 px-4 py-2.5 text-sm font-bold text-emerald-50 transition hover:-translate-y-0.5 hover:bg-emerald-400/22"
            >
              Προσθήκη
            </button>
          </div>

          {message && (
            <p className="mb-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] px-4 py-2 text-xs text-zinc-300">
              {message}
            </p>
          )}

          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/20">
            <div className="grid grid-cols-[90px_1fr_120px_110px] border-b border-white/[0.07] bg-white/[0.035] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-500">
              <span>Code</span>
              <span>Status</span>
              <span>Order</span>
              <span className="text-right">Actions</span>
            </div>
            <div className="max-h-[46vh] overflow-auto">
              {isLoading ? (
                <p className="px-4 py-5 text-sm text-zinc-500">Loading vehicle groups...</p>
              ) : groups.length > 0 ? (
                groups.map((group) => (
                  <div key={group.id} className="grid grid-cols-[90px_1fr_120px_110px] items-center border-b border-white/[0.045] px-4 py-2.5 last:border-b-0">
                    <span className="font-mono text-sm font-black text-white">{group.code}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleGroup(group)}
                      className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-black ${
                        group.active
                          ? 'border-emerald-300/35 bg-emerald-400/14 text-emerald-50'
                          : 'border-zinc-600 bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      {group.active ? 'Active' : 'Inactive'}
                    </button>
                    <span className="text-xs text-zinc-400">{group.sort_order}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteGroup(group)}
                      className="justify-self-end rounded-xl border border-rose-300/30 bg-rose-400/10 px-3 py-1.5 text-xs font-bold text-rose-100 transition hover:bg-rose-400/18"
                    >
                      Διαγραφή
                    </button>
                  </div>
                ))
              ) : (
                <p className="px-4 py-5 text-sm text-zinc-500">Δεν υπάρχουν κατηγορίες οχημάτων.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
