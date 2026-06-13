import Link from "next/link";

export const dynamic = "force-dynamic";

export default function BookingCancelPage() {
  return (
    <main>
      <section className="page-hero compact-hero">
        <div>
          <p className="eyebrow">Booking cancelled</p>
          <h1>No payment was completed</h1>
          <p>
            No payment was completed. You can return to the workshops page and choose another date
            when you are ready.
          </p>
          <Link className="button button-primary" href="/workshops">
            View workshops
          </Link>
        </div>
      </section>
    </main>
  );
}
