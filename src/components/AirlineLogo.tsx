"use client";

import { useState } from "react";

// Renders an airline logo by IATA code on a transparent background so it
// meshes with the dark UI. Tries transparent CDNs in order, then falls back
// to a colored monogram.
function sourcesFor(code: string): string[] {
  if (!code) return [];
  return [
    `https://pics.avs.io/120/120/${code}.png`, // Aviasales — transparent
    `https://images.kiwi.com/airlines/64/${code}.png`, // Kiwi — fallback
  ];
}

export function AirlineLogo({
  code,
  name,
  size = 30,
}: {
  code: string;
  name?: string;
  size?: number;
}) {
  const c = (code || "").toUpperCase();
  const sources = sourcesFor(c);
  const [idx, setIdx] = useState(0);

  if (sources.length === 0 || idx >= sources.length) {
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
      className="inline-flex shrink-0 items-center justify-center rounded-md bg-white/10 p-0.5 ring-1 ring-white/10"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sources[idx]}
        alt={name || c}
        loading="lazy"
        onError={() => setIdx((i) => i + 1)}
        className="max-h-full max-w-full object-contain"
      />
    </span>
  );
}
