import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getProvider } from "@/lib/providers";
import { sendEmail } from "@/lib/email";
import { formatUSD } from "@/lib/format";
import type { CabinClass } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Scheduled job (Vercel Cron): re-checks each active alert's route, records a
// price snapshot, and emails when the fare hits the target or drops.
//
// Secured with CRON_SECRET — Vercel Cron sends it as a Bearer token; it can
// also be passed as ?secret= for manual runs.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const param = new URL(request.url).searchParams.get("secret");
    if (auth !== `Bearer ${secret}` && param !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  if (!sql) {
    return NextResponse.json({ error: "No database configured." }, { status: 503 });
  }

  const alerts = (await sql`select * from alerts where active = true`) as Array<{
    id: string;
    email: string;
    origin: string;
    destination: string | null;
    cabin: string;
    depart_date: string | Date;
    return_date: string | null;
    target_price: number | null;
    last_notified_price: number | null;
  }>;

  const provider = getProvider();
  let checked = 0;
  let notified = 0;
  const results: Array<Record<string, unknown>> = [];

  for (const a of alerts) {
    try {
      const departDate =
        a.depart_date instanceof Date
          ? a.depart_date.toISOString().slice(0, 10)
          : String(a.depart_date);
      const destination = a.destination ?? ""; // "" = anywhere
      const routeLabel = `${a.origin}-${destination || "Anywhere"}`;

      const deals = await provider.search({
        origin: a.origin,
        destination,
        departDate,
        returnDate: a.return_date ?? undefined,
        passengers: 1,
        cabin: a.cabin as CabinClass,
      });
      // Find the single cheapest deal (for anywhere, this is the best destination).
      const priced = deals.filter((d) => d.cashPrice !== null);
      if (!priced.length) {
        results.push({ route: routeLabel, target: a.target_price, found: null, note: "no price" });
        continue;
      }
      const cheapest = priced.reduce((a2, b) =>
        (a2.cashPrice ?? Infinity) <= (b.cashPrice ?? Infinity) ? a2 : b,
      );
      const min = cheapest.cashPrice as number;
      checked++;

      await sql`
        insert into price_history (origin, destination, cabin, depart_date, price)
        values (${a.origin}, ${cheapest.destination}, ${a.cabin}, ${departDate}, ${min})
      `;

      // Only notify on a NEW low — never re-email the same or higher price.
      const meetsTarget = a.target_price === null || min <= a.target_price;
      const isNewLow =
        a.last_notified_price === null || min < a.last_notified_price;
      const shouldNotify = meetsTarget && isNewLow;

      if (shouldNotify) {
        const dest = cheapest.destination;
        const label = `${a.origin}→${dest}`;
        await sendEmail({
          to: a.email,
          subject: `✈️ ${label} dropped to ${formatUSD(min)}`,
          html: alertHtml(a.origin, dest, departDate, min),
        });
        await sql`update alerts set last_notified_price = ${min} where id = ${a.id}`;
        notified++;
      }

      results.push({
        route: routeLabel,
        cheapestTo: cheapest.destination,
        target: a.target_price,
        lastNotified: a.last_notified_price,
        found: min,
        notified: shouldNotify,
      });
    } catch (err) {
      console.error("[cron] alert check failed", a.id, err);
      results.push({ route: `${a.origin}-${a.destination ?? "Anywhere"}`, error: true });
    }
  }

  return NextResponse.json({ checked, notified, total: alerts.length, results });
}

function alertHtml(
  origin: string,
  destination: string,
  date: string,
  price: number,
): string {
  return `
    <div style="font-family:system-ui,sans-serif">
      <h2>Price drop on ${origin} → ${destination}</h2>
      <p>The fare for <strong>${date}</strong> is now
         <strong>${formatUSD(price)}</strong>.</p>
      <p>Search it on Pointfare to book.</p>
    </div>`;
}
