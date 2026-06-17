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

      const nextWorkshopSlug = update.workshopSlug ?? slot.workshopSlug;
      const nextStartsAt = update.startsAt ?? slot.startsAt;
      const duplicateSlot = store.slots.find(
        (candidate) =>
          candidate.id !== slot.id &&
          candidate.workshopSlug === nextWorkshopSlug &&
          candidate.startsAt === nextStartsAt,
      );

      if (duplicateSlot) {
        return {
          payload: { error: "A slot for this workshop and start time already exists." },
          status: 409,
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

      if (update.workshopSlug !== undefined) {
        slot.workshopSlug = update.workshopSlug;
      }

      if (update.startsAt !== undefined) {
        slot.startsAt = update.startsAt;
      }

      if (update.endsAt !== undefined) {
        slot.endsAt = update.endsAt;
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

export async function DELETE(_request: Request, { params }: SlotRouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  }

  const { slotId } = await params;

  const result = await updateBookingStore((store) => {
    const slotIndex = store.slots.findIndex((candidate) => candidate.id === slotId);

    if (slotIndex === -1) {
      return {
        payload: { error: "Slot not found." },
        status: 404,
      };
    }

    const bookingCount = store.bookings.filter((booking) => booking.slotId === slotId).length;

    if (bookingCount > 0) {
      return {
        payload: {
          error:
            "This slot has booking history and cannot be deleted. Close it to keep it archived.",
        },
        status: 409,
      };
    }

    const [slot] = store.slots.splice(slotIndex, 1);
    store.holds = store.holds.filter((hold) => hold.slotId !== slotId);

    return {
      payload: { slot },
      status: 200,
    };
  });

  return NextResponse.json(result.payload, { status: result.status });
}
