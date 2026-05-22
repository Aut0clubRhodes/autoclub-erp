'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createBackup } from '@/lib/backupApi';

function formatBackupTimestamp(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + `-${pad(date.getHours())}-${pad(date.getMinutes())}`;
}

export default function Settings() {
  const router = useRouter();
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_52%_0%,rgba(56,189,248,0.08),transparent_28%),linear-gradient(180deg,#07101a_0%,#050910_100%)] p-4 text-white sm:p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="rounded-3xl border border-white/[0.07] bg-white/[0.025] px-5 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-sm text-zinc-300 transition duration-200 hover:border-sky-300/25 hover:bg-white/[0.06] hover:text-white"
              >
                Πίσω
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-200/60">
                  AUTOCLUB ERP
                </p>
                <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">Ρυθμίσεις</h1>
                <p className="mt-1 text-sm text-zinc-400">System configuration, backup and access tools.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-sm text-zinc-400 transition duration-200 hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white"
              aria-label="Close settings"
            >
              ×
            </button>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="h-fit rounded-3xl border border-white/[0.07] bg-white/[0.025] p-3 shadow-[0_18px_54px_rgba(0,0,0,0.2)]">
            <nav className="space-y-1">
              {['Backup', 'System', 'Security', 'Integrations'].map((item, index) => (
                <button
                  key={item}
                  type="button"
                  className={`w-full rounded-2xl px-4 py-3 text-left text-sm transition duration-200 ${
                    index === 0
                      ? 'border border-sky-300/18 bg-sky-300/[0.09] text-white shadow-[0_0_20px_rgba(56,189,248,0.06)]'
                      : 'border border-transparent text-zinc-500 hover:border-white/[0.06] hover:bg-white/[0.035] hover:text-zinc-300'
                  }`}
                >
                  {item}
                  {index > 0 && <span className="ml-2 text-[10px] uppercase tracking-[0.16em] text-zinc-600">soon</span>}
                </button>
              ))}
            </nav>
          </aside>

          <main className="space-y-5">
            <section className="rounded-3xl border border-sky-100/[0.1] bg-white/[0.025] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.28)] sm:p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Backup Συστήματος</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                    Κατεβάζει ένα JSON backup με τα βασικά δεδομένα της βάσης: αυτοκίνητα, service,
                    οικονομικές κινήσεις, προμηθευτές, πρακτορεία, αντιπροσώπους, κρατήσεις, έγγραφα και
                    κατηγορίες εξόδων.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  disabled={loading}
                  className="w-full rounded-2xl border border-sky-300/20 bg-sky-300/[0.1] px-5 py-3 text-sm font-semibold text-sky-100 shadow-[0_0_24px_rgba(56,189,248,0.08)] transition duration-200 hover:-translate-y-px hover:border-sky-300/35 hover:bg-sky-300/[0.16] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                >
                  {loading ? 'Δημιουργία Backup...' : 'Λήψη Backup'}
                </button>
              </div>

              {(message || error) && (
                <div className="mt-5 space-y-3">
                  {message && (
                    <div className="rounded-2xl border border-emerald-300/18 bg-emerald-300/[0.08] px-4 py-3 text-sm text-emerald-100">
                      {message}
                    </div>
                  )}
                  {error && (
                    <div className="rounded-2xl border border-rose-300/18 bg-rose-300/[0.08] px-4 py-3 text-sm text-rose-100">
                      {error}
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              {[
                ['System', 'Γενικές επιλογές συστήματος θα συνδεθούν αργότερα.'],
                ['Security', 'Ρόλοι, δικαιώματα και πρόσβαση σε επόμενο βήμα.'],
                ['Integrations', 'Συνδέσεις τρίτων υπηρεσιών σε μελλοντική έκδοση.'],
              ].map(([title, description]) => (
                <div key={title} className="rounded-3xl border border-white/[0.06] bg-white/[0.018] p-5 text-sm text-zinc-500">
                  <h3 className="font-semibold text-zinc-300">{title}</h3>
                  <p className="mt-2 leading-6">{description}</p>
                </div>
              ))}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
