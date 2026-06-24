import {
  bookingEngineLocalConfig,
  type BookingEngineEmailSettings,
  type BookingEngineEmailTemplate,
  type BookingEngineEmailTemplateId,
} from './bookingEngineLocalConfig';

export const BOOKING_ENGINE_EMAIL_ENDPOINT = '/api/send-email';
export const GOOGLE_REVIEW_URL = 'https://g.page/r/CYOr9zt3_-KVEBM/review';

export type BookingEngineEmailEventType =
  | 'new_reservation_confirmed'
  | 'reservation_onrequest'
  | 'reservation_confirmed_customer'
  | 'payment_request'
  | 'reminder'
  | 'cancellation'
  | 'review_request'
  | 'custom_email';

export type BookingEngineEmailTemplateRow = {
  template_key?: string | null;
  label?: string | null;
  active?: boolean | null;
  subject?: string | null;
  message?: string | null;
};

export type BookingEngineEmailReservationContext = {
  reservationId: string;
  customerName: string;
  email: string;
  phone: string;
  country?: string;
  countryCode?: string;
  dateOfBirth?: string;
  accommodationName?: string;
  flightNumber?: string;
  notes?: string;
  carName: string;
  group: string;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
  pickupLocation: string;
  returnLocation: string;
  rentalTotal?: string;
  totalPrice: string;
  paymentMethod: string;
  paymentLink?: string;
  extras?: Array<{
    id?: string;
    name: string;
    quantity: number;
    unitPrice?: number;
    total?: number;
  }>;
};

export type BookingEngineEmailSiteContext = {
  siteId: string;
  siteName: string;
  adminEmail: string;
  logoImage?: string;
  whatsappNumber?: string;
};

export const bookingEngineEmailTemplateOrder: BookingEngineEmailTemplateId[] = [
  'admin_new_confirmed_reservation',
  'customer_confirmed_reservation',
  'admin_new_onrequest_reservation',
  'customer_onrequest_received',
  'customer_confirmed_after_review',
  'customer_payment_request',
  'customer_reminder',
  'customer_cancellation',
  'customEmail',
];

export const bookingEngineEmailTemplateDefaults: Record<
  BookingEngineEmailTemplateId,
  BookingEngineEmailTemplate
> = bookingEngineLocalConfig.emailSettings.templates;

const normalizeTemplateMessage = (
  templateKey: BookingEngineEmailTemplateId,
  message: string,
) => {
  if (templateKey !== 'customer_reminder') return message;

  const cleaned = message
    .replace(/A reminder for your upcoming AutoClub Rhodes booking\.?/gi, '')
    .replace(/upcoming AutoClub Rhodes booking\.?/gi, '')
    .trim();
  const fallback =
    'Hello {{customer_name}},\n\nThank you for choosing AutoClub Rhodes.\n\nWe hope you enjoyed your rental.\nWe would really appreciate your review and feedback.';
  const withReviewWording = cleaned || fallback;

  return withReviewWording.includes(GOOGLE_REVIEW_URL)
    ? withReviewWording
    : `${withReviewWording}\n${GOOGLE_REVIEW_URL}`;
};

export const normalizeSupabaseEmailTemplates = (
  rows: BookingEngineEmailTemplateRow[] = [],
  adminEmail = '',
): BookingEngineEmailSettings => {
  const templates = { ...bookingEngineEmailTemplateDefaults };

  rows.forEach((row) => {
    const templateKey = row.template_key as BookingEngineEmailTemplateId;
    const defaultTemplate = templates[templateKey];
    if (!defaultTemplate) return;

    templates[templateKey] = {
      ...defaultTemplate,
      label: row.label || defaultTemplate.label,
      active: row.active !== false,
      subject: row.subject || '',
      message: normalizeTemplateMessage(templateKey, row.message || ''),
    };
  });

  return {
    adminEmail,
    templates,
  };
};

const getExtraSubtotal = (
  extra: NonNullable<BookingEngineEmailReservationContext['extras']>[number],
) => {
  if (Number.isFinite(Number(extra.total))) return Number(extra.total);
  return Number(extra.unitPrice || 0) * Number(extra.quantity || 0);
};

const formatExtraAmount = (amount: number) =>
  new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);

export const renderBookingExtrasSummary = (
  extras: BookingEngineEmailReservationContext['extras'] = [],
) => {
  if (!extras.length) return '';

  const lines = extras.map((extra) =>
    `${extra.name} x${extra.quantity} - ${formatExtraAmount(getExtraSubtotal(extra))}`,
  );
  const total = extras.reduce((sum, extra) => sum + getExtraSubtotal(extra), 0);

  return `${lines.join('\n')}\n\nTotal extras: ${formatExtraAmount(total)}`;
};

export const renderBookingExtrasHtml = (
  extras: BookingEngineEmailReservationContext['extras'] = [],
) => {
  if (!extras.length) {
    return '';
  }

  const rows = extras
    .map(
      (extra) => `<tr>
        <td style="padding:7px 9px;border-bottom:1px solid #d8e0ea;font-size:13px;font-weight:700;color:#102033;">${escapeHtml(extra.name)} x${extra.quantity}</td>
        <td style="padding:7px 9px;border-bottom:1px solid #d8e0ea;text-align:right;font-size:13px;font-weight:800;color:#102033;">${escapeHtml(formatExtraAmount(getExtraSubtotal(extra)))}</td>
      </tr>`,
    )
    .join('');
  const total = extras.reduce((sum, extra) => sum + getExtraSubtotal(extra), 0);

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #d8e0ea;border-radius:10px;overflow:hidden;">
    ${rows}
    <tr>
      <td style="padding:8px 9px;background:#f3f6fa;font-size:12px;font-weight:900;color:#102033;">Total extras</td>
      <td style="padding:8px 9px;background:#f3f6fa;text-align:right;font-size:13px;font-weight:900;color:#102033;">${escapeHtml(formatExtraAmount(total))}</td>
    </tr>
  </table>`;
};

export const renderBookingEmailTemplate = (
  template: string,
  reservation: BookingEngineEmailReservationContext,
) => {
  const replacements: Record<string, string> = {
    customer_name: reservation.customerName,
    reservation_id: reservation.reservationId,
    car_name: reservation.carName,
    group: reservation.group,
    pickup_date: reservation.pickupDate,
    pickup_time: reservation.pickupTime,
    return_date: reservation.returnDate,
    return_time: reservation.returnTime,
    pickup_location: reservation.pickupLocation,
    return_location: reservation.returnLocation,
    total_price: reservation.totalPrice,
    payment_method: reservation.paymentMethod,
    payment_link: reservation.paymentLink || '',
    extras_summary: renderBookingExtrasSummary(reservation.extras),
  };

  return Object.entries(replacements).reduce((message, [key, value]) => {
    return message
      .split(`{{${key}}}`)
      .join(value || '')
      .split(`{${key}}`)
      .join(value || '');
  }, template);
};

export const getBookingEmailIntro = (templateId: BookingEngineEmailTemplateId) => {
  switch (templateId) {
    case 'admin_new_confirmed_reservation':
      return 'New confirmed reservation received.';
    case 'admin_new_onrequest_reservation':
      return 'A new website request is waiting for availability review.';
    case 'customer_onrequest_received':
      return 'Our team will review availability and contact you shortly.';
    case 'customer_confirmed_reservation':
    case 'customer_confirmed_after_review':
      return 'Your booking is confirmed.';
    case 'customer_payment_request':
      return 'Your payment request is ready.';
    case 'customer_reminder':
      return 'Thank you for choosing AutoClub Rhodes. We hope you enjoyed your rental. We would really appreciate your review and feedback.';
    case 'customer_cancellation':
      return 'Your reservation has been cancelled.';
    default:
      return 'An update about your AutoClub Rhodes reservation.';
  }
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const renderEmailCta = ({
  href,
  label,
  background = '#0891b2',
}: {
  href: string;
  label: string;
  background?: string;
}) =>
  `<div style="margin:12px 0 12px;">
    <a href="${escapeHtml(href)}" style="display:inline-block;border-radius:10px;background:${background};color:#ffffff;text-decoration:none;padding:10px 14px;font-size:13px;font-weight:900;">${label}</a>
  </div>`;

const stripEmptyPaymentLinkLines = (value: string) =>
  value
    .split('\n')
    .filter((line) => !/^payment link:\s*$/i.test(line.trim()))
    .join('\n');

const renderTextParagraph = (paragraph: string, paymentLink = '') => {
  const reviewUrlPattern = new RegExp(GOOGLE_REVIEW_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  const paymentLinkPattern = paymentLink
    ? new RegExp(paymentLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    : null;
  let working = paragraph.trim();
  const pieces: string[] = [];

  if (!working) return '';

  if (working.includes(GOOGLE_REVIEW_URL)) {
    working = working.replace(reviewUrlPattern, '').replace(/Review link:\s*/gi, '').trim();
    if (working) {
      pieces.push(
        `<p style="margin:0 0 10px;font-size:14px;line-height:1.55;font-weight:650;color:#26384d;">${escapeHtml(working).replace(/\n/g, '<br />')}</p>`,
      );
    }
    pieces.push(renderEmailCta({ href: GOOGLE_REVIEW_URL, label: '&#11088; Leave a Google Review' }));
    return pieces.join('');
  }

  if (paymentLink && working.includes(paymentLink)) {
    working = working.replace(paymentLinkPattern as RegExp, '').replace(/Payment link:\s*/gi, '').trim();
    if (working) {
      pieces.push(
        `<p style="margin:0 0 10px;font-size:14px;line-height:1.55;font-weight:650;color:#26384d;">${escapeHtml(working).replace(/\n/g, '<br />')}</p>`,
      );
    }
    pieces.push(renderEmailCta({ href: paymentLink, label: '&#128179; Complete Payment', background: '#059669' }));
    return pieces.join('');
  }

  return `<p style="margin:0 0 10px;font-size:14px;line-height:1.55;font-weight:650;color:#26384d;">${escapeHtml(working).replace(/\n/g, '<br />')}</p>`;
};

const renderTextBlockHtml = (value: string, paymentLink = '') =>
  stripEmptyPaymentLinkLines(value || '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => renderTextParagraph(paragraph, paymentLink))
    .join('');

export const buildBookingEmailHtml = ({
  site,
  reservation,
  intro,
  templateId,
  manualMessage,
}: {
  site: BookingEngineEmailSiteContext;
  reservation: BookingEngineEmailReservationContext;
  intro: string;
  templateId?: BookingEngineEmailTemplateId;
  manualMessage?: string;
}) => {
  const isAdminNotification =
    templateId === 'admin_new_confirmed_reservation' ||
    templateId === 'admin_new_onrequest_reservation';
  const isAdminOnRequest = templateId === 'admin_new_onrequest_reservation';
  const isCustomerOnRequest = templateId === 'customer_onrequest_received';
  const isOnRequest = isAdminOnRequest || isCustomerOnRequest;
  const hasManualMessage = typeof manualMessage === 'string';
  const emailTitle = isAdminOnRequest
    ? 'New On Request Reservation'
    : isCustomerOnRequest
      ? 'Reservation Request Received'
      : isAdminNotification
        ? 'New Website Reservation'
        : '';
  const extrasTotal = (reservation.extras || []).reduce(
    (sum, extra) => sum + getExtraSubtotal(extra),
    0,
  );
  const customerRows = [
    ['Customer', reservation.customerName],
    ['Email', reservation.email],
    ['WhatsApp', reservation.phone],
    ['Country', reservation.country || ''],
    ['Date of birth', reservation.dateOfBirth || ''],
    ['Hotel / Villa / Apartment', reservation.accommodationName || ''],
    ['Flight number', reservation.flightNumber || ''],
  ].filter(([, value]) => String(value || '').trim());
  const reservationRows = [
    ['Reservation', reservation.reservationId],
    ['Car', reservation.carName],
    ['Group', reservation.group],
    ['Pickup', `${reservation.pickupDate} ${reservation.pickupTime}`],
    ['Pickup location', reservation.pickupLocation],
    ['Return', `${reservation.returnDate} ${reservation.returnTime}`],
    ['Return location', reservation.returnLocation],
    ['Notes', reservation.notes?.trim() || ''],
  ].filter(([, value]) => String(value || '').trim());
  const paymentRows = [
    ['Rental total', reservation.rentalTotal || reservation.totalPrice],
    ['Extras total', formatExtraAmount(extrasTotal)],
    ['Final total', reservation.totalPrice],
    ['Payment method', reservation.paymentMethod],
    ['Payment link', reservation.paymentLink || ''],
  ].filter(([, value]) => String(value || '').trim());
  const allRows = [...customerRows, ...reservationRows];
  const renderRows = (rows: string[][]) => rows
    .map(
      ([label, value]) => `<tr>
        <td style="width:36%;padding:7px 9px;background:#f3f6fa;border-bottom:1px solid #d8e0ea;font-size:10px;font-weight:900;text-transform:uppercase;color:#53657a;">${escapeHtml(label)}</td>
        <td style="padding:7px 9px;border-bottom:1px solid #d8e0ea;font-size:13px;font-weight:700;color:#102033;">${escapeHtml(value || '')}</td>
      </tr>`,
    )
    .join('');
  const renderSection = (title: string, rows: string[][]) => `
    <div style="margin-top:12px;">
      <div style="margin-bottom:6px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;color:#53657a;">${escapeHtml(title)}</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #d8e0ea;border-radius:12px;overflow:hidden;">
        ${renderRows(rows)}
      </table>
    </div>`;

  return `<!doctype html>
<html>
  <body style="margin:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#102033;">
    <div style="max-width:640px;margin:0 auto;padding:12px 8px;">
      <div style="background:#ffffff;border:1px solid #d8e0ea;border-radius:14px;overflow:hidden;box-shadow:0 12px 32px rgba(15,23,42,0.09);">
        <div style="padding:14px 16px;background:#073f5d;color:#ffffff;">
          <div style="display:flex;align-items:center;gap:11px;">
            ${
              site.logoImage
                ? `<img src="${escapeHtml(site.logoImage)}" alt="${escapeHtml(site.siteName)}" style="width:44px;height:44px;border-radius:10px;background:#ffffff;object-fit:contain;padding:3px;" />`
                : `<div style="width:44px;height:44px;border-radius:10px;background:#ffffff;color:#073f5d;display:inline-flex;align-items:center;justify-content:center;font-weight:900;">AC</div>`
            }
            <div>
              <div style="font-size:18px;font-weight:900;line-height:1.1;">${escapeHtml(site.siteName)}</div>
              <div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9ee7f5;margin-top:3px;">Car rental in Rhodes</div>
            </div>
          </div>
        </div>
        <div style="padding:15px 16px;">
          ${emailTitle ? `<h1 style="margin:0 0 7px;font-size:20px;line-height:1.25;color:#102033;">${escapeHtml(emailTitle)}</h1>` : ''}
          ${
            isOnRequest
              ? `<div style="margin:0 0 11px;padding:10px 11px;border:1px solid #f59e0b;border-radius:10px;background:#fffbeb;color:#78350f;">
                  ${isAdminOnRequest ? '<div style="display:inline-block;margin-bottom:5px;padding:3px 7px;border-radius:999px;background:#f59e0b;color:#ffffff;font-size:10px;font-weight:900;letter-spacing:.06em;">ON REQUEST — ACTION NEEDED</div>' : ''}
                  <div style="font-size:13px;line-height:1.45;font-weight:800;">Your request has been received and is under review. This is not a confirmed reservation yet.</div>
                </div>`
              : ''
          }
          ${
            hasManualMessage
              ? `<div style="margin:0 0 4px;">${renderTextBlockHtml(manualMessage || '', reservation.paymentLink || '')}</div>
                ${
                  reservation.extras?.length
                    ? `<div style="margin-top:12px;">
                        <div style="margin-bottom:6px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;color:#53657a;">Extras</div>
                        ${renderBookingExtrasHtml(reservation.extras)}
                      </div>`
                    : ''
                }`
              : `<p style="margin:0 0 11px;font-size:14px;line-height:1.45;font-weight:700;color:#26384d;">${escapeHtml(intro)}</p>
                ${
                  isAdminNotification
                    ? `${renderSection('Customer details', customerRows)}${renderSection('Reservation details', reservationRows)}`
                    : `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #d8e0ea;border-radius:12px;overflow:hidden;">${renderRows(allRows)}</table>`
                }
                ${
                  reservation.extras?.length
                    ? `<div style="margin-top:12px;">
                        <div style="margin-bottom:6px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;color:#53657a;">Extras</div>
                        ${renderBookingExtrasHtml(reservation.extras)}
                      </div>`
                    : ''
                }
                ${renderSection('Total and payment', paymentRows)}`
          }
        </div>
        <div style="padding:12px 16px;background:#f8fafc;border-top:1px solid #d8e0ea;font-size:11px;line-height:1.5;color:#53657a;">
          <strong style="color:#102033;">AutoClub Rhodes</strong><br />
          For urgent changes, contact us on WhatsApp +306948202397.
        </div>
      </div>
    </div>
  </body>
</html>`;
};

const eventTemplateMap: Record<
  BookingEngineEmailEventType,
  Array<{ key: BookingEngineEmailTemplateId; recipient: 'admin' | 'customer' }>
> = {
  new_reservation_confirmed: [
    { key: 'admin_new_confirmed_reservation', recipient: 'admin' },
    { key: 'customer_confirmed_reservation', recipient: 'customer' },
  ],
  reservation_onrequest: [
    { key: 'admin_new_onrequest_reservation', recipient: 'admin' },
    { key: 'customer_onrequest_received', recipient: 'customer' },
  ],
  reservation_confirmed_customer: [
    { key: 'customer_confirmed_after_review', recipient: 'customer' },
  ],
  payment_request: [{ key: 'customer_payment_request', recipient: 'customer' }],
  reminder: [{ key: 'customer_reminder', recipient: 'customer' }],
  cancellation: [{ key: 'customer_cancellation', recipient: 'customer' }],
  review_request: [{ key: 'customer_reminder', recipient: 'customer' }],
  custom_email: [{ key: 'customEmail', recipient: 'customer' }],
};

const manualEmailTemplateKeys = new Set<BookingEngineEmailTemplateId>([
  'customer_payment_request',
  'customer_reminder',
  'customer_cancellation',
  'customEmail',
]);

export const buildBookingEmailEventPayload = ({
  eventType,
  templates,
  site,
  reservation,
}: {
  eventType: BookingEngineEmailEventType;
  templates: BookingEngineEmailSettings['templates'];
  site: BookingEngineEmailSiteContext;
  reservation: BookingEngineEmailReservationContext;
}) => {
  const emails = eventTemplateMap[eventType]
    .map(({ key, recipient }) => {
      const template = templates[key];
      if (!template?.active) return null;

      const to = recipient === 'admin' ? site.adminEmail : reservation.email;
      if (!to) return null;

      const subject = renderBookingEmailTemplate(template.subject, reservation);
      const renderedMessage = renderBookingEmailTemplate(template.message, reservation);
      const usesManualBody = manualEmailTemplateKeys.has(key);
      const textBody =
        template.message.includes('{{extras_summary}}') || template.message.includes('{extras_summary}')
          ? renderedMessage
          : reservation.extras?.length
            ? `${renderedMessage}\n\nExtras:\n${renderBookingExtrasSummary(reservation.extras)}`
            : renderedMessage;

      return {
        to,
        subject,
        html_body: buildBookingEmailHtml({
          site,
          reservation,
          intro: getBookingEmailIntro(key),
          templateId: key,
          manualMessage: usesManualBody ? renderedMessage : undefined,
        }),
        text_body: textBody,
        template_key: key,
        template_label: template.label,
        recipient_type: recipient,
      };
    })
    .filter(Boolean);

  const firstEmail = emails[0] as
    | {
        to: string;
        subject: string;
        html_body: string;
        text_body: string;
        template_key: BookingEngineEmailTemplateId;
        template_label: string;
        recipient_type: 'admin' | 'customer';
      }
    | undefined;

  return {
    event_type: eventType,
    reservation_id: reservation.reservationId,
    site_id: site.siteId,
    full_name: reservation.customerName,
    customer_name: reservation.customerName,
    email: reservation.email,
    phone: reservation.phone,
    country: reservation.country || '',
    country_code: reservation.countryCode || '',
    date_of_birth: reservation.dateOfBirth || '',
    accommodation_name: reservation.accommodationName || '',
    flight_number: reservation.flightNumber || '',
    notes: reservation.notes || '',
    payment_link: reservation.paymentLink || '',
    extras: reservation.extras || [],
    extras_summary: renderBookingExtrasSummary(reservation.extras),
    extras_summary_html: renderBookingExtrasHtml(reservation.extras),
    extras_total: (reservation.extras || []).reduce(
      (sum, extra) => sum + getExtraSubtotal(extra),
      0,
    ),
    to: firstEmail?.to || '',
    subject: firstEmail?.subject || '',
    html_body: firstEmail?.html_body || '',
    emails,
    reservation,
  };
};

export const sendBookingEngineEmailEvent = async (
  payload: ReturnType<typeof buildBookingEmailEventPayload>,
) => {
  console.log('INTERNAL EMAIL PAYLOAD', payload);

  if (!payload.emails.length) {
    const result = {
      success: true,
      message: 'No active email templates or recipients for event.',
      results: [],
    };
    console.log('INTERNAL EMAIL RESULT', result);
    return result;
  }

  try {
    const response = await fetch(BOOKING_ENGINE_EMAIL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(async () => ({
      success: false,
      message: await response.text(),
      results: [],
    }));

    console.log('INTERNAL EMAIL RESULT', {
      ok: response.ok,
      status: response.status,
      body: result,
    });

    if (!response.ok || result?.success === false) {
      console.error('INTERNAL EMAIL ERROR', {
        status: response.status,
        body: result,
      });
    }

    return result;
  } catch (error) {
    console.error('INTERNAL EMAIL ERROR', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Internal email request failed',
      results: [],
    };
  }
};
