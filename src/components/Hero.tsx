import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute -right-16 top-[-3rem] h-[24rem] w-[19rem] rounded-t-[9.5rem] bg-moss/15 sm:-right-6 sm:h-[30rem] sm:w-[23rem] sm:rounded-t-[11.5rem]"
      />
      <div
        aria-hidden
        className="absolute -left-20 bottom-[-3rem] h-56 w-40 rounded-t-[5rem] bg-amber/20"
      />

      <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
        <p className="font-data text-xs uppercase tracking-[0.2em] text-moss">
          Bremen · Hemelingen
        </p>

        <h1 className="mt-5 max-w-3xl text-5xl leading-[1.05] text-ink sm:text-7xl">
          Deine Stufe der Hairarchie.
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
          Fades, Bartkonturen und klassische Schnitte in der Hemelinger Heerstraße —
          modern, ohne Umwege, mit Zeit für dich statt für die Wartebank.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link
            href="/termin"
            className="focus-ring rounded-full bg-moss px-7 py-3.5 font-medium text-paper shadow-[0_10px_30px_-12px_var(--shadow)] transition-transform hover:-translate-y-0.5 hover:bg-moss-deep"
          >
            Termin buchen
          </Link>
          <Link
            href="/#leistungen"
            className="focus-ring rounded-full border border-line px-7 py-3.5 font-medium text-ink transition-colors hover:bg-paper-2"
          >
            Leistungen ansehen
          </Link>
        </div>

        <div className="mt-14 flex items-center gap-3 text-sm text-ink-soft">
          <span className="font-data text-base font-medium text-ink">4,6 ★</span>
          <span>20 Google-Rezensionen</span>
          <span aria-hidden className="text-line">
            /
          </span>
          <span>Mo–Fr 9–19 Uhr · Sa 9–18 Uhr</span>
        </div>
      </div>
    </section>
  );
}
