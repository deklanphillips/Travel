import { NextRequest, NextResponse } from "next/server";

// On-click award booking redirect. Fetches the pre-filled booking link for a
// specific seats.aero availability (via /trips) and 302s the user straight to
// the program's own award search. One /trips call per click keeps us well
// within rate limits (vs. fetching links for every search result up front).

interface BookingLink {
  label: string;
  link: string;
  primary: boolean;
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing availability id." }, { status: 400 });
  }

  const key = process.env.SEATS_AERO_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Award booking unavailable." }, { status: 503 });
  }

  try {
    const res = await fetch(
      `https://seats.aero/partnerapi/trips/${encodeURIComponent(id)}`,
      {
        headers: { "Partner-Authorization": key, Accept: "application/json" },
        cache: "no-store",
      },
    );
    if (!res.ok) throw new Error(`trips ${res.status}`);

    const json = (await res.json()) as { booking_links?: BookingLink[] };
    const links = json.booking_links ?? [];
    // The availability's own program is flagged primary; fall back to first.
    const chosen = links.find((l) => l.primary) ?? links[0];
    if (!chosen?.link) throw new Error("no booking link");

    return NextResponse.redirect(chosen.link);
  } catch (err) {
    console.error("[award/book] failed", id, err);
    return NextResponse.json(
      { error: "Could not load the booking link — please try again." },
      { status: 502 },
    );
  }
}
