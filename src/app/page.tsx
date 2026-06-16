import { Navbar } from "@/components/Navbar";
import { SearchExperience } from "@/components/SearchExperience";
import { HowItWorks, Programs, Pricing, Footer } from "@/components/Sections";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="aurora relative overflow-hidden pb-10 pt-16 sm:pt-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Now tracking 10 loyalty programs
          </div>
          <h1 className="text-balance text-4xl font-bold tracking-tight text-white sm:text-6xl">
            Find the cheapest way to fly —{" "}
            <span className="bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent">
              cash or miles
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-400">
            FareHawk searches flight prices and award availability at the same
            time, so you always book the best value seat.
          </p>
        </div>

        <div className="relative mt-12">
          <SearchExperience />
        </div>
      </section>

      <HowItWorks />
      <Programs />
      <Pricing />
      <Footer />
    </main>
  );
}
