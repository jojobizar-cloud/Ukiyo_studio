import Link from "next/link";
import { studioLocation } from "@/lib/workshops";

export function Footer() {
  return (
    <footer className="site-footer" id="contact">
      <div>
        <p className="eyebrow">Visit the studio</p>
        <h2>{studioLocation.name}</h2>
        <a
          className="footer-address-link"
          href={studioLocation.mapsUrl}
          rel="noreferrer"
          target="_blank"
        >
          {studioLocation.street}
          <br />
          {studioLocation.postalCity}
          <br />
          {studioLocation.country}
        </a>
      </div>
      <div>
        <p className="eyebrow">Workshops</p>
        <Link href="/workshops/foam-clay-mirror">Foam Clay Mirror Workshop</Link>
        <Link href="/workshops/charm-bar">Charm Bar Experience</Link>
        <Link href="/workshops/paint-a-tote-bag">Paint a Tote Bag</Link>
      </div>
      <div>
        <p className="eyebrow">Practical</p>
        <p>Refund possible when cancelled at least 48 hours before the workshop.</p>
        <p>
          KVK {studioLocation.kvk}
          <br />
          VAT {studioLocation.vat}
        </p>
      </div>
    </footer>
  );
}
