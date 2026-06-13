import { NextResponse } from "next/server";
import { getWorkshop } from "@/lib/workshops";
import { getWorkshopSlotAvailability } from "@/lib/booking/availability";
import { readBookingStore } from "@/lib/booking/localStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SlotsRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, { params }: SlotsRouteContext) {
  const { slug } = await params;
  const workshop = getWorkshop(slug);

  if (!workshop) {
    return NextResponse.json({ error: "Workshop not found." }, { status: 404 });
  }

  if (workshop.status === "coming-soon") {
    return NextResponse.json({
      workshop: {
        slug: workshop.slug,
        title: workshop.title,
        status: workshop.status,
      },
      slots: [],
    });
  }

  const now = new Date();
  const store = await readBookingStore(now);
  const slots = getWorkshopSlotAvailability(store, workshop.slug, now);

  return NextResponse.json({
    workshop: {
      slug: workshop.slug,
      title: workshop.title,
      status: workshop.status,
    },
    slots,
  });
}
