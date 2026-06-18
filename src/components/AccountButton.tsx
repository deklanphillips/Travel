"use client";

import { useEffect, useRef, useState } from "react";
import { useEntitlement } from "@/lib/entitlement";
import { useTheme, type Theme } from "@/lib/theme";

const THEMES: Theme[] = ["light", "dark", "system"];

export function AccountButton() {
  const { isPro, loading, startCheckout, cancel } = useEntitlement();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
            clipRule="evenodd"
          />
        </svg>
        {isPro && (
          <span className="rounded bg-brand-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
            Pro
          </span>
        )}
        Account
        <span className="text-[10px]">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-white/10 bg-ink-800 p-2 shadow-xl shadow-black/40">
          <div className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Theme
          </div>
          <div className="mb-2 flex gap-1 rounded-lg bg-white/5 p-1">
            {THEMES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`flex-1 rounded-md px-2 py-1 text-xs font-medium capitalize transition ${
                  theme === t
                    ? "bg-white text-ink-900"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="border-t border-white/5 pt-2">
            {loading ? (
              <div className="px-2 py-1.5 text-sm text-slate-500">Loading…</div>
            ) : isPro ? (
              <>
                <div className="flex items-center justify-between px-2 py-1 text-sm text-slate-300">
                  <span>Plan</span>
                  <span className="font-semibold text-brand-300">Pro</span>
                </div>
                <button
                  onClick={() => {
                    cancel();
                    setOpen(false);
                  }}
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  startCheckout();
                  setOpen(false);
                }}
                className="w-full rounded-md bg-white px-2 py-1.5 text-center text-sm font-semibold text-ink-900 transition hover:bg-slate-100"
              >
                Go Pro
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
