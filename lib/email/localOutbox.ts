import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hasDatabaseConfig } from "@/lib/db/config";
import {
  appendEmailDeliveryAttemptToPostgres,
  hasSuccessfulEmailDeliveryInPostgres,
  readEmailOutboxFromPostgres,
} from "@/lib/db/postgres";
import type { EmailDeliveryRecord } from "@/lib/email/types";

const dataDirectory = path.join(process.cwd(), "data");
const emailOutboxPath =
  process.env.EMAIL_OUTBOX_PATH ?? path.join(dataDirectory, "email-outbox.local.json");

let writeQueue: Promise<unknown> = Promise.resolve();

async function readOutboxFile() {
  try {
    const content = await readFile(emailOutboxPath, "utf8");
    return JSON.parse(content) as EmailDeliveryRecord[];
  } catch {
    return [];
  }
}

async function writeOutboxFile(records: EmailDeliveryRecord[]) {
  await mkdir(path.dirname(emailOutboxPath), { recursive: true });
  await writeFile(emailOutboxPath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
}

export async function readEmailOutbox() {
  if (hasDatabaseConfig()) {
    const postgresRecords = await readEmailOutboxFromPostgres();

    if (postgresRecords) {
      return postgresRecords;
    }
  }

  return readOutboxFile();
}

export async function hasSuccessfulEmailDelivery(idempotencyKey: string) {
  if (hasDatabaseConfig()) {
    const postgresResult = await hasSuccessfulEmailDeliveryInPostgres(idempotencyKey);

    if (postgresResult !== null) {
      return postgresResult;
    }
  }

  const records = await readEmailOutbox();

  return records.some(
    (record) =>
      record.idempotencyKey === idempotencyKey &&
      (record.status === "sent" || record.status === "stored"),
  );
}

export async function appendEmailDeliveryAttempt(
  record: Omit<EmailDeliveryRecord, "createdAt" | "id">,
) {
  if (hasDatabaseConfig()) {
    const postgresRecord = await appendEmailDeliveryAttemptToPostgres(record);

    if (postgresRecord) {
      return postgresRecord;
    }
  }

  const queuedOperation = writeQueue.then(async () => {
    const records = await readOutboxFile();
    const deliveryRecord: EmailDeliveryRecord = {
      id: `email_${randomUUID()}`,
      createdAt: new Date().toISOString(),
      ...record,
    };

    records.push(deliveryRecord);
    await writeOutboxFile(records);
    return deliveryRecord;
  });

  writeQueue = queuedOperation.then(
    () => undefined,
    () => undefined,
  );

  return queuedOperation;
}
