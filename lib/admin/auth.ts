import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ADMIN_COOKIE_NAME = "ukiyo_admin_session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD?.trim() ?? "";
}

function getSessionSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.STRIPE_SECRET_KEY?.trim() ||
    getAdminPassword()
  );
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function isAdminConfigured() {
  return getAdminPassword().length > 0;
}

export function verifyAdminPassword(candidate: string) {
  const password = getAdminPassword();

  if (!password || !candidate) {
    return false;
  }

  return safeCompare(candidate, password);
}

export function createAdminSessionToken() {
  const password = getAdminPassword();
  const secret = getSessionSecret();

  if (!password || !secret) {
    return null;
  }

  return createHmac("sha256", secret).update(`ukiyo-admin:${password}`).digest("hex");
}

export async function isAdminAuthenticated() {
  const expectedToken = createAdminSessionToken();

  if (!expectedToken) {
    return false;
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  return Boolean(cookieToken && safeCompare(cookieToken, expectedToken));
}

export async function setAdminSessionCookie() {
  const token = createAdminSessionToken();

  if (!token) {
    throw new Error("Admin password is not configured.");
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
}
