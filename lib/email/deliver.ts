import { getEmailProvider, getResendApiKey } from "@/lib/email/config";
import {
  appendEmailDeliveryAttempt,
  hasSuccessfulEmailDelivery,
} from "@/lib/email/localOutbox";
import type { EmailDeliveryRecord, EmailMessage } from "@/lib/email/types";

type ResendResponse = {
  id?: string;
  message?: string;
  name?: string;
};

let deliveryQueue: Promise<unknown> = Promise.resolve();

async function sendWithResend(message: EmailMessage) {
  const apiKey = getResendApiKey();

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from: message.from,
      html: message.html,
      reply_to: message.replyTo,
      subject: message.subject,
      text: message.text,
      to: message.to,
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": message.idempotencyKey,
    },
    method: "POST",
  });
  const payload = (await response.json().catch(() => ({}))) as ResendResponse;

  if (!response.ok) {
    throw new Error(payload.message ?? payload.name ?? "Resend email delivery failed.");
  }

  return payload.id;
}

export async function deliverEmailOnce(
  message: EmailMessage,
): Promise<EmailDeliveryRecord | null> {
  const queuedDelivery = deliveryQueue.then(async () => {
    if (await hasSuccessfulEmailDelivery(message.idempotencyKey)) {
      return null;
    }

    const provider = getEmailProvider();

    if (provider === "local") {
      return appendEmailDeliveryAttempt({
        ...message,
        provider,
        status: "stored",
      });
    }

    try {
      const providerMessageId = await sendWithResend(message);

      return appendEmailDeliveryAttempt({
        ...message,
        provider,
        providerMessageId,
        sentAt: new Date().toISOString(),
        status: "sent",
      });
    } catch (error) {
      return appendEmailDeliveryAttempt({
        ...message,
        error: error instanceof Error ? error.message : "Email delivery failed.",
        provider,
        status: "failed",
      });
    }
  });

  deliveryQueue = queuedDelivery.then(
    () => undefined,
    () => undefined,
  );

  return queuedDelivery;
}
