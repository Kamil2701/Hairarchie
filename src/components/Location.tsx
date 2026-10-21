import { weeklySchedule } from "@/lib/data/hours";
import { salon } from "@/lib/data/salon";

const CHART_START = 9 * 60;
const CHART_END = 19 * 60;
const CHART_RANGE = CHART_END - CHART_START;
const TICKS = [9, 12, 15, 18];

function tickTop(hour: number): number {
  return 100 - ((hour * 60 - CHART_START) / CHART_RANGE) * 100;
}

export function Location() {
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(salon.mapsQuery)}`;

  return (
    <section id="salon" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
      <p className="font-data text-xs uppercase tracking-[0.2em] text-moss">Salon</p>
      <h2 className="mt-3 max-w-lg text-4xl text-ink sm:text-5xl">Hemelinger Heerstraße 7</h2>

      <div className="mt-10 grid gap-6 sm:grid-cols-[1fr_1.3fr]">
        <div className="flex flex-col justify-between rounded-t-[4rem] bg-paper-2 px-8 py-10 text-ink sm:rounded-t-[5rem] sm:px-10 sm:py-12">
          <div>
            <p className="font-data text-xs uppercase tracking-[0.2em] text-ink-soft">Adresse</p>
            <p className="mt-3 text-lg leading-relaxed">
              {salon.addressLine1}
              <br />
              {salon.addressLine2}
            </p>
            <p className="mt-5 max-w-xs text-sm text-ink-soft">
              Mitten in Hemelingen, gut erreichbar mit Bahn und Bus. Termine bitte
              online buchen — spontane Fragen gerne per Anruf.
            </p>
          </div>
          <a
            href={mapsHref}
            target="_blank"
            rel="noreferrer"
            className="focus-ring mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-moss px-6 py-3 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5 hover:bg-moss-deep"
          >
            Route planen
          </a>
        </div>

        <div className="rounded-3xl bg-paper-3/60 p-7 sm:p-8">
          <div className="flex items-baseline justify-between">
            <p className="font-data text-xs uppercase tracking-[0.2em] text-ink-soft">Öffnungszeiten</p>
            <p className="font-data text-xs text-ink-soft">9–19 Uhr</p>
          </div>

          <div className="relative mt-8 h-48 sm:h-56">
            {TICKS.map((hour) => (
              <div
                key={hour}
                className="absolute inset-x-0 flex items-center gap-2"
                style={{ top: `${tickTop(hour)}%` }}
              >
                <span className="w-6 shrink-0 font-data text-[0.65rem] text-ink-soft/70">{hour}</span>
                <span className="h-px flex-1 bg-line" />
              </div>
            ))}

            <div className="absolute inset-0 left-8 flex items-stretch gap-2.5 sm:gap-3">
              {weeklySchedule.map((day) => {
                const heightPct = day.window
                  ? ((day.window.closeMin - day.window.openMin) / CHART_RANGE) * 100
                  : 0;
                return (
                  <div key={day.short} className="flex flex-1 flex-col justify-end">
                    {day.window ? (
                      <div
                        className="w-full rounded-t-md bg-moss"
                        style={{ height: `${heightPct}%` }}
                      />
                    ) : (
                      <div className="h-1 w-full rounded-full border border-dashed border-ink-soft/40" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex gap-2.5 pl-8 sm:gap-3">
            {weeklySchedule.map((day) => (
              <p key={day.short} className="flex-1 text-center font-data text-xs text-ink-soft">
                {day.short}
              </p>
            ))}
          </div>

          <p className="mt-6 text-sm text-ink-soft">
            Mo–Fr 9–19 Uhr · Sa 9–18 Uhr · So geschlossen
          </p>
        </div>
      </div>
    </section>
  );
}
