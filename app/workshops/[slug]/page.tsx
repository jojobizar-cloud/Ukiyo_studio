import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingCalendar } from "@/components/BookingCalendar";
import { getWorkshop, studioLocation, workshops } from "@/lib/workshops";

type WorkshopPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return workshops.map((workshop) => ({
    slug: workshop.slug,
  }));
}

export async function generateMetadata({ params }: WorkshopPageProps): Promise<Metadata> {
  const { slug } = await params;
  const workshop = getWorkshop(slug);

  if (!workshop) {
    return {
      title: "Workshop not found",
    };
  }

  return {
    title: workshop.title,
    description: workshop.shortDescription,
  };
}

export default async function WorkshopDetailPage({ params }: WorkshopPageProps) {
  const { slug } = await params;
  const workshop = getWorkshop(slug);

  if (!workshop) {
    notFound();
  }

  return (
    <main>
      <section className={`workshop-detail-hero accent-${workshop.accent}`}>
        <div className="detail-hero-copy">
          <p className="eyebrow">{workshop.statusLabel}</p>
          <h1>{workshop.title}</h1>
          <p>{workshop.tagline}</p>
          <div className="detail-meta">
            <span>{workshop.priceLabel}</span>
            <span>{workshop.capacityLabel}</span>
            <span>{workshop.durationLabel}</span>
          </div>
        </div>
        <div className="detail-hero-image">
          <img src={workshop.image} alt={workshop.imageAlt} />
        </div>
      </section>

      <section className="detail-content">
        <article className="detail-main">
          <p className="eyebrow">What to expect</p>
          <h2>A relaxed creative workshop at Ukiyo Studio</h2>
          <p>{workshop.longDescription}</p>
          <div className="split-list">
            <div>
              <h3>Included</h3>
              <ul>
                {workshop.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Good for</h3>
              <ul>
                {workshop.goodFor.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </article>

        <BookingCalendar workshopSlug={workshop.slug} workshopStatus={workshop.status} />
      </section>

      <section className="visit-section detail-visit">
        <div>
          <p className="eyebrow">Location</p>
          <h2>{studioLocation.name}</h2>
          <p>
            {studioLocation.street}, {studioLocation.postalCity}. Refund possible when cancelled at
            least 48 hours before the workshop.
          </p>
        </div>
      </section>
    </main>
  );
}
