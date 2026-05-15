'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  onWindowOpen?: (windowId: string) => void;
  activeWindow?: string | null;
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'ΛΕΙΤΟΥΡΓΙΑ',
    items: [
      { label: 'Πίνακας', href: '/dashboard', icon: '📊' },
      { label: 'Κρατήσεις', href: '/bookings', icon: '🚗' },
      { label: 'Αυτοκίνητα', href: '/cars', icon: '🚘' },
      { label: 'Service', href: '/services', icon: '🔧' },
    ],
  },
  {
    title: 'ΟΙΚΟΝΟΜΙΚΑ',
    items: [
      { label: 'Ταμείο', href: '/finance', icon: '💰' },
      { label: 'Έσοδα', href: '/finance/income', icon: '🧾' },
      { label: 'Έξοδα', href: '/finance/expenses', icon: '📤' },
      { label: 'Προμηθευτές', href: '/suppliers', icon: '🏢' },
      { label: 'Αναφορές', href: '/reports', icon: '📈' },
    ],
  },
  {
    title: 'ΣΥΣΤΗΜΑ',
   items: [
  { label: 'Πρακτορεία', href: '/agencies', icon: '🏢' },
  { label: 'Ρυθμίσεις', href: '/settings', icon: '⚙️' },
],
  },
];

const WINDOW_ITEMS = ['Αυτοκίνητα', 'Ταμείο', 'Έσοδα', 'Έξοδα', 'Προμηθευτές', 'Αναφορές', 'Πρακτορεία'];

export default function Sidebar({ onWindowOpen, activeWindow }: SidebarProps) {
  const pathname = usePathname();

  const handleItemClick = (item: NavItem) => {
    if (WINDOW_ITEMS.includes(item.label) && onWindowOpen) {
      onWindowOpen(item.label);
    }
  };

  return (
    <aside className="w-64 bg-black border-r border-zinc-800 flex flex-col h-screen text-white">
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-xl font-semibold tracking-tight">AUTOCLUB</h1>
        <p className="text-xs text-zinc-500 mt-2">Enterprise fleet management</p>
      </div>

      <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-3">
            <div className="text-[0.65rem] font-semibold tracking-[0.24em] text-zinc-500 uppercase">
              {section.title}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isWindowItem = WINDOW_ITEMS.includes(item.label);
                const isActive =
                  isWindowItem
                    ? activeWindow === item.label
                    : pathname === item.href || pathname.startsWith(item.href + '/');

                if (isWindowItem) {
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleItemClick(item)}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors text-left ${
                        isActive
                          ? 'bg-zinc-900 text-white border-l-2 border-sky-500'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-sm font-medium leading-none">{item.label}</span>
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-zinc-900 text-white border-l-2 border-sky-500'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm font-medium leading-none">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <p className="text-xs text-zinc-600 text-center">v1.0.0</p>
      </div>
    </aside>
  );
}
