import Link from "next/link";
import { siInstagram } from "simple-icons";
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
        <a
          className="instagram-link"
          href="https://www.instagram.com/ukiyostudio_ehv/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Ukiyo Studio on Instagram (opens in a new tab)"
          title="Follow @ukiyostudio_ehv on Instagram"
        >
          <span className="instagram-icon">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d={siInstagram.path} />
            </svg>
          </span>
          <span className="instagram-label">Instagram</span>
        </a>
      </nav>
    </header>
  );
}
