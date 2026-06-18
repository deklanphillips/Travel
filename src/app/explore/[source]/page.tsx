import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { ExploreTable } from "@/components/ExploreTable";
import { programBySource } from "@/data/programs";
import { cardsForProgram } from "@/data/transferPartners";
import { CardBadge } from "@/components/CardBadge";
import { AirlineLogo } from "@/components/AirlineLogo";

export default async function ProgramExplorePage({
  params,
}: {
  params: Promise<{ source: string }>;
}) {
  const { source } = await params;
  const program = programBySource(source);
  if (!program) notFound();

  const cards = cardsForProgram(program.code);

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Link href="/explore" className="text-sm text-brand-300 hover:text-brand-200">
          ← All programs
        </Link>
        <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold tracking-tight text-white">
          <AirlineLogo code={program.code} name={program.name} size={32} />
          Explore {program.name}
        </h1>
        <p className="mt-2 text-slate-400">
          All available award space on {program.name}, with cash comparison.
        </p>
        {cards.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1">
            <span className="mr-1 text-[10px] uppercase tracking-wide text-slate-500">
              Transfer from
            </span>
            {cards.map((c) => (
              <CardBadge key={c} card={c} />
            ))}
          </div>
        )}

        <ExploreTable source={program.source} />
      </section>
    </main>
  );
}
