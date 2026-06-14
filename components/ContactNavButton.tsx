"use client";

import type { ReactNode } from "react";

type ContactNavButtonProps = {
  children?: ReactNode;
  className?: string;
  intent?: "group-booking";
  message?: string;
  subject?: string;
  workshop?: string;
};

export function ContactNavButton({
  children = "Contact",
  className = "nav-contact-button",
  intent,
  message,
  subject,
  workshop,
}: ContactNavButtonProps) {
  function openContactForm() {
    window.dispatchEvent(
      new CustomEvent("ukiyo:open-contact", {
        detail: {
          intent,
          message,
          subject,
          workshop,
        },
      }),
    );
  }

  return (
    <button className={className} onClick={openContactForm} type="button">
      {children}
    </button>
  );
}
