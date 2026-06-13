export type EmailKind = "booking-confirmation" | "contact-message" | "owner-booking-notification";
export type EmailProvider = "local" | "resend";
export type EmailDeliveryStatus = "stored" | "sent" | "failed";

export type EmailMessage = {
  kind: EmailKind;
  idempotencyKey: string;
  bookingId: string;
  from: string;
  replyTo?: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
};

export type EmailDeliveryRecord = EmailMessage & {
  id: string;
  provider: EmailProvider;
  status: EmailDeliveryStatus;
  createdAt: string;
  sentAt?: string;
  providerMessageId?: string;
  error?: string;
};
