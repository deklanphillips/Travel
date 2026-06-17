// Minimal email sender via Resend (https://resend.com) HTTP API. Falls back to
// logging when RESEND_API_KEY isn't set, so local/dev runs don't fail.

interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendArgs): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM_EMAIL ?? "Pointfare <alerts@pointfare.app>";

  if (!key) {
    console.log(`[email] (no RESEND_API_KEY) would send "${subject}" to ${to}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    console.error(`[email] Resend error ${res.status}: ${await res.text()}`);
  }
}
