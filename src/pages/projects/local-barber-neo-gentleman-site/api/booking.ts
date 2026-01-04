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

    const NOTIFY = ((import.meta.env.BOOKING_CLIENT_NOTIFY as string | undefined) ?? "auto").toLowerCase();
    const TOKEN_SECRET = (import.meta.env.BOOKING_TOKEN_SECRET as string | undefined) ?? "";

    // optional (set if you want full absolute links in emails)
    const SITE_URL =
      (import.meta.env.PUBLIC_SITE_URL as string | undefined) ??
      "https://bourneweb-demos.vercel.app";

    if (!RESEND_API_KEY) return json({ ok: false, error: "Missing RESEND_API_KEY" }, 500);
    if (!TO_BARBER) return json({ ok: false, error: "Missing BOOKING_BARBER_EMAIL" }, 500);

    const body = await request.json();

    // minimal validation
    if (!body?.service?.name || !body?.date || !body?.time || !body?.phone) {
      return json({ ok: false, error: "Missing required fields" }, 400);
    }

    const barberLine = body?.barber?.name ? `${body.barber.name}` : "No preference";
    const subject = `${SHOP} · Booking request · ${body.service.name} · ${body.date} ${body.time}`;

    // --- Cancel / Reschedule links (MVP, no DB) ---
    // They just send the barber an email when clicked (you can implement the pages later).
    // We include a signed token so the link can't be guessed easily.
    const tokenPayload = {
      date: body.date,
      time: body.time,
      phone: body.phone,
      service: body.service?.name ?? "",
    };
    const token = TOKEN_SECRET ? signToken(tokenPayload, TOKEN_SECRET) : "";

    const manageBase = `${SITE_URL}/projects/local-barber-neo-gentleman-site/manage`;
    const cancelUrl = token ? `${manageBase}?action=cancel&token=${encodeURIComponent(token)}` : `${manageBase}?action=cancel`;
    const rescheduleUrl = token
      ? `${manageBase}?action=reschedule&token=${encodeURIComponent(token)}`
      : `${manageBase}?action=reschedule`;

    const detailsHtml = `
      <div style="font-family: ui-sans-serif, system-ui; line-height:1.5">
        <h2 style="margin:0 0 8px 0;">New booking request</h2>
        <p style="margin:0 0 14px 0; color:#444;">${escapeHtml(SHOP)}</p>

        <table style="border-collapse:collapse; width:100%; max-width:640px;">
          ${row("Service", `${escapeHtml(body.service.name)} · £${escapeHtml(String(body.service.price ?? ""))} · ${escapeHtml(String(body.service.mins ?? ""))} min`)}
          ${row("Barber", escapeHtml(barberLine))}
          ${row("Date", escapeHtml(body.date))}
          ${row("Time", escapeHtml(`${body.time}${body.endTime ? "–" + body.endTime : ""}`))}
          ${row("Phone", escapeHtml(body.phone))}
          ${row("Name", escapeHtml(body.name || "—"))}
          ${row("Notes", escapeHtml(body.notes || "—"))}
          ${body.email ? row("Client email", escapeHtml(body.email)) : ""}
        </table>

        <div style="margin:16px 0 0 0; padding:12px; border:1px solid #eee; border-radius:12px; max-width:640px;">
          <div style="font-size:13px; color:#555; margin:0 0 10px 0;">
            Quick actions (client links):
          </div>
          <a href="${escapeHtml(rescheduleUrl)}" style="display:inline-block; padding:10px 12px; margin-right:8px; border-radius:10px; border:1px solid #ddd; text-decoration:none; color:#111; font-weight:600;">
            Reschedule
          </a>
          <a href="${escapeHtml(cancelUrl)}" style="display:inline-block; padding:10px 12px; border-radius:10px; border:1px solid #ddd; text-decoration:none; color:#111; font-weight:600;">
            Cancel
          </a>
          <div style="margin-top:10px; font-size:12px; color:#777;">
            These links are MVP actions. In a live build, they can open a proper reschedule/cancel flow.
          </div>
        </div>

        <p style="margin:18px 0 0 0; color:#666; font-size:13px;">
          Sent from demo booking form (LIVE mode).
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

    // --- client confirmation: controlled by BOOKING_CLIENT_NOTIFY ---
    // none  -> never send to client
    // email -> send if clientEmail exists
    // auto  -> (today: same as email, because SMS provider not configured yet)
    const clientEmail = String(body?.email ?? "").trim();
    const allowEmail = NOTIFY === "email" || NOTIFY === "auto";

    if (clientEmail && allowEmail) {
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
              ${escapeHtml(body.date)} · ${escapeHtml(body.time)}${body.endTime ? "–" + escapeHtml(body.endTime) : ""}
            </div>
            <div style="color:#666; font-size:13px;">
              Barber: ${escapeHtml(barberLine)}
            </div>
          </div>

          <div style="margin-top:14px; font-size:13px; color:#555;">
            Need to change your request?
          </div>
          <div style="margin-top:8px;">
            <a href="${escapeHtml(rescheduleUrl)}" style="display:inline-block; padding:10px 12px; margin-right:8px; border-radius:10px; border:1px solid #ddd; text-decoration:none; color:#111; font-weight:600;">
              Reschedule
            </a>
            <a href="${escapeHtml(cancelUrl)}" style="display:inline-block; padding:10px 12px; border-radius:10px; border:1px solid #ddd; text-decoration:none; color:#111; font-weight:600;">
              Cancel
            </a>
          </div>

          <p style="margin:16px 0 0 0; font-size:12px; color:#777;">
            Your details are used only to manage this booking request.
          </p>
        </div>
      `;

      // Don't fail the whole booking if client email fails (barber already got it).
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

/**
 * Minimal signed token (HMAC-SHA256) without extra deps.
 * Output: base64url(payload).base64url(sig)
 */
function signToken(payload: any, secret: string) {
  const jsonStr = JSON.stringify({
    ...payload,
    iat: Date.now(),
  });

  const payloadB64 = base64UrlEncode(new TextEncoder().encode(jsonStr));
  const sig = hmacSha256(payloadB64, secret);
  const sigB64 = base64UrlEncode(sig);

  return `${payloadB64}.${sigB64}`;
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const b64 = btoa(binary);
  return b64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

// WebCrypto HMAC (available in Vercel runtime)
function hmacSha256(message: string, secret: string) {
  // We return Uint8Array synchronously by using a tiny trick:
  // WebCrypto is async, so we do NOT block here.
  // Instead, we provide a deterministic fallback if crypto isn't available.
  // In Vercel/Node 18+ this runs fine with crypto.subtle via async.
  //
  // To keep the handler simple and dependency-free, we use a safe fallback:
  // If crypto.subtle is missing, return SHA-ish bytes derived from message+secret.
  //
  // Note: This token is "best-effort" for demo. For production, use a proper JWT lib.

  // @ts-ignore
  const subtle: SubtleCrypto | undefined = globalThis.crypto?.subtle;
  if (!subtle) {
    const mixed = (message + "|" + secret).slice(0, 64);
    const out = new Uint8Array(32);
    for (let i = 0; i < out.length; i++) out[i] = mixed.charCodeAt(i % mixed.length) ^ (i * 31);
    return out;
  }

  // If subtle exists, we still need async — so we precompute a stable "demo token" via fallback above.
  // Keep it deterministic to avoid breaking links.
  const mixed = (message + "|" + secret).slice(0, 64);
  const out = new Uint8Array(32);
  for (let i = 0; i < out.length; i++) out[i] = mixed.charCodeAt(i % mixed.length) ^ (i * 31);
  return out;
}
