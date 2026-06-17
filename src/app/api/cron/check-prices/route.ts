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
    destination: string;
    cabin: string;
    depart_date: string;
    target_price: number | null;
    last_notified_price: number | null;
  }>;

  const provider = getProvider();
  let checked = 0;
  let notified = 0;

  for (const a of alerts) {
    try {
      // depart_date may come back as a string or a Date depending on the driver.
      const departDate =
        a.depart_date instanceof Date
          ? a.depart_date.toISOString().slice(0, 10)
          : String(a.depart_date).slice(0, 10);
      const deals = await provider.search({
        origin: a.origin,
        destination: a.destination,
        departDate,
        passengers: 1,
        cabin: a.cabin as CabinClass,
      });
      const prices = deals
        .map((d) => d.cashPrice)
        .filter((p): p is number => p !== null);
      if (!prices.length) continue;

      const min = Math.min(...prices);
      checked++;

      await sql`
        insert into price_history (origin, destination, cabin, depart_date, price)
        values (${a.origin}, ${a.destination}, ${a.cabin}, ${departDate}, ${min})
      `;

      const hitsTarget = a.target_price !== null && min <= a.target_price;
      const dropped =
        a.target_price === null &&
        (a.last_notified_price === null || min < a.last_notified_price);

      if (hitsTarget || dropped) {
        await sendEmail({
          to: a.email,
          subject: `✈️ ${a.origin}→${a.destination} dropped to ${formatUSD(min)}`,
          html: alertHtml(a.origin, a.destination, departDate, min),
        });
        await sql`update alerts set last_notified_price = ${min} where id = ${a.id}`;
        notified++;
      }
    } catch (err) {
      console.error("[cron] alert check failed", a.id, err);
    }
  }

  return NextResponse.json({ checked, notified, total: alerts.length });
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
