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

function renderHtml(title: string, lines: string[]) {
  const body = lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("\n");

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f7f0e7;color:#1f211d;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
    <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:40px;line-height:1.1;margin:0 0 24px;">${escapeHtml(title)}</h1>
      ${body}
    </div>
  </body>
</html>`;
}

export function createCustomerBookingConfirmation(context: BookingEmailContext) {
  const details = getBookingDetails(context);
  const studioPhone = getStudioContactPhone();
  const subject = `Your Ukiyo Studio booking is confirmed`;
  const lines = [
    `Thank you for booking ${details.workshopTitle}.`,
    `Date and time: ${details.dateLabel}, ${details.timeLabel}.`,
    `Seats: ${details.seats}.`,
    `Amount paid: ${details.amount}.`,
    `Location: ${details.location}.`,
    "Getting to the studio:",
    "Ukiyo Studio is located inside a shared business building.",
    studioPhone
      ? `When you arrive at the entrance, text or call ${studioPhone}. We will unlock the door remotely for you.`
      : "If the entrance is closed, reply to this email before your workshop so we can arrange access.",
    "Once inside, take the stairs or elevator to the first floor. We will meet you there.",
    `Booking reference: ${details.bookingReference}.`,
    "Refund possible when cancelled at least 48 hours before the workshop.",
  ];

  return {
    html: renderHtml(subject, lines),
    subject,
    text: lines.join("\n"),
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
