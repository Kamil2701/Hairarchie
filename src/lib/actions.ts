"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  checkAdminPassword,
  createAdminSession,
  clearAdminSession,
  isAdminAuthenticated,
} from "@/lib/session";
import { createBooking, setBookingStatus, getBookedRanges, getBookingById } from "@/lib/bookings";
import { getBlocksFor, createBlock, deleteBlock, findConflictingBookings, type NewBlock } from "@/lib/blocks";
import {
  findOrCreateCustomer,
  creditPointsForBooking,
  reversePointsForBooking,
  pointsForPriceCents,
} from "@/lib/customers";
import { findServices, totalDurationMin, totalPriceCents } from "@/lib/data/services";
import { findStylist } from "@/lib/data/stylists";
import { availableSlots, daySlots, blocksToRanges, dateToWeekday, type SlotInfo } from "@/lib/availability";
import { businessHours } from "@/lib/data/hours";

async function combinedBookedRanges(stylistId: string, date: string) {
  const [booked, blocks] = await Promise.all([getBookedRanges(stylistId, date), getBlocksFor(stylistId, date)]);
  return [...booked, ...blocksToRanges(date, blocks)];
}

export type BookingFormState = {
  error?: string;
  success?: boolean;
};

export async function getDaySlots(
  serviceIds: string[],
  stylistId: string,
  date: string,
): Promise<SlotInfo[]> {
  const services = findServices(serviceIds);
  if (services.length === 0 || !findStylist(stylistId) || !date) return [];
  const booked = await combinedBookedRanges(stylistId, date);
  return daySlots(date, totalDurationMin(services), booked);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitBooking(
  _prevState: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const serviceIds = formData.getAll("serviceIds").map(String).filter(Boolean);
  const stylistId = String(formData.get("stylistId") ?? "");
  const date = String(formData.get("date") ?? "");
  const startMin = Number(formData.get("startMin"));
  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const customerEmail = String(formData.get("customerEmail") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const services = findServices(serviceIds);
  const stylist = findStylist(stylistId);

  if (services.length === 0 || !stylist) {
    return { error: "Bitte wähle mindestens eine Leistung und eine:n Stylist:in aus." };
  }
  if (!date || !Number.isFinite(startMin)) {
    return { error: "Bitte wähle Datum und Uhrzeit aus." };
  }
  if (!businessHours[dateToWeekday(date)]) {
    return { error: "An diesem Tag haben wir geschlossen. Bitte wähle einen anderen Tag." };
  }
  if (customerName.length < 2) {
    return { error: "Bitte gib deinen Namen an." };
  }
  if (!EMAIL_RE.test(customerEmail)) {
    return { error: "Bitte gib eine gültige E-Mail-Adresse an." };
  }
  if (customerPhone.replace(/[^0-9]/g, "").length < 6) {
    return { error: "Bitte gib eine gültige Telefonnummer an." };
  }

  // Re-derive the slot list server-side rather than trusting the posted
  // startMin outright — confirms it's a real, currently open slot.
  const booked = await combinedBookedRanges(stylistId, date);
  const duration = totalDurationMin(services);
  const slots = availableSlots(date, duration, booked);
  if (!slots.includes(startMin)) {
    return { error: "Dieser Termin ist nicht mehr verfügbar. Bitte wähle eine andere Uhrzeit." };
  }

  const customer = await findOrCreateCustomer({
    name: customerName,
    email: customerEmail,
    phone: customerPhone,
  });

  const result = await createBooking({
    serviceIds,
    stylistId,
    date,
    startMin,
    durationMin: duration,
    customerId: customer.id,
    customerName,
    customerPhone,
    customerEmail,
    notes,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  return { success: true };
}

export type LoginFormState = { error?: string };

export async function loginAdmin(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const password = String(formData.get("password") ?? "");
  if (!checkAdminPassword(password)) {
    return { error: "Falscher Zugangscode." };
  }
  await createAdminSession();
  redirect("/admin/dashboard");
}

export async function logoutAdmin(): Promise<void> {
  await clearAdminSession();
  redirect("/admin");
}

export async function cancelBooking(formData: FormData): Promise<void> {
  if (!(await isAdminAuthenticated())) {
    throw new Error("Unauthorized");
  }
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await setBookingStatus(id, "cancelled");
  revalidatePath("/admin/dashboard");
}

/** The "erschienen" confirmation: 10 points per €1 of the booked
 * services, credited once the stylist confirms the customer actually
 * showed up — never just for booking the appointment. */
export async function markAttended(formData: FormData): Promise<void> {
  if (!(await isAdminAuthenticated())) {
    throw new Error("Unauthorized");
  }
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const booking = await getBookingById(id);
  if (!booking || booking.status !== "confirmed" || !booking.customerId) {
    revalidatePath("/admin/dashboard");
    return;
  }

  const points = pointsForPriceCents(totalPriceCents(findServices(booking.serviceIds)));
  const credit = await creditPointsForBooking(booking.customerId, booking.id, points);
  if (credit.ok) {
    await setBookingStatus(id, "attended");
  }
  revalidatePath("/admin/dashboard");
}

/** Undoes a mistaken "erschienen" click: reverts the status and removes
 * the points it credited. */
export async function undoAttendance(formData: FormData): Promise<void> {
  if (!(await isAdminAuthenticated())) {
    throw new Error("Unauthorized");
  }
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const booking = await getBookingById(id);
  if (!booking || booking.status !== "attended") {
    revalidatePath("/admin/dashboard");
    return;
  }

  await reversePointsForBooking(id);
  await setBookingStatus(id, "confirmed");
  revalidatePath("/admin/dashboard");
}

export type ConflictSummary = {
  date: string;
  startMin: number;
  customerName: string;
  serviceLabel: string;
};

export type BlockFormState = {
  error?: string;
  success?: boolean;
  conflicts?: ConflictSummary[];
};

function parseTimeToMin(hhmm: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export async function createBlockAction(
  _prevState: BlockFormState,
  formData: FormData,
): Promise<BlockFormState> {
  if (!(await isAdminAuthenticated())) {
    throw new Error("Unauthorized");
  }

  const stylistIdRaw = String(formData.get("stylistId") ?? "");
  const stylistId = stylistIdRaw === "" ? null : stylistIdRaw;
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "") || startDate;
  const hasTime = formData.get("hasTime") === "on";
  const startMin = hasTime ? parseTimeToMin(String(formData.get("startTime") ?? "")) : null;
  const endMin = hasTime ? parseTimeToMin(String(formData.get("endTime") ?? "")) : null;
  const reason = String(formData.get("reason") ?? "").trim();
  const force = formData.get("force") === "1";

  if (stylistId !== null && !findStylist(stylistId)) {
    return { error: "Unbekannte:r Stylist:in." };
  }
  if (!startDate || !endDate || endDate < startDate) {
    return { error: "Bitte gib einen gültigen Zeitraum an (Ende darf nicht vor dem Start liegen)." };
  }
  if (hasTime && (startMin === null || endMin === null || endMin <= startMin)) {
    return { error: "Bitte gib eine gültige Uhrzeit an (Ende nach Start)." };
  }

  const candidate: NewBlock = { stylistId, startDate, endDate, startMin, endMin, reason };

  if (!force) {
    const conflicts = await findConflictingBookings(candidate);
    if (conflicts.length > 0) {
      return {
        conflicts: conflicts
          .sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin)
          .map((b) => ({
            date: b.date,
            startMin: b.startMin,
            customerName: b.customerName,
            serviceLabel: findServices(b.serviceIds).map((s) => s.name).join(" + ") || b.serviceIds.join(", "),
          })),
      };
    }
  }

  const result = await createBlock(candidate);
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin/kalender");
  return { success: true };
}

export async function deleteBlockAction(formData: FormData): Promise<void> {
  if (!(await isAdminAuthenticated())) {
    throw new Error("Unauthorized");
  }
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteBlock(id);
  revalidatePath("/admin/kalender");
}
