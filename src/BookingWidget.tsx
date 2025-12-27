import React, { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import Lenis from "@studio-freight/lenis";

type BarberKey = "mason" | "oliver" | "theo";
type ServiceKey = "skinfade" | "haircutbeard" | "hottowel";

type Barber = { key: BarberKey; name: string; role: string; photo: string };
type Service = { key: ServiceKey; name: string; mins: number; price: number; desc: string };

const NOTE_CHIPS = ["Beard trim", "Skin fade length", "Sensitive skin", "No clipper zero"] as const;

const OPEN_START = 10 * 60;
const OPEN_END = 20 * 60;
const STEP = 15;

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (mins: number) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
const toMins = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const addMins = (hhmm: string, add: number) => fmt(toMins(hhmm) + add);

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function prettyDayLong(d: Date) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit", month: "short" }).format(d);
}
function prettyMonth(d: Date) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(d);
}
function isoForInput(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function parseISO(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function roundUpToStep(mins: number) {
  return Math.ceil(mins / STEP) * STEP;
}
function nextAvailableToday() {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const rounded = roundUpToStep(cur);
  if (rounded < OPEN_START) return fmt(OPEN_START);
  if (rounded >= OPEN_END) return null;
  return fmt(rounded);
}
function buildTimesForDate(d: Date) {
  const all: string[] = [];
  for (let m = OPEN_START; m < OPEN_END; m += STEP) all.push(fmt(m));

  const today = new Date();
  if (startOfDay(d) < startOfDay(today)) return [];

  if (isSameDay(d, today)) {
    const next = nextAvailableToday();
    if (!next) return [];
    const idx = all.indexOf(next);
    return idx >= 0 ? all.slice(idx) : all;
  }
  return all;
}
function filterTimesForService(times: string[], mins: number) {
  return times.filter((t) => toMins(t) + mins <= OPEN_END);
}

function digitsOnly(s: string) {
  return (s || "").replace(/\D/g, "");
}
function isPhoneValid(s: string) {
  const d = digitsOnly(s);
  return d.length >= 10 && d.length <= 13;
}
function formatUKPhone(raw: string) {
  let v = (raw || "").trim();
  v = v.replace(/[^\d+]/g, "");
  if (v.includes("+")) v = "+" + v.replace(/\+/g, "").replace(/[^\d]/g, "");
  const digits = v.replace(/\D/g, "");
  const hasPlus = v.startsWith("+");

  if (hasPlus) {
    if (digits.startsWith("44") && digits.length >= 12) {
      const rest = digits.slice(2);
      const a = rest.slice(0, 4);
      const b = rest.slice(4, 7);
      const c = rest.slice(7, 10);
      const d = rest.slice(10, 13);
      return `+44 ${a}${b ? " " + b : ""}${c ? " " + c : ""}${d ? " " + d : ""}`.trim();
    }
    return "+" + digits;
  } else {
    const a = digits.slice(0, 5);
    const b = digits.slice(5, 8);
    const c = digits.slice(8, 11);
    return `${a}${b ? " " + b : ""}${c ? " " + c : ""}`.trim();
  }
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** inline “photo” avatars (works out of the box, can be swapped for real JPG later) */
function avatarDataURI(seed: string, accent: string) {
  const initial = seed.trim().slice(0, 1).toUpperCase();
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <defs>
      <radialGradient id="g" cx="35%" cy="28%" r="80%">
        <stop offset="0" stop-color="${accent}" stop-opacity="0.35"/>
        <stop offset="1" stop-color="#0b0b0b" stop-opacity="1"/>
      </radialGradient>
      <linearGradient id="s" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.14"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="64" fill="url(#g)"/>
    <rect x="8" y="8" width="112" height="112" rx="56" fill="none" stroke="url(#s)"/>
    <!-- silhouette -->
    <path d="M64 72c14 0 26 8 30 20 1 3-1 6-5 6H39c-4 0-6-3-5-6 4-12 16-20 30-20z" fill="#ffffff" opacity="0.12"/>
    <circle cx="64" cy="50" r="16" fill="#ffffff" opacity="0.14"/>
    <!-- initial (subtle) -->
    <text x="64" y="114" text-anchor="middle" font-family="ui-sans-serif,system-ui" font-size="16" fill="#ffffff" opacity="0.35" font-weight="800">${initial}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const BARBERS: Barber[] = [
  { key: "mason", name: "Mason", role: "Senior Barber", photo: avatarDataURI("Mason", "#d2aa6e") },
  { key: "oliver", name: "Oliver", role: "Skin Fade Specialist", photo: avatarDataURI("Oliver", "#c8a46a") },
  { key: "theo", name: "Theo", role: "Classic Cuts", photo: avatarDataURI("Theo", "#b99254") },
];

const SERVICES: Service[] = [
  { key: "skinfade", name: "Skin fade", mins: 50, price: 28, desc: "Clean blend, crisp edges." },
  { key: "haircutbeard", name: "Haircut + beard", mins: 60, price: 30, desc: "Full refresh, tidy finish." },
  { key: "hottowel", name: "Hot towel shave", mins: 30, price: 18, desc: "Warm towel, smooth close." },
];

/** calendar grid */
function getMonthGrid(view: Date) {
  const y = view.getFullYear();
  const m = view.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const startWeekday = (first.getDay() + 6) % 7; // Monday=0
  const daysInMonth = last.getDate();

  const cells: Array<{ date: Date | null; label: string }> = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ date: null, label: "" });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(y, m, d), label: String(d) });
  while (cells.length % 7 !== 0) cells.push({ date: null, label: "" });

  return { cells };
}

export default function BookingWidget() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const p1Ref = useRef<HTMLDivElement | null>(null);
  const p2Ref = useRef<HTMLDivElement | null>(null);
  const p3Ref = useRef<HTMLDivElement | null>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [barberKey, setBarberKey] = useState<BarberKey | null>(null);
  const barber = useMemo(() => BARBERS.find((b) => b.key === barberKey) || null, [barberKey]);

  const [serviceKey, setServiceKey] = useState<ServiceKey | null>(null);
  const service = useMemo(() => SERVICES.find((s) => s.key === serviceKey) || null, [serviceKey]);

  const [date, setDate] = useState<Date>(startOfDay(new Date()));
  const [time, setTime] = useState<string>("");

  const [showDetails, setShowDetails] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Lenis (once)
  useEffect(() => {
    const w = window as any;
    if (w.__bw_lenis) return;
    const lenis = new Lenis({ smoothWheel: true, smoothTouch: false });
    w.__bw_lenis = lenis;

    const raf = (t: number) => {
      lenis.raf(t);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, []);

  // Entrance
  useEffect(() => {
    if (!rootRef.current) return;
    if (prefersReducedMotion()) return;
    gsap.fromTo(rootRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" });
  }, []);

  const panelRefFor = (s: 1 | 2 | 3) => (s === 1 ? p1Ref : s === 2 ? p2Ref : p3Ref);

  const transitionTo = (next: 1 | 2 | 3) => {
    if (next === step) return;

    const reduce = prefersReducedMotion();
    const curEl = panelRefFor(step).current;
    const nextEl = panelRefFor(next).current;

    setSent(false);

    if (!curEl || !nextEl || reduce) {
      setStep(next);
      return;
    }

    gsap.set(nextEl, { autoAlpha: 0, x: next > step ? 26 : -26, pointerEvents: "none" });
    gsap.set(curEl, { pointerEvents: "none" });
    gsap.set([p1Ref.current, p2Ref.current, p3Ref.current], { position: "absolute", inset: 0 });

    gsap.set(nextEl, { display: "block" });

    const tl = gsap.timeline({
      onComplete: () => {
        setStep(next);
        requestAnimationFrame(() => {
          const active = panelRefFor(next).current;
          if (!active) return;

          [p1Ref.current, p2Ref.current, p3Ref.current].forEach((el) => {
            if (!el) return;
            if (el === active) {
              gsap.set(el, { clearProps: "position,inset,x", autoAlpha: 1, display: "block", pointerEvents: "auto" });
            } else {
              gsap.set(el, { autoAlpha: 0, display: "none", pointerEvents: "none", clearProps: "position,inset,x" });
            }
          });
        });
      },
    });

    tl.to(curEl, { autoAlpha: 0, x: next > step ? -26 : 26, duration: 0.20, ease: "power2.out" }, 0);
    tl.to(nextEl, { autoAlpha: 1, x: 0, duration: 0.24, ease: "power2.out" }, 0.05);
  };

  // Keep non-active panels hidden after first render
  useEffect(() => {
    [p1Ref.current, p2Ref.current, p3Ref.current].forEach((el, idx) => {
      if (!el) return;
      const s = (idx + 1) as 1 | 2 | 3;
      if (s === step) {
        gsap.set(el, { autoAlpha: 1, display: "block", pointerEvents: "auto" });
      } else {
        gsap.set(el, { autoAlpha: 0, display: "none", pointerEvents: "none" });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Times
  const baseTimes = useMemo(() => buildTimesForDate(date), [date]);
  const times = useMemo(() => (service ? filterTimesForService(baseTimes, service.mins) : baseTimes), [baseTimes, service]);
  const noSlots = times.length === 0;

  const nextLabelTime = useMemo(() => {
    if (times.length === 0) return null;
    if (isSameDay(date, new Date())) return nextAvailableToday() || times[0];
    return times[0];
  }, [date, times]);

  const endTime = useMemo(() => {
    if (!service || !time) return "";
    return addMins(time, service.mins);
  }, [service, time]);

  const phoneOk = isPhoneValid(phone);
  const phoneSoftError = phone.length > 0 && !phoneOk ? "That number looks short" : "";

  // Calendar view month
  const [viewMonth, setViewMonth] = useState<Date>(() => new Date(date.getFullYear(), date.getMonth(), 1));
  useEffect(() => {
    setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }, [date]);

  const grid = useMemo(() => getMonthGrid(viewMonth), [viewMonth]);
  const minDay = useMemo(() => startOfDay(new Date()), []);
  const isDisabledDay = (d: Date) => startOfDay(d) < minDay;

  const pickDate = (d: Date) => {
    setDate(startOfDay(d));
    setTime("");
    setSent(false);
  };

  const onPickBarber = (k: BarberKey) => {
    setBarberKey(k);
    setSent(false);
  };

  const onPickService = (k: ServiceKey) => {
    setServiceKey(k);
    setSent(false);
    if (!prefersReducedMotion() && rootRef.current) {
      const el = rootRef.current.querySelector(`[data-service="${k}"]`);
      if (el) gsap.fromTo(el, { scale: 0.99 }, { scale: 1, duration: 0.18, ease: "power2.out" });
    }
  };

  const onPickTime = (t: string) => {
    setTime(t);
    setSent(false);
  };

  const addNoteChip = (txt: string) => {
    setShowDetails(true);
    setNotes((prev) => {
      const p = (prev || "").trim();
      if (!p) return txt;
      if (p.toLowerCase().includes(txt.toLowerCase())) return prev;
      return `${p}${p.endsWith(".") ? "" : "."} ${txt}`;
    });
  };

  const step1Ready = !!barber && !!service;
  const step2Ready = !!date;
  const step3Ready = !!time && phoneOk;

  const progress = step === 1 ? 0.33 : step === 2 ? 0.66 : 1;

  /** bmw__subline — ONLY real selected data, progressively */
  const sublineText = useMemo(() => {
    const parts: string[] = [];
    if (barber) parts.push(barber.name);
    if (service) parts.push(`${service.name} · £${service.price}`);
    if (service && date) parts.push(prettyDayLong(date));
    if (service && date && time && endTime) parts.push(`${time}–${endTime}`);
    return parts.join(" • ");
  }, [barber, service, date, time, endTime]);

  const confirmLabel = useMemo(() => {
    if (!step3Ready) return "Confirm";
    return `Confirm — £${service?.price ?? ""}`;
  }, [step3Ready, service]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSent(false);
    if (!step3Ready || sending) return;

    setSending(true);
    await new Promise((r) => setTimeout(r, 850));
    setSending(false);
    setSent(true);
  };

  return (
    <div className="bmw" ref={rootRef}>
      <form className="bmw__card" onSubmit={onSubmit} aria-label="Booking wizard">
        <div className="bmw__top">
          <div className="bmw__kicker">Book online</div>
          <div className="bmw__headline">A clean cut, booked in minutes.</div>
          {sublineText ? <div className="bmw__subline">{sublineText}</div> : null}
        </div>

        <div className="bmw__stage" aria-live="polite">
          {/* PANEL 1 */}
          <div ref={p1Ref} className="bmw__panel" aria-hidden={step !== 1}>
            <div className="bmw__stepHead">
              <div>
                <div className="bmw__stepKicker">Step 1</div>
                <div className="bmw__stepTitle">Pick barber + service</div>
              </div>
            </div>

            <div className="bmw__block">
              <div className="bmw__labelRow">
                <span className="bmw__label">Barber</span>
              </div>

              <div className="bmw__chips" role="list">
                {BARBERS.map((b) => {
                  const active = b.key === barberKey;
                  return (
                    <button
                      key={b.key}
                      type="button"
                      className={`bmw__chip ${active ? "is-active" : ""}`}
                      onClick={() => onPickBarber(b.key)}
                      role="listitem"
                    >
                      <span className="bmw__avatar" aria-hidden="true">
                        <img src={b.photo} alt="" loading="lazy" />
                      </span>

                      <span className="bmw__chipText">
                        <span className="bmw__chipMain">{b.name}</span>
                        <span className="bmw__chipMeta">{b.role}</span>
                      </span>

                      <span className="bmw__sel" aria-hidden="true">{active ? "✓" : ""}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bmw__block">
              <div className="bmw__labelRow">
                <span className="bmw__label">Service</span>
              </div>

              <div className="bmw__chips" role="list">
                {SERVICES.map((s) => {
                  const active = s.key === serviceKey;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      className={`bmw__chip ${active ? "is-active" : ""}`}
                      onClick={() => onPickService(s.key)}
                      data-service={s.key}
                      role="listitem"
                    >
                      <span className="bmw__chipText">
                        <span className="bmw__chipMain">{s.name}</span>
                        <span className="bmw__chipMeta">{s.mins}m • £{s.price}</span>
                      </span>

                      <span className="bmw__sel" aria-hidden="true">{active ? "✓" : ""}</span>
                    </button>
                  );
                })}
              </div>

              <div className="bmw__oneLine">
                {service ? service.desc : "Choose a service to continue."}
              </div>
            </div>

            <div className="bmw__nav">
              <button type="button" className="bmw__btnGhost" disabled>Back</button>
              <button type="button" className={`bmw__btn ${step1Ready ? "is-ready" : ""}`} onClick={() => transitionTo(2)} disabled={!step1Ready}>
                Next
              </button>
            </div>
          </div>

          {/* PANEL 2 */}
          <div ref={p2Ref} className="bmw__panel" aria-hidden={step !== 2}>
            <div className="bmw__stepHead">
              <div>
                <div className="bmw__stepKicker">Step 2</div>
                <div className="bmw__stepTitle">Choose a date</div>
              </div>
              <div className="bmw__miniRight">
                <span className="bmw__miniPill">{prettyDayLong(date)}</span>
              </div>
            </div>

            <div className="bmw__calendar">
              <div className="bmw__calTop">
                <button
                  type="button"
                  className="bmw__calArrow"
                  onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                  aria-label="Previous month"
                >
                  ‹
                </button>
                <div className="bmw__calMonth">{prettyMonth(viewMonth)}</div>
                <button
                  type="button"
                  className="bmw__calArrow"
                  onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>

              <div className="bmw__calWeek">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
                  <div key={w} className="bmw__calW">{w}</div>
                ))}
              </div>

              <div className="bmw__calGrid" role="grid" aria-label="Calendar">
                {grid.cells.map((c, idx) => {
                  if (!c.date) return <div key={idx} className="bmw__calEmpty" aria-hidden="true" />;
                  const d = c.date;
                  const disabled = isDisabledDay(d);
                  const active = isSameDay(d, date);
                  const today = isSameDay(d, new Date());

                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`bmw__day ${active ? "is-active" : ""} ${today ? "is-today" : ""}`}
                      onClick={() => pickDate(d)}
                      disabled={disabled}
                      aria-pressed={active}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>

              <input
                className="bmw__dateHidden"
                type="date"
                value={isoForInput(date)}
                min={isoForInput(new Date())}
                onChange={(e) => pickDate(parseISO(e.target.value))}
                aria-label="Date input"
              />
            </div>

            <div className="bmw__nav">
              <button type="button" className="bmw__btnGhost" onClick={() => transitionTo(1)}>Back</button>
              <button type="button" className={`bmw__btn ${step2Ready ? "is-ready" : ""}`} onClick={() => transitionTo(3)} disabled={!step2Ready}>
                Next
              </button>
            </div>
          </div>

          {/* PANEL 3 */}
          <div ref={p3Ref} className="bmw__panel" aria-hidden={step !== 3}>
            <div className="bmw__stepHead">
              <div>
                <div className="bmw__stepKicker">Step 3</div>
                <div className="bmw__stepTitle">Pick a time</div>
              </div>
              <div className="bmw__miniRight">
                <span className="bmw__miniPill">{prettyDayLong(date)}</span>
              </div>
            </div>

            {noSlots ? (
              <div className="bmw__empty">
                <div className="bmw__emptyT">No slots on this date.</div>
                <div className="bmw__emptyS">Pick another date.</div>
                <button type="button" className="bmw__btnGhost" onClick={() => transitionTo(2)}>Back to calendar</button>
              </div>
            ) : (
              <div className="bmw__times" role="list" aria-label="Time slots">
                {times.map((t) => {
                  const active = t === time;
                  const best = t === nextLabelTime;
                  const end = service ? addMins(t, service.mins) : "";
                  return (
                    <button
                      key={t}
                      type="button"
                      className={`bmw__time ${active ? "is-active" : ""}`}
                      onClick={() => onPickTime(t)}
                      role="listitem"
                    >
                      <div className="bmw__timeTop">
                        <span className="bmw__sel" aria-hidden="true">{active ? "✓" : ""}</span>
                        {best ? <span className="bmw__badge">Next available</span> : null}
                      </div>
                      <div className="bmw__timeMain">{t}</div>
                      <div className="bmw__timeSub">{service ? `${t}–${end} · Ends ${end}` : "Select service for range"}</div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="bmw__detailsWrap">
              <label className="bmw__field">
                <span className="bmw__label">Phone*</span>
                <div className="bmw__inputWrap">
                  <input
                    className={`bmw__input ${phone && !phoneOk ? "is-warnSoft" : ""}`}
                    value={phone}
                    onChange={(e) => setPhone(formatUKPhone(e.target.value))}
                    placeholder="+44 7xxx xxx xxx"
                    autoComplete="tel"
                    inputMode="tel"
                    required
                    aria-invalid={phone ? String(!phoneOk) : "false"}
                  />
                  {phoneOk ? <span className="bmw__okTick" aria-hidden="true">✓</span> : null}
                </div>
                <span className="bmw__hint">Text confirmation only. No spam.</span>
                {phoneSoftError ? <span className="bmw__softErr">{phoneSoftError}</span> : null}
              </label>

              <button type="button" className="bmw__detailsToggle" onClick={() => setShowDetails((v) => !v)} aria-expanded={showDetails}>
                {showDetails ? "Hide details" : "Add details (optional)"}
                <span className="bmw__chev" aria-hidden="true">▾</span>
              </button>

              <div className={`bmw__details ${showDetails ? "is-open" : ""}`}>
                <div className="bmw__detailsInner">
                  <label className="bmw__field">
                    <span className="bmw__label">Name</span>
                    <input className="bmw__input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
                  </label>

                  <div className="bmw__noteChips" role="list" aria-label="Quick notes">
                    {NOTE_CHIPS.map((c) => (
                      <button key={c} type="button" className="bmw__noteChip" onClick={() => addNoteChip(c)} role="listitem">
                        + {c}
                      </button>
                    ))}
                  </div>

                  <label className="bmw__field">
                    <span className="bmw__label">Notes</span>
                    <textarea
                      className="bmw__input bmw__textarea"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Beard trim? Skin fade length? Any allergies?"
                    />
                  </label>
                </div>
              </div>

              {sent ? (
                <div className="bmw__sent" role="status">
                  Request sent. We’ll text you soon.
                </div>
              ) : null}
            </div>

            <div className="bmw__nav">
              <button type="button" className="bmw__btnGhost" onClick={() => transitionTo(2)}>Back</button>
              <button type="submit" className={`bmw__btn ${step3Ready ? "is-ready" : ""} ${sending ? "is-loading" : ""}`} disabled={!step3Ready || sending}>
                {sending ? "Sending…" : confirmLabel}
              </button>
            </div>
          </div>
        </div>

        <div className="bmw__progress">
          <div className="bmw__progressTop">
            <span className="bmw__pLabel">Progress</span>
            <span className="bmw__pVal">{step}/3</span>
          </div>
          <div className="bmw__bar" aria-hidden="true">
            <div className="bmw__barFill" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="bmw__dots" aria-hidden="true">
            <span className={`bmw__dot ${step >= 1 ? "is-on" : ""}`} />
            <span className={`bmw__dot ${step >= 2 ? "is-on" : ""}`} />
            <span className={`bmw__dot ${step >= 3 ? "is-on" : ""}`} />
          </div>
        </div>
      </form>
    </div>
  );
}
