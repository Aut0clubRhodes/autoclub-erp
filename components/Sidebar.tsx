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
}

interface NavSection {
  title: string;
  items: NavItem[];
  collapsible?: boolean;
}

interface SidebarProps {
  onWindowOpen?: (windowId: string) => void;
  activeWindow?: string | null;
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'ΛΕΙΤΟΥΡΓΙΑ',
    items: [
      { label: 'Πίνακας', href: '/dashboard', icon: LayoutDashboard, tone: 'text-zinc-300' },
      { label: 'Κρατήσεις', href: '/bookings', icon: CalendarDays, tone: 'text-zinc-300' },
      { label: 'Αυτοκίνητα', href: '/cars', icon: Car, tone: 'text-sky-200' },
      { label: 'Service', href: '/services', icon: Wrench, tone: 'text-orange-200' },
    ],
  },
  {
    title: 'ΟΙΚΟΝΟΜΙΚΑ',
    items: [
      { label: 'Ταμείο', href: '/finance', icon: Wallet, tone: 'text-zinc-300' },
      { label: 'Έσοδα', href: '/finance/income', icon: TrendingUp, tone: 'text-cyan-200' },
      { label: 'Έξοδα', href: '/finance/expenses', icon: TrendingDown, tone: 'text-rose-200' },
      { label: 'Αναφορές', href: '/reports', icon: BarChart3, tone: 'text-amber-200' },
    ],
  },
  {
    title: 'ΣΥΣΤΗΜΑ',
    collapsible: true,
    items: [
      { label: 'Προμηθευτές', href: '/suppliers', icon: Building2, tone: 'text-zinc-300' },
      { label: 'Πρακτορεία', href: '/agencies', icon: BriefcaseBusiness, tone: 'text-zinc-300' },
      { label: 'Κατηγορίες Εξόδων', href: '/expense-categories', icon: Tags, tone: 'text-zinc-300' },
      { label: 'Ρυθμίσεις', href: '/settings', icon: Settings2, tone: 'text-zinc-300' },
    ],
  },
];

const WINDOW_ITEMS = [
  'Αυτοκίνητα',
  'Ταμείο',
  'Έσοδα',
  'Έξοδα',
  'Προμηθευτές',
  'Αναφορές',
  'Πρακτορεία',
  'Κατηγορίες Εξόδων',
];

export default function Sidebar({ onWindowOpen, activeWindow }: SidebarProps) {
  const pathname = usePathname();
  const [systemOpen, setSystemOpen] = useState(true);

  const handleItemClick = (item: NavItem) => {
    if (WINDOW_ITEMS.includes(item.label) && onWindowOpen) {
      onWindowOpen(item.label);
    }
  };

  const renderItem = (item: NavItem) => {
    const isWindowItem = WINDOW_ITEMS.includes(item.label);
    const isActive = isWindowItem
      ? activeWindow === item.label
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;
    const className = `group flex min-h-9 w-full items-center gap-3 rounded-xl border px-3 py-1.5 text-left transition duration-200 ${
      isActive
        ? 'border-sky-400/25 bg-sky-400/[0.08] text-white shadow-[0_0_0_1px_rgba(56,189,248,0.08),0_12px_28px_rgba(2,132,199,0.08)]'
        : 'border-transparent text-zinc-400 hover:border-white/[0.07] hover:bg-white/[0.03] hover:text-zinc-100'
    }`;

    const content = (
      <>
        <span
          className={`flex h-[22px] w-[22px] items-center justify-center rounded-md border transition duration-200 ${
            isActive
              ? 'border-sky-400/25 bg-sky-400/[0.08]'
              : 'border-white/[0.06] bg-white/[0.02] group-hover:border-white/[0.1] group-hover:bg-white/[0.04]'
          }`}
        >
          <Icon className={`h-3.5 w-3.5 ${item.tone}`} strokeWidth={1.75} />
        </span>
        <span className="text-sm font-medium leading-none">{item.label}</span>
      </>
    );

    if (isWindowItem) {
      return (
        <button key={item.href} type="button" onClick={() => handleItemClick(item)} className={className}>
          {content}
        </button>
      );
    }

    return (
      <Link key={item.href} href={item.href} className={className}>
        {content}
      </Link>
    );
  };

  return (
    <aside className="flex h-screen w-[248px] shrink-0 flex-col border-r border-white/[0.045] bg-[linear-gradient(180deg,#070b10_0%,#06090d_100%)] text-white shadow-[18px_0_40px_rgba(0,0,0,0.22)]">
      <div className="border-b border-white/[0.06] px-5 py-3.5">
        <div className="relative h-11 w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <Image src="/logo.png" alt="AUTOCLUB" fill priority className="object-cover object-center" sizes="208px" />
        </div>
        <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500/90">
          Enterprise Fleet ERP
        </p>
      </div>

      <nav className="flex-1 space-y-3.5 overflow-y-auto px-4 py-4">
        {NAV_SECTIONS.map((section) => {
          const isSystem = section.collapsible;
          const isOpen = !isSystem || systemOpen;

          return (
            <div key={section.title} className="space-y-2">
              {isSystem ? (
                <button
                  type="button"
                  onClick={() => setSystemOpen((current) => !current)}
                  className="flex w-full items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500/80 transition hover:text-zinc-300"
                >
                  <span>{section.title}</span>
                  <span className={`text-xs transition ${systemOpen ? 'rotate-180' : ''}`}>⌄</span>
                </button>
              ) : (
                <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500/80">
                  {section.title}
                </div>
              )}

              {isOpen && <div className="space-y-1">{section.items.map(renderItem)}</div>}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.06] px-5 py-3">
        <p className="text-center text-[11px] uppercase tracking-[0.2em] text-zinc-600">v1.0.0</p>
      </div>
    </aside>
  );
}
