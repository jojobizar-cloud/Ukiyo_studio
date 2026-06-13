import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ContactFormLauncher } from "@/components/ContactFormLauncher";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Ukiyo Studio | Creative Workshops in Eindhoven",
    template: "%s | Ukiyo Studio",
  },
  description:
    "Creative workshops in Eindhoven for calm, connection, and mindful making. Join Foam Clay Mirror workshops, the Charm Bar Experience, and coming-soon tote bag sessions.",
  metadataBase: new URL("https://www.ukiyostudioehv.nl"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <Header />
        {children}
        <Footer />
        <ContactFormLauncher />
      </body>
    </html>
  );
}
