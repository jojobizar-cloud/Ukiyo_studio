import { NextResponse } from "next/server";
import { getSlotAvailability } from "@/lib/booking/availability";
import { getWorkshop } from "@/lib/workshops";
import { readBookingStore } from "@/lib/booking/localStore";
import { getSiteUrl, getStripe } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CheckoutBody = {
  seats?: unknown;
  slotId?: unknown;
};

async function readBody(request: Request) {
  try {
    return (await request.json()) as CheckoutBody;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const body = await readBody(request);

  if (!body || typeof body.slotId !== "string" || !Number.isInteger(body.seats)) {
    return NextResponse.json({ error: "Choose a date and a valid number of seats." }, { status: 400 });
  }

  const seats = Number(body.seats);

  if (seats < 1 || seats > 10) {
    return NextResponse.json({ error: "Seats must be between 1 and 10." }, { status: 400 });
  }

  const now = new Date();
  const store = await readBookingStore(now);
  const slot = store.slots.find((candidate) => candidate.id === body.slotId);

  if (!slot) {
    return NextResponse.json({ error: "This workshop date no longer exists." }, { status: 404 });
  }

  if (slot.status !== "open") {
    return NextResponse.json(
      { error: "This workshop date is not open for booking." },
      { status: 409 },
    );
  }

  const availability = getSlotAvailability(store, slot, now);

  if (seats > availability.remainingSeats) {
    return NextResponse.json(
      {
        error:
          availability.remainingSeats === 0
            ? "This workshop date is sold out."
            : `Only ${availability.remainingSeats} seats are still available.`,
        slot: availability,
      },
      { status: 409 },
    );
  }

  const workshop = getWorkshop(slot.workshopSlug);

  if (!workshop) {
    return NextResponse.json({ error: "This workshop no longer exists." }, { status: 404 });
  }

  const stripe = getStripe();
  const siteUrl = getSiteUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card", "ideal"],
    billing_address_collection: "auto",
    line_items: [
      {
        quantity: seats,
        price_data: {
          currency: slot.currency.toLowerCase(),
          unit_amount: slot.priceCents,
          product_data: {
            name: workshop.title,
            description: `${seats} ${seats === 1 ? "seat" : "seats"} - ${slot.startsAt}`,
          },
        },
      },
    ],
    metadata: {
      slotId: slot.id,
      workshopSlug: slot.workshopSlug,
      seats: String(seats),
    },
    success_url: `${siteUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/booking/cancel`,
  });

  return NextResponse.json({ url: session.url });
}
