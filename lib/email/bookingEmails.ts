import { readBookingStore } from "@/lib/booking/localStore";
import {
  getBookingNotificationEmail,
  getEmailFromAddress,
} from "@/lib/email/config";
import { deliverEmailOnce } from "@/lib/email/deliver";
import {
  createCustomerBookingConfirmation,
  createOwnerBookingNotification,
} from "@/lib/email/templates";
import type { EmailDeliveryRecord } from "@/lib/email/types";

function normalizeRecipient(email: string | null | undefined) {
  const trimmedEmail = email?.trim();

  return trimmedEmail && trimmedEmail.includes("@") ? trimmedEmail : null;
}

export async function sendBookingEmails(bookingId: string) {
  const store = await readBookingStore();
  const booking = store.bookings.find((candidate) => candidate.id === bookingId);

  if (!booking || booking.status !== "paid") {
    return [];
  }

  const slot = store.slots.find((candidate) => candidate.id === booking.slotId);

  if (!slot) {
    return [];
  }

  const context = { booking, slot, store };
  const from = getEmailFromAddress();
  const deliveries: Array<EmailDeliveryRecord | null> = [];
  const customerEmail = normalizeRecipient(booking.customerEmail);

  if (customerEmail) {
    const confirmation = createCustomerBookingConfirmation(context);
    deliveries.push(
      await deliverEmailOnce({
        ...confirmation,
        bookingId: booking.id,
        from,
        idempotencyKey: `booking-confirmation:${booking.id}`,
        kind: "booking-confirmation",
        to: [customerEmail],
      }),
    );
  }

  const ownerEmail = normalizeRecipient(getBookingNotificationEmail());

  if (ownerEmail) {
    const notification = createOwnerBookingNotification(context);
    deliveries.push(
      await deliverEmailOnce({
        ...notification,
        bookingId: booking.id,
        from,
        idempotencyKey: `owner-booking-notification:${booking.id}`,
        kind: "owner-booking-notification",
        to: [ownerEmail],
      }),
    );
  }

  return deliveries.filter(Boolean);
}
