# Ukiyo Studio Website

Ukiyo Studio website rebuild with a polished responsive frontend, Stripe Checkout,
admin tools, contact form handling, and Neon/Postgres-backed booking storage.

## Local Development

```bash
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000`.

## Booking System

The booking flow includes:

- Calendar date selection.
- Seat quantity selection.
- Slot capacity checks on the server.
- Direct Stripe Checkout without a visible seat-hold step.

Seed dates live in `data/booking-seed.json`. In production, booking data is stored
in Neon/Postgres when `DATABASE_URL`, `POSTGRES_URL`, `NEON_DATABASE_URL`, or
`NEON_PASSWORD` is configured. Without a database environment variable, local
runtime booking data falls back to `data/booking-store.local.json`, which is
intentionally ignored by Git.

## Stripe Checkout

Phase 3 includes Stripe Checkout session creation, success/cancel pages, and a signed webhook endpoint.

Required local environment variables:

```bash
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_RK=rk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
ADMIN_PASSWORD=choose-a-private-password
```

Database environment variables:

```bash
DATABASE_URL=postgresql://...
```

If `DATABASE_URL` is not set, this project can also use `NEON_PASSWORD` together
with the default Ukiyo Studio Neon host/database/user values. See `.env.example`
for the full safe template.

Optional email environment variables:

```bash
EMAIL_PROVIDER=local
EMAIL_FROM="Ukiyo Studio <bookings@ukiyostudioehv.nl>"
BOOKING_NOTIFICATION_EMAIL=your-owner-email@example.com
CONTACT_TO_EMAIL=ukiyostudioehv@outlook.com
RESEND_API_KEY=re_...
```

Use `EMAIL_PROVIDER=local` during development. Local email previews are written to `data/email-outbox.local.json`, which is ignored by Git.

Use `EMAIL_PROVIDER=resend` with `RESEND_API_KEY` after the sender domain is verified in Resend.

Webhook endpoint:

```text
/api/stripe/webhook
```

Recommended subscribed events:

- `checkout.session.completed`
- `checkout.session.expired`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`

Dashboard webhooks require a public URL. For local webhook testing, use the Stripe CLI to forward events to `localhost:3000/api/stripe/webhook`. The success page also verifies paid Checkout Sessions directly, which keeps local testing usable without the CLI.

## Admin Tools

Phase 4 adds a password-protected admin area:

```text
/admin
```

Use the `ADMIN_PASSWORD` value from `.env.local` to log in locally. The admin area can:

- Create new workshop slots in the Europe/Amsterdam timezone.
- Open or close existing slots.
- Adjust slot capacity and price.
- View paid bookings, booked seats, email status, and revenue.
- Mark paid bookings as refunded/cancelled for admin records and CSV exports.
- Keep closed slots in a separate archive section.
- Export bookings as CSV.

## Confirmation Emails

Phase 5 adds transactional email handling after a paid booking is fulfilled:

- Customer booking confirmation email when Stripe provides a customer email.
- Owner notification email when `BOOKING_NOTIFICATION_EMAIL` is set.
- Website contact form messages to `ukiyostudioehv@outlook.com`.
- Idempotency keys so repeated Stripe webhooks or success-page refreshes do not duplicate successful emails.
- Local outbox fallback for development and provider setup.
- Email delivery status in the admin dashboard.

## Deployment

Recommended deployment stack:

- GitHub: source repository.
- Neon: persistent Postgres database for slots, bookings, and email delivery logs.
- Vercel: Next.js hosting and serverless API routes.
- Stripe Dashboard webhook: points to the deployed Vercel URL.

After the first Vercel deployment, set these environment variables in Vercel:

```bash
NEXT_PUBLIC_SITE_URL=https://www.ukiyostudioehv.nl
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_RK=rk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
ADMIN_PASSWORD=choose-a-private-password
DATABASE_URL=postgresql://...
EMAIL_PROVIDER=local
EMAIL_FROM="Ukiyo Studio <bookings@ukiyostudioehv.nl>"
BOOKING_NOTIFICATION_EMAIL=ukiyostudioehv@outlook.com
CONTACT_TO_EMAIL=ukiyostudioehv@outlook.com
```

For Stripe webhooks on Vercel, create or update the Stripe event destination URL
to:

```text
https://www.ukiyostudioehv.nl/api/stripe/webhook
```

Keep using Stripe test mode while playtesting. When switching to real payments,
replace the Stripe keys and webhook secret with live-mode values.
