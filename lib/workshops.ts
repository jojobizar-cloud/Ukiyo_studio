export type WorkshopStatus = "bookable" | "coming-soon";

export type Workshop = {
  slug: string;
  title: string;
  subtitle?: string;
  navTitle: string;
  tagline: string;
  cardDescription: string;
  shortDescription: string;
  longDescription: string;
  priceCents: number;
  durationLabel: string;
  durationMinutes: number;
  capacity: number;
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
    slug: "halloween-edition",
    title: "Halloween edition",
    subtitle: "Soft clay mirror workshop",
    navTitle: "Halloween special",
    tagline:
      "Decorate a mirror with soft clay and spooky details like pumpkins, ghosts, cats and witch hats. A playful Halloween edition with snacks and Pumpkin Spice Latte included.",
    cardDescription:
      "Decorate a mirror with soft clay and spooky details like pumpkins, ghosts, cats and witch hats. A playful Halloween edition with snacks and Pumpkin Spice Latte included.",
    shortDescription:
      "A Halloween soft clay mirror workshop in Eindhoven, with spooky decorations, snacks and Pumpkin Spice Latte included. EUR 45 per person.",
    longDescription:
      "Give your mirror a playful Halloween makeover with soft foam clay. Shape pumpkins, friendly ghosts, cats and witch hats, then arrange them around your mirror in your own style. We will guide you through the techniques and help bring your ideas to life. Settle in with snacks and a Pumpkin Spice Latte while you create a seasonal piece to take home. No experience is needed, and all materials are included.",
    priceCents: 4500,
    durationLabel: "2 hours",
    durationMinutes: 120,
    capacity: 10,
    status: "bookable",
    statusLabel: "Book a date",
    image: "/images/halloween-clay-mirror.jpg",
    imageAlt:
      "Halloween mirror decorated with soft clay pumpkins, ghosts, black cats and witch hats",
    accent: "halloween",
    includes: [
      "Mirror base, soft foam clay and studio tools",
      "Halloween inspiration and step-by-step guidance",
      "Snacks and a Pumpkin Spice Latte",
      "Your finished Halloween mirror to take home",
    ],
    goodFor: ["A seasonal creative afternoon", "Friends", "Solo creative time", "Halloween lovers"],
    bookingNote:
      "Select an available date, choose the number of seats, and continue to secure checkout.",
  },
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
    priceCents: 4000,
    durationLabel: "2 hours",
    durationMinutes: 120,
    capacity: 10,
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
    priceCents: 1500,
    durationLabel: "30-45 minutes",
    durationMinutes: 45,
    capacity: 10,
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
];

export function getWorkshopPriceLabel(workshop: Workshop) {
  const price = new Intl.NumberFormat("en-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(workshop.priceCents / 100);

  return `${price} per person`;
}

export function getWorkshop(slug: string) {
  return workshops.find((workshop) => workshop.slug === slug);
}
