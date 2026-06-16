"use client";

import { useEntitlement } from "@/lib/entitlement";

// CTA button for a pricing tier. The Pro (featured) tier triggers checkout.
export function PlanButton({
  featured,
  label,
}: {
  featured: boolean;
  label: string;
}) {
  const { isPro, startCheckout } = useEntitlement();

  const className = `w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
    featured
      ? "bg-white text-ink-900 hover:bg-slate-100"
      : "bg-white/5 text-white hover:bg-white/10"
  }`;

  if (featured) {
    return (
      <button onClick={startCheckout} disabled={isPro} className={className}>
        {isPro ? "You're on Pro ✓" : label}
      </button>
    );
  }

  return <button className={className}>{label}</button>;
}
