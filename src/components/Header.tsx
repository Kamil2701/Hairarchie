"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "/#leistungen", label: "Leistungen" },
  { href: "/#team", label: "Team" },
  { href: "/#salon", label: "Salon" },
  { href: "/#kontakt", label: "Kontakt" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="focus-ring logo-mark rounded text-xl text-ink">
          Hairarchie
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="focus-ring rounded text-sm text-ink-soft transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/konto"
            className="focus-ring hidden rounded-full text-sm text-ink-soft transition-colors hover:text-ink sm:inline-block"
          >
            Mein Konto
          </Link>
          <Link
            href="/termin"
            className="focus-ring hidden rounded-full bg-moss px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-moss-deep sm:inline-block"
          >
            Termin buchen
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Menü öffnen"
            className="focus-ring rounded p-2 md:hidden"
          >
            <span className="sr-only">Menü</span>
            <div className="flex w-6 flex-col gap-1.5">
              <span className={`h-0.5 bg-ink transition-transform ${open ? "translate-y-2 rotate-45" : ""}`} />
              <span className={`h-0.5 bg-ink transition-opacity ${open ? "opacity-0" : ""}`} />
              <span className={`h-0.5 bg-ink transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`} />
            </div>
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-line bg-paper px-5 pb-6 pt-2 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="focus-ring rounded px-2 py-3 text-base text-ink"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/konto"
              onClick={() => setOpen(false)}
              className="focus-ring rounded px-2 py-3 text-base text-ink"
            >
              Mein Konto
            </Link>
            <Link
              href="/termin"
              onClick={() => setOpen(false)}
              className="focus-ring mt-2 rounded-full bg-moss px-5 py-3 text-center text-sm font-medium text-paper"
            >
              Termin buchen
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
