'use client';

import { useState } from 'react';
import {
  Archive,
  Building2,
  FolderCog,
  Languages,
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
import {
  defaultReservationLanguages,
  loadReservationLanguages,
  saveReservationLanguages,
  type ReservationLanguageOption,
} from '@/lib/reservationLanguages';
import type { SupplierRecord } from '@/lib/suppliersApi';

type SettingsSection =
  | 'backup'
  | 'suppliers'
  | 'agencies'
  | 'vehicle-groups'
  | 'languages'
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

const settingsSections = [
  ...sections.slice(0, 4),
  { id: 'languages' as SettingsSection, label: 'Γλώσσες', description: 'Διαχείριση γλωσσών κρατήσεων', icon: Languages, tone: 'text-teal-200' },
  ...sections.slice(4),
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
        {settingsSections.map((section) => {
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
        {activeSection === 'languages' && <LanguagesSettingsPanel />}
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

function LanguagesSettingsPanel() {
  const [languages, setLanguages] = useState<ReservationLanguageOption[]>(() => loadReservationLanguages());
  const [draft, setDraft] = useState({ label: '', value: '' });
  const [message, setMessage] = useState('');

  const persistLanguages = (nextLanguages: ReservationLanguageOption[], nextMessage: string) => {
    setLanguages(nextLanguages);
    saveReservationLanguages(nextLanguages);
    setMessage(nextMessage);
  };

  const updateLanguage = (id: string, patch: Partial<ReservationLanguageOption>) => {
    persistLanguages(
      languages.map((language) => (language.id === id ? { ...language, ...patch } : language)),
      'Οι γλώσσες ενημερώθηκαν.',
    );
  };

  const addLanguage = () => {
    const label = draft.label.trim();
    const value = draft.value.trim().toLowerCase();
    if (!label || !value) {
      setMessage('Συμπλήρωσε label και value/code.');
      return;
    }
    if (languages.some((language) => language.value.toLowerCase() === value)) {
      setMessage('Υπάρχει ήδη γλώσσα με αυτό το value/code.');
      return;
    }

    persistLanguages(
      [
        ...languages,
        {
          id: `custom-language-${Date.now()}`,
          label,
          value,
          active: true,
          builtIn: false,
        },
      ],
      'Η γλώσσα προστέθηκε.',
    );
    setDraft({ label: '', value: '' });
  };

  const resetDefaults = () => {
    persistLanguages(defaultReservationLanguages, 'Οι προεπιλεγμένες γλώσσες επαναφέρθηκαν.');
  };

  return (
    <section className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-200/70">SYSTEM</p>
        <h3 className="mt-1 text-xl font-semibold text-white">Γλώσσες</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
          Διαχείριση γλωσσών κρατήσεων. Οι ενεργές γλώσσες εμφανίζονται στα dropdowns των κρατήσεων.
        </p>
      </div>

      <div className="grid gap-2 rounded-2xl border border-white/[0.07] bg-black/20 p-3 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
        <input
          value={draft.label}
          onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
          placeholder="Label, π.χ. Spanish"
          className="h-10 rounded-xl border border-white/[0.08] bg-zinc-950/80 px-3 text-sm font-semibold text-white outline-none placeholder:text-zinc-600 focus:border-teal-300/55"
        />
        <input
          value={draft.value}
          onChange={(event) => setDraft((current) => ({ ...current, value: event.target.value }))}
          placeholder="Code, π.χ. es"
          className="h-10 rounded-xl border border-white/[0.08] bg-zinc-950/80 px-3 text-sm font-semibold text-white outline-none placeholder:text-zinc-600 focus:border-teal-300/55"
        />
        <button
          type="button"
          onClick={addLanguage}
          className="h-10 rounded-xl border border-teal-300/25 bg-teal-300/[0.12] px-4 text-sm font-black text-teal-100 transition hover:bg-teal-300/[0.18]"
        >
          Add language
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-black/20">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-white/[0.04] text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">
            <tr>
              <th className="px-3 py-2">Label</th>
              <th className="px-3 py-2">Value/code</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {languages.map((language) => (
              <tr key={language.id}>
                <td className="px-3 py-2">
                  <input
                    value={language.label}
                    onChange={(event) => updateLanguage(language.id, { label: event.target.value })}
                    className="h-9 w-full rounded-lg border border-white/[0.08] bg-zinc-950/80 px-2 text-sm font-semibold text-white outline-none focus:border-teal-300/55"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={language.value}
                    onChange={(event) => updateLanguage(language.id, { value: event.target.value.trim().toLowerCase() })}
                    className="h-9 w-full rounded-lg border border-white/[0.08] bg-zinc-950/80 px-2 font-mono text-sm font-semibold text-white outline-none focus:border-teal-300/55"
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => updateLanguage(language.id, { active: !language.active })}
                    className={`rounded-full border px-3 py-1 text-xs font-black ${
                      language.active
                        ? 'border-emerald-300/30 bg-emerald-300/[0.12] text-emerald-100'
                        : 'border-zinc-500/30 bg-zinc-500/[0.1] text-zinc-400'
                    }`}
                  >
                    {language.active ? 'Yes' : 'No'}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  {language.builtIn ? (
                    <span className="text-xs font-semibold text-zinc-500">Default</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => persistLanguages(languages.filter((item) => item.id !== language.id), 'Η γλώσσα διαγράφηκε.')}
                      className="rounded-lg border border-rose-300/25 bg-rose-300/[0.1] px-3 py-1.5 text-xs font-black text-rose-100 hover:bg-rose-300/[0.16]"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {message && <p className="text-sm font-semibold text-teal-100">{message}</p>}
        <button
          type="button"
          onClick={resetDefaults}
          className="ml-auto rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-2 text-xs font-black text-zinc-200 transition hover:bg-white/[0.07]"
        >
          Reset defaults
        </button>
      </div>
    </section>
  );
}
