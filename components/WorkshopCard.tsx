import Link from "next/link";
import { getWorkshopPriceLabel, type Workshop } from "@/lib/workshops";

type WorkshopCardProps = {
  workshop: Workshop;
};

export function WorkshopCard({ workshop }: WorkshopCardProps) {
  return (
    <article className={`workshop-card accent-${workshop.accent}`}>
      <Link href={`/workshops/${workshop.slug}`} className="workshop-card-link">
        <div className="workshop-image-wrap">
          <img src={workshop.image} alt={workshop.imageAlt} loading="lazy" decoding="async" />
          <span className="status-pill">{workshop.statusLabel}</span>
        </div>
        <div className="workshop-card-copy">
          <p className="eyebrow">{workshop.navTitle}</p>
          <div className="workshop-card-heading">
            <h3>{workshop.title}</h3>
            {workshop.subtitle ? <p className="workshop-card-subtitle">{workshop.subtitle}</p> : null}
          </div>
          <p>{workshop.cardDescription}</p>
          <div className="workshop-meta">
            <span>{getWorkshopPriceLabel(workshop)}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
