// Regenerates src/data/airports.json from the public-domain OurAirports data.
//
// Usage:
//   curl -sSL -o /tmp/airports.csv  https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv
//   curl -sSL -o /tmp/countries.csv https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/countries.csv
//   node scripts/build-airports.mjs
//
// Keeps large/medium airports that have an IATA code and scheduled service.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

// Minimal RFC-4180-ish CSV parser (handles quoted fields with commas/quotes).
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c === "\r") {
      // ignore
    } else {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function toObjects(rows) {
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const o = {};
    header.forEach((h, i) => (o[h] = r[i] ?? ""));
    return o;
  });
}

const countries = toObjects(parseCsv(readFileSync("/tmp/countries.csv", "utf8")));
const countryName = new Map(countries.map((c) => [c.code, c.name]));

const airports = toObjects(parseCsv(readFileSync("/tmp/airports.csv", "utf8")));

const TYPE_RANK = { large_airport: 0, medium_airport: 1 };

const filtered = airports
  .filter(
    (a) =>
      /^[A-Z]{3}$/.test(a.iata_code) &&
      (a.type === "large_airport" || a.type === "medium_airport") &&
      a.scheduled_service === "yes",
  )
  .map((a) => ({
    code: a.iata_code,
    city: a.municipality || a.name,
    name: a.name,
    country: countryName.get(a.iso_country) || a.iso_country,
    _rank: TYPE_RANK[a.type] ?? 2,
  }))
  // Dedupe by IATA (keep highest-ranked / first).
  .sort((a, b) => a._rank - b._rank || a.code.localeCompare(b.code));

const seen = new Set();
const deduped = [];
for (const a of filtered) {
  if (seen.has(a.code)) continue;
  seen.add(a.code);
  deduped.push({ code: a.code, city: a.city, name: a.name, country: a.country });
}

const outDir = new URL("../src/data/", import.meta.url);
mkdirSync(outDir, { recursive: true });
writeFileSync(new URL("airports.json", outDir), JSON.stringify(deduped));

const large = filtered.filter((a) => a._rank === 0).length;
console.log(`Total commercial airports: ${deduped.length} (large: ${large})`);
console.log("Sample:", deduped.slice(0, 3));
