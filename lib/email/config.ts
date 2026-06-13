import type { EmailProvider } from "@/lib/email/types";

export function getEmailProvider(): EmailProvider {
  const configuredProvider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();

  if (configuredProvider === "resend") {
    return "resend";
  }

  if (process.env.RESEND_API_KEY?.trim()) {
    return "resend";
  }

  return "local";
}

export function getEmailFromAddress() {
  return process.env.EMAIL_FROM?.trim() || "Ukiyo Studio <bookings@ukiyostudioehv.nl>";
}

export function getBookingNotificationEmail() {
  return process.env.BOOKING_NOTIFICATION_EMAIL?.trim() || null;
}

export function getResendApiKey() {
  return process.env.RESEND_API_KEY?.trim() || null;
}
