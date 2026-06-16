"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { loadCheckout, type CheckoutData } from "@/lib/checkout";
import { getAirport } from "@/lib/airports";
import {
  CABIN_LABELS,
  formatDuration,
  formatMiles,
  formatTime,
  formatUSD,
} from "@/lib/format";

type PayMethod = "cash" | "miles";

export default function CheckoutPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<CheckoutData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [method, setMethod] = useState<PayMethod>("cash");
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    const stored = loadCheckout();
    if (stored && stored.deal.id === decodeURIComponent(params.id)) {
      setData(stored);
      // Default to whichever payment method is available / better value.
      if (!stored.deal.cashPrice && stored.deal.award) setMethod("miles");
    }
    setLoaded(true);
  }, [params.id]);

  if (!loaded) {
    return <Shell>{null}</Shell>;
  }

  if (!data) {
    return (
      <Shell>
        <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-ink-800/60 p-8 text-center">
          <h1 className="text-xl font-semibold text-white">
            This booking session expired
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            We couldn&apos;t find the flight you selected. Please run your search
            again and pick a flight.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-ink-900 hover:bg-slate-100"
          >
            Back to search
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <CheckoutBody
        data={data}
        method={method}
        setMethod={setMethod}
        booked={booked}
        onBook={() => setBooked(true)}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">{children}</div>
    </main>
  );
}

function CheckoutBody({
  data,
  method,
  setMethod,
  booked,
  onBook,
}: {
  data: CheckoutData;
  method: PayMethod;
  setMethod: (m: PayMethod) => void;
  booked: boolean;
  onBook: () => void;
}) {
  const { deal, params } = data;
  const hasCash = deal.cashPrice !== null;
  const hasMiles = deal.award !== null;

  const originCity = getAirport(deal.origin)?.city ?? deal.origin;
  const destCity = getAirport(deal.destination)?.city ?? deal.destination;

  const total = useMemo(() => {
    if (method === "miles" && deal.award) {
      return `${formatMiles(deal.award.miles * params.passengers)} miles + ${formatUSD(
        deal.award.fees * params.passengers,
      )}`;
    }
    return formatUSD((deal.cashPrice ?? 0) * 1); // cashPrice already totals passengers
  }, [method, deal, params.passengers]);

  if (booked) {
    return <Confirmation deal={deal} originCity={originCity} destCity={destCity} />;
  }

  return (
    <>
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
            clipRule="evenodd"
          />
        </svg>
        Back to results
      </Link>

      <h1 className="text-2xl font-bold text-white sm:text-3xl">
        Complete your booking
      </h1>
      <p className="mt-1 text-slate-400">
        {originCity} → {destCity} · {CABIN_LABELS[deal.cabin]} ·{" "}
        {params.passengers} {params.passengers === 1 ? "traveler" : "travelers"}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Left: forms */}
        <div className="space-y-6">
          <Card title="Traveler details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" placeholder="Jane" />
              <Field label="Last name" placeholder="Doe" />
              <Field label="Email" placeholder="jane@example.com" type="email" />
              <Field label="Phone" placeholder="+1 555 010 0100" type="tel" />
            </div>
          </Card>

          <Card title="Payment method">
            <div className="flex flex-wrap gap-3">
              {hasCash && (
                <MethodOption
                  active={method === "cash"}
                  onClick={() => setMethod("cash")}
                  title="Pay with cash"
                  subtitle={deal.cashPrice ? formatUSD(deal.cashPrice) : "—"}
                />
              )}
              {hasMiles && deal.award && (
                <MethodOption
                  active={method === "miles"}
                  onClick={() => setMethod("miles")}
                  title={`Pay with ${deal.award.program}`}
                  subtitle={`${formatMiles(
                    deal.award.miles * params.passengers,
                  )} mi + ${formatUSD(deal.award.fees * params.passengers)}`}
                />
              )}
            </div>

            <div className="mt-5 space-y-4">
              {method === "cash" ? (
                <>
                  <Field label="Card number" placeholder="4242 4242 4242 4242" />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Expiry" placeholder="MM / YY" />
                    <Field label="CVC" placeholder="123" />
                  </div>
                </>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label={`${deal.award?.program} account #`}
                    placeholder="XXXXXXXX"
                  />
                  <Field label="Account PIN" placeholder="••••" type="password" />
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right: itinerary summary */}
        <aside className="space-y-4">
          <Card title="Your flight">
            <ItinerarySummary deal={deal} />
          </Card>

          <div className="rounded-2xl border border-white/10 bg-ink-800/60 p-5">
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>Total ({method === "miles" ? "miles" : "cash"})</span>
              <span className="text-lg font-bold text-white">{total}</span>
            </div>
            <button
              onClick={onBook}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-brand-500 to-purple-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:opacity-95"
            >
              Confirm booking
            </button>
            <p className="mt-3 text-center text-xs text-slate-500">
              Demo checkout — no payment is taken and no booking is made.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

function ItinerarySummary({ deal }: { deal: CheckoutData["deal"] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-white">
          {deal.segments[0].carrier}
        </span>
        <span className="text-slate-400">
          {deal.stops === 0
            ? "Nonstop"
            : `${deal.stops} stop${deal.stops > 1 ? "s" : ""}`}
        </span>
      </div>
      <ol className="space-y-3">
        {deal.segments.map((s, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <div className="mt-1 flex flex-col items-center">
              <span className="h-2 w-2 rounded-full bg-brand-400" />
              {i < deal.segments.length - 1 && (
                <span className="my-1 h-8 w-px bg-white/10" />
              )}
            </div>
            <div>
              <p className="font-medium text-white">
                {s.from} → {s.to}
              </p>
              <p className="text-xs text-slate-400">
                {formatTime(s.departTime)} – {formatTime(s.arriveTime)} ·{" "}
                {s.carrierCode} {s.flightNumber}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <div className="border-t border-white/5 pt-3 text-xs text-slate-400">
        Total travel time {formatDuration(deal.durationMinutes)}
      </div>
    </div>
  );
}

function Confirmation({
  deal,
  originCity,
  destCity,
}: {
  deal: CheckoutData["deal"];
  originCity: string;
  destCity: string;
}) {
  const ref = deal.id.slice(0, 6).toUpperCase();
  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/15">
        <svg className="h-8 w-8 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-white">Booking confirmed</h1>
      <p className="mt-2 text-slate-400">
        Your {deal.segments[0].carrier} flight from {originCity} to {destCity} is
        booked. A confirmation has been sent to your email.
      </p>
      <p className="mt-4 inline-block rounded-lg border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-slate-300">
        Confirmation code{" "}
        <span className="font-mono font-semibold text-white">{ref}</span>
      </p>
      <div className="mt-8">
        <Link
          href="/"
          className="inline-block rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-ink-900 hover:bg-slate-100"
        >
          Search more flights
        </Link>
      </div>
    </div>
  );
}

/* --- small presentational helpers --- */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-ink-800/60 p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  placeholder,
  type = "text",
}: {
  label: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-400">
        {label}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-ink-900 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
      />
    </label>
  );
}

function MethodOption({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl border px-4 py-3 text-left transition ${
        active
          ? "border-brand-500 bg-brand-500/10"
          : "border-white/10 bg-ink-900/40 hover:border-white/20"
      }`}
    >
      <span className="block text-sm font-medium text-white">{title}</span>
      <span className="block text-xs text-slate-400">{subtitle}</span>
    </button>
  );
}
