# Pointfare ✈️

Find the cheapest way to fly — **in cash or miles**. Pointfare searches flight
prices and loyalty-program award availability side by side, inspired by
[seats.aero](https://seats.aero).

Built with **Next.js 14 (App Router)**, **TypeScript**, and **Tailwind CSS**.

## Features

- 🔎 Single-search experience: enter route, date, cabin, passengers
- 💵 / 🪙 Cash price **and** miles cost shown side by side on every result
- 🏆 "Best value" ranking that weighs miles against cash (≈1.4¢/mile)
- ↕️ Sort by best value, cheapest cash, fewest miles, or shortest duration
- 🎨 Polished dark UI with airport autocomplete and loading states
- 🔌 Pluggable data layer — runs on realistic **mock data** out of the box,
  or live **Duffel** cash fares with one env var

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). It works immediately with
sample data — no API key needed.

## Switching to real flight data

Copy the example env file and choose a provider:

```bash
cp .env.example .env.local
```

```env
FLIGHT_PROVIDER=duffel
DUFFEL_API_TOKEN=duffel_test_xxxxxxxx
```

Get a free test token at [app.duffel.com](https://app.duffel.com). Duffel
returns live **cash** fares; loyalty **award/miles** data isn't available from
public APIs (it's what seats.aero scrapes), so the Duffel provider leaves the
miles field empty until a dedicated award source is added.

## Architecture

```
src/
  app/
    page.tsx              # Landing page + search
    api/search/route.ts   # Validates params, calls the active provider
  components/             # Navbar, SearchExperience, DealCard, etc.
  lib/
    types.ts              # Shared Deal / SearchParams types
    providers/
      index.ts            # Picks provider from FLIGHT_PROVIDER env
      mock.ts             # Realistic generated deals (default)
      duffel.ts           # Live cash fares via Duffel API
    airports.ts           # Airport list for autocomplete
    format.ts             # Pricing, sorting, value-score helpers
```

Adding a new data source = implement the `FlightProvider` interface and wire it
into `providers/index.ts`.

## Roadmap

- [ ] Real award-availability source (the seats.aero hard part)
- [ ] User accounts + saved routes
- [ ] Price & award alerts
- [ ] Stripe paywall for the Pro tier
- [ ] Deploy to a custom domain (Vercel)

## Deploying

This is a standard Next.js app — deploy to [Vercel](https://vercel.com) in a
few clicks, or any Node host. Set `FLIGHT_PROVIDER` / `DUFFEL_API_TOKEN` as
environment variables in your host's dashboard.
