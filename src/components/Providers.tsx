"use client";

import { EntitlementProvider } from "@/lib/entitlement";

// Client-side context providers, wrapped around the app in the root layout.
export function Providers({ children }: { children: React.ReactNode }) {
  return <EntitlementProvider>{children}</EntitlementProvider>;
}
