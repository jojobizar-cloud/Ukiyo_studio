import Link from "next/link";
import { ContactNavButton } from "@/components/ContactNavButton";

export function Header() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Ukiyo Studio home">
        <img src="/images/ukiyo-logo.jpeg" alt="" className="brand-mark" />
        <span>Ukiyo Studio</span>
      </Link>
      <nav className="main-nav" aria-label="Main navigation">
        <Link href="/">Home</Link>
        <Link href="/workshops">Workshops</Link>
        <Link href="/workshops/foam-clay-mirror">Foam Clay</Link>
        <Link href="/#gallery">Gallery</Link>
        <Link href="/#about">About</Link>
        <ContactNavButton />
      </nav>
    </header>
  );
}
