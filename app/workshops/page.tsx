import type { Metadata } from "next";
import { WorkshopCard } from "@/components/WorkshopCard";
import { workshops } from "@/lib/workshops";

export const metadata: Metadata = {
  title: "Workshops",
  description:
    "Explore Ukiyo Studio creative workshops in Eindhoven, including Foam Clay Mirror, Charm Bar, and coming-soon tote bag workshops.",
};

export default function WorkshopsPage() {
  return (
    <main>
      <section className="page-hero compact-hero">
        <div>
          <p className="eyebrow">Workshops</p>
          <h1>Choose your creative session</h1>
          <p>
            Every workshop is built for small groups, mindful making, and a relaxed studio
            atmosphere in Eindhoven.
          </p>
        </div>
      </section>
      <section className="workshops-page-section">
        <div className="workshop-grid wide">
          {workshops.map((workshop) => (
            <WorkshopCard key={workshop.slug} workshop={workshop} />
          ))}
        </div>
      </section>
    </main>
  );
}
