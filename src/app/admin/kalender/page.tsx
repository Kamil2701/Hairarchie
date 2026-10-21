import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/session";
import { listUpcomingBookings } from "@/lib/bookings";
import { listUpcomingBlocks, getBlocksForDate } from "@/lib/blocks";
import { stylists, findStylist } from "@/lib/data/stylists";
import { minutesToLabel } from "@/lib/availability";
import { deleteBlockAction } from "@/lib/actions";
import { DayCalendar } from "@/components/admin/DayCalendar";
import { BlockForm } from "@/components/admin/BlockForm";

function toISO(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

function parseISO(dateISO: string): Date {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(dateISO: string, days: number): string {
  const d = parseISO(dateISO);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

function mondayOf(dateISO: string): string {
  const d = parseISO(dateISO);
  const weekday = d.getDay(); // 0 = Sunday
  const diff = weekday === 0 ? -6 : 1 - weekday;
  d.setDate(d.getDate() + diff);
  return toISO(d);
}

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }

  const { date: rawDate } = await searchParams;
  const today = toISO(new Date());
  const date = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : today;

  const monday = mondayOf(date);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const [allBookings, dayBlocks, upcomingBlocks] = await Promise.all([
    listUpcomingBookings(),
    getBlocksForDate(date),
    listUpcomingBlocks(),
  ]);

  const dayBookings = allBookings.filter((b) => b.date === date && b.status !== "cancelled");

  return (
    <div className="mx-auto min-h-full max-w-5xl px-5 py-14 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-data text-xs uppercase tracking-[0.2em] text-moss">Team</p>
          <h1 className="mt-2 text-3xl text-ink">Kalender</h1>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/dashboard" className="focus-ring rounded-full border border-line px-5 py-2.5 text-sm text-ink hover:bg-paper-2">
            Liste
          </Link>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        {weekDays.map((d) => {
          const isSelected = d === date;
          const isToday = d === today;
          const label = parseISO(d).toLocaleDateString("de-DE", { weekday: "short" });
          const dayNum = parseISO(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
          return (
            <Link
              key={d}
              href={`/admin/kalender?date=${d}`}
              className={`focus-ring rounded-2xl border px-3 py-2 text-center transition-colors ${
                isSelected ? "border-moss bg-paper-2" : "border-line hover:bg-paper-2/60"
              }`}
            >
              <span className="block text-[0.65rem] uppercase tracking-wide text-ink-soft">
                {label}
                {isToday ? " · heute" : ""}
              </span>
              <span className="font-data text-sm text-ink">{dayNum}</span>
            </Link>
          );
        })}
        <div className="ml-auto flex gap-2">
          <Link
            href={`/admin/kalender?date=${addDays(monday, -7)}`}
            className="focus-ring rounded-full border border-line px-4 py-2 text-sm text-ink hover:bg-paper-2"
          >
            ← Woche
          </Link>
          <Link
            href={`/admin/kalender?date=${addDays(monday, 7)}`}
            className="focus-ring rounded-full border border-line px-4 py-2 text-sm text-ink hover:bg-paper-2"
          >
            Woche →
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <DayCalendar date={date} stylists={stylists} bookings={dayBookings} blocks={dayBlocks} />
      </div>

      <div className="mt-14 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h2 className="text-xl text-ink">Zeit blockieren</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Für Urlaub, Krankheit oder sonstige Termine, an denen nicht gebucht werden kann.
          </p>
          <div className="mt-5">
            <BlockForm stylists={stylists} />
          </div>
        </div>

        <div>
          <h2 className="text-xl text-ink">Blockierte Zeiten</h2>
          {upcomingBlocks.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">Aktuell keine Blockierungen.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              {upcomingBlocks.map((block) => {
                const stylist = block.stylistId ? findStylist(block.stylistId) : undefined;
                const range =
                  block.startDate === block.endDate
                    ? parseISO(block.startDate).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })
                    : `${parseISO(block.startDate).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })} – ${parseISO(
                        block.endDate,
                      ).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}`;
                const time = block.startMin !== null && block.endMin !== null
                  ? `, ${minutesToLabel(block.startMin)}–${minutesToLabel(block.endMin)} Uhr`
                  : " (ganztägig)";
                return (
                  <div key={block.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line px-5 py-4">
                    <div>
                      <p className="text-ink">
                        {range}
                        {time}
                      </p>
                      <p className="text-sm text-ink-soft">
                        {block.stylistId === null ? "Ganzer Salon" : (stylist?.name ?? block.stylistId)}
                        {block.reason ? ` · ${block.reason}` : ""}
                      </p>
                    </div>
                    <form action={deleteBlockAction}>
                      <input type="hidden" name="id" value={block.id} />
                      <button
                        type="submit"
                        className="focus-ring rounded-full border border-line px-4 py-2 text-sm text-ink hover:bg-paper-2"
                      >
                        Aufheben
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
