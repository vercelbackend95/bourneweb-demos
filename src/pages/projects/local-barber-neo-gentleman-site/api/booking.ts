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

    // auto = send client email if provided (today: same as email, because no SMS provider)
    // email = same behavior as auto (explicit)
    // none = never send to client
    const NOTIFY = ((import.meta.env.BOOKING_CLIENT_NOTIFY as string | undefined) ?? "auto").toLowerCase();

    // optional number for "Call/Text" links in client email (E.164 preferred, e.g. +447...)
    const SHOP_PHONE = (import.meta.env.BOOKING_SHOP_PHONE as string | undefined) ?? "";

    if (!RESEND_API_KEY) return json({ ok: false, error: "Missing RESEND_API_KEY" }, 500);
    if (!TO_BARBER) return json({ ok: false, error: "Missing BOOKING_BARBER_EMAIL" }, 500);

    const body = await request.json();

    // minimal validation
    if (!body?.service?.name || !body?.date || !body?.time || !body?.phone) {
      return json({ ok: false, error: "Missing required fields" }, 400);
    }

    const barberLine = body?.barber?.name ? `${body.barber.name}` : "No preference";
    const timeLine = `${body.time}${body.endTime ? "–" + body.endTime : ""}`;

    const subject = `${SHOP} · Booking request · ${body.service.name} · ${body.date} ${body.time}`;

    const detailsHtml = `
      <div style="font-family: ui-sans-serif, system-ui; line-height:1.5">
        <h2 style="margin:0 0 8px 0;">New booking request</h2>
        <p style="margin:0 0 14px 0; color:#444;">${escapeHtml(SHOP)}</p>

        <table style="border-collapse:collapse; width:100%; max-width:640px;">
          ${row("Service", `${escapeHtml(body.service.name)} · £${escapeHtml(String(body.service.price ?? ""))} · ${escapeHtml(String(body.service.mins ?? ""))} min`)}
          ${row("Barber", escapeHtml(barberLine))}
          ${row("Date", escapeHtml(body.date))}
          ${row("Time", escapeHtml(timeLine))}
          ${row("Phone", escapeHtml(body.phone))}
          ${row("Name", escapeHtml(body.name || "—"))}
          ${row("Notes", escapeHtml(body.notes || "—"))}
          ${body.email ? row("Client email", escapeHtml(body.email)) : ""}
        </table>

        <p style="margin:18px 0 0 0; color:#666; font-size:13px;">
          Demo flow: barber confirms by text/call.
        </p>
      </div>
    `;

    // send to barber (always)
    const sendBarber = await resendSend({
      apiKey: RESEND_API_KEY,
      from: FROM,
      to: TO_BARBER,
      subject,
      html: detailsHtml,
    });

    if (!sendBarber.ok) return json({ ok: false, error: sendBarber.error }, 502);

    // --- client confirmation (DEMO) ---
    const clientEmail = String(body?.email ?? "").trim();
    const allowEmail = NOTIFY === "auto" || NOTIFY === "email";

    if (clientEmail && allowEmail) {
      // Mailto links (no DB, no tokens, no endpoints) — works now.
      const mailtoBase = `mailto:${encodeURIComponent(TO_BARBER)}`;

      const cancelSubject = `${SHOP} · Cancel request · ${body.date} ${body.time}`;
      const cancelBody =
        `Hi ${SHOP},\n\n` +
        `I’d like to cancel my booking request:\n` +
        `- Service: ${body.service.name}\n` +
        `- Date: ${body.date}\n` +
        `- Time: ${body.time}${body.endTime ? "–" + body.endTime : ""}\n` +
        `- Phone: ${body.phone}\n` +
        `- Name: ${body.name || "—"}\n\n` +
        `Thanks.`;

      const rescheduleSubject = `${SHOP} · Reschedule request · ${body.date} ${body.time}`;
      const rescheduleBody =
        `Hi ${SHOP},\n\n` +
        `I’d like to reschedule my booking request:\n` +
        `- Service: ${body.service.name}\n` +
        `- Current: ${body.date} ${body.time}${body.endTime ? "–" + body.endTime : ""}\n` +
        `- Phone: ${body.phone}\n` +
        `- Name: ${body.name || "—"}\n\n` +
        `Preferred new time(s):\n` +
        `1) \n2) \n3) \n\n` +
        `Thanks.`;

      const cancelMailto = `${mailtoBase}?subject=${encodeURIComponent(cancelSubject)}&body=${encodeURIComponent(cancelBody)}`;
      const rescheduleMailto = `${mailtoBase}?subject=${encodeURIComponent(rescheduleSubject)}&body=${encodeURIComponent(rescheduleBody)}`;

      const clientSubject = `${SHOP} · Request received · ${body.date} ${body.time}`;
      const clientHtml = `
        <div style="font-family: ui-sans-serif, system-ui; line-height:1.5">
          <h2 style="margin:0 0 8px 0;">Request received ✅</h2>
          <p style="margin:0 0 14px 0; color:#444;">
            We’ll text to confirm shortly. No marketing.
          </p>

          <div style="padding:12px; border:1px solid #eee; border-radius:12px; max-width:640px;">
            <div style="font-weight:700; color:#111; margin-bottom:6px;">
              ${escapeHtml(body.service.name)}
            </div>
            <div style="color:#444; margin-bottom:6px;">
              ${escapeHtml(body.date)} · ${escapeHtml(timeLine)}
            </div>
            <div style="color:#666; font-size:13px;">
              Barber: ${escapeHtml(barberLine)}
            </div>
          </div>

          <div style="margin-top:14px; font-size:13px; color:#555;">
            Need to change your request?
          </div>

          <div style="margin-top:8px;">
            <a href="${escapeHtml(rescheduleMailto)}" style="display:inline-block; padding:10px 12px; margin-right:8px; border-radius:10px; border:1px solid #ddd; text-decoration:none; color:#111; font-weight:600;">
              Reschedule
            </a>
            <a href="${escapeHtml(cancelMailto)}" style="display:inline-block; padding:10px 12px; border-radius:10px; border:1px solid #ddd; text-decoration:none; color:#111; font-weight:600;">
              Cancel
            </a>
            ${SHOP_PHONE ? `
              <a href="tel:${escapeHtml(SHOP_PHONE)}" style="display:inline-block; padding:10px 12px; margin-left:8px; border-radius:10px; border:1px solid #ddd; text-decoration:none; color:#111; font-weight:600;">
                Call/Text
              </a>` : ""}
          </div>

          <p style="margin:16px 0 0 0; font-size:12px; color:#777;">
            Your details are used only to manage this booking request.
          </p>
        </div>
      `;

      // Do not fail booking if client email fails — barber already received the request.
      await resendSend({
        apiKey: RESEND_API_KEY,
        from: FROM,
        to: clientEmail,
        subject: clientSubject,
        html: clientHtml,
      });
    }

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
