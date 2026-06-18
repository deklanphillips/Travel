"use client";

import { EntitlementProvider } from "@/lib/entitlement";
import { ThemeProvider } from "@/lib/theme";

// Client-side context providers, wrapped around the app in the root layout.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <EntitlementProvider>{children}</EntitlementProvider>
    </ThemeProvider>
  );
}
