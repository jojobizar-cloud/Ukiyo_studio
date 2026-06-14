import Link from "next/link";
import { ContactNavButton } from "@/components/ContactNavButton";

export function Header() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Ukiyo Studio home">
        <span>Ukiyo Studio</span>
      </Link>
      <nav className="main-nav" aria-label="Main navigation">
        <Link href="/">Home</Link>
        <Link href="/workshops">Workshops</Link>
        <Link href="/#gallery">Gallery</Link>
        <Link href="/#about">About</Link>
        <ContactNavButton
          intent="group-booking"
          subject="Private group booking request"
          workshop="Private group or event"
          message="Tell us your occasion, preferred workshop, group size, preferred date, and anything else we should know."
        >
          Group bookings
        </ContactNavButton>
        <ContactNavButton />
      </nav>
    </header>
  );
}
