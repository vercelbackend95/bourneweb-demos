// src/pages/projects/local-barber-neo-gentleman-site/api/booking.ts
export const prerender = false;

export async function POST({ request }: { request: Request }) {
  try {
    const RESEND_API_KEY = import.meta.env.RESEND_API_KEY as string | undefined;

    const FROM =
      (import.meta.env.BOOKING_FROM_EMAIL as string | undefined) ??
      "Neo Gentleman <onboarding@resend.dev>";

    const TO_BARBER = import.meta.env.BOOKING_BARBER_EMAIL as string | undefined;

    const SHOP = (import.meta.env.BOOKING_SHOP_NAME as string | undefined) ?? "Neo Gentleman";

    // client notify:
    // none  -> never email client
    // email -> email client if provided
    // auto  -> same as email for now (SMS not implemented)
    const NOTIFY = (
      (import.meta.env.BOOKING_CLIENT_NOTIFY as string | undefined) ?? "none"
    ).toLowerCase();

    if (!RESEND_API_KEY) return json({ ok: false, error: "Missing RESEND_API_KEY" }, 500);
    if (!TO_BARBER) return json({ ok: false, error: "Missing BOOKING_BARBER_EMAIL" }, 500);

    const body = await request.json();

    // ✅ Honeypot anti-spam: bots fill hidden "website"
    if (typeof body?.website === "string" && body.website.trim().length > 0) {
      return json({ ok: true, ignored: true }, 200);
    }

    // minimal validation
    const serviceName = body?.service?.name ? String(body.service.name) : "";
    const servicePrice = body?.service?.price ?? "";
    const serviceMins = body?.service?.mins ?? "";
    const date = body?.date ? String(body.date) : "";
    const time = body?.time ? String(body.time) : "";
    const endTime = body?.endTime ? String(body.endTime) : "";
    const phone = body?.phone ? String(body.phone) : "";
    const name = body?.name ? String(body.name) : "";
    const notes = body?.notes ? String(body.notes) : "";
    const clientEmail = typeof body?.email === "string" ? body.email.trim() : "";

    const consentBooking = !!body?.consent?.booking;
    const consentMarketing = !!body?.consent?.marketing;

    if (!serviceName || !date || !time || !phone) {
      return json({ ok: false, error: "Missing required fields" }, 400);
    }

    if (!consentBooking) {
      return json({ ok: false, error: "Missing required consent (booking)" }, 400);
    }

    const barberLine = body?.barber?.name ? String(body.barber.name) : "No preference";

    const subject = `${SHOP} · Booking request · ${serviceName} · ${date} ${time}`;

    const detailsHtml = `
      <div style="font-family: ui-sans-serif, system-ui; line-height:1.5">
        <h2 style="margin:0 0 8px 0;">New booking request</h2>
        <p style="margin:0 0 14px 0; color:#444;">${escapeHtml(SHOP)}</p>

        <table style="border-collapse:collapse; width:100%; max-width:640px;">
          ${row(
            "Service",
            `${escapeHtml(serviceName)} · £${escapeHtml(String(servicePrice))} · ${escapeHtml(String(serviceMins))} min`
          )}
          ${row("Barber", escapeHtml(barberLine))}
          ${row("Date", escapeHtml(date))}
          ${row("Time", escapeHtml(`${time}${endTime ? "–" + endTime : ""}`))}
          ${row("Phone", escapeHtml(phone))}
          ${row("Name", escapeHtml(name || "—"))}
          ${row("Notes", escapeHtml(notes || "—"))}
          ${clientEmail ? row("Client email", escapeHtml(clientEmail)) : ""}
          ${row("Consent (booking)", consentBooking ? "Yes" : "No")}
          ${row("Consent (marketing)", consentMarketing ? "Yes" : "No")}
        </table>

        <p style="margin:18px 0 0 0; color:#666; font-size:13px;">
          Sent from booking form.
        </p>
      </div>
    `;

    // 1) send to barber (always)
    const sendBarber = await resendSend({
      apiKey: RESEND_API_KEY,
      from: FROM,
      to: TO_BARBER,
      subject,
      html: detailsHtml,
    });

    if (!sendBarber.ok) return json({ ok: false, error: sendBarber.error }, 502);

    // 2) optional: client confirmation email
    const allowEmail = NOTIFY === "email" || NOTIFY === "auto";
    let clientNotified = false;

    if (clientEmail && allowEmail) {
      const clientSubject = `${SHOP} · Request received · ${date} ${time}`;
      const clientHtml = `
        <div style="font-family: ui-sans-serif, system-ui; line-height:1.5">
          <h2 style="margin:0 0 8px 0;">Request received ✅</h2>
          <p style="margin:0 0 14px 0; color:#444;">
            We’ll follow up shortly to confirm. No marketing.
          </p>

          <p style="margin:0 0 10px 0;">
            <strong>${escapeHtml(serviceName)}</strong><br/>
            ${escapeHtml(date)} · ${escapeHtml(time)}${endTime ? "–" + escapeHtml(endTime) : ""}<br/>
            Barber: ${escapeHtml(barberLine)}
          </p>

          <p style="margin:14px 0 0 0; color:#666; font-size:13px;">
            To reschedule or cancel, reply to this email or contact the shop.
          </p>
        </div>
      `;

      const sendClient = await resendSend({
        apiKey: RESEND_API_KEY,
        from: FROM,
        to: clientEmail,
        subject: clientSubject,
        html: clientHtml,
      });

      clientNotified = !!sendClient.ok;
      // Jeśli mail do klienta się nie wyśle — nie blokujemy requestu (barber i tak dostał).
    }

    return json({ ok: true, clientNotified }, 200);
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
