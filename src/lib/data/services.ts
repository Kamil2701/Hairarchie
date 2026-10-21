export type Service = {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
  /** Small grooming extras — not offered as a standalone first choice,
   * only suggested as an add-on once a real service is already picked. */
  addOn?: boolean;
};

export type Tier = {
  id: string;
  level: number;
  name: string;
  description: string;
  services: Service[];
};

/**
 * Sourced from the salon's current SumUp booking page (sumupbookings.com/hairarchie).
 * Grouped into four ascending tiers by price — the "Hairarchie" the brand name plays on.
 */
export const tiers: Tier[] = [
  {
    id: "basis",
    level: 1,
    name: "Basis",
    description: "Schnelle Handgriffe für den Alltag",
    services: [
      { id: "maschinen-haarschnitt", name: "Maschinen Haarschnitt", durationMin: 45, priceCents: 1100 },
      { id: "was-komplett", name: "Waschen komplett", durationMin: 45, priceCents: 1000, addOn: true },
      { id: "wax-gesicht", name: "Wax Gesicht", durationMin: 45, priceCents: 500, addOn: true },
      { id: "wachs-nase", name: "Wachs Nase", durationMin: 45, priceCents: 300, addOn: true },
      { id: "wax-ohren", name: "Wax Ohren", durationMin: 45, priceCents: 300, addOn: true },
    ],
  },
  {
    id: "klassiker",
    level: 2,
    name: "Klassiker",
    description: "Der Standard, auf den man sich verlässt",
    services: [
      { id: "herren-haarschnitt", name: "Herren Haarschnitt", durationMin: 30, priceCents: 1499 },
      { id: "waschen-schneiden", name: "Waschen Schneiden", durationMin: 30, priceCents: 1800 },
      { id: "bart", name: "Bart", durationMin: 45, priceCents: 1300 },
      { id: "kinder-haarschnitt", name: "Kinder Haarschnitt", durationMin: 45, priceCents: 1200 },
      { id: "kinder-fade", name: "Kinder Fade", durationMin: 45, priceCents: 1299 },
    ],
  },
  {
    id: "bart-kombi",
    level: 3,
    name: "Bart & Kombi",
    description: "Haar und Bart in einem Termin",
    services: [
      { id: "haare-bart-maschine", name: "Haare & Bart (Maschine)", durationMin: 45, priceCents: 2000 },
      { id: "herren-haare-bart", name: "Herren Haare & Bart", durationMin: 45, priceCents: 2500 },
      { id: "waschen-schneiden-bart", name: "Waschen, Schneiden & Bart", durationMin: 45, priceCents: 2800 },
    ],
  },
  {
    id: "premium",
    level: 4,
    name: "Premium",
    description: "Die volle Behandlung",
    services: [
      { id: "premium-paket", name: "Premium Paket", durationMin: 45, priceCents: 3500 },
      { id: "deluxe", name: "Deluxe", durationMin: 45, priceCents: 4499 },
      { id: "straehnen-schneiden", name: "Strähnen & Schnitt", durationMin: 45, priceCents: 7600 },
    ],
  },
];

export const allServices: Service[] = tiers.flatMap((tier) => tier.services);
export const addOnServices: Service[] = allServices.filter((s) => s.addOn);

/** Tiers with add-on extras filtered out, for the main "pick a service"
 * step — a tier that would end up empty is dropped entirely. */
export const mainTiers: Tier[] = tiers
  .map((tier) => ({ ...tier, services: tier.services.filter((s) => !s.addOn) }))
  .filter((tier) => tier.services.length > 0);

export function findService(serviceId: string): Service | undefined {
  return allServices.find((service) => service.id === serviceId);
}

/** Resolves multiple ids, silently dropping unknown ones, preserving `ids` order. */
export function findServices(ids: string[]): Service[] {
  return ids
    .map((id) => findService(id))
    .filter((service): service is Service => service !== undefined);
}

export function totalDurationMin(services: Service[]): number {
  return services.reduce((sum, s) => sum + s.durationMin, 0);
}

export function totalPriceCents(services: Service[]): number {
  return services.reduce((sum, s) => sum + s.priceCents, 0);
}

export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}
