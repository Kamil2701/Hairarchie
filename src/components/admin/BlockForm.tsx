"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Stylist } from "@/lib/data/stylists";
import { minutesToLabel } from "@/lib/availability";
import { createBlockAction, type BlockFormState } from "@/lib/actions";

const initialState: BlockFormState = {};

function formatDayLabel(dateISO: string): string {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

export function BlockForm({ stylists }: { stylists: Stylist[] }) {
  const [state, formAction, isPending] = useActionState(createBlockAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const forceRef = useRef<HTMLInputElement>(null);

  // Every field is controlled: after the "check" submit re-renders this
  // Client Component from a fresh server response, uncontrolled inputs
  // would snap back to empty (no defaultValue survives that round trip)
  // — which silently blocked the follow-up "confirm anyway" submit on
  // the browser's own required-field validation. Controlled state is
  // what keeps the user's input in place across that re-render.
  const [stylistId, setStylistId] = useState("");
  const [hasTime, setHasTime] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!state.success) return;
    const raf = requestAnimationFrame(() => {
      formRef.current?.reset();
      setStylistId("");
      setHasTime(false);
      setStartDate("");
      setEndDate("");
      setStartTime("");
      setEndTime("");
      setReason("");
    });
    return () => cancelAnimationFrame(raf);
  }, [state.success]);

  const hasConflicts = Boolean(state.conflicts && state.conflicts.length > 0);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <input ref={forceRef} type="hidden" name="force" defaultValue="" />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-ink-soft">Wer</span>
          <select
            name="stylistId"
            value={stylistId}
            onChange={(e) => setStylistId(e.target.value)}
            className="focus-ring rounded-xl border border-line bg-transparent px-4 py-3 text-ink"
          >
            <option value="">Ganzer Salon</option>
            {stylists.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 self-end pb-3 text-sm">
          <input
            type="checkbox"
            name="hasTime"
            checked={hasTime}
            onChange={(e) => setHasTime(e.target.checked)}
            className="accent-[var(--moss)]"
          />
          <span className="text-ink-soft">Nur bestimmte Uhrzeit</span>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-ink-soft">Von</span>
          <input
            type="date"
            name="startDate"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="focus-ring rounded-xl border border-line bg-transparent px-4 py-3 text-ink"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-ink-soft">Bis</span>
          <input
            type="date"
            name="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="focus-ring rounded-xl border border-line bg-transparent px-4 py-3 text-ink"
          />
        </label>

        {hasTime && (
          <>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-ink-soft">Startzeit</span>
              <input
                type="time"
                name="startTime"
                required={hasTime}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="focus-ring rounded-xl border border-line bg-transparent px-4 py-3 text-ink"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-ink-soft">Endzeit</span>
              <input
                type="time"
                name="endTime"
                required={hasTime}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="focus-ring rounded-xl border border-line bg-transparent px-4 py-3 text-ink"
              />
            </label>
          </>
        )}
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-ink-soft">Notiz (optional)</span>
        <input
          type="text"
          name="reason"
          placeholder="z. B. Urlaub, Krank, Betriebsausflug"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="focus-ring rounded-xl border border-line bg-transparent px-4 py-3 text-ink"
        />
      </label>

      {state.error && (
        <p role="alert" className="rounded-xl bg-amber-soft/40 px-4 py-3 text-sm text-ink">
          {state.error}
        </p>
      )}

      {hasConflicts && state.conflicts && (
        <div className="rounded-xl border border-dashed border-ink-soft/40 px-4 py-3 text-sm">
          <p className="text-ink">
            In diesem Zeitraum {state.conflicts.length === 1 ? "gibt es bereits einen Termin" : `gibt es bereits ${state.conflicts.length} Termine`}:
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-ink-soft">
            {state.conflicts.map((c, i) => (
              <li key={i} className="font-data">
                {formatDayLabel(c.date)}, {minutesToLabel(c.startMin)} Uhr — {c.customerName} ({c.serviceLabel})
              </li>
            ))}
          </ul>
          <p className="mt-2 text-ink-soft">
            Diese Termine bleiben bestehen — bitte melde dich selbst bei den Kund:innen, falls nötig.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isPending}
          onClick={() => {
            if (forceRef.current) forceRef.current.value = "";
          }}
          className="focus-ring self-start rounded-full border border-line px-6 py-3 text-sm font-medium text-ink transition-colors enabled:hover:bg-paper-2 disabled:opacity-40"
        >
          {isPending ? "Wird geprüft …" : "Zeitraum blockieren"}
        </button>
        {hasConflicts && (
          <button
            type="submit"
            disabled={isPending}
            onClick={() => {
              if (forceRef.current) forceRef.current.value = "1";
            }}
            className="focus-ring self-start rounded-full bg-moss px-6 py-3 text-sm font-medium text-paper transition-colors enabled:hover:bg-moss-deep disabled:opacity-40"
          >
            Trotzdem blockieren
          </button>
        )}
      </div>
    </form>
  );
}
