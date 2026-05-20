'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Car,
  LayoutDashboard,
  ReceiptText,
  Settings2,
  Tags,
  TrendingDown,
  TrendingUp,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

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
  onLogout?: () => void;
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'ΛΕΙΤΟΥΡΓΙΑ',
    items: [
      { label: 'Πίνακας', href: '/dashboard', icon: LayoutDashboard, tone: 'text-sky-300', chip: 'border-sky-400/25 bg-sky-400/10' },
      { label: 'Κρατήσεις', href: '/bookings', icon: CalendarDays, tone: 'text-violet-300', chip: 'border-violet-400/25 bg-violet-400/10' },
      { label: 'Αυτοκίνητα', href: '/cars', icon: Car, tone: 'text-emerald-300', chip: 'border-emerald-400/25 bg-emerald-400/10' },
      { label: 'Service', href: '/services', icon: Wrench, tone: 'text-orange-300', chip: 'border-orange-400/25 bg-orange-400/10' },
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
          { label: 'Οφειλές', href: '/finance/debts', icon: ReceiptText, tone: 'text-fuchsia-300', chip: 'border-fuchsia-400/25 bg-fuchsia-400/10' },
        ],
      },
      { label: 'Αναφορές', href: '/reports', icon: BarChart3, tone: 'text-amber-300', chip: 'border-amber-400/25 bg-amber-400/10' },
    ],
  },
  {
    title: 'ΣΥΣΤΗΜΑ',
    collapsible: true,
    items: [
      { label: 'Προμηθευτές', href: '/suppliers', icon: Building2, tone: 'text-violet-300', chip: 'border-violet-400/25 bg-violet-400/10' },
      { label: 'Πρακτορεία', href: '/agencies', icon: BriefcaseBusiness, tone: 'text-cyan-300', chip: 'border-cyan-400/25 bg-cyan-400/10' },
      { label: 'Κατηγορίες Εξόδων', href: '/expense-categories', icon: Tags, tone: 'text-amber-300', chip: 'border-amber-400/25 bg-amber-400/10' },
      { label: 'Ρυθμίσεις', href: '/settings', icon: Settings2, tone: 'text-slate-300', chip: 'border-slate-400/20 bg-slate-400/10' },
    ],
  },
];

const WINDOW_ITEMS = [
  'Αυτοκίνητα',
  'Service',
  'Ταμείο',
  'Έσοδα',
  'Έξοδα',
  'Οφειλές',
  'Προμηθευτές',
  'Αναφορές',
  'Πρακτορεία',
  'Κατηγορίες Εξόδων',
];

export default function Sidebar({ onWindowOpen, activeWindow, userEmail, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const [systemOpen, setSystemOpen] = useState(true);
  const [financeOpen, setFinanceOpen] = useState(true);

  const handleItemClick = (item: NavItem) => {
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
    const isActive = isWindowItem
      ? activeWindow === item.label
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;
    const className = `group relative flex min-h-[44px] w-full items-center gap-2.5 rounded-2xl border px-3.5 py-1.5 text-left transition duration-200 ${
      isActive || (hasChildren && childIsActive)
        ? 'border-sky-300/25 bg-sky-300/[0.08] text-white shadow-[0_0_0_1px_rgba(125,211,252,0.12),0_16px_30px_rgba(14,165,233,0.12)] before:absolute before:left-0 before:top-2 before:h-[calc(100%-1rem)] before:w-1 before:rounded-full before:bg-sky-300'
        : 'border-transparent text-zinc-300/90 hover:border-sky-100/[0.08] hover:bg-white/[0.035] hover:text-white'
    }`;
    const childClassName = `group relative ml-7 flex min-h-[32px] w-[calc(100%-1.75rem)] items-center gap-2 rounded-xl border px-3 py-1.5 text-left transition duration-200 ${
      isActive
        ? 'border-sky-300/20 bg-sky-300/[0.07] text-white'
        : 'border-transparent text-zinc-400 hover:border-sky-100/[0.06] hover:bg-white/[0.03] hover:text-zinc-100'
    }`;

    const content = (
      <>
        <span
          className={`flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border transition duration-200 ${item.chip} ${
            isActive || (hasChildren && childIsActive) ? 'shadow-[0_0_24px_rgba(56,189,248,0.14)]' : 'group-hover:shadow-[0_0_18px_rgba(255,255,255,0.08)]'
          }`}
        >
          <Icon className={`h-[18px] w-[18px] ${item.tone}`} strokeWidth={1.9} />
        </span>
        <span className="text-[13px] font-medium leading-none tracking-[0.01em]">{item.label}</span>
      </>
    );
    const childContent = (
      <>
        <span
          className={`flex h-[26px] w-[26px] items-center justify-center rounded-lg border transition duration-200 ${item.chip} ${
            isActive ? 'shadow-[0_0_18px_rgba(56,189,248,0.12)]' : 'group-hover:shadow-[0_0_14px_rgba(255,255,255,0.07)]'
          }`}
        >
          <Icon className={`h-[14px] w-[14px] ${item.tone}`} strokeWidth={1.9} />
        </span>
        <span className="text-[12px] font-medium leading-none tracking-[0.01em]">{item.label}</span>
      </>
    );

    if (hasChildren) {
      return (
        <div key={item.href} className="space-y-1">
          <div className="relative">
            <button type="button" onClick={() => handleItemClick(item)} className={`${className} pr-11`}>
              {content}
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setFinanceOpen((current) => !current);
              }}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] text-xs text-zinc-400 transition hover:border-sky-300/20 hover:bg-sky-300/[0.08] hover:text-white"
              aria-label="Toggle finance menu"
            >
              <span className={`transition ${financeOpen ? 'rotate-180' : ''}`}>⌄</span>
            </button>
          </div>
          {financeOpen && <div className="space-y-1">{item.children?.map((child) => renderItem(child, true))}</div>}
        </div>
      );
    }

    if (isWindowItem) {
      return (
        <button key={item.href} type="button" onClick={() => handleItemClick(item)} className={nested ? childClassName : className}>
          {nested ? childContent : content}
        </button>
      );
    }

    return (
      <Link key={item.href} href={item.href} className={nested ? childClassName : className}>
        {nested ? childContent : content}
      </Link>
    );
  };

  return (
    <aside className="flex h-screen w-[280px] shrink-0 flex-col border-r border-sky-100/[0.08] bg-[linear-gradient(180deg,#07101a_0%,#05080d_100%)] text-white shadow-[24px_0_60px_rgba(0,0,0,0.32)]">
      <div className="border-b border-sky-100/[0.08] px-6 pb-5 pt-6">
        <div className="relative mx-auto h-[74px] w-[176px]">
          <div className="absolute inset-3 rounded-full bg-sky-400/[0.08] blur-2xl" />
          <Image src="/logo.png" alt="AUTOCLUB" fill priority className="relative object-cover object-center" sizes="176px" />
        </div>
        <p className="mt-2 text-center text-[11px] font-medium uppercase tracking-[0.28em] text-[#8e99a8]">
          Enterprise Fleet ERP
        </p>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {NAV_SECTIONS.map((section) => {
          const isSystem = section.collapsible;
          const isOpen = !isSystem || systemOpen;

          return (
            <div key={section.title} className="space-y-2">
              {isSystem ? (
                <button
                  type="button"
                  onClick={() => setSystemOpen((current) => !current)}
                  className="flex w-full items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8e99a8] transition hover:text-zinc-200"
                >
                  <span>{section.title}</span>
                  <span className={`text-xs transition ${systemOpen ? 'rotate-180' : ''}`}>⌄</span>
                </button>
              ) : (
                <div className="px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8e99a8]">
                  {section.title}
                </div>
              )}

              {isOpen && <div className="space-y-1">{section.items.map((item) => renderItem(item))}</div>}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sky-100/[0.08] px-5 py-4">
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-3 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-300/20 bg-sky-300/[0.08] text-sm font-semibold text-white">
            A
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#f4f7fb]">AutoClub</p>
            <p className="truncate text-xs text-[#8e99a8]">{userEmail || 'Administrator'}</p>
          </div>
        </div>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 w-full rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-rose-300/25 hover:bg-rose-300/[0.08] hover:text-white"
          >
            Αποσύνδεση
          </button>
        )}
        <p className="mt-3 text-center text-[11px] uppercase tracking-[0.2em] text-zinc-600">v1.0.0</p>
      </div>
    </aside>
  );
}
