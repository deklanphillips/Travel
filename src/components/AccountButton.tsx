"use client";

import { useEntitlement } from "@/lib/entitlement";

export function AccountButton() {
  const { isPro, loading, startCheckout, cancel } = useEntitlement();

  if (loading) return <div className="h-9 w-24" />;

  if (isPro) {
    return (
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-500/20 to-purple-500/20 px-3 py-1.5 text-sm font-semibold text-brand-200 ring-1 ring-inset ring-brand-400/30">
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.367-2.447a1 1 0 00-1.176 0l-3.367 2.447c-.784.57-1.838-.196-1.539-1.118l1.286-3.957a1 1 0 00-.363-1.118L2.075 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
          </svg>
          Pro
        </span>
        <button
          onClick={cancel}
          className="text-sm font-medium text-slate-400 transition hover:text-white"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startCheckout}
      className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-900 shadow-lg shadow-brand-500/10 transition hover:bg-slate-100"
    >
      Go Pro
    </button>
  );
}
