'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { createNotification } from '@/lib/notificationsApi';
import { createReservationEvent } from '@/lib/reservationEventsApi';
import type { ReservationRequestRecord } from '@/lib/reservationsApi';

type ReturnConfirmClientProps = {
  reservationId: string;
};

type PageState = 'loading' | 'ready' | 'confirming' | 'confirmed' | 'error';

const GOOGLE_REVIEW_URL = 'https://g.page/r/CYOr9zt3_-KVEBM/review';
const OWNER_RETURN_NOTIFICATION_WEBHOOK_URL =
  'https://hook.eu1.make.com/yxgr8rhw8xtihtd6p6416btez93jj917';

const logReturnConfirmError = (label: string, error: unknown) => {
  const supabaseError = error as { message?: string; details?: string; hint?: string; code?: string } | null;

  console.error(label, {
    message: supabaseError?.message || 'Unknown return confirmation error',
    details: supabaseError?.details || '',
    hint: supabaseError?.hint || '',
    code: supabaseError?.code || '',
    raw: error,
  });
};

const formatReturnDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('el-GR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const notifyOwnerReturnConfirmed = async (hotelRoom?: string | null) => {
  if (!OWNER_RETURN_NOTIFICATION_WEBHOOK_URL || OWNER_RETURN_NOTIFICATION_WEBHOOK_URL.includes('PASTE_')) {
    console.warn('Owner return notification webhook URL is not configured.');
    return;
  }

  try {
    const response = await fetch(OWNER_RETURN_NOTIFICATION_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hotel_room: hotelRoom || '',
      }),
    });

    if (!response.ok) {
      console.error('Owner return notification webhook failed.', {
        status: response.status,
        statusText: response.statusText,
      });
    }
  } catch (error) {
    console.error('Owner return notification webhook error:', error);
  }
};

export default function ReturnConfirmClient({ reservationId }: ReturnConfirmClientProps) {
  const [reservation, setReservation] = useState<ReservationRequestRecord | null>(null);
  const [pageState, setPageState] = useState<PageState>(reservationId ? 'loading' : 'error');
  const [message, setMessage] = useState(reservationId ? '' : 'Missing reservation id.');
  const [rating, setRating] = useState(0);
  const [ratingMessage, setRatingMessage] = useState('');

  useEffect(() => {
    if (!reservationId) return;

    const loadReservation = async () => {
      setPageState('loading');
      setMessage('');

      const { data, error } = await supabase
        .from('reservation_requests')
        .select('*')
        .eq('id', reservationId)
        .single();

      if (error) {
        logReturnConfirmError('Fetch return reservation error:', error);
        setMessage('Reservation was not found.');
        setPageState('error');
        return;
      }

      const nextReservation = data as ReservationRequestRecord;
      setReservation(nextReservation);
      setPageState(nextReservation.return_confirmed ? 'confirmed' : 'ready');
    };

    void loadReservation();
  }, [reservationId]);

  const notificationMessage = useMemo(() => {
    if (!reservation) return 'Customer confirmed vehicle return.';

    return `${reservation.customer_name || reservation.phone || 'Customer'} confirmed vehicle return.`;
  }, [reservation]);

  const confirmReturn = async () => {
    if (!reservationId || !reservation) return;

    setPageState('confirming');
    setMessage('');

    const confirmedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from('reservation_requests')
      .update({
        status: 'RETURN',
        return_confirmed: true,
        return_confirmed_at: confirmedAt,
      })
      .eq('id', reservationId)
      .select('*')
      .single();

    if (error) {
      logReturnConfirmError('Confirm return update error:', error);
      setMessage('Return confirmation could not be saved. Please try again.');
      setPageState('ready');
      return;
    }

    await createReservationEvent({
      reservation_id: reservationId,
      event_type: 'return_confirmed',
      event_message: 'Customer confirmed vehicle return.',
    });

    const notification = await createNotification({
      reservation_id: reservationId,
      type: 'return_confirmed',
      title: 'Vehicle return confirmed',
      message: notificationMessage,
    });

    if (!notification) {
      console.error('Return confirmation notification insert failed.');
    }

    await notifyOwnerReturnConfirmed(data?.hotel_room || reservation.hotel_room);

    setReservation(data as ReservationRequestRecord);
    setPageState('confirmed');
  };

  const handleRating = (nextRating: number) => {
    setRating(nextRating);

    if (nextRating >= 4) {
      window.location.assign(GOOGLE_REVIEW_URL);
      return;
    }

    setRatingMessage('Thank you for your feedback.');
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.12),transparent_32%),linear-gradient(180deg,#07101a_0%,#050910_100%)] px-4 py-8 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[720px] flex-col items-center justify-center">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="relative h-20 w-48">
            <Image src="/logo.png" alt="AUTOCLUB" fill priority className="object-contain" sizes="192px" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-100/60">Return confirmation</p>
        </div>

        <div className="w-full overflow-hidden rounded-[28px] border border-white/[0.08] bg-zinc-950/86 shadow-[0_28px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="border-b border-white/[0.06] px-6 py-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/70">AUTOCLUB RENTAL</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">Confirm vehicle return</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Please confirm that the vehicle has been returned.
            </p>
          </div>

          <div className="space-y-5 p-6">
            {reservation && (
              <div className="grid gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 text-sm sm:grid-cols-2">
                <InfoRow label="Customer" value={reservation.customer_name || reservation.phone || '-'} />
                <InfoRow label="Vehicle group" value={reservation.vehicle_group || '-'} />
                <InfoRow label="Return date" value={formatReturnDate(reservation.return_date)} />
                <InfoRow label="Return time" value={reservation.return_time || '-'} />
              </div>
            )}

            {pageState === 'loading' && (
              <p className="rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-5 text-center text-sm text-zinc-400">
                Loading reservation...
              </p>
            )}

            {pageState === 'error' && (
              <p className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.06] px-4 py-5 text-center text-sm font-semibold text-rose-100">
                {message || 'Unable to load this return confirmation.'}
              </p>
            )}

            {(pageState === 'ready' || pageState === 'confirming') && (
              <button
                type="button"
                onClick={confirmReturn}
                disabled={pageState === 'confirming'}
                className="w-full rounded-2xl border border-emerald-300/25 bg-emerald-400 px-5 py-4 text-sm font-black text-zinc-950 shadow-[0_0_28px_rgba(52,211,153,0.16)] transition duration-200 hover:-translate-y-px hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pageState === 'confirming' ? 'Confirming...' : 'Confirm Return'}
              </button>
            )}

            {message && pageState === 'ready' && (
              <p className="text-center text-xs font-semibold text-rose-200">{message}</p>
            )}

            {pageState === 'confirmed' && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-emerald-300/25 bg-emerald-300/[0.08] px-4 py-5 text-center">
                  <p className="text-xl font-black text-emerald-100">✓ Return confirmed</p>
                  <p className="mt-2 text-sm text-emerald-100/70">Thank you. Your return confirmation was received.</p>
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 text-center">
                  <p className="text-sm font-semibold text-white">Rate your experience</p>
                  <div className="mt-4 flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleRating(star)}
                        className={`rounded-xl px-1 text-3xl leading-none transition duration-200 hover:-translate-y-px focus:outline-none focus:ring-2 focus:ring-amber-300/40 ${
                          star <= rating ? 'text-amber-300' : 'text-zinc-700 hover:text-amber-200'
                        }`}
                        aria-label={`Rate ${star} stars`}
                      >
                        {star <= rating ? '\u2605' : '\u2606'}
                      </button>
                    ))}
                  </div>
                  {rating > 0 && <p className="mt-3 text-xs font-semibold text-zinc-400">Rating selected: {rating}/5</p>}
                  {ratingMessage && <p className="mt-2 text-xs font-semibold text-emerald-100/75">{ratingMessage}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-600">{label}</p>
      <p className="mt-1 font-semibold text-zinc-100">{value}</p>
    </div>
  );
}
