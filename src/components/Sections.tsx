const PROGRAMS = [
  "Avios",
  "AAdvantage",
  "MileagePlus",
  "SkyMiles",
  "Flying Blue",
  "Miles & More",
  "Skywards",
  "KrisFlyer",
  "Privilege Club",
  "ANA Mileage Club",
];

const STEPS = [
  {
    title: "Search once",
    body: "Enter your route, dates, and cabin. We fan out across cash fares and award programs in a single query.",
  },
  {
    title: "Compare cash vs. miles",
    body: "Every result shows the dollar price next to the points cost — so you instantly see which is the better deal.",
  },
  {
    title: "Book the smart way",
    body: "Jump straight to the airline or program with the best value for your trip. No more tab-hopping.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          One search. Cash <span className="text-brand-400">and</span> miles.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-400">
          Stop guessing whether points or your wallet gets you the better seat.
          FareHawk puts them side by side.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <div
            key={step.title}
            className="rounded-2xl border border-white/10 bg-ink-800/50 p-6"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-purple-500 text-sm font-bold text-white">
              {i + 1}
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">
              {step.title}
            </h3>
            <p className="text-sm leading-relaxed text-slate-400">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Programs() {
  return (
    <section id="programs" className="border-y border-white/5 bg-ink-800/30 py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-slate-500">
          Tracking award space across leading programs
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {PROGRAMS.map((p) => (
            <span
              key={p}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300"
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Pricing() {
  const tiers = [
    {
      name: "Free",
      price: "$0",
      tagline: "Casual searching",
      features: ["Cash + miles search", "10 searches / day", "Top 3 programs"],
      cta: "Start free",
      featured: false,
    },
    {
      name: "Pro",
      price: "$9",
      period: "/mo",
      tagline: "Serious points travelers",
      features: [
        "Unlimited searches",
        "All loyalty programs",
        "Price & award alerts",
        "Saved routes",
      ],
      cta: "Go Pro",
      featured: true,
    },
  ];

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Simple pricing
        </h2>
        <p className="mt-3 text-slate-400">Start free. Upgrade when you fly more.</p>
      </div>

      <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`relative rounded-3xl border p-7 ${
              tier.featured
                ? "border-brand-500/50 bg-gradient-to-b from-brand-500/10 to-purple-500/5"
                : "border-white/10 bg-ink-800/50"
            }`}
          >
            {tier.featured && (
              <span className="absolute -top-3 right-6 rounded-full bg-gradient-to-r from-brand-500 to-purple-500 px-3 py-1 text-xs font-semibold text-white">
                Most popular
              </span>
            )}
            <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
            <p className="text-sm text-slate-400">{tier.tagline}</p>
            <div className="my-5 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-white">{tier.price}</span>
              {tier.period && (
                <span className="text-slate-400">{tier.period}</span>
              )}
            </div>
            <ul className="mb-6 space-y-2.5">
              {tier.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                  <svg
                    className="h-4 w-4 shrink-0 text-emerald-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <button
              className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
                tier.featured
                  ? "bg-white text-ink-900 hover:bg-slate-100"
                  : "bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              {tier.cta}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} FareHawk. Built for points nerds.
        </p>
        <p className="text-xs text-slate-600">
          Fares shown are estimates. Verify with the airline before booking.
        </p>
      </div>
    </footer>
  );
}
