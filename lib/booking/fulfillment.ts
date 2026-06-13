import type Stripe from "stripe";
import { createBookingId, updateBookingStore } from "@/lib/booking/localStore";
import { sendBookingEmails } from "@/lib/email/bookingEmails";

type FulfillmentResult = {
  ok: boolean;
  bookingId?: string;
  message: string;
};

function getStringMetadata(session: Stripe.Checkout.Session, key: string) {
  const value = session.metadata?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function getPaymentIntentId(session: Stripe.Checkout.Session) {
  if (typeof session.payment_intent === "string") {
    return session.payment_intent;
  }

  return session.payment_intent?.id;
}

function getCustomerEmail(session: Stripe.Checkout.Session) {
  return session.customer_details?.email ?? session.customer_email ?? null;
}

export async function fulfillPaidCheckoutSession(session: Stripe.Checkout.Session) {
  const slotId = getStringMetadata(session, "slotId");
  const seatsText = getStringMetadata(session, "seats");

  if (!slotId || !seatsText) {
    return {
      ok: false,
      message: "Checkout Session is missing booking metadata.",
    } satisfies FulfillmentResult;
  }

  const seats = Number(seatsText);

  if (!Number.isInteger(seats) || seats < 1) {
    return {
      ok: false,
      message: "Checkout Session has invalid seat metadata.",
    } satisfies FulfillmentResult;
  }

  const fulfillment = await updateBookingStore<FulfillmentResult>((store, now) => {
    const existingBooking = store.bookings.find(
      (booking) => booking.stripeCheckoutSessionId === session.id,
    );

    if (existingBooking) {
      return {
        ok: true,
        bookingId: existingBooking.id,
        message: "Booking was already fulfilled.",
      };
    }

    const slot = store.slots.find((candidate) => candidate.id === slotId);

    if (!slot) {
      return {
        ok: false,
        message: "Workshop date could not be found.",
      };
    }

    const paidSeats = store.bookings
      .filter((booking) => booking.slotId === slot.id && booking.status === "paid")
      .reduce((total, booking) => total + booking.seats, 0);

    if (paidSeats + seats > slot.capacity) {
      return {
        ok: false,
        message: "This workshop date no longer has enough seats available.",
      };
    }

    const booking = {
      id: createBookingId(),
      slotId,
      seats,
      status: "paid" as const,
      createdAt: now.toISOString(),
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: getPaymentIntentId(session),
      customerEmail: getCustomerEmail(session),
      amountTotalCents: session.amount_total,
      currency: session.currency,
    };

    store.bookings.push(booking);

    return {
      ok: true,
      bookingId: booking.id,
      message: "Booking fulfilled.",
    };
  });

  if (fulfillment.ok && fulfillment.bookingId) {
    try {
      await sendBookingEmails(fulfillment.bookingId);
    } catch (error) {
      console.error("Booking email workflow failed.", error);
    }
  }

  return fulfillment;
}

export async function markUnpaidCheckoutSessionClosed(
  session: Stripe.Checkout.Session,
  reason: string,
) {
  return updateBookingStore<FulfillmentResult>((store) => {
    const existingBooking = store.bookings.find(
      (booking) => booking.stripeCheckoutSessionId === session.id,
    );

    if (existingBooking) {
      return {
        ok: true,
        bookingId: existingBooking.id,
        message: "Checkout Session is already paid.",
      };
    }

    return {
      ok: true,
      message: reason,
    };
  });
}
