import "server-only";
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase";

export type Customer = {
  id: string;
  email: string;
  name: string;
  phone: string;
  passwordHash: string | null;
  createdAt: string;
};

export type PointsTransaction = {
  id: string;
  customerId: string;
  bookingId: string | null;
  points: number;
  reason: string;
  createdAt: string;
};

// Same in-memory dev fallback pattern as bookings.ts / blocks.ts.
const devCustomers: Customer[] = [];
const devPointsTransactions: PointsTransaction[] = [];

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const candidate = scryptSync(password, salt, expected.length);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

/** 10 points per €1, standard (half-up) rounding. */
export function pointsForPriceCents(priceCents: number): number {
  return Math.round(priceCents / 10);
}

/** Finds a customer by email, creating one if this is their first
 * booking. Name/phone are refreshed from the latest booking so a
 * customer's details stay current without needing an account yet. */
export async function findOrCreateCustomer(input: {
  name: string;
  email: string;
  phone: string;
}): Promise<Customer> {
  const email = normalizeEmail(input.email);
  const admin = getSupabaseAdmin();

  if (admin) {
    const { data: existing, error: findError } = await admin
      .from("customers")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (findError) throw new Error(findError.message);

    if (existing) {
      const { data, error } = await admin
        .from("customers")
        .update({ name: input.name, phone: input.phone })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return rowToCustomer(data);
    }

    const { data, error } = await admin
      .from("customers")
      .insert({ email, name: input.name, phone: input.phone })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return rowToCustomer(data);
  }

  const existing = devCustomers.find((c) => c.email === email);
  if (existing) {
    existing.name = input.name;
    existing.phone = input.phone;
    return existing;
  }
  const customer: Customer = {
    id: randomUUID(),
    email,
    name: input.name,
    phone: input.phone,
    passwordHash: null,
    createdAt: new Date().toISOString(),
  };
  devCustomers.push(customer);
  return customer;
}

function rowToCustomer(row: Record<string, unknown>): Customer {
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    phone: row.phone as string,
    passwordHash: (row.password_hash as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function getCustomerByEmail(emailRaw: string): Promise<Customer | null> {
  const email = normalizeEmail(emailRaw);
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data, error } = await admin.from("customers").select("*").eq("email", email).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToCustomer(data) : null;
  }
  return devCustomers.find((c) => c.email === email) ?? null;
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data, error } = await admin.from("customers").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToCustomer(data) : null;
  }
  return devCustomers.find((c) => c.id === id) ?? null;
}

/** Creates a login (email + password) for a customer. If a customer row
 * already exists for this email — e.g. from an earlier booking — the
 * account is attached to it (so their booking history shows up right
 * away) rather than creating a duplicate. Rejects if that email already
 * has a password set. */
export async function signUpCustomer(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<{ ok: true; customer: Customer } | { ok: false; error: string }> {
  const email = normalizeEmail(input.email);
  const passwordHash = hashPassword(input.password);
  const admin = getSupabaseAdmin();

  if (admin) {
    const { data: existing, error: findError } = await admin
      .from("customers")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (findError) throw new Error(findError.message);

    if (existing?.password_hash) {
      return { ok: false, error: "Für diese E-Mail existiert bereits ein Konto. Bitte melde dich an." };
    }

    if (existing) {
      const { data, error } = await admin
        .from("customers")
        .update({ name: input.name, phone: input.phone || existing.phone, password_hash: passwordHash })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return { ok: true, customer: rowToCustomer(data) };
    }

    const { data, error } = await admin
      .from("customers")
      .insert({ email, name: input.name, phone: input.phone, password_hash: passwordHash })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, customer: rowToCustomer(data) };
  }

  const existing = devCustomers.find((c) => c.email === email);
  if (existing?.passwordHash) {
    return { ok: false, error: "Für diese E-Mail existiert bereits ein Konto. Bitte melde dich an." };
  }
  if (existing) {
    existing.name = input.name;
    if (input.phone) existing.phone = input.phone;
    existing.passwordHash = passwordHash;
    return { ok: true, customer: existing };
  }
  const customer: Customer = {
    id: randomUUID(),
    email,
    name: input.name,
    phone: input.phone,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  devCustomers.push(customer);
  return { ok: true, customer };
}

export async function verifyCustomerCredentials(
  emailRaw: string,
  password: string,
): Promise<{ ok: true; customer: Customer } | { ok: false; error: string }> {
  const customer = await getCustomerByEmail(emailRaw);
  if (!customer || !customer.passwordHash || !verifyPassword(password, customer.passwordHash)) {
    return { ok: false, error: "E-Mail oder Passwort ist falsch." };
  }
  return { ok: true, customer };
}

export async function getCustomerPoints(customerId: string): Promise<number> {
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data, error } = await admin.from("points_transactions").select("points").eq("customer_id", customerId);
    if (error) throw new Error(error.message);
    return (data ?? []).reduce((sum, row) => sum + (row.points as number), 0);
  }

  return devPointsTransactions
    .filter((t) => t.customerId === customerId)
    .reduce((sum, t) => sum + t.points, 0);
}

/** Credits points for a completed booking. Safe to call at most once
 * per booking — a second call is rejected by the unique constraint on
 * `booking_id` (dev fallback mirrors that check in memory). */
export async function creditPointsForBooking(
  customerId: string,
  bookingId: string,
  points: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = getSupabaseAdmin();
  if (admin) {
    const { error } = await admin.from("points_transactions").insert({
      customer_id: customerId,
      booking_id: bookingId,
      points,
      reason: "booking_attended",
    });
    if (error) {
      if (error.code === "23505") return { ok: false, error: "Für diesen Termin wurden bereits Punkte gutgeschrieben." };
      return { ok: false, error: "Punkte konnten nicht gutgeschrieben werden." };
    }
    return { ok: true };
  }

  if (devPointsTransactions.some((t) => t.bookingId === bookingId)) {
    return { ok: false, error: "Für diesen Termin wurden bereits Punkte gutgeschrieben." };
  }
  devPointsTransactions.push({
    id: randomUUID(),
    customerId,
    bookingId,
    points,
    reason: "booking_attended",
    createdAt: new Date().toISOString(),
  });
  return { ok: true };
}

/** All points transactions for a customer, newest first — used to show
 * "+X Punkte" next to each attended appointment on the account page. */
export async function listPointsTransactionsForCustomer(customerId: string): Promise<PointsTransaction[]> {
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data, error } = await admin
      .from("points_transactions")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id as string,
      customerId: row.customer_id as string,
      bookingId: (row.booking_id as string | null) ?? null,
      points: row.points as number,
      reason: row.reason as string,
      createdAt: row.created_at as string,
    }));
  }

  return devPointsTransactions
    .filter((t) => t.customerId === customerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Reverses the points credited for a booking (the "undo" on a mistaken
 * "erschienen" click). No-op if nothing was credited. */
export async function reversePointsForBooking(bookingId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (admin) {
    const { error } = await admin.from("points_transactions").delete().eq("booking_id", bookingId);
    if (error) throw new Error(error.message);
    return;
  }

  const index = devPointsTransactions.findIndex((t) => t.bookingId === bookingId);
  if (index >= 0) devPointsTransactions.splice(index, 1);
}
