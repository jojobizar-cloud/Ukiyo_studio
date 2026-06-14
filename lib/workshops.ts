export type WorkshopStatus = "bookable" | "coming-soon";

export type Workshop = {
  slug: string;
  title: string;
  navTitle: string;
  tagline: string;
  cardDescription: string;
  shortDescription: string;
  longDescription: string;
  priceLabel: string;
  durationLabel: string;
  capacityLabel: string;
  status: WorkshopStatus;
  statusLabel: string;
  image: string;
  imageAlt: string;
  accent: string;
  includes: string[];
  goodFor: string[];
  bookingNote: string;
};

export const studioLocation = {
  name: "Ukiyo Studio",
  street: "Kronehoefstraat 85",
  postalCity: "5612HL Eindhoven",
  country: "The Netherlands",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Ukiyo%20Studio%20Kronehoefstraat%2085%205612HL%20Eindhoven",
  kvk: "91301211",
  vat: "NL865610575B01",
};

export const workshops: Workshop[] = [
  {
    slug: "foam-clay-mirror",
    title: "Foam Clay Mirror Workshop",
    navTitle: "Foam Clay",
    tagline: "Decorate a mirror with soft clay flowers, shapes, and color.",
    cardDescription:
      "Transform a plain mirror into a one-of-a-kind piece using soft foam clay, colorful details, and your own creative touch.",
    shortDescription:
      "A slow, tactile workshop where you decorate your own mirror with lightweight foam clay details.",
    longDescription:
      "Create a playful mirror with soft clay florals, textures, and color combinations that feel personal to you. The session is designed to be calm and beginner friendly, with guidance, examples, and all materials prepared before you arrive.",
    priceLabel: "EUR 40 per person",
    durationLabel: "2.5 hours",
    capacityLabel: "Max 10 people",
    status: "bookable",
    statusLabel: "Book a date",
    image: "/images/foam-clay-mirror.jpeg",
    imageAlt: "Colorful foam clay mirrors with soft clay packets and floral details",
    accent: "clay",
    includes: [
      "Mirror base and foam clay materials",
      "Use of studio tools and color palettes",
      "Step-by-step creative guidance",
      "Your finished mirror to take home",
    ],
    goodFor: ["Solo creative time", "Friends", "Birthdays", "Small group outings"],
    bookingNote:
      "Select an available date, choose the number of seats, and continue to secure checkout.",
  },
  {
    slug: "charm-bar",
    title: "Charm Bar Experience",
    navTitle: "Charm Bar",
    tagline: "Build a colorful custom bag charm with beads, letters, and playful details.",
    cardDescription:
      "Create your own keychain, bag charm, or phone strap using our selection of charms.",
    shortDescription:
      "Choose from a curated charm bar and design a sweet, personal accessory in a relaxed studio setting.",
    longDescription:
      "Mix letters, colors, beads, clips, cords, and tiny details to create a bag charm that feels completely yours. The format is easy to join, social, and ideal for a lighter creative session.",
    priceLabel: "EUR 15 per person",
    durationLabel: "90 minutes",
    capacityLabel: "Max 10 people",
    status: "bookable",
    statusLabel: "Book a date",
    image: "/images/charm-bar.jpeg",
    imageAlt: "Colorful handmade charm bar materials and bag charm",
    accent: "charm",
    includes: [
      "Charm bar access with beads, cords, letters, and clips",
      "Help with combinations and finishing",
      "One custom bag charm to take home",
      "A cozy table setup for small groups",
    ],
    goodFor: ["Quick creative plans", "Friend dates", "Teens and adults", "Gifts"],
    bookingNote:
      "Select an available date, choose the number of seats, and continue to secure checkout.",
  },
  {
    slug: "paint-a-tote-bag",
    title: "Paint a Tote Bag",
    navTitle: "Tote Bag",
    tagline: "A new textile workshop for painting your own everyday tote.",
    cardDescription:
      "Turn a blank tote bag into something uniquely yours using fabric pens, with the freedom to create your own design or use one of our templates.",
    shortDescription:
      "A coming-soon session for creating a reusable tote bag with your own painted design.",
    longDescription:
      "This workshop is being prepared as the next Ukiyo Studio format. The page is live so visitors can discover what is coming, while booking remains closed until the details are final.",
    priceLabel: "Coming soon",
    durationLabel: "Coming soon",
    capacityLabel: "Coming soon",
    status: "coming-soon",
    statusLabel: "Coming soon",
    image: "/images/tote-bag.jpeg",
    imageAlt: "Hands painting floral details on a canvas tote bag with fabric markers",
    accent: "tote",
    includes: [
      "Reusable tote bag",
      "Textile paints and tools",
      "Design inspiration",
      "Finished tote to take home",
    ],
    goodFor: ["Creative afternoons", "Friends", "Beginners", "Personal gifts"],
    bookingNote:
      "This workshop is not open for booking yet. It can be activated in Phase 2 once the details are final.",
  },
];

export function getWorkshop(slug: string) {
  return workshops.find((workshop) => workshop.slug === slug);
}
