"use client";

import { useState } from "react";

// Renders an airline's logo by IATA code (free Kiwi.com logo CDN), on a light
// chip so it's visible on dark UI. Falls back to a colored monogram if missing.
export function AirlineLogo({
  code,
  name,
  size = 22,
}: {
  code: string;
  name?: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const c = (code || "").toUpperCase();

  if (failed || !c) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded bg-gradient-to-br from-brand-500 to-purple-500 text-[10px] font-bold text-white"
        style={{ width: size, height: size }}
      >
        {c.slice(0, 2)}
      </span>
    );
  }

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded bg-white"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://images.kiwi.com/airlines/64/${c}.png`}
        alt={name || c}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
