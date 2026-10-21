import { tiers, formatPrice } from "@/lib/data/services";

const roman = ["I", "II", "III", "IV"];

export function Services() {
  return (
    <section id="leistungen" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
      <div className="max-w-xl">
        <p className="font-data text-xs uppercase tracking-[0.2em] text-moss">Leistungen</p>
        <h2 className="mt-3 text-4xl text-ink sm:text-5xl">Die Hairarchie</h2>
        <p className="mt-4 text-ink-soft">
          Vier Stufen, ein Prinzip: je mehr Zeit und Handwerk ein Termin braucht, desto
          weiter oben steht er. Jede Leistung lässt sich beim Buchen frei kombinieren.
        </p>
      </div>

      <div className="mt-14 flex flex-col gap-12">
        {tiers.map((tier, i) => (
          <div key={tier.id} className="grid gap-6 border-t border-line pt-8 sm:grid-cols-[minmax(0,9rem)_1fr]">
            <div>
              <span
                className="font-display text-4xl font-semibold text-amber"
                style={{ opacity: 0.55 + i * 0.15 }}
              >
                {roman[i]}
              </span>
              <h3 className="mt-1 text-xl text-ink">{tier.name}</h3>
              <p className="mt-1 text-sm text-ink-soft">{tier.description}</p>
            </div>

            <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {tier.services.map((service) => (
                <li
                  key={service.id}
                  className="flex items-baseline justify-between gap-4 border-b border-dashed border-line pb-3"
                >
                  <span className="text-ink">{service.name}</span>
                  <span className="flex items-baseline gap-3 whitespace-nowrap font-data text-sm text-ink-soft">
                    {service.durationMin} Min.
                    <span className="text-base font-medium text-ink">{formatPrice(service.priceCents)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
