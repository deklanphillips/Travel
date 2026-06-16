// A small curated airport list for autocomplete + display.
// Not exhaustive — enough to make the UI feel real. Extend freely.

export interface Airport {
  code: string; // IATA
  city: string;
  name: string;
  country: string;
}

export const AIRPORTS: Airport[] = [
  { code: "JFK", city: "New York", name: "John F. Kennedy Intl", country: "USA" },
  { code: "EWR", city: "New York", name: "Newark Liberty Intl", country: "USA" },
  { code: "LAX", city: "Los Angeles", name: "Los Angeles Intl", country: "USA" },
  { code: "SFO", city: "San Francisco", name: "San Francisco Intl", country: "USA" },
  { code: "ORD", city: "Chicago", name: "O'Hare Intl", country: "USA" },
  { code: "MIA", city: "Miami", name: "Miami Intl", country: "USA" },
  { code: "SEA", city: "Seattle", name: "Seattle-Tacoma Intl", country: "USA" },
  { code: "BOS", city: "Boston", name: "Logan Intl", country: "USA" },
  { code: "ATL", city: "Atlanta", name: "Hartsfield-Jackson", country: "USA" },
  { code: "DFW", city: "Dallas", name: "Dallas/Fort Worth Intl", country: "USA" },
  { code: "LHR", city: "London", name: "Heathrow", country: "UK" },
  { code: "LGW", city: "London", name: "Gatwick", country: "UK" },
  { code: "CDG", city: "Paris", name: "Charles de Gaulle", country: "France" },
  { code: "AMS", city: "Amsterdam", name: "Schiphol", country: "Netherlands" },
  { code: "FRA", city: "Frankfurt", name: "Frankfurt am Main", country: "Germany" },
  { code: "MAD", city: "Madrid", name: "Adolfo Suárez Barajas", country: "Spain" },
  { code: "FCO", city: "Rome", name: "Fiumicino", country: "Italy" },
  { code: "IST", city: "Istanbul", name: "Istanbul Airport", country: "Turkey" },
  { code: "DXB", city: "Dubai", name: "Dubai Intl", country: "UAE" },
  { code: "DOH", city: "Doha", name: "Hamad Intl", country: "Qatar" },
  { code: "SIN", city: "Singapore", name: "Changi", country: "Singapore" },
  { code: "HND", city: "Tokyo", name: "Haneda", country: "Japan" },
  { code: "NRT", city: "Tokyo", name: "Narita Intl", country: "Japan" },
  { code: "HKG", city: "Hong Kong", name: "Hong Kong Intl", country: "Hong Kong" },
  { code: "SYD", city: "Sydney", name: "Kingsford Smith", country: "Australia" },
  { code: "GRU", city: "São Paulo", name: "Guarulhos Intl", country: "Brazil" },
  { code: "YYZ", city: "Toronto", name: "Pearson Intl", country: "Canada" },
  { code: "MEX", city: "Mexico City", name: "Benito Juárez Intl", country: "Mexico" },
  { code: "BKK", city: "Bangkok", name: "Suvarnabhumi", country: "Thailand" },
];

const BY_CODE = new Map(AIRPORTS.map((a) => [a.code, a]));

export function getAirport(code: string): Airport | undefined {
  return BY_CODE.get(code.toUpperCase());
}

export function searchAirports(query: string, limit = 6): Airport[] {
  const q = query.trim().toLowerCase();
  if (!q) return AIRPORTS.slice(0, limit);
  return AIRPORTS.filter(
    (a) =>
      a.code.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.country.toLowerCase().includes(q),
  ).slice(0, limit);
}
