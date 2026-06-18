"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PROGRAMS } from "@/data/programs";
import { cardsForProgram } from "@/data/transferPartners";
import { AirlineLogo } from "./AirlineLogo";
import { CardBadge } from "./CardBadge";

// seats.aero-style Explore dropdown: every program with its logo and transfer
// partners; each row links to that program's award table.
export function ExploreMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 transition hover:text-white ${
          open ? "text-white" : ""
        }`}
      >
        Explore
        <span className={`text-[10px] transition ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-3 max-h-[75vh] w-[600px] max-w-[92vw] overflow-y-auto rounded-xl border border-white/10 bg-ink-900/95 p-1.5 shadow-2xl shadow-black/50 backdrop-blur">
          {PROGRAMS.map((p) => (
            <Link
              key={p.source}
              href={`/explore/${p.source}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition hover:bg-white/5"
            >
              <AirlineLogo code={p.code} name={p.name} size={22} />
              <span className="whitespace-nowrap text-sm font-medium text-white">
                {p.name}
              </span>
              <span className="ml-auto flex flex-wrap justify-end gap-1 pl-2">
                {cardsForProgram(p.code).map((c) => (
                  <CardBadge key={c} card={c} />
                ))}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
