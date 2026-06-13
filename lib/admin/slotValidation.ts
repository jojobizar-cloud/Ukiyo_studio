import { amsterdamLocalDateTimeToIso } from "@/lib/admin/dates";
import type { BookingSlotStatus } from "@/lib/booking/types";
import { getWorkshop } from "@/lib/workshops";

export type CreateSlotInput = {
  workshopSlug?: unknown;
  date?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  capacity?: unknown;
  priceCents?: unknown;
  status?: unknown;
};

export type UpdateSlotInput = {
  capacity?: unknown;
  priceCents?: unknown;
  status?: unknown;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{2}:\d{2}$/;

function isValidDateKey(value: string) {
  if (!datePattern.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value;
}

function isValidTime(value: string) {
  if (!timePattern.test(value)) {
    return false;
  }

  const [hour, minute] = value.split(":").map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function parseInteger(value: unknown, label: string, minimum: number, maximum: number) {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be a whole number.`);
  }

  const parsedValue = Number(value);

  if (parsedValue < minimum || parsedValue > maximum) {
    throw new Error(`${label} must be between ${minimum} and ${maximum}.`);
  }

  return parsedValue;
}

function parseSlotStatus(value: unknown): BookingSlotStatus {
  if (value === undefined || value === "open") {
    return "open";
  }

  if (value === "closed") {
    return "closed";
  }

  throw new Error("Status must be open or closed.");
}

export function parseCreateSlotInput(input: CreateSlotInput) {
  if (typeof input.workshopSlug !== "string") {
    throw new Error("Choose a workshop type.");
  }

  const workshop = getWorkshop(input.workshopSlug);

  if (!workshop || workshop.status !== "bookable") {
    throw new Error("This workshop type is not open for booking.");
  }

  if (typeof input.date !== "string" || !isValidDateKey(input.date)) {
    throw new Error("Choose a valid date.");
  }

  if (typeof input.startTime !== "string" || !isValidTime(input.startTime)) {
    throw new Error("Choose a valid start time.");
  }

  if (typeof input.endTime !== "string" || !isValidTime(input.endTime)) {
    throw new Error("Choose a valid end time.");
  }

  const capacity = parseInteger(input.capacity, "Capacity", 1, 50);
  const priceCents = parseInteger(input.priceCents, "Price", 0, 50000);
  const startsAt = amsterdamLocalDateTimeToIso(input.date, input.startTime);
  const endsAt = amsterdamLocalDateTimeToIso(input.date, input.endTime);

  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    throw new Error("End time must be later than start time.");
  }

  return {
    capacity,
    currency: "EUR" as const,
    endsAt,
    priceCents,
    startsAt,
    status: parseSlotStatus(input.status),
    workshopSlug: workshop.slug,
  };
}

export function parseUpdateSlotInput(input: UpdateSlotInput) {
  const update: {
    capacity?: number;
    priceCents?: number;
    status?: BookingSlotStatus;
  } = {};

  if (input.capacity !== undefined) {
    update.capacity = parseInteger(input.capacity, "Capacity", 1, 50);
  }

  if (input.priceCents !== undefined) {
    update.priceCents = parseInteger(input.priceCents, "Price", 0, 50000);
  }

  if (input.status !== undefined) {
    update.status = parseSlotStatus(input.status);
  }

  if (!("capacity" in update) && !("priceCents" in update) && !("status" in update)) {
    throw new Error("No slot changes were provided.");
  }

  return update;
}
