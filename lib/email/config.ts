import type { EmailProvider } from "@/lib/email/types";

function getTrimmedEnv(name: string) {
  const value = process.env[name]?.trim();

  return value || null;
}

export function getEmailProvider(): EmailProvider {
  const configuredProvider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();

  if (configuredProvider === "local") {
    return "local";
  }

  if (configuredProvider === "resend") {
    return "resend";
  }

  if (getResendApiKey()) {
    return "resend";
  }

  return "local";
}

export function getEmailFromAddress() {
  return getTrimmedEnv("EMAIL_FROM") || "Ukiyo Studio <bookings@ukiyostudioehv.nl>";
}

export function getBookingNotificationEmail() {
  return getTrimmedEnv("BOOKING_NOTIFICATION_EMAIL");
}

export function getResendApiKey() {
  return getTrimmedEnv("RESEND_API_KEY") || getTrimmedEnv("resend_api");
}
