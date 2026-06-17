import type { Deal } from "@/lib/types";
import {
  CABIN_LABELS,
  dealValueScore,
  formatDuration,
  formatMiles,
  formatTime,
  formatUSD,
  type DealFlag,
} from "@/lib/format";

function ProgramBadge({ code }: { code: string }) {
  return (
    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded bg-gradient-to-br from-brand-500/30 to-purple-500/30 px-1.5 text-[11px] font-bold text-brand-200 ring-1 ring-inset ring-white/10">
      {code}
    </span>
  );
}

// A Pro-gated badge marking a fare as a deal. Free users see a locked teaser;
// Pro users see how far below the typical price it is.
function DealBadge({
  flag,
  proLocked,
  onUpgrade,
}: {
  flag: DealFlag;
  proLocked: boolean;
  onUpgrade?: () => void;
}) {
  if (proLocked) {
    return (
      <button
        type="button"
        onClick={onUpgrade}
        className="absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow"
      >
        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
            clipRule="evenodd"
          />
        </svg>
        Deal · Pro
      </button>
    );
  }
  return (
    <span className="absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow">
      🔥 Deal · {Math.round(flag.savingsPct * 100)}% below typical
    </span>
  );
}

export function DealCard({
  deal,
  isBest,
  dealFlag,
  proLocked,
  onUpgrade,
}: {
  deal: Deal;
  isBest?: boolean;
  dealFlag?: DealFlag;
  proLocked?: boolean;
  onUpgrade?: () => void;
}) {
  const first = deal.segments[0];
  const last = deal.segments[deal.segments.length - 1];
  const stopsLabel =
    deal.stops === 0 ? "Nonstop" : `${deal.stops} stop${deal.stops > 1 ? "s" : ""}`;

  const showDeal = dealFlag?.isDeal;

  // Cash-vs-points comparison for award cards: the cheapest cash fare on the
  // route, and the value of the redemption in cents per mile.
  const compareCash = deal.cashPrice === null ? deal.cashCompare ?? null : null;
  const centsPerMile =
    deal.award && compareCash !== null && deal.award.miles > 0
      ? ((compareCash - deal.award.fees) / deal.award.miles) * 100
      : null;

  return (
    <article
      className={`group relative animate-fade-up rounded-2xl border bg-ink-800/60 p-4 transition hover:bg-ink-800 sm:p-5 ${
        showDeal && !proLocked
          ? "border-emerald-400/40 hover:border-emerald-400/60"
          : "border-white/10 hover:border-brand-500/40"
      }`}
    >
      {showDeal ? (
        <DealBadge flag={dealFlag} proLocked={!!proLocked} onUpgrade={onUpgrade} />
      ) : isBest ? (
        <span className="absolute -top-2.5 left-4 rounded-full bg-gradient-to-r from-brand-500 to-purple-500 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow">
          Best value
        </span>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Itinerary */}
        <div className="flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <ProgramBadge code={first.carrierCode} />
            <span className="text-sm font-medium text-slate-200">
              {first.carrier}
            </span>
            <span className="text-xs text-slate-500">
              {CABIN_LABELS[deal.cabin]}
            </span>
            <span className="text-xs text-slate-500">·</span>
            <span className="text-xs font-medium text-slate-400">
              {new Date(first.departTime).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
              {deal.returnDate
                ? ` → ${new Date(`${deal.returnDate}T00:00:00`).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric" },
                  )}`
                : ""}
            </span>
            {deal.returnDate && (
              <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                Round trip
              </span>
            )}
          </div>

          {deal.awardAvailabilityOnly ? (
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-lg font-semibold text-white">{deal.origin}</div>
              </div>
              <div className="flex flex-1 flex-col items-center px-1">
                <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                  Award space
                </span>
                <div className="my-1 h-px w-full bg-gradient-to-r from-slate-600 to-slate-600" />
                <span className="text-[11px] text-slate-500">
                  {new Date(first.departTime).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-white">
                  {deal.destination}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-lg font-semibold text-white">
                  {formatTime(first.departTime)}
                </div>
                <div className="text-xs text-slate-500">{deal.origin}</div>
              </div>

              <div className="flex flex-1 flex-col items-center px-1">
                <span className="text-[11px] text-slate-500">
                  {formatDuration(deal.durationMinutes)}
                </span>
                <div className="my-1 flex w-full items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                  <span className="h-px flex-1 bg-gradient-to-r from-slate-600 to-slate-600" />
                  <svg
                    className="h-3.5 w-3.5 -rotate-90 text-slate-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                  <span className="h-px flex-1 bg-gradient-to-r from-slate-600 to-slate-600" />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                </div>
                <span className="text-[11px] font-medium text-slate-400">
                  {stopsLabel}
                </span>
              </div>

              <div className="text-center">
                <div className="text-lg font-semibold text-white">
                  {formatTime(last.arriveTime)}
                </div>
                <div className="text-xs text-slate-500">{deal.destination}</div>
              </div>
            </div>
          )}

          {deal.seatsLeft !== null && deal.seatsLeft <= 4 && (
            <p className="mt-2 text-xs font-medium text-amber-400">
              Only {deal.seatsLeft} seat{deal.seatsLeft > 1 ? "s" : ""} left at this price
            </p>
          )}
        </div>

        {/* Pricing — each tile deep-links to the airline's booking site */}
        <div className="flex shrink-0 items-stretch gap-3 sm:w-72 sm:flex-col sm:gap-2">
          <PriceTile
            kind="cash"
            label="Cash"
            value={
              deal.cashPrice !== null
                ? formatUSD(deal.cashPrice)
                : compareCash !== null
                  ? `~${formatUSD(compareCash)}`
                  : "—"
            }
            sub={
              deal.cashPrice === null && compareCash !== null
                ? "cheapest cash"
                : undefined
            }
            href={deal.cashBookingUrl}
            bookOn={first.carrier}
            highlight={
              deal.cashPrice !== null &&
              (deal.award === null ||
                deal.cashPrice <= dealValueScore(deal) + 1)
            }
          />
          <PriceTile
            kind="miles"
            label={deal.award ? deal.award.program : "Miles"}
            value={
              deal.award
                ? `${formatMiles(deal.award.miles)} mi`
                : "—"
            }
            sub={
              deal.award
                ? `+ ${formatUSD(deal.award.fees)} fees${
                    centsPerMile !== null ? ` · ${centsPerMile.toFixed(1)}¢/mi` : ""
                  }`
                : undefined
            }
            href={deal.awardBookingUrl}
            bookOn={deal.award ? deal.award.program : undefined}
            highlight={
              deal.award !== null &&
              (deal.cashPrice === null ||
                (deal.award.miles * 1.4) / 100 + deal.award.fees <
                  deal.cashPrice)
            }
          />
        </div>
      </div>
    </article>
  );
}

function PriceTile({
  kind,
  label,
  value,
  href,
  bookOn,
  sub,
  highlight,
}: {
  kind: "cash" | "miles";
  label: string;
  value: string;
  href?: string | null;
  bookOn?: string;
  sub?: string;
  highlight?: boolean;
}) {
  const clickable = Boolean(href);

  const inner = (
    <>
      <span className="text-[11px] uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span
        className={`text-base font-bold ${
          value === "—" ? "text-slate-600" : "text-white"
        }`}
      >
        {value}
      </span>
      {sub && <span className="text-[11px] text-slate-500">{sub}</span>}
      {clickable && bookOn && (
        <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-brand-300 opacity-0 transition group-hover:opacity-100">
          Book on {bookOn}
          <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
          </svg>
        </span>
      )}
      <span className="sr-only">{kind}</span>
    </>
  );

  const className = `flex flex-1 flex-col justify-center rounded-xl border px-3 py-2 transition ${
    highlight
      ? "border-emerald-400/40 bg-emerald-400/10"
      : "border-white/10 bg-ink-900/40"
  } ${
    clickable
      ? "cursor-pointer hover:border-brand-400/60 hover:bg-brand-500/10 focus:outline-none focus:ring-2 focus:ring-brand-500"
      : ""
  }`;

  if (clickable) {
    return (
      <a
        href={href!}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        aria-label={`Book ${label} fare${bookOn ? ` on ${bookOn}` : ""}`}
      >
        {inner}
      </a>
    );
  }

  return <div className={className}>{inner}</div>;
}
