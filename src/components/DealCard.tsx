import type { Deal } from "@/lib/types";
import {
  CABIN_LABELS,
  dealValueScore,
  formatDuration,
  formatMiles,
  formatTime,
  formatUSD,
} from "@/lib/format";

function ProgramBadge({ code }: { code: string }) {
  return (
    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded bg-gradient-to-br from-brand-500/30 to-purple-500/30 px-1.5 text-[11px] font-bold text-brand-200 ring-1 ring-inset ring-white/10">
      {code}
    </span>
  );
}

export function DealCard({
  deal,
  isBest,
  onSelect,
}: {
  deal: Deal;
  isBest?: boolean;
  onSelect?: () => void;
}) {
  const first = deal.segments[0];
  const last = deal.segments[deal.segments.length - 1];
  const stopsLabel =
    deal.stops === 0 ? "Nonstop" : `${deal.stops} stop${deal.stops > 1 ? "s" : ""}`;

  return (
    <article
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(e) => {
        if (onSelect && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group relative animate-fade-up rounded-2xl border border-white/10 bg-ink-800/60 p-4 transition hover:border-brand-500/40 hover:bg-ink-800 sm:p-5 ${
        onSelect ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500" : ""
      }`}
    >
      {isBest && (
        <span className="absolute -top-2.5 left-4 rounded-full bg-gradient-to-r from-brand-500 to-purple-500 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow">
          Best value
        </span>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Itinerary */}
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <ProgramBadge code={first.carrierCode} />
            <span className="text-sm font-medium text-slate-200">
              {first.carrier}
            </span>
            <span className="text-xs text-slate-500">
              {CABIN_LABELS[deal.cabin]}
            </span>
          </div>

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

          {deal.seatsLeft !== null && deal.seatsLeft <= 4 && (
            <p className="mt-2 text-xs font-medium text-amber-400">
              Only {deal.seatsLeft} seat{deal.seatsLeft > 1 ? "s" : ""} left at this price
            </p>
          )}
        </div>

        {/* Pricing */}
        <div className="flex shrink-0 items-stretch gap-3 sm:w-72 sm:flex-col sm:gap-2">
          <PriceTile
            kind="cash"
            label="Cash"
            value={deal.cashPrice !== null ? formatUSD(deal.cashPrice) : "—"}
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
            sub={deal.award ? `+ ${formatUSD(deal.award.fees)} fees` : undefined}
            highlight={
              deal.award !== null &&
              (deal.cashPrice === null ||
                (deal.award.miles * 1.4) / 100 + deal.award.fees <
                  deal.cashPrice)
            }
          />
        </div>
      </div>

      {onSelect && (
        <div className="mt-3 flex items-center justify-end border-t border-white/5 pt-3 text-sm font-medium text-brand-300 transition group-hover:text-brand-200">
          Select &amp; book
          <svg
            className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </article>
  );
}

function PriceTile({
  kind,
  label,
  value,
  sub,
  highlight,
}: {
  kind: "cash" | "miles";
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-1 flex-col justify-center rounded-xl border px-3 py-2 transition ${
        highlight
          ? "border-emerald-400/40 bg-emerald-400/10"
          : "border-white/10 bg-ink-900/40"
      }`}
    >
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
      <span className="sr-only">{kind}</span>
    </div>
  );
}
