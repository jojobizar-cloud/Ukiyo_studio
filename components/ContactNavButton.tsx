"use client";

export function ContactNavButton() {
  return (
    <button
      className="nav-contact-button"
      onClick={() => window.dispatchEvent(new Event("ukiyo:open-contact"))}
      type="button"
    >
      Contact
    </button>
  );
}
