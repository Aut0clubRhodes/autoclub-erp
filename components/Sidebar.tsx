'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: string;
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
      { label: 'Πίνακας', href: '/dashboard', icon: '▣' },
      { label: 'Κρατήσεις', href: '/bookings', icon: '▤' },
      { label: 'Αυτοκίνητα', href: '/cars', icon: '◫' },
      { label: 'Service', href: '/services', icon: '◌' },
    ],
  },
  {
    title: 'ΟΙΚΟΝΟΜΙΚΑ',
    items: [
      { label: 'Ταμείο', href: '/finance', icon: '€' },
      { label: 'Έσοδα', href: '/finance/income', icon: '↗' },
      { label: 'Έξοδα', href: '/finance/expenses', icon: '↘' },
      { label: 'Αναφορές', href: '/reports', icon: '◫' },
    ],
  },
  {
    title: 'ΣΥΣΤΗΜΑ',
    collapsible: true,
    items: [
      { label: 'Προμηθευτές', href: '/suppliers', icon: '◉' },
      { label: 'Πρακτορεία', href: '/agencies', icon: '⌂' },
      { label: 'Ρυθμίσεις', href: '/settings', icon: '⚙' },
    ],
  },
];

const WINDOW_ITEMS = ['Αυτοκίνητα', 'Ταμείο', 'Έσοδα', 'Έξοδα', 'Προμηθευτές', 'Αναφορές', 'Πρακτορεία'];

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
    const className = `group flex w-full items-center gap-3 rounded-xl border px-3 py-1.5 text-left transition ${
      isActive
        ? 'border-sky-400/30 bg-sky-400/10 text-white shadow-[0_0_0_1px_rgba(56,189,248,0.08)]'
        : 'border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-white/[0.035] hover:text-zinc-100'
    }`;

    const content = (
      <>
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-lg border text-[11px] ${
            isActive
              ? 'border-sky-400/30 bg-sky-400/10 text-sky-200'
              : 'border-zinc-800 bg-zinc-900/80 text-zinc-500 group-hover:text-zinc-300'
          }`}
        >
          {item.icon}
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
    <aside className="flex h-screen w-[248px] shrink-0 flex-col border-r border-white/[0.06] bg-[linear-gradient(180deg,#0b0d11_0%,#090a0d_100%)] text-white shadow-[18px_0_40px_rgba(0,0,0,0.28)]">
      <div className="border-b border-white/[0.06] px-5 py-3.5">
        <div className="relative h-11 w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <Image src="/logo.png" alt="AUTOCLUB" fill priority className="object-cover object-center" sizes="208px" />
        </div>
        <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-500">
          Enterprise Fleet ERP
        </p>
      </div>

      <nav className="flex-1 space-y-3 overflow-y-auto px-4 py-3.5">
        {NAV_SECTIONS.map((section) => {
          const isSystem = section.collapsible;
          const isOpen = !isSystem || systemOpen;

          return (
            <div key={section.title} className="space-y-2">
              {isSystem ? (
                <button
                  type="button"
                  onClick={() => setSystemOpen((current) => !current)}
                  className="flex w-full items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500 transition hover:text-zinc-300"
                >
                  <span>{section.title}</span>
                  <span className={`text-xs transition ${systemOpen ? 'rotate-180' : ''}`}>⌄</span>
                </button>
              ) : (
                <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
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
