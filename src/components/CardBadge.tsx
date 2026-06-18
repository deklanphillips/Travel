"use client";

import { useState } from "react";
import type { CardName } from "@/data/transferPartners";

// Issuer domains for logos (free Clearbit logo CDN).
const CARD_DOMAIN: Record<CardName, string> = {
  Amex: "americanexpress.com",
  Chase: "chase.com",
  "Cap One": "capitalone.com",
  Citi: "citi.com",
  Bilt: "biltrewards.com",
  "Wells Fargo": "wellsfargo.com",
  Rove: "",
};

// Brand text colour, used as a fallback (and to keep brand identity) on the
// transparent chip so the badges mesh with the dark theme.
const CARD_TEXT: Record<CardName, string> = {
  Amex: "text-[#4d9be6]",
  Chase: "text-slate-200",
  "Cap One": "text-[#3fd0dc]",
  Citi: "text-[#3fc06f]",
  Bilt: "text-slate-100",
  "Wells Fargo": "text-[#f06b72]",
  Rove: "text-slate-200",
};

// A transparent, color-coded transferable-points badge with the issuer's logo.
export function CardBadge({ card }: { card: CardName }) {
  const [failed, setFailed] = useState(false);
  const domain = CARD_DOMAIN[card];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] font-bold leading-tight ring-1 ring-white/10 ${CARD_TEXT[card]}`}
      title={`Transfer ${card} points`}
    >
      {domain && !failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://logo.clearbit.com/${domain}`}
          alt=""
          width={14}
          height={14}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-3.5 w-3.5 rounded-[2px] object-contain"
        />
      )}
      {card}
    </span>
  );
}
