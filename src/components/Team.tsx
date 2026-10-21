import { stylists } from "@/lib/data/stylists";

export function Team() {
  return (
    <section id="team" className="bg-paper-2/60 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="max-w-xl">
          <p className="font-data text-xs uppercase tracking-[0.2em] text-moss">Team</p>
          <h2 className="mt-3 text-4xl text-ink sm:text-5xl">Wer dich schneidet</h2>
          <p className="mt-4 text-ink-soft">
            Bei der Buchung wählst du direkt, wer den Termin übernimmt.
          </p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {stylists.map((stylist) => (
            <div key={stylist.id} className="flex flex-col items-start">
              <div className="flex h-36 w-28 items-end justify-center rounded-t-[3.5rem] bg-gradient-to-b from-amber-soft to-moss pb-5">
                <span className="font-display text-3xl font-semibold text-paper">
                  {stylist.name.charAt(0)}
                </span>
              </div>
              <h3 className="mt-5 text-lg text-ink">{stylist.name}</h3>
              <p className="text-sm text-moss">{stylist.role}</p>
              <p className="mt-1 text-sm text-ink-soft">{stylist.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
