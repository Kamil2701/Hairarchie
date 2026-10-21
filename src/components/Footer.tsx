import Link from "next/link";
import { salon } from "@/lib/data/salon";

export function Footer() {
  return (
    <footer id="kontakt" className="border-t border-line bg-paper-2/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-14 sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <div>
          <p className="logo-mark text-xl text-ink">{salon.name}</p>
          <p className="mt-2 text-sm text-ink-soft">
            {salon.addressLine1}
            <br />
            {salon.addressLine2}
          </p>
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <a href={salon.phoneHref} className="focus-ring rounded text-ink hover:text-moss">
            {salon.phone}
          </a>
          <a href={`mailto:${salon.email}`} className="focus-ring rounded text-ink hover:text-moss">
            {salon.email}
          </a>
          <a
            href={salon.instagram}
            target="_blank"
            rel="noreferrer"
            className="focus-ring rounded text-ink hover:text-moss"
          >
            Instagram
          </a>
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <Link href="/termin" className="focus-ring rounded text-ink hover:text-moss">
            Termin buchen
          </Link>
          <Link href="/konto" className="focus-ring rounded text-ink-soft hover:text-moss">
            Mein Konto
          </Link>
          <Link href="/admin" className="focus-ring rounded text-ink-soft hover:text-moss">
            Team-Login
          </Link>
        </div>
      </div>

      <p className="border-t border-line px-5 py-5 text-xs text-ink-soft sm:px-8">
        © {new Date().getFullYear()} {salon.name}, {salon.city}
      </p>
    </footer>
  );
}
