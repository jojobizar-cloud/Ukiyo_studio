"use client";

import { FormEvent, useEffect, useState } from "react";

type ContactFormState = {
  email: string;
  message: string;
  name: string;
  subject: string;
  workshop: string;
};

const initialFormState: ContactFormState = {
  email: "",
  message: "",
  name: "",
  subject: "",
  workshop: "",
};

export function ContactFormLauncher() {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<ContactFormState>(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function openContactForm() {
      setIsOpen(true);
    }

    window.addEventListener("ukiyo:open-contact", openContactForm);
    return () => window.removeEventListener("ukiyo:open-contact", openContactForm);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  function updateForm(update: Partial<ContactFormState>) {
    setForm((current) => ({ ...current, ...update }));
  }

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    setError(null);

    try {
      const response = await fetch("/api/contact", {
        body: JSON.stringify(form),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not send your message.");
      }

      setForm(initialFormState);
      setStatus("Message sent. We will reply by email.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not send your message.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {isOpen ? (
        <div className="contact-modal" role="dialog" aria-modal="true" aria-labelledby="contact-title">
          <button
            className="contact-modal-backdrop"
            aria-label="Close contact form"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <section className="contact-panel">
            <div className="contact-panel-header">
              <div>
                <p className="eyebrow">Contact</p>
                <h2 id="contact-title">Send Ukiyo Studio a message</h2>
              </div>
              <button
                aria-label="Close contact form"
                className="contact-close-button"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                x
              </button>
            </div>
            <form className="contact-form" onSubmit={submitContact}>
              <label>
                Name
                <input
                  autoComplete="name"
                  onChange={(event) => updateForm({ name: event.target.value })}
                  type="text"
                  value={form.name}
                />
              </label>
              <label>
                Email
                <input
                  autoComplete="email"
                  onChange={(event) => updateForm({ email: event.target.value })}
                  required
                  type="email"
                  value={form.email}
                />
              </label>
              <label>
                Workshop or topic
                <select
                  onChange={(event) => updateForm({ workshop: event.target.value })}
                  value={form.workshop}
                >
                  <option value="">General question</option>
                  <option value="Foam Clay Mirror Workshop">Foam Clay Mirror Workshop</option>
                  <option value="Charm Bar Experience">Charm Bar Experience</option>
                  <option value="Paint a Tote Bag">Paint a Tote Bag</option>
                  <option value="Private group or event">Private group or event</option>
                </select>
              </label>
              <label>
                Subject
                <input
                  onChange={(event) => updateForm({ subject: event.target.value })}
                  placeholder="Booking question, private workshop, collaboration..."
                  type="text"
                  value={form.subject}
                />
              </label>
              <label>
                Message
                <textarea
                  onChange={(event) => updateForm({ message: event.target.value })}
                  required
                  rows={6}
                  value={form.message}
                />
              </label>
              {status ? <div className="contact-message is-success">{status}</div> : null}
              {error ? <div className="contact-message is-error">{error}</div> : null}
              <button className="button button-primary full-width" disabled={submitting} type="submit">
                {submitting ? "Sending..." : "Send message"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
