import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { parseCreateSlotInput } from "@/lib/admin/slotValidation";
import { createSlotId, updateBookingStore } from "@/lib/booking/localStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function readBody(request: Request) {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  }

  const body = await readBody(request);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Provide slot details." }, { status: 400 });
  }

  try {
    const slotInput = parseCreateSlotInput(body);

    const result = await updateBookingStore((store) => {
      const existingSlot = store.slots.find(
        (slot) =>
          slot.workshopSlug === slotInput.workshopSlug && slot.startsAt === slotInput.startsAt,
      );

      if (existingSlot) {
        return {
          payload: { error: "A slot for this workshop and start time already exists." },
          status: 409,
        };
      }

      const slot = {
        id: createSlotId(),
        ...slotInput,
      };

      store.slots.push(slot);

      return {
        payload: { slot },
        status: 201,
      };
    });

    return NextResponse.json(result.payload, { status: result.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create slot." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  }

  const body = await readBody(request);

  if (body && typeof body === "object" && "status" in body && body.status !== "closed") {
    return NextResponse.json(
      { error: "Bulk slot cleanup only supports closed slots." },
      { status: 400 },
    );
  }

  const result = await updateBookingStore((store) => {
    const closedSlotIds = new Set(
      store.slots.filter((slot) => slot.status === "closed").map((slot) => slot.id),
    );
    const protectedSlotIds = new Set(
      store.bookings
        .filter((booking) => closedSlotIds.has(booking.slotId))
        .map((booking) => booking.slotId),
    );
    const deletableSlotIds = new Set(
      store.slots
        .filter((slot) => slot.status === "closed" && !protectedSlotIds.has(slot.id))
        .map((slot) => slot.id),
    );

    store.slots = store.slots.filter((slot) => !deletableSlotIds.has(slot.id));
    store.holds = store.holds.filter((hold) => !deletableSlotIds.has(hold.slotId));

    return {
      payload: {
        deletedCount: deletableSlotIds.size,
        protectedCount: protectedSlotIds.size,
      },
      status: 200,
    };
  });

  return NextResponse.json(result.payload, { status: result.status });
}
