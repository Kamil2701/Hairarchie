"use client";

import { useEffect, useMemo, useState, useTransition, useActionState } from "react";
import type { Tier, Service } from "@/lib/data/services";
import { formatPrice, totalDurationMin, totalPriceCents } from "@/lib/data/services";
import type { Stylist } from "@/lib/data/stylists";
import { minutesToLabel, type SlotInfo } from "@/lib/availability";
import { getDaySlots, submitBooking, type BookingFormState } from "@/lib/actions";

type Props = {
  tiers: Tier[];
  addOnServices: Service[];
  stylists: Stylist[];
  dates: string[];
};

const STEPS = ["Leistung", "Stylist:in", "Termin", "Deine Daten"] as const;

function formatDate(dateISO: string): { weekday: string; day: string } {
  const [y, m, d] = dateISO.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return {
    weekday: date.toLocaleDateString("de-DE", { weekday: "short" }),
    day: date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
  };
}

const initialState: BookingFormState = {};

export function BookingFlow({ tiers, addOnServices, stylists, dates }: Props) {
  const [step, setStep] = useState(0);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [stylistId, setStylistId] = useState("");
  const [date, setDate] = useState("");
  const [startMin, setStartMin] = useState<number | null>(null);

  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [isPendingSlots, startSlotsTransition] = useTransition();

  const [addOnError, setAddOnError] = useState<string | null>(null);
  const [isPendingAddOn, startAddOnTransition] = useTransition();

  const [state, formAction, isSubmitting] = useActionState(submitBooking, initialState);

  const allServices = useMemo(
    () => [...tiers.flatMap((t) => t.services), ...addOnServices],
    [tiers, addOnServices],
  );
  const selectedServices = useMemo(
    () => allServices.filter((s) => serviceIds.includes(s.id)),
    [allServices, serviceIds],
  );
  const duration = totalDurationMin(selectedServices);
  const price = totalPriceCents(selectedServices);
  const stylist = stylists.find((s) => s.id === stylistId);

  function toggleService(id: string) {
    setServiceIds((current) =>
      current.includes(id) ? current.filter((s) => s !== id) : [...current, id],
    );
    setStartMin(null);
  }

  // Extras get added after a time slot is already picked, so adding one
  // can make the appointment run longer than what's actually free —
  // re-check before committing rather than silently overbooking.
  function toggleAddOn(addOnId: string) {
    setAddOnError(null);

    if (serviceIds.includes(addOnId)) {
      setServiceIds((current) => current.filter((id) => id !== addOnId));
      return;
    }

    const candidateIds = [...serviceIds, addOnId];
    startAddOnTransition(async () => {
      if (!stylistId || !date || startMin === null) return;
      const result = await getDaySlots(candidateIds, stylistId, date);
      const stillFits = result.some((s) => s.startMin === startMin && s.available);
      if (stillFits) {
        setServiceIds(candidateIds);
      } else {
        setAddOnError(
          "Passt leider nicht mehr in deinen gewählten Termin. Geh einen Schritt zurück und wähle eine andere Uhrzeit, falls du diesen Zusatz möchtest.",
        );
      }
    });
  }

  useEffect(() => {
    startSlotsTransition(async () => {
      if (serviceIds.length === 0 || !stylistId || !date) {
        setSlots([]);
        return;
      }
      const result = await getDaySlots(serviceIds, stylistId, date);
      setSlots(result);
      setStartMin((current) =>
        current !== null && result.some((s) => s.startMin === current && s.available) ? current : null,
      );
    });
  }, [serviceIds, stylistId, date]);

  if (state.success) {
    return (
      <div className="rounded-3xl bg-paper-2 p-8 sm:p-12">
        <p className="font-data text-xs uppercase tracking-[0.2em] text-moss">Bestätigt</p>
        <h2 className="mt-3 text-3xl text-ink">Bis bald!</h2>
        <p className="mt-4 text-ink-soft">
          Dein Termin für{" "}
          <strong className="text-ink">{selectedServices.map((s) => s.name).join(" + ")}</strong> bei{" "}
          <strong className="text-ink">{stylist?.name}</strong>
          {date && startMin !== null ? (
            <>
              {" "}
              am <strong className="text-ink">{formatDate(date).day}</strong> um{" "}
              <strong className="text-ink">{minutesToLabel(startMin)} Uhr</strong>
            </>
          ) : null}{" "}
          ist reserviert. Eine Bestätigung kannst du bei Fragen jederzeit telefonisch anfragen.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction}>
      {serviceIds.map((id) => (
        <input key={id} type="hidden" name="serviceIds" value={id} readOnly />
      ))}
      <input type="hidden" name="stylistId" value={stylistId} readOnly />
      <input type="hidden" name="date" value={date} readOnly />
      <input type="hidden" name="startMin" value={startMin ?? ""} readOnly />

      <ol className="mb-9 flex flex-wrap gap-x-6 gap-y-2 font-data text-xs uppercase tracking-[0.15em]">
        {STEPS.map((label, i) => (
          <li key={label} className={i === step ? "text-moss" : i < step ? "text-ink-soft" : "text-line"}>
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <fieldset className="flex flex-col gap-8">
          <legend className="sr-only">Leistungen wählen</legend>
          <p className="-mt-2 text-sm text-ink-soft">
            Wähle eine oder mehrere Leistungen — wir kombinieren sie zu einem Termin.
          </p>
          {tiers.map((tier) => (
            <div key={tier.id}>
              <p className="mb-3 text-sm font-medium text-ink-soft">{tier.name}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {tier.services.map((s) => (
                  <label
                    key={s.id}
                    className={`focus-ring flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                      serviceIds.includes(s.id) ? "border-moss bg-paper-2" : "border-line hover:bg-paper-2/60"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="accent-[var(--moss)]"
                        checked={serviceIds.includes(s.id)}
                        onChange={() => toggleService(s.id)}
                      />
                      <span className="text-sm text-ink">{s.name}</span>
                    </span>
                    <span className="font-data text-sm text-ink-soft">{formatPrice(s.priceCents)}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          {selectedServices.length > 0 && (
            <div className="flex items-center justify-between rounded-2xl bg-paper-2 px-5 py-4 text-sm">
              <span className="text-ink-soft">
                {selectedServices.length} Leistung{selectedServices.length > 1 ? "en" : ""} · {duration} Min.
              </span>
              <span className="font-data text-base font-medium text-ink">{formatPrice(price)}</span>
            </div>
          )}

          <button
            type="button"
            disabled={serviceIds.length === 0}
            onClick={() => setStep(1)}
            className="focus-ring self-start rounded-full bg-moss px-7 py-3 font-medium text-paper transition-colors enabled:hover:bg-moss-deep disabled:opacity-40"
          >
            Weiter
          </button>
        </fieldset>
      )}

      {step === 1 && (
        <fieldset className="flex flex-col gap-6">
          <legend className="sr-only">Stylist:in wählen</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {stylists.map((s) => (
              <label
                key={s.id}
                className={`focus-ring flex cursor-pointer flex-col items-start gap-1 rounded-2xl border px-4 py-4 transition-colors ${
                  stylistId === s.id ? "border-moss bg-paper-2" : "border-line hover:bg-paper-2/60"
                }`}
              >
                <input
                  type="radio"
                  name="stylist-picker"
                  className="sr-only"
                  checked={stylistId === s.id}
                  onChange={() => {
                    setStylistId(s.id);
                    setStartMin(null);
                  }}
                />
                <span className="font-display text-lg font-semibold text-ink">{s.name}</span>
                <span className="text-sm text-moss">{s.role}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="focus-ring rounded-full border border-line px-7 py-3 font-medium text-ink hover:bg-paper-2"
            >
              Zurück
            </button>
            <button
              type="button"
              disabled={!stylistId}
              onClick={() => setStep(2)}
              className="focus-ring rounded-full bg-moss px-7 py-3 font-medium text-paper transition-colors enabled:hover:bg-moss-deep disabled:opacity-40"
            >
              Weiter
            </button>
          </div>
        </fieldset>
      )}

      {step === 2 && (
        <fieldset className="flex flex-col gap-6">
          <legend className="sr-only">Datum und Uhrzeit wählen</legend>

          <div className="flex flex-wrap gap-2">
            {dates.map((d) => {
              const { weekday, day } = formatDate(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDate(d);
                    setStartMin(null);
                  }}
                  className={`focus-ring rounded-2xl border px-3 py-2 text-center transition-colors ${
                    date === d ? "border-moss bg-paper-2" : "border-line hover:bg-paper-2/60"
                  }`}
                >
                  <span className="block text-[0.65rem] uppercase tracking-wide text-ink-soft">{weekday}</span>
                  <span className="font-data text-sm text-ink">{day}</span>
                </button>
              );
            })}
          </div>

          {date && (
            <div>
              {isPendingSlots ? (
                <p className="text-sm text-ink-soft">Verfügbare Zeiten werden geladen …</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-ink-soft">An diesem Tag haben wir geschlossen. Bitte anderes Datum wählen.</p>
              ) : (
                <>
                  {slots.every((s) => !s.available) && (
                    <p className="mb-3 text-sm text-ink-soft">
                      An diesem Tag schon alles vergeben — bitte anderes Datum wählen.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot.startMin}
                        type="button"
                        disabled={!slot.available}
                        aria-label={
                          slot.available
                            ? minutesToLabel(slot.startMin)
                            : `${minutesToLabel(slot.startMin)}, bereits vergeben`
                        }
                        onClick={() => setStartMin(slot.startMin)}
                        className={`focus-ring rounded-full border px-4 py-2 font-data text-sm transition-colors ${
                          !slot.available
                            ? "cursor-not-allowed border-line text-ink-soft/40 line-through"
                            : startMin === slot.startMin
                              ? "border-moss bg-moss text-paper"
                              : "border-line text-ink hover:bg-paper-2"
                        }`}
                      >
                        {minutesToLabel(slot.startMin)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="focus-ring rounded-full border border-line px-7 py-3 font-medium text-ink hover:bg-paper-2"
            >
              Zurück
            </button>
            <button
              type="button"
              disabled={startMin === null}
              onClick={() => setStep(3)}
              className="focus-ring rounded-full bg-moss px-7 py-3 font-medium text-paper transition-colors enabled:hover:bg-moss-deep disabled:opacity-40"
            >
              Weiter
            </button>
          </div>
        </fieldset>
      )}

      {step === 3 && (
        <fieldset className="flex flex-col gap-5">
          <legend className="sr-only">Deine Daten</legend>

          <div className="rounded-2xl bg-paper-2 px-5 py-4 text-sm text-ink-soft">
            <p className="text-ink">{selectedServices.map((s) => s.name).join(" + ")}</p>
            <p className="mt-1">
              {stylist?.name} · {date && formatDate(date).day}
              {startMin !== null ? `, ${minutesToLabel(startMin)} Uhr` : ""} · {duration} Min. ·{" "}
              <span className="font-data text-ink">{formatPrice(price)}</span>
            </p>
          </div>

          {addOnServices.length > 0 && (
            <div className="rounded-2xl border border-line px-5 py-4">
              <p className="text-sm text-ink">Noch etwas dazu?</p>
              <p className="mt-1 text-sm text-ink-soft">Kleine Extras zu deinem Termin dazubuchen.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {addOnServices.map((s) => (
                  <label
                    key={s.id}
                    className={`focus-ring flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                      serviceIds.includes(s.id) ? "border-moss bg-paper-2" : "border-line hover:bg-paper-2/60"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="accent-[var(--moss)]"
                        checked={serviceIds.includes(s.id)}
                        disabled={isPendingAddOn}
                        onChange={() => toggleAddOn(s.id)}
                      />
                      <span className="text-sm text-ink">{s.name}</span>
                    </span>
                    <span className="font-data text-sm text-ink-soft">{formatPrice(s.priceCents)}</span>
                  </label>
                ))}
              </div>
              {isPendingAddOn && <p className="mt-2 text-xs text-ink-soft">Wird geprüft …</p>}
              {addOnError && (
                <p role="alert" className="mt-2 text-xs text-ink">
                  {addOnError}
                </p>
              )}
            </div>
          )}

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-ink-soft">Name</span>
            <input
              name="customerName"
              required
              minLength={2}
              className="focus-ring rounded-xl border border-line bg-transparent px-4 py-3 text-ink"
              placeholder="Vor- und Nachname"
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-ink-soft">Telefon</span>
              <input
                name="customerPhone"
                required
                type="tel"
                className="focus-ring rounded-xl border border-line bg-transparent px-4 py-3 text-ink"
                placeholder="0421 …"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-ink-soft">E-Mail</span>
              <input
                name="customerEmail"
                required
                type="email"
                className="focus-ring rounded-xl border border-line bg-transparent px-4 py-3 text-ink"
                placeholder="du@beispiel.de"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-ink-soft">Anmerkung (optional)</span>
            <textarea
              name="notes"
              rows={3}
              className="focus-ring rounded-xl border border-line bg-transparent px-4 py-3 text-ink"
              placeholder="z. B. Wunschlänge, Allergien"
            />
          </label>

          {state.error && (
            <p role="alert" className="rounded-xl bg-amber-soft/40 px-4 py-3 text-sm text-ink">
              {state.error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="focus-ring rounded-full border border-line px-7 py-3 font-medium text-ink hover:bg-paper-2"
            >
              Zurück
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="focus-ring rounded-full bg-moss px-7 py-3 font-medium text-paper transition-colors enabled:hover:bg-moss-deep disabled:opacity-40"
            >
              {isSubmitting ? "Wird gebucht …" : "Termin verbindlich buchen"}
            </button>
          </div>
        </fieldset>
      )}
    </form>
  );
}
