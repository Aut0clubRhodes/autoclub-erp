import {
  bookingEngineLocalConfig,
  type BookingEngineEmailSettings,
  type BookingEngineEmailTemplate,
  type BookingEngineEmailTemplateId,
} from './bookingEngineLocalConfig';

export const BOOKING_ENGINE_EMAIL_WEBHOOK_URL =
  'https://hook.eu1.make.com/k4m65rc0do8ctn9se5zyh7msfez79m6v';

export type BookingEngineEmailEventType =
  | 'new_reservation_confirmed'
  | 'reservation_onrequest'
  | 'reservation_confirmed_customer'
  | 'payment_request'
  | 'reminder'
  | 'cancellation';

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
  totalPrice: string;
  paymentMethod: string;
  paymentLink?: string;
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
      message: row.message || '',
    };
  });

  return {
    adminEmail,
    templates,
  };
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
  };

  return Object.entries(replacements).reduce((message, [key, value]) => {
    return message
      .split(`{{${key}}}`)
      .join(value || '')
      .split(`{${key}}`)
      .join(value || '');
  }, template);
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const buildBookingEmailHtml = ({
  site,
  reservation,
  message,
}: {
  site: BookingEngineEmailSiteContext;
  reservation: BookingEngineEmailReservationContext;
  message: string;
}) => {
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br />');
  const rows = [
    ['Reservation', reservation.reservationId],
    ['Customer', reservation.customerName],
    ['Country', reservation.country || ''],
    ['WhatsApp', reservation.phone],
    ['Date of birth', reservation.dateOfBirth || ''],
    ['Hotel / Villa / Apartment', reservation.accommodationName || ''],
    ['Flight number', reservation.flightNumber || ''],
    ['Car', `${reservation.carName} / Group ${reservation.group}`],
    ['Pickup', `${reservation.pickupDate} ${reservation.pickupTime} - ${reservation.pickupLocation}`],
    ['Return', `${reservation.returnDate} ${reservation.returnTime} - ${reservation.returnLocation}`],
    ['Total', reservation.totalPrice],
    ['Payment', reservation.paymentMethod],
  ];

  return `<!doctype html>
<html>
  <body style="margin:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#102033;">
    <div style="max-width:680px;margin:0 auto;padding:24px 14px;">
      <div style="background:#ffffff;border:1px solid #d8e0ea;border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(15,23,42,0.10);">
        <div style="padding:22px 24px;background:#073f5d;color:#ffffff;">
          <div style="display:flex;align-items:center;gap:14px;">
            ${
              site.logoImage
                ? `<img src="${escapeHtml(site.logoImage)}" alt="${escapeHtml(site.siteName)}" style="width:52px;height:52px;border-radius:12px;background:#ffffff;object-fit:contain;padding:4px;" />`
                : `<div style="width:52px;height:52px;border-radius:12px;background:#ffffff;color:#073f5d;display:inline-flex;align-items:center;justify-content:center;font-weight:900;">AC</div>`
            }
            <div>
              <div style="font-size:20px;font-weight:900;line-height:1.1;">${escapeHtml(site.siteName)}</div>
              <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9ee7f5;margin-top:4px;">Car rental in Rhodes</div>
            </div>
          </div>
        </div>
        <div style="padding:26px 24px;">
          <div style="font-size:15px;line-height:1.7;color:#26384d;">${safeMessage}</div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border-collapse:collapse;border:1px solid #d8e0ea;border-radius:12px;overflow:hidden;">
            ${rows
              .map(
                ([label, value]) => `<tr>
                  <td style="width:36%;padding:11px 13px;background:#f3f6fa;border-bottom:1px solid #d8e0ea;font-size:12px;font-weight:900;text-transform:uppercase;color:#53657a;">${escapeHtml(label)}</td>
                  <td style="padding:11px 13px;border-bottom:1px solid #d8e0ea;font-size:14px;font-weight:700;color:#102033;">${escapeHtml(value || '')}</td>
                </tr>`,
              )
              .join('')}
          </table>
        </div>
        <div style="padding:18px 24px;background:#f8fafc;border-top:1px solid #d8e0ea;font-size:12px;line-height:1.6;color:#53657a;">
          <strong style="color:#102033;">${escapeHtml(site.siteName)}</strong><br />
          For urgent changes, contact us${site.whatsappNumber ? ` on WhatsApp ${escapeHtml(site.whatsappNumber)}` : ' on WhatsApp'}.
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
};

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
      const message = renderBookingEmailTemplate(template.message, reservation);

      return {
        to,
        subject,
        html_body: buildBookingEmailHtml({ site, reservation, message }),
        text_body: message,
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
  console.log('BOOKING ENGINE EMAIL WEBHOOK PAYLOAD', payload);

  if (!payload.emails.length) {
    console.log('BOOKING ENGINE EMAIL WEBHOOK RESULT', 'No active email templates or recipients for event.');
    return;
  }

  try {
    const response = await fetch(BOOKING_ENGINE_EMAIL_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const result = await response.text();

    console.log('BOOKING ENGINE EMAIL WEBHOOK RESULT', {
      ok: response.ok,
      status: response.status,
      body: result,
    });

    if (!response.ok) {
      console.error('BOOKING ENGINE EMAIL WEBHOOK ERROR', {
        status: response.status,
        body: result,
      });
    }
  } catch (error) {
    console.error('BOOKING ENGINE EMAIL WEBHOOK ERROR', error);
  }
};
