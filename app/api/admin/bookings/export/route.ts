import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getAdminDashboardData } from "@/lib/admin/dashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function escapeCsvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function toEuroValue(cents?: number | null) {
  if (cents === null || cents === undefined) {
    return "";
  }

  return (cents / 100).toFixed(2);
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  }

  const data = await getAdminDashboardData();
  const headers = [
    "Booking ID",
    "Created at",
    "Workshop",
    "Workshop date",
    "Workshop time",
    "Seats",
    "Status",
    "Customer email",
    "Amount EUR",
    "Currency",
    "Stripe checkout session",
  ];
  const rows = data.bookings.map((booking) => [
    booking.id,
    booking.createdAt,
    booking.workshopTitle,
    booking.dateLabel,
    booking.timeLabel,
    booking.seats,
    booking.status,
    booking.customerEmail ?? "",
    toEuroValue(booking.amountTotalCents),
    booking.currency ?? "",
    booking.stripeCheckoutSessionId ?? "",
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\r\n");
  const dateKey = data.generatedAt.slice(0, 10);

  return new NextResponse(`${csv}\r\n`, {
    headers: {
      "Content-Disposition": `attachment; filename="ukiyo-bookings-${dateKey}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
