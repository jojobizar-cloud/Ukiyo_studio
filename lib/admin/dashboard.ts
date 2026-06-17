import { getSlotAvailability } from "@/lib/booking/availability";
import { readBookingStore } from "@/lib/booking/localStore";
import type { BookingSlotStatus, BookingStatus } from "@/lib/booking/types";
import { getWorkshop, workshops } from "@/lib/workshops";
import { getAmsterdamTodayKey } from "@/lib/admin/dates";
import {
  getBookingNotificationEmail,
  getEmailFromAddress,
  getEmailProvider,
} from "@/lib/email/config";
import { readEmailOutbox } from "@/lib/email/localOutbox";
import type { EmailDeliveryStatus } from "@/lib/email/types";

export type AdminWorkshopOption = {
  slug: string;
  title: string;
  defaultCapacity: number;
  defaultDurationMinutes: number;
  defaultPriceCents: number;
};

export type AdminSlotRow = {
  id: string;
  workshopSlug: string;
  workshopTitle: string;
  startsAt: string;
  endsAt: string;
  dateKey: string;
  startTime: string;
  endTime: string;
  dateLabel: string;
  timeLabel: string;
  capacity: number;
  paidSeats: number;
  remainingSeats: number;
  bookingCount: number;
  priceCents: number;
  currency: string;
  status: BookingSlotStatus;
  isSoldOut: boolean;
};

export type AdminBookingRow = {
  id: string;
  slotId: string;
  workshopTitle: string;
  startsAt: string;
  dateLabel: string;
  timeLabel: string;
  seats: number;
  status: BookingStatus;
  createdAt: string;
  refundedAt?: string | null;
  customerEmail?: string | null;
  amountTotalCents?: number | null;
  currency?: string | null;
  stripeCheckoutSessionId?: string;
};

export type AdminEmailRow = {
  id: string;
  bookingId: string;
  kind: string;
  provider: string;
  status: EmailDeliveryStatus;
  to: string[];
  subject: string;
  createdAt: string;
  sentAt?: string;
  error?: string;
};

export type AdminDashboardData = {
  generatedAt: string;
  todayKey: string;
  workshops: AdminWorkshopOption[];
  emailConfig: {
    fromAddress: string;
    notificationRecipientConfigured: boolean;
    provider: string;
  };
  summary: {
    emailFailures: number;
    emailRecords: number;
    openSlots: number;
    bookedSeats: number;
    paidBookings: number;
    refundedBookings: number;
    revenueCents: number;
  };
  slots: AdminSlotRow[];
  bookings: AdminBookingRow[];
  emails: AdminEmailRow[];
};

const adminWorkshopDefaults: Record<
  string,
  {
    defaultCapacity: number;
    defaultDurationMinutes: number;
    defaultPriceCents: number;
  }
> = {
  "charm-bar": {
    defaultCapacity: 10,
    defaultDurationMinutes: 90,
    defaultPriceCents: 1500,
  },
  "foam-clay-mirror": {
    defaultCapacity: 10,
    defaultDurationMinutes: 150,
    defaultPriceCents: 4000,
  },
};

export function getAdminWorkshopOptions(): AdminWorkshopOption[] {
  return workshops
    .filter((workshop) => workshop.status === "bookable")
    .map((workshop) => ({
      slug: workshop.slug,
      title: workshop.title,
      ...(adminWorkshopDefaults[workshop.slug] ?? {
        defaultCapacity: 10,
        defaultDurationMinutes: 120,
        defaultPriceCents: 0,
      }),
    }));
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const now = new Date();
  const store = await readBookingStore(now);
  const emailOutbox = await readEmailOutbox();
  const bookingCountBySlotId = new Map<string, number>();

  for (const booking of store.bookings) {
    bookingCountBySlotId.set(
      booking.slotId,
      (bookingCountBySlotId.get(booking.slotId) ?? 0) + 1,
    );
  }

  const slots = store.slots
    .map((slot) => {
      const workshop = getWorkshop(slot.workshopSlug);
      const availability = getSlotAvailability(store, slot, now);

      return {
        id: slot.id,
        workshopSlug: slot.workshopSlug,
        workshopTitle: workshop?.title ?? slot.workshopSlug,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        dateKey: slot.startsAt.slice(0, 10),
        startTime: slot.startsAt.slice(11, 16),
        endTime: slot.endsAt.slice(11, 16),
        dateLabel: availability.dateLabel,
        timeLabel: availability.timeLabel,
        capacity: availability.capacity,
        paidSeats: availability.paidSeats,
        remainingSeats: availability.remainingSeats,
        bookingCount: bookingCountBySlotId.get(slot.id) ?? 0,
        priceCents: availability.priceCents,
        currency: availability.currency,
        status: availability.status,
        isSoldOut: availability.isSoldOut,
      };
    })
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));

  const slotById = new Map(slots.map((slot) => [slot.id, slot]));
  const bookings = store.bookings
    .map((booking) => {
      const slot = slotById.get(booking.slotId);

      return {
        id: booking.id,
        slotId: booking.slotId,
        workshopTitle: slot?.workshopTitle ?? "Unknown workshop",
        startsAt: slot?.startsAt ?? "",
        dateLabel: slot?.dateLabel ?? "Unknown date",
        timeLabel: slot?.timeLabel ?? "",
        seats: booking.seats,
        status: booking.status,
        createdAt: booking.createdAt,
        refundedAt: booking.refundedAt,
        customerEmail: booking.customerEmail,
        amountTotalCents: booking.amountTotalCents,
        currency: booking.currency,
        stripeCheckoutSessionId: booking.stripeCheckoutSessionId,
      };
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  const paidBookings = bookings.filter((booking) => booking.status === "paid");
  const refundedBookings = bookings.filter((booking) => booking.status === "refunded");
  const emails = emailOutbox
    .map((record) => ({
      id: record.id,
      bookingId: record.bookingId,
      kind: record.kind,
      provider: record.provider,
      status: record.status,
      to: record.to,
      subject: record.subject,
      createdAt: record.createdAt,
      sentAt: record.sentAt,
      error: record.error,
    }))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return {
    generatedAt: now.toISOString(),
    todayKey: getAmsterdamTodayKey(now),
    emailConfig: {
      fromAddress: getEmailFromAddress(),
      notificationRecipientConfigured: Boolean(getBookingNotificationEmail()),
      provider: getEmailProvider(),
    },
    workshops: getAdminWorkshopOptions(),
    summary: {
      emailFailures: emails.filter((email) => email.status === "failed").length,
      emailRecords: emails.length,
      openSlots: slots.filter((slot) => slot.status === "open").length,
      bookedSeats: paidBookings.reduce((total, booking) => total + booking.seats, 0),
      paidBookings: paidBookings.length,
      refundedBookings: refundedBookings.length,
      revenueCents: paidBookings.reduce(
        (total, booking) => total + (booking.amountTotalCents ?? 0),
        0,
      ),
    },
    slots,
    bookings,
    emails,
  };
}
