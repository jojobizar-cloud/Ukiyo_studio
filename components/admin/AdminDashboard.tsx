"use client";

import { FormEvent, useMemo, useState } from "react";
import type {
  AdminBookingRow,
  AdminDashboardData,
  AdminSlotRow,
} from "@/lib/admin/dashboard";

type AdminDashboardProps = {
  data: AdminDashboardData;
};

type SlotFormState = {
  workshopSlug: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: string;
  priceEuros: string;
  status: "open" | "closed";
};

function formatMoney(cents: number, currency = "EUR") {
  return new Intl.NumberFormat("en-NL", {
    currency,
    style: "currency",
  }).format(cents / 100);
}

function formatDateTime(isoDate: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Amsterdam",
  }).format(new Date(isoDate));
}

function toPriceInput(cents: number) {
  return (cents / 100).toFixed(2);
}

function parseEuroCents(value: string) {
  const normalizedValue = value.trim().replace(",", ".");
  const euros = Number(normalizedValue);

  if (!Number.isFinite(euros) || euros < 0) {
    return null;
  }

  return Math.round(euros * 100);
}

function addMinutesToTime(time: string, minutesToAdd: number) {
  const [hourText, minuteText] = time.split(":");
  const totalMinutes =
    Number(hourText) * 60 + Number(minuteText) + Math.max(0, minutesToAdd);
  const hour = Math.floor((totalMinutes % (24 * 60)) / 60)
    .toString()
    .padStart(2, "0");
  const minute = (totalMinutes % 60).toString().padStart(2, "0");

  return `${hour}:${minute}`;
}

async function parseApiError(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? "The admin action failed.";
  } catch {
    return "The admin action failed.";
  }
}

function makeInitialSlotForm(data: AdminDashboardData): SlotFormState {
  const firstWorkshop = data.workshops[0];

  return {
    capacity: String(firstWorkshop?.defaultCapacity ?? 10),
    date: data.todayKey,
    endTime: addMinutesToTime("10:00", firstWorkshop?.defaultDurationMinutes ?? 120),
    priceEuros: toPriceInput(firstWorkshop?.defaultPriceCents ?? 0),
    startTime: "10:00",
    status: "open",
    workshopSlug: firstWorkshop?.slug ?? "",
  };
}

function SlotEditForm({ slot }: { slot: AdminSlotRow }) {
  const [capacity, setCapacity] = useState(String(slot.capacity));
  const [priceEuros, setPriceEuros] = useState(toPriceInput(slot.priceCents));
  const [status, setStatus] = useState(slot.status);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function saveSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const priceCents = parseEuroCents(priceEuros);

    if (priceCents === null) {
      setMessage("Enter a valid price.");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/slots/${encodeURIComponent(slot.id)}`, {
        body: JSON.stringify({
          capacity: Number(capacity),
          priceCents,
          status,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      window.location.reload();
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "Could not save slot.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="admin-inline-form" onSubmit={saveSlot}>
      <label>
        Capacity
        <input
          min={slot.paidSeats}
          onChange={(event) => setCapacity(event.target.value)}
          required
          type="number"
          value={capacity}
        />
      </label>
      <label>
        Price
        <input
          min="0"
          onChange={(event) => setPriceEuros(event.target.value)}
          required
          step="0.01"
          type="number"
          value={priceEuros}
        />
      </label>
      <label>
        Status
        <select
          onChange={(event) => setStatus(event.target.value as AdminSlotRow["status"])}
          value={status}
        >
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </label>
      <button className="button button-soft" disabled={saving} type="submit">
        {saving ? "Saving..." : "Save"}
      </button>
      {message ? <div className="admin-message is-error">{message}</div> : null}
    </form>
  );
}

function BookingStatusAction({ booking }: { booking: AdminBookingRow }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isPaid = booking.status === "paid";
  const nextStatus = isPaid ? "refunded" : "paid";

  async function updateBookingStatus() {
    const confirmed = window.confirm(
      isPaid
        ? "Mark this booking as refunded/cancelled in the admin records? This does not issue the refund in Stripe."
        : "Restore this booking as paid? This will count the seats and revenue again.",
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/bookings/${encodeURIComponent(booking.id)}`,
        {
          body: JSON.stringify({ status: nextStatus }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "PATCH",
        },
      );

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      window.location.reload();
    } catch (updateError) {
      setMessage(
        updateError instanceof Error
          ? updateError.message
          : "Could not update booking status.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-booking-action">
      <button
        className="button button-soft"
        disabled={saving}
        onClick={updateBookingStatus}
        type="button"
      >
        {saving ? "Saving..." : isPaid ? "Mark refunded" : "Restore paid"}
      </button>
      {message ? <div className="admin-message is-error">{message}</div> : null}
    </div>
  );
}

export function AdminDashboard({ data }: AdminDashboardProps) {
  const [slotForm, setSlotForm] = useState<SlotFormState>(() => makeInitialSlotForm(data));
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const currentSlots = data.slots.filter((slot) => slot.status !== "closed");
  const archivedSlots = data.slots.filter((slot) => slot.status === "closed");

  const selectedWorkshop = useMemo(
    () => data.workshops.find((workshop) => workshop.slug === slotForm.workshopSlug),
    [data.workshops, slotForm.workshopSlug],
  );

  function updateSlotForm(update: Partial<SlotFormState>) {
    setSlotForm((current) => ({ ...current, ...update }));
  }

  function changeWorkshop(workshopSlug: string) {
    const workshop = data.workshops.find((candidate) => candidate.slug === workshopSlug);

    setSlotForm((current) => ({
      ...current,
      capacity: String(workshop?.defaultCapacity ?? current.capacity),
      endTime: addMinutesToTime(current.startTime, workshop?.defaultDurationMinutes ?? 120),
      priceEuros: toPriceInput(workshop?.defaultPriceCents ?? parseEuroCents(current.priceEuros) ?? 0),
      workshopSlug,
    }));
  }

  function changeStartTime(startTime: string) {
    setSlotForm((current) => ({
      ...current,
      endTime: addMinutesToTime(startTime, selectedWorkshop?.defaultDurationMinutes ?? 120),
      startTime,
    }));
  }

  async function createSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const priceCents = parseEuroCents(slotForm.priceEuros);

    if (priceCents === null) {
      setMessage("Enter a valid price.");
      return;
    }

    setCreating(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/slots", {
        body: JSON.stringify({
          capacity: Number(slotForm.capacity),
          date: slotForm.date,
          endTime: slotForm.endTime,
          priceCents,
          startTime: slotForm.startTime,
          status: slotForm.status,
          workshopSlug: slotForm.workshopSlug,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      window.location.reload();
    } catch (createError) {
      setMessage(createError instanceof Error ? createError.message : "Could not create slot.");
    } finally {
      setCreating(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.assign("/admin/login");
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-toolbar">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Booking dashboard</h1>
        </div>
        <div className="admin-toolbar-actions">
          <a className="button button-soft" href="/api/admin/bookings/export">
            Export CSV
          </a>
          <button className="button button-soft" onClick={logout} type="button">
            Log out
          </button>
        </div>
      </div>

      <section className="admin-summary-grid" aria-label="Booking summary">
        <div>
          <span>Open slots</span>
          <strong>{data.summary.openSlots}</strong>
        </div>
        <div>
          <span>Paid bookings</span>
          <strong>{data.summary.paidBookings}</strong>
        </div>
        <div>
          <span>Refunded</span>
          <strong>{data.summary.refundedBookings}</strong>
        </div>
        <div>
          <span>Booked seats</span>
          <strong>{data.summary.bookedSeats}</strong>
        </div>
        <div>
          <span>Revenue</span>
          <strong>{formatMoney(data.summary.revenueCents)}</strong>
        </div>
        <div>
          <span>Email records</span>
          <strong>{data.summary.emailRecords}</strong>
        </div>
        <div>
          <span>Email failures</span>
          <strong>{data.summary.emailFailures}</strong>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-header">
          <div>
            <p className="eyebrow">Slots</p>
            <h2>Open a new workshop date</h2>
          </div>
          <p>Times are saved in the Europe/Amsterdam timezone.</p>
        </div>
        <form className="admin-slot-form" onSubmit={createSlot}>
          <label>
            Workshop
            <select
              onChange={(event) => changeWorkshop(event.target.value)}
              required
              value={slotForm.workshopSlug}
            >
              {data.workshops.map((workshop) => (
                <option key={workshop.slug} value={workshop.slug}>
                  {workshop.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input
              onChange={(event) => updateSlotForm({ date: event.target.value })}
              required
              type="date"
              value={slotForm.date}
            />
          </label>
          <label>
            Start
            <input
              onChange={(event) => changeStartTime(event.target.value)}
              required
              type="time"
              value={slotForm.startTime}
            />
          </label>
          <label>
            End
            <input
              onChange={(event) => updateSlotForm({ endTime: event.target.value })}
              required
              type="time"
              value={slotForm.endTime}
            />
          </label>
          <label>
            Capacity
            <input
              max="50"
              min="1"
              onChange={(event) => updateSlotForm({ capacity: event.target.value })}
              required
              type="number"
              value={slotForm.capacity}
            />
          </label>
          <label>
            Price
            <input
              min="0"
              onChange={(event) => updateSlotForm({ priceEuros: event.target.value })}
              required
              step="0.01"
              type="number"
              value={slotForm.priceEuros}
            />
          </label>
          <label>
            Status
            <select
              onChange={(event) =>
                updateSlotForm({ status: event.target.value as SlotFormState["status"] })
              }
              value={slotForm.status}
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <button className="button button-primary" disabled={creating} type="submit">
            {creating ? "Creating..." : "Create slot"}
          </button>
        </form>
        {message ? <div className="admin-message is-error">{message}</div> : null}
      </section>

      <section className="admin-section">
        <div className="admin-section-header">
          <div>
            <p className="eyebrow">Planning</p>
            <h2>Active workshop slots</h2>
          </div>
          <p>{currentSlots.length} active slots</p>
        </div>
        <div className="admin-slot-list">
          {currentSlots.map((slot) => (
            <article className="admin-slot-item" key={slot.id}>
              <div className="admin-slot-main">
                <div>
                  <span className={`admin-status is-${slot.status}`}>{slot.status}</span>
                  <h3>{slot.workshopTitle}</h3>
                  <p>
                    {slot.dateLabel}, {slot.timeLabel}
                  </p>
                </div>
                <div className="admin-slot-stats">
                  <span>
                    <strong>{slot.paidSeats}</strong> booked
                  </span>
                  <span>
                    <strong>{slot.remainingSeats}</strong> available
                  </span>
                  <span>
                    <strong>{slot.capacity}</strong> capacity
                  </span>
                </div>
              </div>
              <SlotEditForm slot={slot} />
            </article>
          ))}
          {currentSlots.length === 0 ? <div className="admin-empty">No active slots.</div> : null}
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-header">
          <div>
            <p className="eyebrow">Archive</p>
            <h2>Closed workshop slots</h2>
          </div>
          <p>{archivedSlots.length} archived slots</p>
        </div>
        {archivedSlots.length > 0 ? (
          <div className="admin-slot-list compact">
            {archivedSlots.map((slot) => (
              <article className="admin-slot-item" key={slot.id}>
                <div className="admin-slot-main">
                  <div>
                    <span className={`admin-status is-${slot.status}`}>{slot.status}</span>
                    <h3>{slot.workshopTitle}</h3>
                    <p>
                      {slot.dateLabel}, {slot.timeLabel}
                    </p>
                  </div>
                  <div className="admin-slot-stats">
                    <span>
                      <strong>{slot.paidSeats}</strong> booked
                    </span>
                    <span>
                      <strong>{slot.remainingSeats}</strong> available
                    </span>
                    <span>
                      <strong>{slot.capacity}</strong> capacity
                    </span>
                  </div>
                </div>
                <SlotEditForm slot={slot} />
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-empty">No closed slots are archived yet.</div>
        )}
      </section>

      <section className="admin-section">
        <div className="admin-section-header">
          <div>
            <p className="eyebrow">Payments</p>
            <h2>Booking records</h2>
          </div>
          <p>{data.bookings.length} booking records</p>
        </div>
        {data.bookings.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Workshop</th>
                  <th>Date</th>
                  <th>Seats</th>
                  <th>Status</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.bookings.map((booking) => (
                  <tr className={`is-${booking.status}`} key={booking.id}>
                    <td>{formatDateTime(booking.createdAt)}</td>
                    <td>{booking.workshopTitle}</td>
                    <td>
                      {booking.dateLabel}
                      <br />
                      <span>{booking.timeLabel}</span>
                    </td>
                    <td>{booking.seats}</td>
                    <td>
                      <span className={`admin-status is-${booking.status}`}>
                        {booking.status}
                      </span>
                      {booking.refundedAt ? (
                        <span className="admin-refund-date">
                          {formatDateTime(booking.refundedAt)}
                        </span>
                      ) : null}
                    </td>
                    <td>{booking.customerEmail ?? "No email from Stripe yet"}</td>
                    <td>
                      {booking.amountTotalCents
                        ? formatMoney(booking.amountTotalCents, booking.currency ?? "EUR")
                        : "Not stored"}
                    </td>
                    <td className="admin-actions-cell">
                      {booking.status === "paid" || booking.status === "refunded" ? (
                        <BookingStatusAction booking={booking} />
                      ) : (
                        ""
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">No paid bookings yet.</div>
        )}
      </section>

      <section className="admin-section">
        <div className="admin-section-header">
          <div>
            <p className="eyebrow">Email</p>
            <h2>Confirmation emails</h2>
          </div>
          <p>
            Provider: {data.emailConfig.provider}. Sender: {data.emailConfig.fromAddress}. Owner
            notifications:{" "}
            {data.emailConfig.notificationRecipientConfigured ? "configured" : "not configured"}.
          </p>
        </div>
        {data.emails.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Type</th>
                  <th>To</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {data.emails.map((email) => (
                  <tr key={email.id}>
                    <td>{formatDateTime(email.createdAt)}</td>
                    <td>{email.kind}</td>
                    <td>{email.to.join(", ")}</td>
                    <td>{email.subject}</td>
                    <td>
                      <span className={`admin-status is-${email.status}`}>{email.status}</span>
                    </td>
                    <td>{email.error ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">
            No email records yet. The local outbox will fill after a paid booking is confirmed.
          </div>
        )}
      </section>
    </div>
  );
}
