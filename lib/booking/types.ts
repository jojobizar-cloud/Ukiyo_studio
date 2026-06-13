export type BookingSlotStatus = "open" | "closed";
export type BookingHoldStatus = "active" | "released" | "expired" | "converted";
export type BookingStatus = "paid" | "cancelled";
export type BookingCurrency = "EUR";

export type BookingSlotRecord = {
  id: string;
  workshopSlug: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  priceCents: number;
  currency: BookingCurrency;
  status: BookingSlotStatus;
};

export type BookingHoldRecord = {
  id: string;
  slotId: string;
  seats: number;
  status: BookingHoldStatus;
  createdAt: string;
  expiresAt: string;
  releasedAt?: string;
};

export type BookingRecord = {
  id: string;
  slotId: string;
  holdId?: string;
  seats: number;
  status: BookingStatus;
  createdAt: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  customerEmail?: string | null;
  amountTotalCents?: number | null;
  currency?: string | null;
};

export type BookingStoreData = {
  slots: BookingSlotRecord[];
  holds: BookingHoldRecord[];
  bookings: BookingRecord[];
};

export type PublicSlotAvailability = {
  id: string;
  workshopSlug: string;
  startsAt: string;
  endsAt: string;
  dateKey: string;
  monthKey: string;
  dateLabel: string;
  monthLabel: string;
  timeLabel: string;
  capacity: number;
  paidSeats: number;
  remainingSeats: number;
  priceCents: number;
  currency: BookingCurrency;
  status: BookingSlotStatus;
  isBookable: boolean;
  isSoldOut: boolean;
};
