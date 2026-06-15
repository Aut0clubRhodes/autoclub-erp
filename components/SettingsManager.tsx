'use client';

import { useState } from 'react';
import {
  Archive,
  Building2,
  FolderCog,
  LockKeyhole,
  Network,
  Tags,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import AgenciesManager from '@/components/AgenciesManager';
import ExpenseCategoriesManager from '@/components/ExpenseCategoriesManager';
import SuppliersManager from '@/components/SuppliersManager';
import { VehicleGroupsPanel } from '@/components/Sidebar';
import { createBackup } from '@/lib/backupApi';
import type { SupplierRecord } from '@/lib/suppliersApi';

type SettingsSection =
  | 'backup'
  | 'suppliers'
  | 'agencies'
  | 'vehicle-groups'
  | 'expense-categories'
  | 'security'
  | 'integrations';

type SettingsManagerProps = {
  onSuppliersChange?: (suppliers: SupplierRecord[]) => void;
};

const sections: {
  id: SettingsSection;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: string;
}[] = [
  { id: 'backup', label: 'Backup', description: 'Εξαγωγή δεδομένων ERP', icon: Archive, tone: 'text-sky-200' },
  { id: 'suppliers', label: 'Εισαγωγή Προμηθευτών', description: 'Κατάλογος προμηθευτών', icon: Truck, tone: 'text-violet-200' },
  { id: 'agencies', label: 'Εισαγωγή Πρακτορείων', description: 'Πρακτορεία και αντιπρόσωποι', icon: Network, tone: 'text-cyan-200' },
  { id: 'vehicle-groups', label: 'Εισαγωγή Κατηγοριών Οχημάτων', description: 'Groups στόλου', icon: Tags, tone: 'text-emerald-200' },
  { id: 'expense-categories', label: 'Εισαγωγή Κατηγοριών Εξόδων', description: 'Κατηγοριοποίηση εξόδων', icon: FolderCog, tone: 'text-amber-200' },
  { id: 'security', label: 'Security', description: 'Ρόλοι και πρόσβαση', icon: LockKeyhole, tone: 'text-zinc-200' },
  { id: 'integrations', label: 'Integrations', description: 'Εξωτερικές συνδέσεις', icon: Building2, tone: 'text-blue-200' },
];

function formatBackupTimestamp(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(
    date.getHours()
  )}-${pad(date.getMinutes())}`;
}

export default function SettingsManager({ onSuppliersChange }: SettingsManagerProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('backup');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleDownloadBackup = async () => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const backup = await createBackup();
      const fileName = `autoclub-backup-${formatBackupTimestamp()}.json`;
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setMessage(`Το backup δημιουργήθηκε: ${fileName}`);
      if (backup.errors) {
        setError('Ορισμένοι πίνακες δεν εξήχθησαν. Δείτε την κονσόλα για λεπτομέρειες.');
      }
    } catch (backupError) {
      console.error('Backup download error:', backupError);
      setError('Το backup δεν ολοκληρώθηκε.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-0 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-2 rounded-2xl border border-white/[0.07] bg-black/20 p-3">
        {sections.map((section) => {
          const Icon = section.icon;
          const active = activeSection === section.id;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                active
                  ? 'erp-active-nav border-sky-300/25 bg-sky-300/[0.09] text-white'
                  : 'border-transparent text-zinc-400 hover:border-white/[0.07] hover:bg-white/[0.035] hover:text-white'
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035]">
                <Icon className={`h-4 w-4 ${section.tone}`} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{section.label}</span>
                <span className="mt-0.5 block text-xs text-zinc-500">{section.description}</span>
              </span>
            </button>
          );
        })}
      </aside>

      <main className="min-h-[520px] rounded-2xl border border-white/[0.07] bg-white/[0.018] p-5">
        {activeSection === 'backup' && (
          <section>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-200/60">SYSTEM</p>
            <h3 className="mt-1 text-xl font-semibold text-white">Backup Συστήματος</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Κατεβάζει ένα JSON backup με τα βασικά δεδομένα του ERP.
            </p>
            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={loading}
              className="erp-action-primary mt-5 rounded-xl border border-sky-300/25 bg-sky-300/[0.1] px-5 py-3 text-sm font-semibold text-sky-100 transition hover:bg-sky-300/[0.16] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {loading ? 'Δημιουργία Backup...' : 'Λήψη Backup'}
            </button>
            {message && <p className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.08] px-4 py-3 text-sm text-emerald-100">{message}</p>}
            {error && <p className="mt-3 rounded-xl border border-rose-300/20 bg-rose-300/[0.08] px-4 py-3 text-sm text-rose-100">{error}</p>}
          </section>
        )}

        {activeSection === 'suppliers' && <SuppliersManager onSuppliersChange={onSuppliersChange} />}
        {activeSection === 'agencies' && <AgenciesManager />}
        {activeSection === 'vehicle-groups' && <VehicleGroupsPanel embedded />}
        {activeSection === 'expense-categories' && <ExpenseCategoriesManager />}

        {activeSection === 'security' && (
          <PlaceholderSection title="Security" text="Η διαχείριση ρόλων και πρόσβασης θα προστεθεί αργότερα." />
        )}
        {activeSection === 'integrations' && (
          <PlaceholderSection title="Integrations" text="Οι εξωτερικές συνδέσεις θα προστεθούν αργότερα." />
        )}
      </main>
    </div>
  );
}

function PlaceholderSection({ title, text }: { title: string; text: string }) {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-black/20 p-6">
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">{text}</p>
    </section>
  );
}
