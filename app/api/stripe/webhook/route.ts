import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  fulfillPaidCheckoutSession,
  markUnpaidCheckoutSessionClosed,
} from "@/lib/booking/fulfillment";
import { getStripe } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getWebhookSecret() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET.");
  }

  return webhookSecret;
}

async function handleCheckoutSessionEvent(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      if (session.payment_status === "paid") {
        await fulfillPaidCheckoutSession(session);
      }
      break;
    case "checkout.session.expired":
      await markUnpaidCheckoutSessionClosed(session, "Checkout Session expired.");
      break;
    case "checkout.session.async_payment_failed":
      await markUnpaidCheckoutSessionClosed(session, "Checkout payment failed.");
      break;
    default:
      break;
  }
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, getWebhookSecret());
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  await handleCheckoutSessionEvent(event);

  return NextResponse.json({ received: true });
}
