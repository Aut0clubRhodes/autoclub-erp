import { NextResponse } from "next/server";

export const runtime = "nodejs";

type SendMailResult = {
  messageId?: string;
};

type NodemailerTransporter = {
  sendMail: (options: {
    from: string;
    to: string;
    subject: string;
    html: string;
  }) => Promise<SendMailResult>;
};

const nodemailer = require("nodemailer") as {
  createTransport: (options: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  }) => NodemailerTransporter;
};

type IncomingEmail = {
  to?: unknown;
  subject?: unknown;
  html_body?: unknown;
};

const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM_EMAIL || user;

  if (!host || !user || !pass || !fromEmail) {
    throw new Error("SMTP configuration is incomplete");
  }

  return {
    host,
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user,
      pass,
    },
    from: `"${process.env.SMTP_FROM_NAME || "AutoClub Rhodes"}" <${fromEmail}>`,
  };
};

const normalizeEmails = (body: unknown): IncomingEmail[] => {
  if (!body || typeof body !== "object") return [];

  const payload = body as { emails?: unknown };

  if (Array.isArray(payload.emails)) {
    return payload.emails as IncomingEmail[];
  }

  return [payload as IncomingEmail];
};

const getStringValue = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Email endpoint ready",
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid JSON body",
        results: [],
      },
      { status: 400 },
    );
  }

  const incomingEmails = normalizeEmails(body);

  if (!incomingEmails.length) {
    return NextResponse.json(
      {
        success: false,
        message: "Provide emails[] or a single email payload",
        results: [],
      },
      { status: 400 },
    );
  }

  const normalizedEmails = incomingEmails.map((email, index) => {
    const to = getStringValue(email.to);
    const subject = getStringValue(email.subject);
    const htmlBody = getStringValue(email.html_body);
    const missing = [
      !to ? "to" : "",
      !subject ? "subject" : "",
      !htmlBody ? "html_body" : "",
    ].filter(Boolean);

    return {
      index,
      to,
      subject,
      htmlBody,
      valid: missing.length === 0,
      missing,
    };
  });

  const validationResults = normalizedEmails
    .filter((email) => !email.valid)
    .map((email) => ({
      index: email.index,
      to: email.to,
      success: false,
      error: `Missing required field(s): ${email.missing.join(", ")}`,
    }));

  const validEmails = normalizedEmails.filter((email) => email.valid);

  if (!validEmails.length) {
    return NextResponse.json(
      {
        success: false,
        message: "No valid emails to send",
        results: validationResults,
      },
      { status: 400 },
    );
  }

  let config: ReturnType<typeof getSmtpConfig>;

  try {
    config = getSmtpConfig();
  } catch (error) {
    console.error("INTERNAL SMTP CONFIG ERROR", error instanceof Error ? error.message : error);

    return NextResponse.json(
      {
        success: false,
        message: "Email service is not configured",
        results: [
          ...validationResults,
          ...validEmails.map((email) => ({
            index: email.index,
            to: email.to,
            success: false,
            error: "SMTP configuration is incomplete",
          })),
        ],
      },
      { status: 500 },
    );
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  const sendResults = [];

  for (const email of validEmails) {
    try {
      const result = await transporter.sendMail({
        from: config.from,
        to: email.to,
        subject: email.subject,
        html: email.htmlBody,
      });

      sendResults.push({
        index: email.index,
        to: email.to,
        subject: email.subject,
        success: true,
        messageId: result.messageId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown SMTP error";
      console.error("INTERNAL SMTP SEND ERROR", {
        to: email.to,
        subject: email.subject,
        message,
      });

      sendResults.push({
        index: email.index,
        to: email.to,
        subject: email.subject,
        success: false,
        error: message,
      });
    }
  }

  const results = [...validationResults, ...sendResults].sort(
    (left, right) => left.index - right.index,
  );
  const success = results.every((result) => result.success);
  const hasSuccessfulSend = results.some((result) => result.success);

  return NextResponse.json(
    {
      success,
      message: success
        ? "All emails sent"
        : hasSuccessfulSend
          ? "Some emails failed"
          : "Email sending failed",
      results,
    },
    { status: success ? 200 : hasSuccessfulSend ? 207 : 500 },
  );
}
