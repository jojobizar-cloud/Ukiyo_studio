import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import seedStore from "@/data/booking-seed.json";
import { expireStaleHolds } from "@/lib/booking/availability";
import type {
  BookingCurrency,
  BookingHoldRecord,
  BookingHoldStatus,
  BookingRecord,
  BookingSlotRecord,
  BookingSlotStatus,
  BookingStatus,
  BookingStoreData,
} from "@/lib/booking/types";
import { getDatabaseUrl } from "@/lib/db/config";
import type {
  EmailDeliveryRecord,
  EmailDeliveryStatus,
  EmailKind,
  EmailProvider,
} from "@/lib/email/types";

declare global {
  var ukiyoPostgresPool: Pool | undefined;
  var ukiyoPostgresSchemaReady: Promise<void> | undefined;
}

type Queryable = Pool | PoolClient;

type SlotRow = {
  id: string;
  workshop_slug: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  price_cents: number;
  currency: string;
  status: string;
};

type HoldRow = {
  id: string;
  slot_id: string;
  seats: number;
  status: string;
  created_at: string;
  expires_at: string;
  released_at: string | null;
};

type BookingRow = {
  id: string;
  slot_id: string;
  hold_id: string | null;
  seats: number;
  status: string;
  created_at: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  customer_email: string | null;
  amount_total_cents: number | null;
  currency: string | null;
};

type EmailDeliveryRow = {
  id: string;
  kind: string;
  idempotency_key: string;
  booking_id: string;
  from_email: string;
  reply_to: string | null;
  to_emails: string[];
  subject: string;
  text_body: string;
  html_body: string;
  provider: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  provider_message_id: string | null;
  error: string | null;
};

function getPool() {
  const connectionString = getDatabaseUrl();

  if (!connectionString) {
    return null;
  }

  if (!globalThis.ukiyoPostgresPool) {
    globalThis.ukiyoPostgresPool = new Pool({
      connectionString,
      max: 5,
      ssl: connectionString.includes("sslmode=disable")
        ? undefined
        : { rejectUnauthorized: false },
    });
  }

  return globalThis.ukiyoPostgresPool;
}

async function ensureDatabaseSchema() {
  const pool = getPool();

  if (!pool) {
    return null;
  }

  if (!globalThis.ukiyoPostgresSchemaReady) {
    globalThis.ukiyoPostgresSchemaReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS booking_slots (
          id TEXT PRIMARY KEY,
          workshop_slug TEXT NOT NULL,
          starts_at TEXT NOT NULL,
          ends_at TEXT NOT NULL,
          capacity INTEGER NOT NULL,
          price_cents INTEGER NOT NULL,
          currency TEXT NOT NULL,
          status TEXT NOT NULL
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS booking_holds (
          id TEXT PRIMARY KEY,
          slot_id TEXT NOT NULL,
          seats INTEGER NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          released_at TEXT
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS bookings (
          id TEXT PRIMARY KEY,
          slot_id TEXT NOT NULL,
          hold_id TEXT,
          seats INTEGER NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          stripe_checkout_session_id TEXT UNIQUE,
          stripe_payment_intent_id TEXT,
          customer_email TEXT,
          amount_total_cents INTEGER,
          currency TEXT
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS email_deliveries (
          id TEXT PRIMARY KEY,
          kind TEXT NOT NULL,
          idempotency_key TEXT NOT NULL,
          booking_id TEXT NOT NULL,
          from_email TEXT NOT NULL,
          reply_to TEXT,
          to_emails JSONB NOT NULL,
          subject TEXT NOT NULL,
          text_body TEXT NOT NULL,
          html_body TEXT NOT NULL,
          provider TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          sent_at TEXT,
          provider_message_id TEXT,
          error TEXT
        );
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS bookings_slot_id_idx ON bookings(slot_id);
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS email_deliveries_idempotency_key_idx
        ON email_deliveries(idempotency_key);
      `);

      const slotCount = await pool.query<{ count: string }>(
        "SELECT COUNT(*) AS count FROM booking_slots",
      );

      if (Number(slotCount.rows[0]?.count ?? 0) === 0) {
        await replaceBookingStore(pool, seedStore as BookingStoreData);
      }
    })();
  }

  await globalThis.ukiyoPostgresSchemaReady;

  return pool;
}

function mapSlot(row: SlotRow): BookingSlotRecord {
  return {
    id: row.id,
    workshopSlug: row.workshop_slug,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    capacity: row.capacity,
    priceCents: row.price_cents,
    currency: row.currency as BookingCurrency,
    status: row.status as BookingSlotStatus,
  };
}

function mapHold(row: HoldRow): BookingHoldRecord {
  return {
    id: row.id,
    slotId: row.slot_id,
    seats: row.seats,
    status: row.status as BookingHoldStatus,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    releasedAt: row.released_at ?? undefined,
  };
}

function mapBooking(row: BookingRow): BookingRecord {
  return {
    id: row.id,
    slotId: row.slot_id,
    holdId: row.hold_id ?? undefined,
    seats: row.seats,
    status: row.status as BookingStatus,
    createdAt: row.created_at,
    stripeCheckoutSessionId: row.stripe_checkout_session_id ?? undefined,
    stripePaymentIntentId: row.stripe_payment_intent_id ?? undefined,
    customerEmail: row.customer_email,
    amountTotalCents: row.amount_total_cents,
    currency: row.currency,
  };
}

function mapEmailDelivery(row: EmailDeliveryRow): EmailDeliveryRecord {
  return {
    id: row.id,
    kind: row.kind as EmailKind,
    idempotencyKey: row.idempotency_key,
    bookingId: row.booking_id,
    from: row.from_email,
    replyTo: row.reply_to ?? undefined,
    to: Array.isArray(row.to_emails) ? row.to_emails : [],
    subject: row.subject,
    text: row.text_body,
    html: row.html_body,
    provider: row.provider as EmailProvider,
    status: row.status as EmailDeliveryStatus,
    createdAt: row.created_at,
    sentAt: row.sent_at ?? undefined,
    providerMessageId: row.provider_message_id ?? undefined,
    error: row.error ?? undefined,
  };
}

async function readBookingStoreRows(client: Queryable): Promise<BookingStoreData> {
  const [slots, holds, bookings] = await Promise.all([
    client.query<SlotRow>("SELECT * FROM booking_slots ORDER BY starts_at ASC, id ASC"),
    client.query<HoldRow>("SELECT * FROM booking_holds ORDER BY created_at ASC, id ASC"),
    client.query<BookingRow>("SELECT * FROM bookings ORDER BY created_at ASC, id ASC"),
  ]);

  return {
    slots: slots.rows.map(mapSlot),
    holds: holds.rows.map(mapHold),
    bookings: bookings.rows.map(mapBooking),
  };
}

async function replaceBookingStore(client: Queryable, store: BookingStoreData) {
  await client.query("DELETE FROM bookings");
  await client.query("DELETE FROM booking_holds");
  await client.query("DELETE FROM booking_slots");

  for (const slot of store.slots) {
    await client.query(
      `
        INSERT INTO booking_slots (
          id, workshop_slug, starts_at, ends_at, capacity, price_cents, currency, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        slot.id,
        slot.workshopSlug,
        slot.startsAt,
        slot.endsAt,
        slot.capacity,
        slot.priceCents,
        slot.currency,
        slot.status,
      ],
    );
  }

  for (const hold of store.holds) {
    await client.query(
      `
        INSERT INTO booking_holds (
          id, slot_id, seats, status, created_at, expires_at, released_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        hold.id,
        hold.slotId,
        hold.seats,
        hold.status,
        hold.createdAt,
        hold.expiresAt,
        hold.releasedAt ?? null,
      ],
    );
  }

  for (const booking of store.bookings) {
    await client.query(
      `
        INSERT INTO bookings (
          id, slot_id, hold_id, seats, status, created_at, stripe_checkout_session_id,
          stripe_payment_intent_id, customer_email, amount_total_cents, currency
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        booking.id,
        booking.slotId,
        booking.holdId ?? null,
        booking.seats,
        booking.status,
        booking.createdAt,
        booking.stripeCheckoutSessionId ?? null,
        booking.stripePaymentIntentId ?? null,
        booking.customerEmail ?? null,
        booking.amountTotalCents ?? null,
        booking.currency ?? null,
      ],
    );
  }
}

export async function readBookingStoreFromPostgres(now = new Date()) {
  const pool = await ensureDatabaseSchema();

  if (!pool) {
    return null;
  }

  const store = await readBookingStoreRows(pool);
  expireStaleHolds(store, now);

  return store;
}

export async function updateBookingStoreInPostgres<T>(
  operation: (store: BookingStoreData, now: Date) => T | Promise<T>,
) {
  const pool = await ensureDatabaseSchema();

  if (!pool) {
    return null;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("LOCK TABLE booking_slots, booking_holds, bookings IN EXCLUSIVE MODE");

    const now = new Date();
    const store = await readBookingStoreRows(client);
    expireStaleHolds(store, now);
    const result = await operation(store, now);

    await replaceBookingStore(client, store);
    await client.query("COMMIT");

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function readEmailOutboxFromPostgres() {
  const pool = await ensureDatabaseSchema();

  if (!pool) {
    return null;
  }

  const result = await pool.query<EmailDeliveryRow>(
    "SELECT * FROM email_deliveries ORDER BY created_at ASC, id ASC",
  );

  return result.rows.map(mapEmailDelivery);
}

export async function hasSuccessfulEmailDeliveryInPostgres(idempotencyKey: string) {
  const pool = await ensureDatabaseSchema();

  if (!pool) {
    return null;
  }

  const result = await pool.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM email_deliveries
        WHERE idempotency_key = $1
          AND status IN ('sent', 'stored')
      ) AS exists
    `,
    [idempotencyKey],
  );

  return Boolean(result.rows[0]?.exists);
}

export async function appendEmailDeliveryAttemptToPostgres(
  record: Omit<EmailDeliveryRecord, "createdAt" | "id">,
) {
  const pool = await ensureDatabaseSchema();

  if (!pool) {
    return null;
  }

  const deliveryRecord: EmailDeliveryRecord = {
    id: `email_${randomUUID()}`,
    createdAt: new Date().toISOString(),
    ...record,
  };

  await pool.query(
    `
      INSERT INTO email_deliveries (
        id, kind, idempotency_key, booking_id, from_email, reply_to, to_emails, subject,
        text_body, html_body, provider, status, created_at, sent_at, provider_message_id, error
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `,
    [
      deliveryRecord.id,
      deliveryRecord.kind,
      deliveryRecord.idempotencyKey,
      deliveryRecord.bookingId,
      deliveryRecord.from,
      deliveryRecord.replyTo ?? null,
      JSON.stringify(deliveryRecord.to),
      deliveryRecord.subject,
      deliveryRecord.text,
      deliveryRecord.html,
      deliveryRecord.provider,
      deliveryRecord.status,
      deliveryRecord.createdAt,
      deliveryRecord.sentAt ?? null,
      deliveryRecord.providerMessageId ?? null,
      deliveryRecord.error ?? null,
    ],
  );

  return deliveryRecord;
}
