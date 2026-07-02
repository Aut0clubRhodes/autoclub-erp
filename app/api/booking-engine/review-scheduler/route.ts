import { NextResponse } from 'next/server';
import {
  runBookingEngineReviewScheduler,
  type ReviewSchedulerResult,
} from '@/lib/bookingEngineReviewScheduler';
import type { buildBookingEmailEventPayload } from '@/lib/bookingEngineEmailEngine';

export const runtime = 'nodejs';

type EmailPayload = ReturnType<typeof buildBookingEmailEventPayload>;

const getErrorField = (error: unknown, field: 'code' | 'message' | 'details' | 'hint' | 'stack') => {
  if (!error || typeof error !== 'object' || !(field in error)) return undefined;
  const value = (error as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : undefined;
};

const logSchedulerError = (error: unknown, step: string) => {
  console.error('BOOKING REVIEW SCHEDULER ERROR');
  console.error(error);
  console.error('BOOKING REVIEW SCHEDULER STEP', step);
  console.error('BOOKING REVIEW SCHEDULER CODE', getErrorField(error, 'code') || '');
  console.error('BOOKING REVIEW SCHEDULER MESSAGE', getErrorField(error, 'message') || '');
  console.error('BOOKING REVIEW SCHEDULER DETAILS', getErrorField(error, 'details') || '');
  console.error('BOOKING REVIEW SCHEDULER HINT', getErrorField(error, 'hint') || '');
  console.error('BOOKING REVIEW SCHEDULER STACK', getErrorField(error, 'stack') || '');
};

const errorResponse = (error: unknown, step: string, status = 500) =>
  NextResponse.json(
    {
      success: false,
      step,
      error: getErrorField(error, 'message') || String(error || 'Unknown error'),
      code: getErrorField(error, 'code') || null,
      details: getErrorField(error, 'details') || null,
      hint: getErrorField(error, 'hint') || null,
    },
    { status },
  );

export async function POST(request: Request) {
  let step = 'start';

  try {
    step = 'read cron secret';
    const cronSecret = process.env.BOOKING_REVIEW_CRON_SECRET;

    if (!cronSecret) {
      const error = new Error('BOOKING_REVIEW_CRON_SECRET is not configured.');
      logSchedulerError(error, step);
      return errorResponse(error, step, 500);
    }

    step = 'validate cron secret header';
    if (request.headers.get('x-cron-secret') !== cronSecret) {
      const error = new Error('Unauthorized review scheduler request.');
      logSchedulerError(error, step);
      return errorResponse(error, step, 401);
    }

    step = 'resolve request origin';
    const origin = new URL(request.url).origin;

    step = 'run review scheduler';
    const result = await runBookingEngineReviewScheduler({
      sendEmailPayload: async (payload: EmailPayload) => {
        step = 'send review email via internal smtp endpoint';
        const response = await fetch(`${origin}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await response.json().catch(async () => ({
          success: false,
          message: await response.text(),
        }));

        return {
          success: response.ok && body?.success !== false,
          message: body?.message || (response.ok ? 'Review email sent.' : 'Review email failed.'),
        };
      },
    });

    step = 'return review scheduler result';
    return NextResponse.json(result, { status: result.failed ? 207 : 200 });
  } catch (error) {
    logSchedulerError(error, step);
    return errorResponse(error, step, 500);
  }
}
