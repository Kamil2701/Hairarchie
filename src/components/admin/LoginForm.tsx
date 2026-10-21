"use client";

import { useActionState } from "react";
import { loginAdmin, type LoginFormState } from "@/lib/actions";

const initialState: LoginFormState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAdmin, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-ink-soft">Zugangscode</span>
        <input
          name="password"
          type="password"
          required
          autoFocus
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
        {pending ? "Prüfe …" : "Anmelden"}
      </button>
    </form>
  );
}
