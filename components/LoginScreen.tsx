'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    const email = username === 'admin' ? 'admin@autoclub.gr' : username;
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setSubmitting(false);

    if (error) {
      setErrorMessage(
        error.message === 'Invalid login credentials'
          ? 'Λάθος χρήστης ή κωδικός πρόσβασης.'
          : error.message
      );
    }
  };

  return (
    <main className="relative flex min-h-screen w-full flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_48%_42%,rgba(14,165,233,0.13),transparent_24%),radial-gradient(circle_at_58%_38%,rgba(34,197,94,0.08),transparent_20%),linear-gradient(180deg,#08111a_0%,#050910_100%)] px-4">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:44px_44px] opacity-20" />
      <section className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-sky-100/[0.12] bg-[linear-gradient(180deg,rgba(13,20,30,0.96),rgba(7,12,18,0.98))] p-7 shadow-[0_24px_90px_rgba(0,0,0,0.58)] backdrop-blur-xl">
        <div className="relative mx-auto mb-6 h-[84px] w-[190px]">
          <div className="absolute inset-3 rounded-full bg-sky-400/[0.09] blur-2xl" />
          <Image src="/logo.png" alt="AUTOCLUB" fill priority className="relative object-cover object-center" sizes="190px" />
        </div>

        <div className="mb-6 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#8e99a8]">Enterprise Fleet ERP</p>
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-[#f4f7fb]">Σύνδεση</h1>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2 text-sm text-zinc-300">
            <span>Χρήστης</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              placeholder="admin"
              required
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-900/90 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
            />
          </label>

          <label className="block space-y-2 text-sm text-zinc-300">
            <span>Password</span>
            <span className="relative block">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-900/90 px-4 py-3 pr-14 text-sm text-white outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-sky-300/20 hover:bg-sky-300/[0.08] hover:text-white"
                aria-label={showPassword ? 'Απόκρυψη κωδικού' : 'Εμφάνιση κωδικού'}
              >
                {showPassword ? 'Απόκρυψη' : 'Προβολή'}
              </button>
            </span>
          </label>

          {errorMessage && (
            <p className="rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Σύνδεση...' : 'Σύνδεση'}
          </button>
        </form>
      </section>
    </main>
  );
}
