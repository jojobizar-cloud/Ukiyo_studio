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

type AdminTab = "active" | "archive" | "bookings" | "emails";

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

function SlotEditForm({
  slot,
  workshops,
}: {
  slot: AdminSlotRow;
  workshops: AdminDashboardData["workshops"];
}) {
  const [workshopSlug, setWorkshopSlug] = useState(slot.workshopSlug);
  const [date, setDate] = useState(slot.dateKey);
  const [startTime, setStartTime] = useState(slot.startTime);
  const [endTime, setEndTime] = useState(slot.endTime);
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
          date,
          endTime,
          capacity: Number(capacity),
          priceCents,
          startTime,
          status,
          workshopSlug,
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
        Workshop
        <select
          onChange={(event) => setWorkshopSlug(event.target.value)}
          required
          value={workshopSlug}
        >
          {workshops.map((workshop) => (
            <option key={workshop.slug} value={workshop.slug}>
              {workshop.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Date
        <input
          onChange={(event) => setDate(event.target.value)}
          required
          type="date"
          value={date}
        />
      </label>
      <label>
        Start
        <input
          onChange={(event) => setStartTime(event.target.value)}
          required
          type="time"
          value={startTime}
        />
      </label>
      <label>
        End
        <input
          onChange={(event) => setEndTime(event.target.value)}
          required
          type="time"
          value={endTime}
        />
      </label>
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

function SlotDeleteAction({ slot }: { slot: AdminSlotRow }) {
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const canDelete = slot.bookingCount === 0;

  async function deleteSlot() {
    if (!canDelete) {
      setMessage("Slots with booking history cannot be deleted.");
      return;
    }

    const confirmed = window.confirm(
      `Delete ${slot.workshopTitle} on ${slot.dateLabel}, ${slot.timeLabel}? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/slots/${encodeURIComponent(slot.id)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      window.location.reload();
    } catch (deleteError) {
      setMessage(
        deleteError instanceof Error ? deleteError.message : "Could not delete slot.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="admin-slot-delete">
      <button
        className="button button-danger"
        disabled={deleting || !canDelete}
        onClick={deleteSlot}
        type="button"
      >
        {deleting ? "Deleting..." : "Delete slot"}
      </button>
      {!canDelete ? (
        <p>This slot has booking history and must stay archived for records.</p>
      ) : null}
      {message ? <div className="admin-message is-error">{message}</div> : null}
    </div>
  );
}

function ArchiveCleanupAction({
  archivedCount,
  deletableCount,
}: {
  archivedCount: number;
  deletableCount: number;
}) {
  const [cleaning, setCleaning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function cleanArchive() {
    const confirmed = window.confirm(
      "Delete all closed workshop slots that have no booking history? Slots with booking records will be kept.",
    );

    if (!confirmed) {
      return;
    }

    setCleaning(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/slots", {
        body: JSON.stringify({ status: "closed" }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const result = (await response.json()) as {
        deletedCount?: number;
        protectedCount?: number;
      };

      if ((result.deletedCount ?? 0) > 0) {
        window.location.reload();
        return;
      }

      setMessage(
        (result.protectedCount ?? 0) > 0
          ? "No empty archived slots were found. Slots with booking history were kept."
          : "No archived slots needed cleanup.",
      );
    } catch (cleanupError) {
      setMessage(
        cleanupError instanceof Error ? cleanupError.message : "Could not clean archive.",
      );
    } finally {
      setCleaning(false);
    }
  }

  return (
    <div className="admin-section-actions">
      <p>
        {archivedCount} archived slots, {deletableCount} empty
      </p>
      <button
        className="button button-danger"
        disabled={cleaning || deletableCount === 0}
        onClick={cleanArchive}
        type="button"
      >
        {cleaning ? "Cleaning..." : "Delete empty archive"}
      </button>
      {message ? <div className="admin-message is-error">{message}</div> : null}
    </div>
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
  const [activeTab, setActiveTab] = useState<AdminTab>("active");
  const [slotForm, setSlotForm] = useState<SlotFormState>(() => makeInitialSlotForm(data));
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const currentSlots = data.slots.filter((slot) => slot.status !== "closed");
  const archivedSlots = data.slots.filter((slot) => slot.status === "closed");
  const deletableArchivedCount = archivedSlots.filter((slot) => slot.bookingCount === 0).length;

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

  function renderSlotList(slots: AdminSlotRow[], emptyMessage: string) {
    return (
      <div className="admin-slot-list">
        {slots.map((slot) => (
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
                <span>
                  <strong>{slot.bookingCount}</strong> records
                </span>
              </div>
            </div>
            <div className="admin-slot-controls">
              <SlotEditForm slot={slot} workshops={data.workshops} />
              <SlotDeleteAction slot={slot} />
            </div>
          </article>
        ))}
        {slots.length === 0 ? <div className="admin-empty">{emptyMessage}</div> : null}
      </div>
    );
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

      <nav className="admin-tabs" aria-label="Admin dashboard sections">
        <button
          className={activeTab === "active" ? "is-active" : ""}
          onClick={() => setActiveTab("active")}
          type="button"
        >
          Active slots <span>{currentSlots.length}</span>
        </button>
        <button
          className={activeTab === "archive" ? "is-active" : ""}
          onClick={() => setActiveTab("archive")}
          type="button"
        >
          Archive <span>{archivedSlots.length}</span>
        </button>
        <button
          className={activeTab === "bookings" ? "is-active" : ""}
          onClick={() => setActiveTab("bookings")}
          type="button"
        >
          Bookings <span>{data.bookings.length}</span>
        </button>
        <button
          className={activeTab === "emails" ? "is-active" : ""}
          onClick={() => setActiveTab("emails")}
          type="button"
        >
          Email <span>{data.emails.length}</span>
        </button>
      </nav>

      {activeTab === "active" ? (
        <section className="admin-section">
          <div className="admin-section-header">
            <div>
              <p className="eyebrow">Planning</p>
              <h2>Active workshop slots</h2>
            </div>
            <p>{currentSlots.length} active slots</p>
          </div>
          {renderSlotList(currentSlots, "No active slots.")}
        </section>
      ) : null}

      {activeTab === "archive" ? (
        <section className="admin-section">
          <div className="admin-section-header">
            <div>
              <p className="eyebrow">Archive</p>
              <h2>Closed workshop slots</h2>
            </div>
            <ArchiveCleanupAction
              archivedCount={archivedSlots.length}
              deletableCount={deletableArchivedCount}
            />
          </div>
          {renderSlotList(archivedSlots, "No closed slots are archived yet.")}
        </section>
      ) : null}

      {activeTab === "bookings" ? (
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
      ) : null}

      {activeTab === "emails" ? (
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
      ) : null}
    </div>
  );
}
