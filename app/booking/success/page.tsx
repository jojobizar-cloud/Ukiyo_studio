import Link from "next/link";
import { getSlotAvailability } from "@/lib/booking/availability";
import { fulfillPaidCheckoutSession } from "@/lib/booking/fulfillment";
import { readBookingStore } from "@/lib/booking/localStore";
import { getStripe } from "@/lib/stripe/server";
import { getWorkshop, studioLocation } from "@/lib/workshops";

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
  let resultState: "confirmed" | "pending" | "attention" = "pending";
  let bookingDetails:
    | {
        workshopTitle: string;
        dateLabel: string;
        timeLabel: string;
        seats: number;
        email: string | null;
      }
    | undefined;

  if (sessionId) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);

      if (session.payment_status === "paid") {
        const result = await fulfillPaidCheckoutSession(session);
        if (result.ok) {
          bookingId = result.bookingId;
          title = "Your workshop is booked";
          message = "Your seats are confirmed. We look forward to welcoming you at Ukiyo Studio.";
          resultState = "confirmed";

          if (bookingId) {
            const store = await readBookingStore();
            const booking = store.bookings.find((candidate) => candidate.id === bookingId);
            const slot = booking
              ? store.slots.find((candidate) => candidate.id === booking.slotId)
              : undefined;

            if (booking && slot) {
              const availability = getSlotAvailability(store, slot, new Date());
              bookingDetails = {
                workshopTitle: getWorkshop(slot.workshopSlug)?.title ?? slot.workshopSlug,
                dateLabel: availability.dateLabel,
                timeLabel: availability.timeLabel,
                seats: booking.seats,
                email: booking.customerEmail ?? null,
              };
            }
          }
        } else {
          title = "Payment received";
          message = `${result.message} Please contact Ukiyo Studio so we can help you resolve this payment.`;
          resultState = "attention";
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
      resultState = "attention";
    }
  }

  return (
    <main className="booking-result-page">
      <section className={`booking-result booking-result-${resultState}`}>
        <div className="booking-result-copy">
          <div className="booking-result-status">
            <span className="booking-result-status-icon" aria-hidden="true" />
            <p className="eyebrow">
              {resultState === "confirmed"
                ? "Booking confirmed"
                : resultState === "attention"
                  ? "Booking needs attention"
                  : "Booking update"}
            </p>
          </div>
          <h1>{title}</h1>
          <p className="booking-result-message">{message}</p>

          {bookingDetails ? (
            <dl className="booking-result-details">
              <div>
                <dt>Workshop</dt>
                <dd>{bookingDetails.workshopTitle}</dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>{bookingDetails.dateLabel}</dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>{bookingDetails.timeLabel}</dd>
              </div>
              <div>
                <dt>Guests</dt>
                <dd>{bookingDetails.seats}</dd>
              </div>
            </dl>
          ) : null}

          {bookingId ? (
            <div className="booking-reference">
              <span>Booking reference</span>
              <code>{bookingId}</code>
            </div>
          ) : null}

          {bookingDetails?.email ? (
            <p className="booking-result-email">
              Confirmation details will be sent to <strong>{bookingDetails.email}</strong>.
            </p>
          ) : null}

          <div className="booking-result-actions">
            <Link className="button button-primary" href="/workshops">
              View workshops
            </Link>
            <a
              className="button button-soft"
              href={studioLocation.mapsUrl}
              rel="noreferrer"
              target="_blank"
            >
              Get directions
            </a>
          </div>
        </div>

        <div className="booking-result-media">
          <img
            src="/images/studio-group-workshop.jpeg"
            alt="A relaxed creative workshop around the table at Ukiyo Studio"
          />
          <div className="booking-result-location">
            <p className="eyebrow">See you at the studio</p>
            <p>{studioLocation.street}</p>
            <p>{studioLocation.postalCity}</p>
            <div className="booking-result-arrival">
              <h2>Getting to the studio</h2>
              <p>Ukiyo Studio is located inside a shared business building.</p>
              <p>
                At the entrance, use the private arrival contact details in your confirmation
                email. We will unlock the door remotely for you.
              </p>
              <p>Take the stairs or elevator to the first floor. We will meet you there.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
