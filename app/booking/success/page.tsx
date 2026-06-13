import Link from "next/link";
import { fulfillPaidCheckoutSession } from "@/lib/booking/fulfillment";
import { getStripe } from "@/lib/stripe/server";

type BookingSuccessPageProps = {
  searchParams: Promise<{
    session_id?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function BookingSuccessPage({ searchParams }: BookingSuccessPageProps) {
  const { session_id: sessionId } = await searchParams;
  let title = "Payment received";
  let message =
    "Thank you. Your payment is being matched to your workshop booking. You will receive a confirmation after processing.";
  let bookingId: string | undefined;

  if (sessionId) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);

      if (session.payment_status === "paid") {
        const result = await fulfillPaidCheckoutSession(session);
        if (result.ok) {
          bookingId = result.bookingId;
          title = "Your workshop is booked";
          message =
            "Your seats are confirmed. If Stripe provided your email address, a confirmation email has been prepared.";
        } else {
          title = "Payment received";
          message = `${result.message} Please contact Ukiyo Studio so we can help you resolve this payment.`;
        }
      } else {
        title = "Payment is processing";
        message =
          "Stripe has not marked this payment as paid yet. If this does not update shortly, check the Stripe Dashboard.";
      }
    } catch {
      title = "We could not verify the payment yet";
      message =
        "Stripe redirected back successfully, but this local app could not retrieve the session. Check the Stripe Dashboard and webhook logs.";
    }
  }

  return (
    <main>
      <section className="page-hero compact-hero">
        <div>
          <p className="eyebrow">Booking</p>
          <h1>{title}</h1>
          <p>{message}</p>
          {bookingId ? <p className="booking-reference">Booking reference: {bookingId}</p> : null}
          <Link className="button button-primary" href="/workshops">
            Back to workshops
          </Link>
        </div>
      </section>
    </main>
  );
}
