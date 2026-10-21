import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedCustomer } from "@/lib/customerSession";
import { RegisterForm } from "@/components/konto/RegisterForm";

export const metadata: Metadata = {
  title: "Konto erstellen — hairarchie",
};

export default async function CustomerRegisterPage() {
  if (await getAuthenticatedCustomer()) {
    redirect("/konto");
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-paper-2/60 px-5 py-20">
      <div className="w-full max-w-sm rounded-3xl bg-paper p-8 shadow-[0_20px_50px_-20px_var(--shadow)]">
        <p className="font-data text-xs uppercase tracking-[0.2em] text-moss">Mein Konto</p>
        <h1 className="mt-2 text-2xl text-ink">Konto erstellen</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Hattest du schon einen Termin bei uns? Nutze einfach die gleiche E-Mail-Adresse — deine bisherigen Termine
          und Punkte erscheinen dann automatisch in deinem Konto.
        </p>
        <div className="mt-6">
          <RegisterForm />
        </div>
        <p className="mt-6 text-sm text-ink-soft">
          Schon ein Konto?{" "}
          <Link href="/konto/login" className="focus-ring rounded text-ink underline hover:text-moss">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}
