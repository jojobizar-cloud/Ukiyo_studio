import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getEmailFromAddress } from "@/lib/email/config";
import { deliverEmailOnce } from "@/lib/email/deliver";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getContactRecipient() {
  return process.env.CONTACT_TO_EMAIL?.trim() || "ukiyostudioehv@outlook.com";
}

type ContactBody = {
  email?: unknown;
  intent?: unknown;
  message?: unknown;
  name?: unknown;
  subject?: unknown;
  workshop?: unknown;
};

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function readBody(request: Request) {
  try {
    return (await request.json()) as ContactBody;
  } catch {
    return null;
  }
}

function createContactEmail({
  email,
  intent,
  message,
  name,
  reference,
  subject,
  workshop,
}: {
  email: string;
  intent: string;
  message: string;
  name: string;
  reference: string;
  subject: string;
  workshop: string;
}) {
  const isGroupBooking = intent === "group-booking";
  const subjectLine = `${isGroupBooking ? "[Group booking]" : "[Website contact]"} ${
    subject || (isGroupBooking ? "Private workshop request" : "New message")
  }`;
  const inquiryType = isGroupBooking ? "Private group booking" : "Website contact";
  const lines = [
    `Reference: ${reference}`,
    `Inquiry type: ${inquiryType}`,
    `Name: ${name || "Not provided"}`,
    `Visitor email: ${email}`,
    `Workshop/topic: ${workshop || "Not selected"}`,
    `Subject: ${subject || "Not provided"}`,
    "",
    "Message:",
    message,
  ];
  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f7f0e7;color:#1f211d;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
    <div style="max-width:680px;margin:0 auto;padding:32px 20px;">
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:34px;line-height:1.1;margin:0 0 24px;">${escapeHtml(inquiryType)} message</h1>
      <p><strong>Reference:</strong> ${escapeHtml(reference)}</p>
      <p><strong>Inquiry type:</strong> ${escapeHtml(inquiryType)}</p>
      <p><strong>Name:</strong> ${escapeHtml(name || "Not provided")}</p>
      <p><strong>Visitor email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Workshop/topic:</strong> ${escapeHtml(workshop || "Not selected")}</p>
      <p><strong>Subject:</strong> ${escapeHtml(subject || "Not provided")}</p>
      <hr style="border:0;border-top:1px solid rgba(31,33,29,.16);margin:24px 0;" />
      <p>${escapeHtml(message).replaceAll("\n", "<br />")}</p>
    </div>
  </body>
</html>`;

  return {
    html,
    subject: subjectLine,
    text: lines.join("\n"),
  };
}

export async function POST(request: Request) {
  const body = await readBody(request);

  if (!body) {
    return NextResponse.json({ error: "Send a valid contact message." }, { status: 400 });
  }

  const email = cleanText(body.email, 180).toLowerCase();
  const intent = cleanText(body.intent, 80) === "group-booking" ? "group-booking" : "";
  const message = cleanText(body.message, 3000);
  const name = cleanText(body.name, 120);
  const subject = cleanText(body.subject, 160);
  const workshop = cleanText(body.workshop, 120);

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (message.length < 10) {
    return NextResponse.json({ error: "Write a message of at least 10 characters." }, { status: 400 });
  }

  const reference = `contact_${randomUUID()}`;
  const contentHash = createHash("sha256")
    .update(`${intent}:${email}:${workshop}:${subject}:${message}`)
    .digest("hex")
    .slice(0, 24);
  const emailContent = createContactEmail({
    email,
    intent,
    message,
    name,
    reference,
    subject,
    workshop,
  });
  const delivery = await deliverEmailOnce({
    ...emailContent,
    bookingId: reference,
    from: getEmailFromAddress(),
    idempotencyKey: `contact-message:${contentHash}`,
    kind: "contact-message",
    replyTo: email,
    to: [getContactRecipient()],
  });

  if (delivery?.status === "failed") {
    return NextResponse.json(
      { error: "Your message could not be sent. Please email ukiyostudioehv@outlook.com directly." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, reference });
}
