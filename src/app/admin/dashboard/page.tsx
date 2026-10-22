import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/session";
import { listUpcomingBookings, isSupabaseConfigured } from "@/lib/bookings";
import { findServices, totalPriceCents } from "@/lib/data/services";
import { pointsForPriceCents } from "@/lib/customers";
import { stylists } from "@/lib/data/stylists";
import { minutesToLabel } from "@/lib/availability";
import { logoutAdmin, cancelBooking, markAttended, undoAttendance } from "@/lib/actions";

const STYLIST_BADGE_CLASSES = [
  "bg-moss/15 text-moss",
  "bg-amber/20 text-moss-deep",
  "bg-paper-3 text-ink-soft",
];

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now
    .getDate()
    .toString()
    .padStart(2, "0")}`;
}

function dayHeading(dateISO: string, today: string): string {
  if (dateISO === today) return "Heute";

  const [ty, tm, td] = today.split("-").map(Number);
  const tomorrow = new Date(ty, tm - 1, td + 1);
  const tomorrowISO = `${tomorrow.getFullYear()}-${(tomorrow.getMonth() + 1).toString().padStart(2, "0")}-${tomorrow
    .getDate()
    .toString()
    .padStart(2, "0")}`;
  if (dateISO === tomorrowISO) return "Morgen";

  return new Date(`${dateISO}T00:00:00`).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });
}

export default async function AdminDashboardPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }

  const allBookings = await listUpcomingBookings();
  const today = todayISO();

  const bookings = allBookings.filter((b) => b.status !== "cancelled");
  const cancelledCount = allBookings.length - bookings.length;

  const byDate = new Map<string, typeof allBookings>();
  for (const booking of allBookings) {
    const list = byDate.get(booking.date) ?? [];
    list.push(booking);
    byDate.set(booking.date, list);
  }

  return (
    <div className="mx-auto min-h-full max-w-3xl px-5 py-14 sm:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-data text-xs uppercase tracking-[0.2em] text-moss">Team</p>
          <h1 className="mt-2 text-3xl text-ink">Buchungen</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {bookings.length} anstehende{bookings.length === 1 ? "r Termin" : " Termine"}
            {cancelledCount > 0 ? ` · ${cancelledCount} storniert` : ""}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/kalender"
            className="focus-ring rounded-full border border-line px-5 py-2.5 text-sm text-ink hover:bg-paper-2"
          >
            Kalender
          </Link>
          <form action={logoutAdmin}>
            <button type="submit" className="focus-ring rounded-full border border-line px-5 py-2.5 text-sm text-ink hover:bg-paper-2">
              Abmelden
            </button>
          </form>
        </div>
      </div>

      {!isSupabaseConfigured && (
        <p className="mt-6 rounded-xl bg-amber-soft/40 px-4 py-3 text-sm text-ink">
          Noch keine Datenbank verbunden — Buchungen werden nur temporär gespeichert und
          gehen bei einem Neustart verloren. Sobald Supabase eingerichtet ist (siehe
          README), landen sie dauerhaft hier.
        </p>
      )}

      {allBookings.length === 0 ? (
        <p className="mt-10 text-ink-soft">Noch keine anstehenden Termine.</p>
      ) : (
        <div className="mt-10 flex flex-col gap-10">
          {[...byDate.entries()].map(([date, dayBookings]) => {
            const isToday = date === today;
            return (
              <div key={date}>
                <h2
                  className={`font-data text-sm uppercase tracking-wide ${
                    isToday ? "text-moss" : "text-ink-soft"
                  }`}
                >
                  {dayHeading(date, today)}
                  {isToday && <span className="ml-2 font-sans normal-case text-ink-soft">({dayBookings.length})</span>}
                </h2>
                <div className="mt-3 flex flex-col gap-2">
                  {dayBookings.map((booking) => {
                    const services = findServices(booking.serviceIds);
                    const stylistIndex = stylists.findIndex((s) => s.id === booking.stylistId);
                    const stylist = stylistIndex >= 0 ? stylists[stylistIndex] : undefined;
                    const badgeClass = STYLIST_BADGE_CLASSES[Math.max(stylistIndex, 0) % STYLIST_BADGE_CLASSES.length];
                    const cancelled = booking.status === "cancelled";
                    const attended = booking.status === "attended";
                    const points = attended ? pointsForPriceCents(totalPriceCents(services)) : 0;
                    return (
                      <div
                        key={booking.id}
                        className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-4 ${
                          cancelled ? "border-line opacity-50" : isToday ? "border-moss/30" : "border-line"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            aria-hidden
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold ${badgeClass}`}
                          >
                            {(stylist?.name ?? "?").charAt(0)}
                          </span>
                          <div>
                            <p className="font-data text-sm text-moss">{minutesToLabel(booking.startMin)}</p>
                            <p className="text-ink">
                              {services.length > 0
                                ? services.map((s) => s.name).join(" + ")
                                : booking.serviceIds.join(", ")}{" "}
                              · {stylist?.name ?? booking.stylistId}
                            </p>
                            <p className="text-sm text-ink-soft">
                              {booking.customerName} · {booking.customerPhone} · {booking.customerEmail}
                            </p>
                            {booking.notes && <p className="mt-1 text-sm text-ink-soft">„{booking.notes}“</p>}
                          </div>
                        </div>
                        {booking.status === "confirmed" && (
                          <div className="flex gap-2">
                            <form action={markAttended}>
                              <input type="hidden" name="id" value={booking.id} />
                              <button
                                type="submit"
                                className="focus-ring rounded-full bg-btn px-4 py-2 text-sm font-medium text-on-btn transition-colors hover:bg-btn-hover"
                              >
                                Erschienen
                              </button>
                            </form>
                            <form action={cancelBooking}>
                              <input type="hidden" name="id" value={booking.id} />
                              <button
                                type="submit"
                                className="focus-ring rounded-full border border-line px-4 py-2 text-sm text-ink hover:bg-paper-2"
                              >
                                Stornieren
                              </button>
                            </form>
                          </div>
                        )}
                        {attended && (
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-moss">✓ Erschienen · +{points} Punkte</span>
                            <form action={undoAttendance}>
                              <input type="hidden" name="id" value={booking.id} />
                              <button
                                type="submit"
                                className="focus-ring rounded-full border border-line px-4 py-2 text-sm text-ink hover:bg-paper-2"
                              >
                                Rückgängig
                              </button>
                            </form>
                          </div>
                        )}
                        {cancelled && <span className="text-sm text-ink-soft">Storniert</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
