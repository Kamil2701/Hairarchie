"use client";

import { useActionState } from "react";
import { registerCustomer, type RegisterFormState } from "@/lib/customerActions";

const initialState: RegisterFormState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerCustomer, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-ink-soft">Name</span>
        <input
          name="name"
          type="text"
          required
          autoFocus
          autoComplete="name"
          className="focus-ring rounded-xl border border-line bg-transparent px-4 py-3 text-ink"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-ink-soft">E-Mail</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="focus-ring rounded-xl border border-line bg-transparent px-4 py-3 text-ink"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-ink-soft">Telefon (optional, für Rückfragen)</span>
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          className="focus-ring rounded-xl border border-line bg-transparent px-4 py-3 text-ink"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-ink-soft">Passwort</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="focus-ring rounded-xl border border-line bg-transparent px-4 py-3 text-ink"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-ink-soft">Passwort wiederholen</span>
        <input
          name="passwordConfirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="focus-ring rounded-xl border border-line bg-transparent px-4 py-3 text-ink"
        />
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-ink">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="focus-ring rounded-full bg-moss px-7 py-3 font-medium text-paper transition-colors enabled:hover:bg-moss-deep disabled:opacity-40"
      >
        {pending ? "Lege Konto an …" : "Konto erstellen"}
      </button>
    </form>
  );
}
