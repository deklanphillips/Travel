import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const IATA_RE = /^[A-Z]{3}$/;
const DATE_RE = /^\d{4}-\d{2}(-\d{2})?$/; // exact day or whole month
const CABINS = ["economy", "premium_economy", "business", "first"];

// Creates a price-drop alert for a route. Requires a configured database.
export async function POST(request: Request) {
  if (!sql) {
    return NextResponse.json(
      { error: "Alerts aren't available right now." },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim();
  const origin = String(body.origin ?? "").toUpperCase().trim();
  const destRaw = String(body.destination ?? "").toUpperCase().trim();
  const destination = destRaw === "" || destRaw === "ANY" ? null : destRaw; // null = anywhere
  const cabin = String(body.cabin ?? "economy");
  const departDate = String(body.departDate ?? "");
  const returnRaw = String(body.returnDate ?? "");
  const returnDate = returnRaw || null;
  const targetRaw = body.targetPrice;
  const targetPrice =
    targetRaw === null || targetRaw === undefined || targetRaw === ""
      ? null
      : Number(targetRaw);

  if (!EMAIL_RE.test(email))
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  if (!IATA_RE.test(origin))
    return NextResponse.json({ error: "Invalid origin." }, { status: 400 });
  if (destination !== null && !IATA_RE.test(destination))
    return NextResponse.json({ error: "Invalid destination." }, { status: 400 });
  if (!CABINS.includes(cabin))
    return NextResponse.json({ error: "Invalid cabin." }, { status: 400 });
  if (!DATE_RE.test(departDate))
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  if (returnDate && !DATE_RE.test(returnDate))
    return NextResponse.json({ error: "Invalid return date." }, { status: 400 });
  if (targetPrice !== null && (!Number.isFinite(targetPrice) || targetPrice < 0))
    return NextResponse.json({ error: "Invalid target price." }, { status: 400 });

  try {
    await sql`
      insert into alerts (email, origin, destination, cabin, depart_date, return_date, target_price)
      values (${email}, ${origin}, ${destination}, ${cabin}, ${departDate}, ${returnDate}, ${targetPrice})
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[alerts] insert error", err);
    return NextResponse.json({ error: "Couldn't save your alert." }, { status: 500 });
  }
}
