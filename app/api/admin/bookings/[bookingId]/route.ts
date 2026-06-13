import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { updateBookingStore } from "@/lib/booking/localStore";
import type { BookingStatus } from "@/lib/booking/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BookingRouteContext = {
  params: Promise<{
    bookingId: string;
  }>;
};

type UpdateBookingBody = {
  status?: unknown;
};

async function readBody(request: Request) {
  try {
    return (await request.json()) as UpdateBookingBody;
  } catch {
    return null;
  }
}

function parseBookingStatus(value: unknown): BookingStatus | null {
  return value === "paid" || value === "refunded" ? value : null;
}

export async function PATCH(request: Request, { params }: BookingRouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  }

  const { bookingId } = await params;
  const body = await readBody(request);
  const status = parseBookingStatus(body?.status);

  if (!status) {
    return NextResponse.json(
      { error: "Choose a valid booking status." },
      { status: 400 },
    );
  }

  const result = await updateBookingStore((store, now) => {
    const booking = store.bookings.find((candidate) => candidate.id === bookingId);

    if (!booking) {
      return {
        payload: { error: "Booking not found." },
        status: 404,
      };
    }

    if (booking.status === status) {
      return {
        payload: { booking },
        status: 200,
      };
    }

    if (status === "paid") {
      const slot = store.slots.find((candidate) => candidate.id === booking.slotId);

      if (!slot) {
        return {
          payload: { error: "The workshop slot for this booking no longer exists." },
          status: 409,
        };
      }

      const paidSeats = store.bookings
        .filter(
          (candidate) =>
            candidate.id !== booking.id &&
            candidate.slotId === booking.slotId &&
            candidate.status === "paid",
        )
        .reduce((total, candidate) => total + candidate.seats, 0);

      if (paidSeats + booking.seats > slot.capacity) {
        return {
          payload: {
            error:
              "This booking cannot be restored as paid because the slot no longer has enough capacity.",
          },
          status: 409,
        };
      }

      booking.status = "paid";
      booking.refundedAt = null;

      return {
        payload: { booking },
        status: 200,
      };
    }

    booking.status = "refunded";
    booking.refundedAt = now.toISOString();

    return {
      payload: { booking },
      status: 200,
    };
  });

  return NextResponse.json(result.payload, { status: result.status });
}
