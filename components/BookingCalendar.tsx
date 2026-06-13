"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PublicSlotAvailability } from "@/lib/booking/types";
import type { WorkshopStatus } from "@/lib/workshops";

type BookingCalendarProps = {
  workshopSlug: string;
  workshopStatus: WorkshopStatus;
};

type SlotsResponse = {
  slots: PublicSlotAvailability[];
};

type BookingError = {
  error: string;
  slot?: PublicSlotAvailability;
};

type CalendarDay = {
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
};

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatMoney(priceCents: number, currency: string) {
  return new Intl.NumberFormat("en-NL", {
    style: "currency",
    currency,
  }).format(priceCents / 100);
}

function padNumber(value: number) {
  return value.toString().padStart(2, "0");
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
}

function buildMonthDays(monthKey: string): CalendarDay[] {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const firstDay = new Date(year, monthIndex, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, monthIndex, 1 - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    return {
      dateKey: toDateKey(date),
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === monthIndex,
    };
  });
}

export function BookingCalendar({ workshopSlug, workshopStatus }: BookingCalendarProps) {
  const [slots, setSlots] = useState<PublicSlotAvailability[]>([]);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [seats, setSeats] = useState(1);
  const [loading, setLoading] = useState(workshopStatus !== "coming-soon");
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isComingSoon = workshopStatus === "coming-soon";

  const loadSlots = useCallback(async () => {
    if (isComingSoon) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workshops/${encodeURIComponent(workshopSlug)}/slots`, {
        cache: "no-store",
      });
      const data = (await response.json()) as SlotsResponse | BookingError;

      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Could not load available dates.");
      }

      setSlots(data.slots);

      const firstBookable = data.slots.find((slot) => slot.isBookable) ?? data.slots[0];

      if (firstBookable) {
        setSelectedDateKey((current) =>
          current && data.slots.some((slot) => slot.dateKey === current)
            ? current
            : firstBookable.dateKey,
        );
        setSelectedSlotId((current) =>
          current && data.slots.some((slot) => slot.id === current) ? current : firstBookable.id,
        );
        setSelectedMonthKey((current) =>
          current && data.slots.some((slot) => slot.monthKey === current)
            ? current
            : firstBookable.monthKey,
        );
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load available dates.");
    } finally {
      setLoading(false);
    }
  }, [isComingSoon, workshopSlug]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const slotsByDate = useMemo(() => {
    const map = new Map<string, PublicSlotAvailability[]>();

    for (const slot of slots) {
      const dateSlots = map.get(slot.dateKey) ?? [];
      dateSlots.push(slot);
      map.set(slot.dateKey, dateSlots);
    }

    return map;
  }, [slots]);

  const monthOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const slot of slots) {
      map.set(slot.monthKey, slot.monthLabel);
    }

    return Array.from(map.entries()).map(([monthKey, monthLabel]) => ({ monthKey, monthLabel }));
  }, [slots]);

  const selectedMonthIndex = monthOptions.findIndex(
    (option) => option.monthKey === selectedMonthKey,
  );
  const selectedMonth = selectedMonthIndex >= 0 ? monthOptions[selectedMonthIndex] : monthOptions[0];
  const calendarDays = selectedMonth ? buildMonthDays(selectedMonth.monthKey) : [];
  const selectedDaySlots = selectedDateKey ? slotsByDate.get(selectedDateKey) ?? [] : [];
  const selectedSlot =
    slots.find((slot) => slot.id === selectedSlotId) ?? selectedDaySlots.find((slot) => slot.isBookable);
  const maxSeats = selectedSlot?.remainingSeats ?? 1;
  const canCheckout = Boolean(selectedSlot?.isBookable && !checkingOut);

  useEffect(() => {
    if (!selectedSlot) {
      return;
    }

    setSeats((currentSeats) => Math.min(Math.max(1, currentSeats), Math.max(1, maxSeats)));
  }, [maxSeats, selectedSlot]);

  function selectDate(dateKey: string) {
    const dateSlots = slotsByDate.get(dateKey) ?? [];
    const nextSlot = dateSlots.find((slot) => slot.isBookable) ?? dateSlots[0];

    setSelectedDateKey(dateKey);
    setSelectedSlotId(nextSlot?.id ?? null);
    setError(null);
  }

  function selectMonth(offset: number) {
    const nextIndex = selectedMonthIndex + offset;
    const nextMonth = monthOptions[nextIndex];

    if (!nextMonth) {
      return;
    }

    setSelectedMonthKey(nextMonth.monthKey);
    const firstMonthSlot =
      slots.find((slot) => slot.monthKey === nextMonth.monthKey && slot.isBookable) ??
      slots.find((slot) => slot.monthKey === nextMonth.monthKey);

    if (firstMonthSlot) {
      setSelectedDateKey(firstMonthSlot.dateKey);
      setSelectedSlotId(firstMonthSlot.id);
    }
  }

  async function continueToPayment() {
    if (!selectedSlot) {
      return;
    }

    setCheckingOut(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slotId: selectedSlot.id,
          seats,
        }),
      });
      const data = (await response.json()) as { url?: string; error?: string; slot?: PublicSlotAvailability };

      if (!response.ok || !data.url) {
        if (data.slot) {
          setSlots((currentSlots) =>
            currentSlots.map((slot) => (slot.id === data.slot?.id ? data.slot : slot)),
          );
        }

        throw new Error(data.error ?? "Could not open Stripe Checkout.");
      }

      window.location.assign(data.url);
    } catch (checkoutError) {
      setCheckingOut(false);
      setError(
        checkoutError instanceof Error ? checkoutError.message : "Could not open Stripe Checkout.",
      );
      void loadSlots();
    }
  }

  if (isComingSoon) {
    return (
      <aside className="booking-panel" aria-label="Booking panel">
        <p className="eyebrow">Coming soon</p>
        <h2>Booking is not open yet</h2>
        <p>
          This workshop is being prepared. Once the details are final, it can use the same date,
          capacity, and seat selection flow as the other workshops.
        </p>
      </aside>
    );
  }

  return (
    <aside className="booking-panel" aria-label="Booking panel">
      <p className="eyebrow">Book your seats</p>
      <h2>Select a date</h2>
      <p>
        Choose an available workshop date, select your seats, and continue directly to secure
        checkout.
      </p>

      {loading ? <div className="booking-state">Loading available dates...</div> : null}

      {!loading && slots.length === 0 ? (
        <div className="booking-state">
          No dates are open yet. New workshop slots can be added from the admin tools phase.
        </div>
      ) : null}

      {!loading && selectedMonth ? (
        <div className="booking-calendar">
          <div className="calendar-header">
            <button
              aria-label="Previous month"
              disabled={selectedMonthIndex <= 0}
              onClick={() => selectMonth(-1)}
              type="button"
            >
              {"<"}
            </button>
            <strong>{selectedMonth.monthLabel}</strong>
            <button
              aria-label="Next month"
              disabled={selectedMonthIndex >= monthOptions.length - 1}
              onClick={() => selectMonth(1)}
              type="button"
            >
              {">"}
            </button>
          </div>
          <div className="calendar-weekdays">
            {weekDays.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="calendar-grid" aria-label="Available workshop dates">
            {calendarDays.map((day) => {
              const daySlots = slotsByDate.get(day.dateKey) ?? [];
              const remainingSeats = daySlots.reduce(
                (total, slot) => total + slot.remainingSeats,
                0,
              );
              const hasBookableSlot = daySlots.some((slot) => slot.isBookable);
              const isSelected = selectedDateKey === day.dateKey;

              return (
                <button
                  className={[
                    "calendar-day",
                    day.isCurrentMonth ? "" : "is-outside-month",
                    hasBookableSlot ? "has-slots" : "",
                    isSelected ? "is-selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={!hasBookableSlot}
                  key={day.dateKey}
                  onClick={() => selectDate(day.dateKey)}
                  type="button"
                >
                  <span>{day.dayNumber}</span>
                  {daySlots.length > 0 ? <small>{remainingSeats} left</small> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {selectedDaySlots.length > 0 ? (
        <div className="time-section">
          <h3>Available times</h3>
          <div className="slot-list">
            {selectedDaySlots.map((slot) => (
              <button
                className={slot.id === selectedSlot?.id ? "slot-button is-selected" : "slot-button"}
                disabled={!slot.isBookable}
                key={slot.id}
                onClick={() => {
                  setSelectedSlotId(slot.id);
                  setError(null);
                }}
                type="button"
              >
                <span>{slot.timeLabel}</span>
                <small>
                  {slot.isSoldOut
                    ? "Sold out"
                    : `${slot.remainingSeats} of ${slot.capacity} seats left`}
                </small>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {selectedSlot ? (
        <div className="seat-section">
          <div>
            <h3>Seats</h3>
            <p>
              {formatMoney(selectedSlot.priceCents, selectedSlot.currency)} per person -{" "}
              {selectedSlot.dateLabel}, {selectedSlot.timeLabel}
            </p>
          </div>
          <div className="seat-stepper" aria-label="Seat quantity">
            <button
              aria-label="Decrease seats"
              disabled={seats <= 1 || checkingOut}
              onClick={() => setSeats((currentSeats) => Math.max(1, currentSeats - 1))}
              type="button"
            >
              -
            </button>
            <strong>{seats}</strong>
            <button
              aria-label="Increase seats"
              disabled={seats >= maxSeats || checkingOut}
              onClick={() => setSeats((currentSeats) => Math.min(maxSeats, currentSeats + 1))}
              type="button"
            >
              +
            </button>
          </div>
        </div>
      ) : null}

      {error ? <div className="booking-error">{error}</div> : null}

      <button
        className="button button-primary full-width"
        disabled={!canCheckout}
        onClick={continueToPayment}
        type="button"
      >
        {checkingOut ? "Opening checkout..." : "Continue to payment"}
      </button>
    </aside>
  );
}
