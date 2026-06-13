import type {
  BookingHoldRecord,
  BookingSlotRecord,
  BookingStoreData,
  PublicSlotAvailability,
} from "@/lib/booking/types";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Amsterdam",
});

const monthFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "Europe/Amsterdam",
});

const timeFormatter = new Intl.DateTimeFormat("nl-NL", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

export function getLocalDateKey(isoDate: string) {
  return isoDate.slice(0, 10);
}

export function getMonthKey(dateKey: string) {
  return dateKey.slice(0, 7);
}

export function isHoldActive(hold: BookingHoldRecord, now: Date) {
  return hold.status === "active" && new Date(hold.expiresAt).getTime() > now.getTime();
}

export function expireStaleHolds(store: BookingStoreData, now: Date) {
  for (const hold of store.holds) {
    if (hold.status === "active" && !isHoldActive(hold, now)) {
      hold.status = "expired";
    }
  }
}

export function getSlotAvailability(
  store: BookingStoreData,
  slot: BookingSlotRecord,
  now: Date,
): PublicSlotAvailability {
  const paidSeats = store.bookings
    .filter((booking) => booking.slotId === slot.id && booking.status === "paid")
    .reduce((total, booking) => total + booking.seats, 0);

  const remainingSeats = Math.max(0, slot.capacity - paidSeats);
  const start = new Date(slot.startsAt);
  const end = new Date(slot.endsAt);
  const dateKey = getLocalDateKey(slot.startsAt);

  return {
    id: slot.id,
    workshopSlug: slot.workshopSlug,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    dateKey,
    monthKey: getMonthKey(dateKey),
    dateLabel: dateFormatter.format(start),
    monthLabel: monthFormatter.format(start),
    timeLabel: `${timeFormatter.format(start)} - ${timeFormatter.format(end)}`,
    capacity: slot.capacity,
    paidSeats,
    remainingSeats,
    priceCents: slot.priceCents,
    currency: slot.currency,
    status: slot.status,
    isBookable: slot.status === "open" && remainingSeats > 0,
    isSoldOut: remainingSeats <= 0,
  };
}

export function getWorkshopSlotAvailability(
  store: BookingStoreData,
  workshopSlug: string,
  now: Date,
) {
  return store.slots
    .filter((slot) => slot.workshopSlug === workshopSlug)
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
    .map((slot) => getSlotAvailability(store, slot, now));
}
