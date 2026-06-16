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

Copy the example env file and add a Duffel token:

```bash
cp .env.example .env.local
```

```env
FLIGHT_PROVIDER=duffel
DUFFEL_API_TOKEN=duffel_test_xxxxxxxx
```

1. Sign up at [app.duffel.com](https://app.duffel.com) (free).
2. Copy a **test** access token (starts `duffel_test_`).
3. Restart `npm run dev` — searches now return real cash fares.

> **Note:** Amadeus's Self-Service API was previously considered here but is
> being decommissioned (portal shutdown July 17, 2026), so it is not used.

### About award (miles) data

Duffel returns live **cash** fares only. Loyalty **award/miles** availability
isn't offered by any public API — it's what seats.aero scrapes from each
program — so real-data results show cash prices and leave the miles field empty
until a dedicated award source is added. With `FLIGHT_PROVIDER=mock` you still
get illustrative miles pricing for UI development.

If credentials are missing, the app logs a warning and falls back to mock data.

## Architecture

```
src/
  app/
    page.tsx              # Landing page + search
    api/search/route.ts   # Validates params, calls the active provider
  components/             # Navbar, SearchExperience, DealCard, etc.
  data/
    airports.json         # 3,200+ commercial airports (generated, server-only)
  lib/
    types.ts              # Shared Deal / SearchParams types
    providers/
      index.ts            # Picks provider from FLIGHT_PROVIDER env
      mock.ts             # Realistic generated deals (default)
      duffel.ts           # Live cash fares via Duffel API
    airports.ts           # Airport dataset access + ranked search
    alliances.ts          # Airline directory + alliance membership
    booking.ts            # Per-airline cash/award booking deep links
    format.ts             # Pricing, sorting, value-score helpers
```

## Airport data

The autocomplete is backed by a comprehensive dataset of 3,200+ commercial
airports (IATA code, city, name, country) derived from the public-domain
[OurAirports](https://ourairports.com/data/) dataset. It lives in
`src/data/airports.json` and is served via `/api/airports` so the full dataset
never ships to the browser. To refresh it, see `scripts/build-airports.mjs`.

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
