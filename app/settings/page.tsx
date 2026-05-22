'use client';

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
    <div className="min-h-screen bg-[linear-gradient(180deg,#07101a_0%,#050910_100%)] p-6 text-white sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-200/60">
            AUTOCLUB ERP
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Ρυθμίσεις</h1>
          <p className="mt-2 text-sm text-zinc-400">System configuration and backup tools.</p>
        </header>

        <section className="rounded-3xl border border-sky-100/[0.1] bg-white/[0.025] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.32)]">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
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
              className="rounded-2xl border border-sky-300/20 bg-sky-300/[0.1] px-5 py-3 text-sm font-semibold text-sky-100 shadow-[0_0_24px_rgba(56,189,248,0.08)] transition duration-200 hover:-translate-y-px hover:border-sky-300/35 hover:bg-sky-300/[0.16] disabled:cursor-not-allowed disabled:opacity-55"
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
      </div>
    </div>
  );
}
