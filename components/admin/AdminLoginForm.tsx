"use client";

import { FormEvent, useState } from "react";

type AdminLoginFormProps = {
  isConfigured: boolean;
};

export function AdminLoginForm({ isConfigured }: AdminLoginFormProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isConfigured) {
      setError("ADMIN_PASSWORD is missing in .env.local.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        body: JSON.stringify({ password }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not log in.");
      }

      window.location.assign("/admin");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Could not log in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="admin-login-form" onSubmit={submitLogin}>
      <label>
        Admin password
        <input
          autoComplete="current-password"
          disabled={!isConfigured || submitting}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
      {error ? <div className="admin-message is-error">{error}</div> : null}
      {!isConfigured ? (
        <div className="admin-message is-error">Add ADMIN_PASSWORD to .env.local first.</div>
      ) : null}
      <button className="button button-primary" disabled={!isConfigured || submitting} type="submit">
        {submitting ? "Logging in..." : "Log in"}
      </button>
    </form>
  );
}
