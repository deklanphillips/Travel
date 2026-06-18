import { CARD_STYLE, type CardName } from "@/data/transferPartners";

// Bold, color-coded transferable-points badge (seats.aero style). Solid brand
// colours — reliable and punchy (no external logo dependency).
export function CardBadge({ card }: { card: CardName }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold leading-tight shadow-sm ${CARD_STYLE[card]}`}
    >
      {card}
    </span>
  );
}
