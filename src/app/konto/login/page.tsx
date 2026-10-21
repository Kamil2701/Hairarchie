import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedCustomer } from "@/lib/customerSession";
import { LoginForm } from "@/components/konto/LoginForm";

export const metadata: Metadata = {
  title: "Anmelden — hairarchie",
};

export default async function CustomerLoginPage() {
  if (await getAuthenticatedCustomer()) {
    redirect("/konto");
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-paper-2/60 px-5 py-20">
      <div className="w-full max-w-sm rounded-3xl bg-paper p-8 shadow-[0_20px_50px_-20px_var(--shadow)]">
        <p className="font-data text-xs uppercase tracking-[0.2em] text-moss">Mein Konto</p>
        <h1 className="mt-2 text-2xl text-ink">Anmelden</h1>
        <div className="mt-6">
          <LoginForm />
        </div>
        <p className="mt-6 text-sm text-ink-soft">
          Noch kein Konto?{" "}
          <Link href="/konto/registrieren" className="focus-ring rounded text-ink underline hover:text-moss">
            Jetzt erstellen
          </Link>
        </p>
      </div>
    </div>
  );
}
