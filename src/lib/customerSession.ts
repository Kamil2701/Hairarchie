import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getCustomerById, type Customer } from "@/lib/customers";

const COOKIE_NAME = "hairarchie_customer";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function secret(): string {
  const value = process.env.CUSTOMER_SESSION_SECRET;
  if (!value) {
    throw new Error("CUSTOMER_SESSION_SECRET is not set. See .env.local.example.");
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

// Payload is "<customerId>.<expiresAt>" — a customer id (uuid) never
// contains a dot, so splitting the token on "." unambiguously recovers
// both fields.
function issueToken(customerId: string, expiresAt: number): string {
  const payload = `${customerId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [customerId, expiresAtRaw, signature] = parts;
  const payload = `${customerId}.${expiresAtRaw}`;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() >= expiresAt) return null;

  return customerId;
}

export async function createCustomerSession(customerId: string): Promise<void> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const store = await cookies();
  store.set(COOKIE_NAME, issueToken(customerId, expiresAt), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function getAuthenticatedCustomerId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : null;
}

export async function clearCustomerSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Resolves the logged-in customer, or null. A session token can be
 * cryptographically valid but point at a customer that no longer exists
 * (e.g. a leftover cookie from the in-memory dev store, from before
 * Supabase was connected) — that's treated as "not logged in" rather
 * than leaving a token that keeps bouncing between /konto and
 * /konto/login. Cookies can't be rewritten during a page render (only
 * in a Server Action/Route Handler), so the stale cookie itself is left
 * in place here — it stops mattering once its 30-day expiry passes, or
 * sooner if the browser logs out or logs back in, both of which do run
 * as Server Actions and overwrite/clear it there. */
export async function getAuthenticatedCustomer(): Promise<Customer | null> {
  const customerId = await getAuthenticatedCustomerId();
  if (!customerId) return null;

  return getCustomerById(customerId);
}
