import { businessHours } from "@/lib/data/hours";
import { dateToWeekday, minutesToLabel } from "@/lib/availability";
import { findServices } from "@/lib/data/services";
import type { Stylist } from "@/lib/data/stylists";
import type { Booking } from "@/lib/bookings";
import type { Block } from "@/lib/blocks";

const PX_PER_MIN = 1.15;

type Props = {
  date: string;
  stylists: Stylist[];
  bookings: Booking[];
  blocks: Block[];
};

export function DayCalendar({ date, stylists, bookings, blocks }: Props) {
  const window = businessHours[dateToWeekday(date)];

  if (!window) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm text-ink-soft">
        An diesem Tag hat der Salon geschlossen.
      </p>
    );
  }

  const totalMin = window.closeMin - window.openMin;
  const containerHeight = totalMin * PX_PER_MIN;
  const topFor = (min: number) => ((Math.max(min, window.openMin) - window.openMin) / totalMin) * 100;
  const heightFor = (startMin: number, endMin: number) => {
    const clampedStart = Math.max(startMin, window.openMin);
    const clampedEnd = Math.min(endMin, window.closeMin);
    return (Math.max(clampedEnd - clampedStart, 0) / totalMin) * 100;
  };

  const hourMarks: number[] = [];
  for (let h = Math.ceil(window.openMin / 60); h * 60 <= window.closeMin; h++) hourMarks.push(h * 60);

  return (
    <div className="rounded-2xl border border-line">
      <div className="grid" style={{ gridTemplateColumns: `3.5rem repeat(${stylists.length}, 1fr)` }}>
        <div />
        {stylists.map((stylist) => (
          <div key={stylist.id} className="border-l border-line px-3 py-2.5 text-sm text-ink">
            {stylist.name}
          </div>
        ))}
      </div>

      <div
        className="relative grid border-t border-line"
        style={{ gridTemplateColumns: `3.5rem repeat(${stylists.length}, 1fr)`, height: containerHeight }}
      >
        <div className="relative">
          {hourMarks.map((min) => (
            <span
              key={min}
              className="absolute right-2 -translate-y-1/2 font-data text-[0.65rem] text-ink-soft/70"
              style={{ top: `${topFor(min)}%` }}
            >
              {minutesToLabel(min)}
            </span>
          ))}
        </div>

        {hourMarks.map((min) => (
          <div
            key={min}
            className="pointer-events-none absolute inset-x-0 h-px bg-line"
            style={{ top: `${topFor(min)}%` }}
          />
        ))}

        {stylists.map((stylist) => {
          const dayBookings = bookings.filter((b) => b.stylistId === stylist.id);
          const dayBlocks = blocks.filter((b) => b.stylistId === null || b.stylistId === stylist.id);

          return (
            <div key={stylist.id} className="relative border-l border-line">
              {dayBlocks.map((block) => {
                const startMin = block.startMin ?? window.openMin;
                const endMin = block.endMin ?? window.closeMin;
                return (
                  <div
                    key={block.id}
                    className="absolute inset-x-1 overflow-hidden rounded-lg border border-dashed border-ink-soft/40 bg-paper-3/70 px-2 py-1 text-xs text-ink-soft"
                    style={{ top: `${topFor(startMin)}%`, height: `${heightFor(startMin, endMin)}%` }}
                  >
                    <p className="font-medium">Blockiert{block.stylistId === null ? " (Salon)" : ""}</p>
                    {block.reason && <p className="truncate">{block.reason}</p>}
                  </div>
                );
              })}

              {dayBookings.map((booking) => {
                const services = findServices(booking.serviceIds);
                const label = services.length > 0 ? services.map((s) => s.name).join(" + ") : booking.serviceIds.join(", ");
                const endMin = booking.startMin + booking.durationMin;
                return (
                  <div
                    key={booking.id}
                    className="absolute inset-x-1 overflow-hidden rounded-lg bg-btn px-2 py-1 text-xs text-on-btn shadow-sm"
                    style={{ top: `${topFor(booking.startMin)}%`, height: `${heightFor(booking.startMin, endMin)}%` }}
                  >
                    <p className="font-data">{minutesToLabel(booking.startMin)}</p>
                    <p className="truncate font-medium">{booking.customerName}</p>
                    <p className="truncate text-on-btn/80">{label}</p>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
