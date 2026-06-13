import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expireStaleHolds } from "@/lib/booking/availability";
import type { BookingStoreData } from "@/lib/booking/types";
import { hasDatabaseConfig } from "@/lib/db/config";
import {
  readBookingStoreFromPostgres,
  updateBookingStoreInPostgres,
} from "@/lib/db/postgres";

const dataDirectory = path.join(process.cwd(), "data");
const seedStorePath = path.join(dataDirectory, "booking-seed.json");
const runtimeStorePath =
  process.env.BOOKING_STORE_PATH ?? path.join(dataDirectory, "booking-store.local.json");

let writeQueue: Promise<unknown> = Promise.resolve();

async function readJsonFile(filePath: string) {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as BookingStoreData;
}

async function writeJsonFile(filePath: string, data: BookingStoreData) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function loadStore() {
  try {
    return await readJsonFile(runtimeStorePath);
  } catch (error) {
    const seedStore = await readJsonFile(seedStorePath);
    await writeJsonFile(runtimeStorePath, seedStore);
    return seedStore;
  }
}

export async function readBookingStore(now = new Date()) {
  if (hasDatabaseConfig()) {
    const postgresStore = await readBookingStoreFromPostgres(now);

    if (postgresStore) {
      return postgresStore;
    }
  }

  const store = await loadStore();
  expireStaleHolds(store, now);
  return store;
}

export async function updateBookingStore<T>(
  operation: (store: BookingStoreData, now: Date) => T | Promise<T>,
) {
  if (hasDatabaseConfig()) {
    const postgresResult = await updateBookingStoreInPostgres(operation);

    if (postgresResult !== null) {
      return postgresResult;
    }
  }

  const queuedOperation = writeQueue.then(async () => {
    const now = new Date();
    const store = await loadStore();
    expireStaleHolds(store, now);
    const result = await operation(store, now);
    await writeJsonFile(runtimeStorePath, store);
    return result;
  });

  writeQueue = queuedOperation.then(
    () => undefined,
    () => undefined,
  );

  return queuedOperation;
}

export function createSlotId() {
  return `slot_${randomUUID()}`;
}

export function createBookingId() {
  return `booking_${randomUUID()}`;
}
