"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// Front-end entitlement state for the paywall.
//
// PHASE 1 (current): "Pro" status is stubbed in localStorage so the gated
// experience is fully testable without any billing backend. `startCheckout`
// just flips the flag on.
//
// PHASE 2 (after deploy): replace the body of `startCheckout` with a redirect
// to a real Stripe Checkout session, and derive `isPro` from the authenticated
// user's subscription (server session) instead of localStorage.

interface EntitlementValue {
  isPro: boolean;
  loading: boolean;
  startCheckout: () => void;
  cancel: () => void;
}

const EntitlementContext = createContext<EntitlementValue | null>(null);
const STORAGE_KEY = "pointfare:pro";

export function EntitlementProvider({ children }: { children: React.ReactNode }) {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      setIsPro(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // ignore (private mode, etc.)
    }
    setLoading(false);
  }, []);

  const startCheckout = useCallback(() => {
    // TODO (Phase 2): redirect to Stripe Checkout, e.g.
    //   const res = await fetch("/api/checkout", { method: "POST" });
    //   window.location.href = (await res.json()).url;
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setIsPro(true);
  }, []);

  const cancel = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setIsPro(false);
  }, []);

  return (
    <EntitlementContext.Provider value={{ isPro, loading, startCheckout, cancel }}>
      {children}
    </EntitlementContext.Provider>
  );
}

export function useEntitlement(): EntitlementValue {
  const value = useContext(EntitlementContext);
  if (!value) {
    throw new Error("useEntitlement must be used within an EntitlementProvider");
  }
  return value;
}
