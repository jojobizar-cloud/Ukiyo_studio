import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: {
    follow: false,
    index: false,
  },
};

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-panel">
        <p className="eyebrow">Ukiyo Studio</p>
        <h1>Admin login</h1>
        <p>Manage workshop dates, capacity, and booking insights.</p>
        <AdminLoginForm isConfigured={isAdminConfigured()} />
      </section>
    </main>
  );
}
