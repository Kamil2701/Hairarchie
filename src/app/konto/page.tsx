import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedCustomer } from "@/lib/customerSession";
import { listBookingsForCustomer } from "@/lib/bookings";
import { listPointsTransactionsForCustomer } from "@/lib/customers";
import { findServices } from "@/lib/data/services";
import { findStylist } from "@/lib/data/stylists";
import { minutesToLabel } from "@/lib/availability";
import { logoutCustomer } from "@/lib/customerActions";

export const metadata: Metadata = {
  title: "Mein Konto — hairarchie",
};

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now
    .getDate()
    .toString()
    .padStart(2, "0")}`;
}

function formatDate(dateISO: string): string {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function AccountPage() {
  const customer = await getAuthenticatedCustomer();
  if (!customer) {
    redirect("/konto/login");
  }

  const [bookings, pointsTransactions] = await Promise.all([
    listBookingsForCustomer(customer.id),
    listPointsTransactionsForCustomer(customer.id),
  ]);

  const pointsByBooking = new Map<string, number>();
  let totalPoints = 0;
  for (const tx of pointsTransactions) {
    totalPoints += tx.points;
    if (tx.bookingId) {
      pointsByBooking.set(tx.bookingId, (pointsByBooking.get(tx.bookingId) ?? 0) + tx.points);
    }
  }

  const today = todayISO();
  const visibleBookings = bookings.filter((b) => b.status !== "cancelled");
  const upcoming = visibleBookings
    .filter((b) => b.status === "confirmed" && b.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin);
  const past = visibleBookings
    .filter((b) => b.status === "attended" || (b.status === "confirmed" && b.date < today))
    .sort((a, b) => b.date.localeCompare(a.date) || b.startMin - a.startMin);

  return (
    <div className="mx-auto min-h-full max-w-3xl px-5 py-14 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="font-data text-xs uppercase tracking-[0.2em] text-moss">Mein Konto</p>
          <h1 className="mt-2 text-3xl text-ink">{customer.name}</h1>
          <p className="mt-1 text-sm text-ink-soft">{customer.email}</p>
        </div>

        <div className="rounded-2xl bg-paper-2 px-6 py-4 text-right">
          <p className="font-data text-3xl text-moss-deep">{totalPoints}</p>
          <p className="text-xs uppercase tracking-wide text-ink-soft">Punkte</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/termin"
          className="focus-ring rounded-full bg-btn px-5 py-2.5 text-sm font-medium text-on-btn transition-colors hover:bg-btn-hover"
        >
          Termin buchen
        </Link>
        <form action={logoutCustomer}>
          <button
            type="submit"
            className="focus-ring rounded-full border border-line px-5 py-2.5 text-sm text-ink hover:bg-paper-2"
          >
            Abmelden
          </button>
        </form>
      </div>

      <section className="mt-12">
        <h2 className="text-xl text-ink">Kommende Termine</h2>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">Kein anstehender Termin gebucht.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {upcoming.map((booking) => {
              const services = findServices(booking.serviceIds);
              const stylist = findStylist(booking.stylistId);
              return (
                <div key={booking.id} className="rounded-2xl border border-moss/30 px-5 py-4">
                  <p className="font-data text-sm text-moss">
                    {formatDate(booking.date)} · {minutesToLabel(booking.startMin)}
                  </p>
                  <p className="mt-1 text-ink">
                    {services.length > 0 ? services.map((s) => s.name).join(" + ") : booking.serviceIds.join(", ")}{" "}
                    · {stylist?.name ?? booking.stylistId}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-xl text-ink">Vergangene Termine</h2>
        {past.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">Noch kein Termin wahrgenommen.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {past.map((booking) => {
              const services = findServices(booking.serviceIds);
              const stylist = findStylist(booking.stylistId);
              const points = pointsByBooking.get(booking.id) ?? 0;
              return (
                <div
                  key={booking.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line px-5 py-4"
                >
                  <div>
                    <p className="font-data text-sm text-ink-soft">{formatDate(booking.date)}</p>
                    <p className="mt-1 text-ink">
                      {services.length > 0 ? services.map((s) => s.name).join(" + ") : booking.serviceIds.join(", ")}{" "}
                      · {stylist?.name ?? booking.stylistId}
                    </p>
                  </div>
                  {points > 0 && <span className="text-sm text-moss">+{points} Punkte</span>}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
