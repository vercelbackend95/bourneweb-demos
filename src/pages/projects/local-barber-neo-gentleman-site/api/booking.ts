// src/pages/projects/local-barber-neo-gentleman-site/api/booking.ts
export const prerender = false;

export async function POST({ request }: { request: Request }) {
  try {
    const RESEND_API_KEY = import.meta.env.RESEND_API_KEY as string | undefined;

    const FROM =
      (import.meta.env.BOOKING_FROM_EMAIL as string | undefined) ??
      "Neo Gentleman <onboarding@resend.dev>";

    // In DEMO: this is your lead inbox (you = "barber")
    const TO_BARBER = import.meta.env.BOOKING_BARBER_EMAIL as string | undefined;

    const SHOP = (import.meta.env.BOOKING_SHOP_NAME as string | undefined) ?? "Neo Gentleman";

    if (!RESEND_API_KEY) return json({ ok: false, error: "Missing RESEND_API_KEY" }, 500);
    if (!TO_BARBER) return json({ ok: false, error: "Missing BOOKING_BARBER_EMAIL" }, 500);

    const body = await request.json();

    // minimal validation
    if (!body?.service?.name || !body?.date || !body?.time || !body?.phone) {
      return json({ ok: false, error: "Missing required fields" }, 400);
    }

    const barberLine = body?.barber?.name ? `${body.barber.name}` : "No preference";
    const subject = `${SHOP} · New lead · ${body.service.name} · ${body.date} ${body.time}`;

    const clientEmail = String(body?.email ?? "").trim();

    const detailsHtml = `
      <div style="font-family: ui-sans-serif, system-ui; line-height:1.5">
        <h2 style="margin:0 0 8px 0;">New booking request (DEMO lead)</h2>
        <p style="margin:0 0 14px 0; color:#444;">${escapeHtml(SHOP)}</p>

        <table style="border-collapse:collapse; width:100%; max-width:640px;">
          ${row(
            "Service",
            `${escapeHtml(body.service.name)} · £${escapeHtml(String(body.service.price ?? ""))} · ${escapeHtml(String(body.service.mins ?? ""))} min`
          )}
          ${row("Barber", escapeHtml(barberLine))}
          ${row("Date", escapeHtml(body.date))}
          ${row("Time", escapeHtml(`${body.time}${body.endTime ? "–" + body.endTime : ""}`))}
          ${row("Phone", escapeHtml(body.phone))}
          ${row("Name", escapeHtml(body.name || "—"))}
          ${row("Notes", escapeHtml(body.notes || "—"))}
          ${clientEmail ? row("Client email", escapeHtml(clientEmail)) : ""}
        </table>

        <p style="margin:18px 0 0 0; color:#666; font-size:13px;">
          Demo mode: client does NOT receive automated emails/SMS. You follow up manually.
        </p>
      </div>
    `;

    const sendLead = await resendSend({
      apiKey: RESEND_API_KEY,
      from: FROM,
      to: TO_BARBER,
      subject,
      html: detailsHtml,
    });

    if (!sendLead.ok) return json({ ok: false, error: sendLead.error }, 502);

    return json({ ok: true }, 200);
  } catch (e: any) {
    return json({ ok: false, error: e?.message ?? "Unknown error" }, 500);
  }
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function row(k: string, v: string) {
  return `
    <tr>
      <td style="padding:8px 10px; border:1px solid #eee; width:160px; color:#666; font-size:13px;">${k}</td>
      <td style="padding:8px 10px; border:1px solid #eee; color:#111;">${v}</td>
    </tr>
  `;
}

function escapeHtml(s: string) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function resendSend(opts: { apiKey: string; from: string; to: string; subject: string; html: string }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: opts.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return { ok: false as const, error: `Resend error ${res.status}: ${txt || res.statusText}` };
  }
  return { ok: true as const };
}
