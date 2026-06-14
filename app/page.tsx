import Link from "next/link";
import { WorkshopCard } from "@/components/WorkshopCard";
import { studioLocation, workshops } from "@/lib/workshops";

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">Creative workshops in Eindhoven</p>
          <h1>
            Slow down.
            <span>Create with your hands.</span>
          </h1>
          <p>
            Calm, cozy workshops designed for connection, color, and mindful creativity at
            Ukiyo Studio.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/workshops">
              View workshops
            </Link>
            <Link className="button button-soft" href="#about">
              About the studio
            </Link>
          </div>
        </div>
      </section>

      <section className="intro-section" id="workshops">
        <div className="section-copy">
          <p className="eyebrow">Choose your moment</p>
          <h2>Creative workshops</h2>
          <p>
            Pick the format that fits your mood: a detailed mirror project, a playful charm bar,
            or the coming-soon tote bag session.
          </p>
        </div>
        <div className="workshop-grid">
          {workshops.map((workshop) => (
            <WorkshopCard key={workshop.slug} workshop={workshop} />
          ))}
        </div>
      </section>

      <section className="statement-section">
        <div className="statement-inner">
          <h2>Ukiyo is about living in the moment - detached from the worries of life.</h2>
          <p>
            At Ukiyo Studio, we create creative workshops that help you slow down, reconnect,
            and enjoy the beauty of making something with your hands.
          </p>
        </div>
      </section>

      <section className="studio-section" id="about">
        <div className="studio-image">
          <img src="/images/studio-group-workshop.jpeg" alt="A calm group workshop at Ukiyo Studio" />
        </div>
        <div className="studio-copy">
          <p className="eyebrow">The studio</p>
          <h2>Creative moments to slow down</h2>
          <p>
            Our workshops are designed as a space to pause, reconnect, and enjoy the simple
            pleasure of creating. No pressure, no perfection - just mindful creativity in a cozy
            and welcoming atmosphere.
          </p>
          <div className="feature-row">
            <div>
              <h3>Small groups</h3>
              <p>Personal attention in a calm setting.</p>
            </div>
            <div>
              <h3>Materials included</h3>
              <p>Everything you need is provided.</p>
            </div>
            <div>
              <h3>No experience needed</h3>
              <p>Everyone is welcome, just as you are.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="gallery-section" id="gallery">
        <div className="section-copy centered">
          <p className="eyebrow">Gallery</p>
          <h2>Custom charms, color, and playful details</h2>
        </div>
        <div className="gallery-grid">
          <img
            src="/images/gallery/charm-bar-keychains.jpg"
            alt="Colorful handmade charm bar keychains spelling Mommy Bag, Love Hateha, and Ukiyo Studio"
          />
          <img
            src="/images/gallery/charm-bar-bag-charm.jpg"
            alt="Colorful Mommy Bag charm with red letters attached to a woven brown bag"
          />
          <img
            src="/images/gallery/charm-bar-love-matcha.jpg"
            alt="Pastel green and pink Love Matcha charm with balloon dog and star details"
          />
        </div>
      </section>

      <section className="visit-section">
        <div>
          <p className="eyebrow">Location</p>
          <h2>Find us in Eindhoven</h2>
          <p>
            {studioLocation.name} is located at {studioLocation.street},{" "}
            {studioLocation.postalCity}.
          </p>
        </div>
        <a
          className="button button-primary"
          href={studioLocation.mapsUrl}
          rel="noreferrer"
          target="_blank"
        >
          Open in Google Maps
        </a>
      </section>
    </main>
  );
}
