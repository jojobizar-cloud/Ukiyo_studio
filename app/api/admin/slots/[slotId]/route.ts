import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { parseUpdateSlotInput } from "@/lib/admin/slotValidation";
import { updateBookingStore } from "@/lib/booking/localStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SlotRouteContext = {
  params: Promise<{
    slotId: string;
  }>;
};

async function readBody(request: Request) {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}

export async function PATCH(request: Request, { params }: SlotRouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  }

  const { slotId } = await params;
  const body = await readBody(request);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Provide slot changes." }, { status: 400 });
  }

  try {
    const update = parseUpdateSlotInput(body);

    const result = await updateBookingStore((store) => {
      const slot = store.slots.find((candidate) => candidate.id === slotId);

      if (!slot) {
        return {
          payload: { error: "Slot not found." },
          status: 404,
        };
      }

      if (update.capacity !== undefined) {
        const paidSeats = store.bookings
          .filter((booking) => booking.slotId === slot.id && booking.status === "paid")
          .reduce((total, booking) => total + booking.seats, 0);

        if (update.capacity < paidSeats) {
          return {
            payload: {
              error: `Capacity cannot be lower than the ${paidSeats} seats already booked.`,
            },
            status: 409,
          };
        }

        slot.capacity = update.capacity;
      }

      if (update.priceCents !== undefined) {
        slot.priceCents = update.priceCents;
      }

      if (update.status !== undefined) {
        slot.status = update.status;
      }

      return {
        payload: { slot },
        status: 200,
      };
    });

    return NextResponse.json(result.payload, { status: result.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update slot." },
      { status: 400 },
    );
  }
}
