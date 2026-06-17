"use client";

import { useState } from "react";
import type { CabinClass } from "@/lib/types";

interface Props {
  origin: string;
  destination: string;
  cabin: CabinClass;
  departDate: string;
  onClose: () => void;
}

export function AlertForm({ origin, destination, cabin, departDate, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [target, setTarget] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          origin,
          destination,
          cabin,
          departDate,
          targetPrice: target || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't save your alert.");
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="mb-4 rounded-2xl border border-brand-400/30 bg-ink-800/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-white">
          🔔 Alert me on {origin} → {destination}
        </p>
        <button
          onClick={onClose}
          className="text-slate-400 transition hover:text-white"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {status === "done" ? (
        <p className="text-sm text-emerald-300">
          You&apos;re set — we&apos;ll email {email} when the price drops.
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="flex-1 rounded-xl border border-white/10 bg-ink-900 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none"
          />
          <input
            type="number"
            min="0"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Target $ (optional)"
            className="w-full rounded-xl border border-white/10 bg-ink-900 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none sm:w-44"
          />
          <button
            type="submit"
            disabled={status === "saving"}
            className="rounded-xl bg-gradient-to-r from-brand-500 to-purple-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
          >
            {status === "saving" ? "Saving…" : "Create alert"}
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}
