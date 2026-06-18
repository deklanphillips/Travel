import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { PROGRAMS } from "@/data/programs";
import { CARD_STYLE, cardsForProgram } from "@/data/transferPartners";

export const metadata = { title: "Explore award programs — Pointfare" };

export default function ExplorePage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Explore award programs
        </h1>
        <p className="mt-2 text-slate-400">
          Browse every mileage program and the cards that transfer to it. Pick one
          to see all of its award space — then compare it to cash.
        </p>

        <div className="mt-8 divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-ink-800/50">
          {PROGRAMS.map((p) => {
            const cards = cardsForProgram(p.code);
            return (
              <Link
                key={p.source}
                href={`/explore/${p.source}`}
                className="flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-white/5"
              >
                <span className="min-w-[220px] font-medium text-white">{p.name}</span>
                <span className="flex flex-wrap gap-1">
                  {cards.length === 0 ? (
                    <span className="text-xs text-slate-600">No transfer partners</span>
                  ) : (
                    cards.map((c) => (
                      <span
                        key={c}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${CARD_STYLE[c]}`}
                      >
                        {c}
                      </span>
                    ))
                  )}
                </span>
                <span className="ml-auto text-sm text-brand-300">Explore →</span>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
