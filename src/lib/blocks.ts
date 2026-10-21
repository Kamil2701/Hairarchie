import "server-only";
import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase";
import { listUpcomingBookings, type Booking } from "@/lib/bookings";

export type Block = {
  id: string;
  /** null = blocks the whole salon, every stylist. */
  stylistId: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD, inclusive
  /** null together with endMin = blocks the full day, every date in range. */
  startMin: number | null;
  endMin: number | null;
  reason: string;
  createdAt: string;
};

export type NewBlock = Omit<Block, "id" | "createdAt">;

// Same in-memory dev fallback pattern as bookings.ts.
const devBlocks: Block[] = [];

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now
    .getDate()
    .toString()
    .padStart(2, "0")}`;
}

function rowToBlock(row: Record<string, unknown>): Block {
  return {
    id: row.id as string,
    stylistId: (row.stylist_id as string | null) ?? null,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    startMin: (row.start_min as number | null) ?? null,
    endMin: (row.end_min as number | null) ?? null,
    reason: (row.reason as string) ?? "",
    createdAt: row.created_at as string,
  };
}

export async function listUpcomingBlocks(): Promise<Block[]> {
  const today = todayISO();
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data, error } = await admin
      .from("blocks")
      .select("*")
      .gte("end_date", today)
      .order("start_date", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToBlock);
  }

  return devBlocks
    .filter((b) => b.endDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** Blocks that apply to this stylist on this date (their own, or a
 * whole-salon block). */
export async function getBlocksFor(stylistId: string, date: string): Promise<Block[]> {
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data, error } = await admin
      .from("blocks")
      .select("*")
      .or(`stylist_id.is.null,stylist_id.eq.${stylistId}`)
      .lte("start_date", date)
      .gte("end_date", date);
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToBlock);
  }

  return devBlocks.filter(
    (b) => (b.stylistId === null || b.stylistId === stylistId) && b.startDate <= date && b.endDate >= date,
  );
}

/** Every block touching this date, any stylist — for rendering a
 * day's full calendar grid (filter by stylist client-side per column). */
export async function getBlocksForDate(date: string): Promise<Block[]> {
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data, error } = await admin.from("blocks").select("*").lte("start_date", date).gte("end_date", date);
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToBlock);
  }

  return devBlocks.filter((b) => b.startDate <= date && b.endDate >= date);
}

export async function createBlock(input: NewBlock): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data, error } = await admin
      .from("blocks")
      .insert({
        stylist_id: input.stylistId,
        start_date: input.startDate,
        end_date: input.endDate,
        start_min: input.startMin,
        end_min: input.endMin,
        reason: input.reason,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: "Blockierung konnte nicht gespeichert werden." };
    return { ok: true, id: data.id as string };
  }

  const id = randomUUID();
  devBlocks.push({ ...input, id, createdAt: new Date().toISOString() });
  return { ok: true, id };
}

export async function deleteBlock(id: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (admin) {
    const { error } = await admin.from("blocks").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }

  const index = devBlocks.findIndex((b) => b.id === id);
  if (index >= 0) devBlocks.splice(index, 1);
}

/** Confirmed bookings that a would-be block would overlap — shown to
 * the admin as a "these are affected" warning before they confirm. */
export async function findConflictingBookings(candidate: NewBlock): Promise<Booking[]> {
  const all = await listUpcomingBookings();
  return all.filter((booking) => {
    if (booking.status !== "confirmed") return false;
    if (candidate.stylistId !== null && booking.stylistId !== candidate.stylistId) return false;
    if (booking.date < candidate.startDate || booking.date > candidate.endDate) return false;
    if (candidate.startMin === null || candidate.endMin === null) return true; // whole day blocked
    const bookingEnd = booking.startMin + booking.durationMin;
    return booking.startMin < candidate.endMin && bookingEnd > candidate.startMin;
  });
}
