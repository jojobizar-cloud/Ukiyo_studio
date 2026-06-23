import { getSlotAvailability } from "@/lib/booking/availability";
import type {
  BookingRecord,
  BookingSlotRecord,
  BookingStoreData,
} from "@/lib/booking/types";
import { getStudioContactPhone } from "@/lib/email/config";
import { studioLocation, getWorkshop } from "@/lib/workshops";

type BookingEmailContext = {
  booking: BookingRecord;
  slot: BookingSlotRecord;
  store: BookingStoreData;
};

function formatMoney(cents?: number | null, currency = "EUR") {
  if (cents === null || cents === undefined) {
    return "Payment recorded";
  }

  return new Intl.NumberFormat("en-NL", {
    currency,
    style: "currency",
  }).format(cents / 100);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getBookingDetails({ booking, slot, store }: BookingEmailContext) {
  const workshop = getWorkshop(slot.workshopSlug);
  const availability = getSlotAvailability(store, slot, new Date());

  return {
    amount: formatMoney(booking.amountTotalCents, booking.currency ?? slot.currency),
    bookingReference: booking.id,
    dateLabel: availability.dateLabel,
    location: `${studioLocation.street}, ${studioLocation.postalCity}`,
    seats: booking.seats,
    timeLabel: availability.timeLabel,
    workshopTitle: workshop?.title ?? slot.workshopSlug,
  };
}

type EmailCallout = {
  lines: string[];
  phone?: string | null;
  title: string;
};

function getPhoneHref(phone: string) {
  return phone.replace(/(?!^)\+|[^\d+]/g, "");
}

function renderHtml(
  title: string,
  lines: string[],
  callout?: EmailCallout,
  footerLines: string[] = [],
) {
  const body = lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("\n");
  const footer = footerLines.map((line) => `<p>${escapeHtml(line)}</p>`).join("\n");
  const calloutBody = callout?.lines
    .map((line) => `<p style="margin:0 0 12px;">${escapeHtml(line)}</p>`)
    .join("\n");
  const phoneHref = callout?.phone ? getPhoneHref(callout.phone) : null;
  const phoneActions = callout?.phone && phoneHref
    ? `<div style="margin:20px 0 16px;">
        <a href="tel:${escapeHtml(phoneHref)}" style="display:inline-block;margin:0 8px 8px 0;padding:11px 16px;background:#d66732;color:#ffffff;text-decoration:none;font-weight:700;">Call ${escapeHtml(callout.phone)}</a>
        <a href="sms:${escapeHtml(phoneHref)}" style="display:inline-block;margin:0 0 8px;padding:11px 16px;border:1px solid #65775b;color:#35432f;text-decoration:none;font-weight:700;">Send a text</a>
      </div>`
    : "";
  const calloutHtml = callout
    ? `<div style="margin:28px 0;padding:22px;background:#eef0e8;border-left:4px solid #65775b;">
        <h2 style="font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:26px;line-height:1.2;margin:0 0 14px;">${escapeHtml(callout.title)}</h2>
        ${calloutBody}
        ${phoneActions}
      </div>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f7f0e7;color:#1f211d;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
    <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:40px;line-height:1.1;margin:0 0 24px;">${escapeHtml(title)}</h1>
      ${body}
      ${calloutHtml}
      ${footer}
    </div>
  </body>
</html>`;
}

export function createCustomerBookingConfirmation(context: BookingEmailContext) {
  const details = getBookingDetails(context);
  const studioPhone = getStudioContactPhone();
  const subject = `Booking confirmed: ${details.workshopTitle}`;
  const bookingLines = [
    `Thank you for booking ${details.workshopTitle}.`,
    `Date and time: ${details.dateLabel}, ${details.timeLabel}.`,
    `Seats: ${details.seats}.`,
    `Amount paid: ${details.amount}.`,
    `Location: ${details.location}.`,
  ];
  const arrivalLines = [
    "Ukiyo Studio is inside a shared business building.",
    studioPhone
      ? `When you arrive at the main entrance, call or text ${studioPhone}. We will unlock the door remotely for you.`
      : "If the entrance is closed, reply to this email before your workshop so we can arrange access.",
    "Once inside, take the stairs or elevator to the first floor. We will meet you there.",
    "Please keep this email handy when you arrive.",
  ];
  const closingLines = [
    `Booking reference: ${details.bookingReference}.`,
    "Refund possible when cancelled at least 48 hours before the workshop.",
  ];
  const textLines = [
    ...bookingLines,
    "",
    "Arriving at the studio",
    ...arrivalLines,
    "",
    ...closingLines,
  ];

  return {
    html: renderHtml(
      subject,
      bookingLines,
      {
        lines: arrivalLines,
        phone: studioPhone,
        title: "Arriving at the studio",
      },
      closingLines,
    ),
    subject,
    text: textLines.join("\n"),
  };
}

export function createOwnerBookingNotification(context: BookingEmailContext) {
  const details = getBookingDetails(context);
  const subject = `New booking: ${details.workshopTitle}`;
  const lines = [
    `A new paid booking was created for ${details.workshopTitle}.`,
    `Date and time: ${details.dateLabel}, ${details.timeLabel}.`,
    `Seats: ${details.seats}.`,
    `Amount paid: ${details.amount}.`,
    `Customer email: ${context.booking.customerEmail ?? "Not provided by Stripe"}.`,
    `Booking reference: ${details.bookingReference}.`,
  ];

  return {
    html: renderHtml(subject, lines),
    subject,
    text: lines.join("\n"),
  };
}
