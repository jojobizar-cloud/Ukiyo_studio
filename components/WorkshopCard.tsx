import Link from "next/link";
import type { Workshop } from "@/lib/workshops";

type WorkshopCardProps = {
  workshop: Workshop;
};

export function WorkshopCard({ workshop }: WorkshopCardProps) {
  return (
    <article className={`workshop-card accent-${workshop.accent}`}>
      <Link href={`/workshops/${workshop.slug}`} className="workshop-card-link">
        <div className="workshop-image-wrap">
          <img src={workshop.image} alt={workshop.imageAlt} />
          <span className="status-pill">{workshop.statusLabel}</span>
        </div>
        <div className="workshop-card-copy">
          <p className="eyebrow">{workshop.navTitle}</p>
          <h3>{workshop.title}</h3>
          <p>{workshop.shortDescription}</p>
          <div className="workshop-meta">
            <span>{workshop.priceLabel}</span>
            <span>{workshop.capacityLabel}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
