// Regenerates src/data/airlines.json from the OpenFlights airline database.
//
// Usage:
//   curl -sSL -o /tmp/airlines.dat https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat
//   node scripts/build-airlines.mjs
//
// Keeps active airlines that have a valid 2-character IATA code and a real name.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

// airlines.dat is simple CSV with quoted fields; split carefully.
function parseLine(line) {
  const out = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      out.push(field);
      field = "";
    } else field += c;
  }
  out.push(field);
  return out;
}

const lines = readFileSync("/tmp/airlines.dat", "utf8").split("\n");
const EXCLUDE = new Set(["", "-", "\\N", "Unknown", "Private flight", "N/A"]);

const seen = new Set();
const airlines = [];
for (const line of lines) {
  if (!line.trim()) continue;
  const p = parseLine(line);
  const name = (p[1] || "").trim();
  const iata = (p[3] || "").trim();
  const country = (p[6] || "").trim();
  const active = (p[7] || "").trim();

  if (active !== "Y") continue;
  if (!/^[A-Z0-9]{2}$/.test(iata)) continue;
  if (EXCLUDE.has(name)) continue;
  if (seen.has(iata)) continue;

  seen.add(iata);
  airlines.push({
    code: iata,
    name,
    country: EXCLUDE.has(country) ? "" : country,
  });
}

airlines.sort((a, b) => a.name.localeCompare(b.name));

const outDir = new URL("../src/data/", import.meta.url);
mkdirSync(outDir, { recursive: true });
writeFileSync(new URL("airlines.json", outDir), JSON.stringify(airlines));

console.log(`Airlines: ${airlines.length}`);
console.log("Sample:", airlines.slice(0, 3));
