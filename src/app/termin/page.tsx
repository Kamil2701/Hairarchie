import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { mainTiers, addOnServices } from "@/lib/data/services";
import { stylists } from "@/lib/data/stylists";
import { upcomingOpenDates } from "@/lib/availability";

export const metadata: Metadata = {
  title: "Termin buchen — hairarchie",
  description: "Termin online buchen bei hairarchie in Bremen-Hemelingen.",
};

export default function BookingPage() {
  const dates = upcomingOpenDates(14);

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="font-data text-xs uppercase tracking-[0.2em] text-moss">Termin</p>
          <h1 className="mt-3 text-4xl text-ink sm:text-5xl">Buch deine Stufe</h1>
          <p className="mt-4 max-w-lg text-ink-soft">
            Vier kurze Schritte: Leistung, Stylist:in, Termin, deine Daten.
          </p>

          <div className="mt-10">
            <BookingFlow tiers={mainTiers} addOnServices={addOnServices} stylists={stylists} dates={dates} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
