import "server-only";
import { randomUUID } from "node:crypto";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { BookedRange } from "@/lib/availability";

export type BookingStatus = "confirmed" | "cancelled" | "attended";

export type Booking = {
  id: string;
  serviceIds: string[];
  stylistId: string;
  date: string; // YYYY-MM-DD
  startMin: number;
  durationMin: number;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  notes: string;
  status: BookingStatus;
  createdAt: string;
};

export type NewBooking = Omit<Booking, "id" | "status" | "createdAt">;

// In-memory fallback so the app is fully testable before Supabase is wired
// up (no SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY set yet). Resets on
// server restart. Once those env vars are set, every call below goes
// through Supabase instead — nothing else in the app needs to change.
const devBookings: Booking[] = [];

function overlaps(a: BookedRange, bStart: number, bDuration: number): boolean {
  return a.startMin < bStart + bDuration && a.startMin + a.durationMin > bStart;
}

export async function getBookedRanges(stylistId: string, date: string): Promise<BookedRange[]> {
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data, error } = await admin
      .from("bookings")
      .select("start_min, duration_min")
      .eq("stylist_id", stylistId)
      .eq("date", date)
      .neq("status", "cancelled");
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({ startMin: row.start_min, durationMin: row.duration_min }));
  }

  return devBookings
    .filter((b) => b.stylistId === stylistId && b.date === date && b.status !== "cancelled")
    .map((b) => ({ startMin: b.startMin, durationMin: b.durationMin }));
}

export async function createBooking(
  input: NewBooking,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const existing = await getBookedRanges(input.stylistId, input.date);
  if (existing.some((b) => overlaps(b, input.startMin, input.durationMin))) {
    return { ok: false, error: "Dieser Termin ist gerade vergeben. Bitte wähle eine andere Uhrzeit." };
  }

  const admin = getSupabaseAdmin();
  if (admin) {
    const { data, error } = await admin
      .from("bookings")
      .insert({
        service_ids: input.serviceIds,
        stylist_id: input.stylistId,
        date: input.date,
        start_min: input.startMin,
        duration_min: input.durationMin,
        customer_id: input.customerId,
        customer_name: input.customerName,
        customer_phone: input.customerPhone,
        customer_email: input.customerEmail,
        notes: input.notes,
        status: "confirmed",
      })
      .select("id")
      .single();
    if (error) {
      // 23P01 = exclusion_violation — the DB-level overlap guard (see
      // schema.sql) caught a race the app-level check above missed.
      if (error.code === "23P01") {
        return { ok: false, error: "Dieser Termin ist gerade vergeben. Bitte wähle eine andere Uhrzeit." };
      }
      return { ok: false, error: "Buchung konnte nicht gespeichert werden. Bitte versuch es erneut." };
    }
    return { ok: true, id: data.id as string };
  }

  const id = randomUUID();
  devBookings.push({
    ...input,
    id,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  });
  return { ok: true, id };
}

export async function listUpcomingBookings(): Promise<Booking[]> {
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today
    .getDate()
    .toString()
    .padStart(2, "0")}`;

  const admin = getSupabaseAdmin();
  if (admin) {
    const { data, error } = await admin
      .from("bookings")
      .select("*")
      .gte("date", todayISO)
      .order("date", { ascending: true })
      .order("start_min", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToBooking);
  }

  return devBookings
    .filter((b) => b.date >= todayISO)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin);
}

function rowToBooking(row: Record<string, unknown>): Booking {
  return {
    id: row.id as string,
    serviceIds: (row.service_ids as string[]) ?? [],
    stylistId: row.stylist_id as string,
    date: row.date as string,
    startMin: row.start_min as number,
    durationMin: row.duration_min as number,
    customerId: (row.customer_id as string | null) ?? null,
    customerName: row.customer_name as string,
    customerPhone: row.customer_phone as string,
    customerEmail: row.customer_email as string,
    notes: (row.notes as string) ?? "",
    status: row.status as BookingStatus,
    createdAt: row.created_at as string,
  };
}

/** A customer's bookings, newest first — powers the /konto overview. */
export async function listBookingsForCustomer(customerId: string): Promise<Booking[]> {
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data, error } = await admin
      .from("bookings")
      .select("*")
      .eq("customer_id", customerId)
      .order("date", { ascending: false })
      .order("start_min", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToBooking);
  }

  return devBookings
    .filter((b) => b.customerId === customerId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.startMin - a.startMin);
}

export async function getBookingById(id: string): Promise<Booking | null> {
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data, error } = await admin.from("bookings").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToBooking(data) : null;
  }

  return devBookings.find((b) => b.id === id) ?? null;
}

export async function setBookingStatus(id: string, status: BookingStatus): Promise<void> {
  const admin = getSupabaseAdmin();
  if (admin) {
    const { error } = await admin.from("bookings").update({ status }).eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }

  const booking = devBookings.find((b) => b.id === id);
  if (booking) booking.status = status;
}

export { isSupabaseConfigured };
