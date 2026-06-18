import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { ExploreTable } from "@/components/ExploreTable";
import { programBySource } from "@/data/programs";

export default async function DepartingPage({
  params,
}: {
  params: Promise<{ source: string; airport: string }>;
}) {
  const { source, airport } = await params;
  const program = programBySource(source);
  if (!program || !/^[A-Za-z]{3}$/.test(airport)) notFound();
  const code = airport.toUpperCase();

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Link href={`/explore/${source}`} className="text-sm text-brand-300 hover:text-brand-200">
          ← {program.name}
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
          {program.name} award space departing {code}
        </h1>
        <p className="mt-2 text-slate-400">
          All recently-seen {program.name} award flights departing {code}, to anywhere.
        </p>
        <ExploreTable source={source} originAirport={code} />
      </section>
    </main>
  );
}
