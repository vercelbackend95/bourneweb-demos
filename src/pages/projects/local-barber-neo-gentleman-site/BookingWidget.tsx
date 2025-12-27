import React, { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import Lenis from "@studio-freight/lenis";

type ServiceKey = "skinfade" | "haircutbeard" | "hottowel";
type Service = { key: ServiceKey; name: string; mins: number; price: number; desc: string };

const SERVICES: Service[] = [
  { key: "skinfade", name: "Skin fade", mins: 50, price: 28, desc: "Clean blend, crisp edges." },
  { key: "haircutbeard", name: "Haircut + beard", mins: 60, price: 30, desc: "Full refresh, tidy finish." },
  { key: "hottowel", name: "Hot towel shave", mins: 30, price: 18, desc: "Warm towel, smooth close." },
];

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

export default function BookingWidget() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  const [serviceKey, setServiceKey] = useState<ServiceKey | null>(null);
  const service = useMemo(() => SERVICES.find((s) => s.key === serviceKey) || null, [serviceKey]);

  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState<string>("");

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [showDetails, setShowDetails] = useState(false);

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

  // Minimal GSAP entrance
  useEffect(() => {
    if (!rootRef.current) return;
    if (prefersReducedMotion()) return;
    gsap.fromTo(rootRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" });
  }, []);

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

  const isTodaySelected = useMemo(() => isSameDay(date, new Date()), [date]);
  const dayChipLabel = useMemo(() => (isTodaySelected ? "Today" : prettyDayLong(date)), [isTodaySelected, date]);

  const phoneOk = isPhoneValid(phone);
  const phoneSoftError = phone.length > 0 && !phoneOk ? "That number looks short" : "";

  const canConfirm = !!service && !!time && phoneOk && !sending;

  const summaryLeft = useMemo(() => {
    if (!service) return "Choose a service";
    const d = prettyDayLong(date);
    if (!time) return `${service.name} • ${d} • Pick a time`;
    return `${service.name} • ${d} • ${time}${endTime ? `–${endTime}` : ""}`;
  }, [service, date, time, endTime]);

  const ctaRight = useMemo(() => {
    if (!service) return "Choose a service";
    if (!time) return "Pick a time";
    if (!phoneOk) return "Add phone";
    return `Confirm — £${service.price}`;
  }, [service, time, phoneOk]);

  useEffect(() => {
    if (!stickyRef.current) return;
    if (prefersReducedMotion()) return;
    gsap.fromTo(stickyRef.current, { y: 8, opacity: 0.92 }, { y: 0, opacity: 1, duration: 0.16, ease: "power2.out" });
  }, [summaryLeft, ctaRight, canConfirm, sending]);

  const onPickService = (k: ServiceKey) => {
    setServiceKey(k);
    setTime("");
    setSent(false);

    // one gentle pulse on active chip
    if (!prefersReducedMotion() && rootRef.current) {
      const el = rootRef.current.querySelector(`[data-service="${k}"]`);
      if (el) gsap.fromTo(el, { scale: 0.99 }, { scale: 1, duration: 0.18, ease: "power2.out" });
    }
  };

  const onPickTime = (t: string) => {
    setTime(t);
    setSent(false);
  };

  const setToday = () => {
    setDate(startOfDay(new Date()));
    setTime("");
    setSent(false);
  };

  const openDatePicker = () => {
    dateInputRef.current?.showPicker?.();
    dateInputRef.current?.click();
  };

  const onDateChange = (iso: string) => {
    if (!iso) return;
    const d = parseISO(iso);
    setDate(startOfDay(d));
    setTime("");
    setSent(false);
  };

  const toggleDetails = () => setShowDetails((v) => !v);

  const addNoteChip = (txt: string) => {
    setShowDetails(true);
    setNotes((prev) => {
      const p = (prev || "").trim();
      if (!p) return txt;
      if (p.toLowerCase().includes(txt.toLowerCase())) return prev;
      return `${p}${p.endsWith(".") ? "" : "."} ${txt}`;
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSent(false);
    if (!canConfirm) return;

    setSending(true);
    await new Promise((r) => setTimeout(r, 850));
    setSending(false);
    setSent(true);
  };

  return (
    <div className="bm3" ref={rootRef}>
      <form className="bm3__card" onSubmit={onSubmit} aria-label="Booking form">
        {/* SERVICE */}
        <section className="bm3__section">
          <header className="bm3__sectionHead">
            <div>
              <div className="bm3__kicker">Service</div>
              <div className="bm3__title">Choose what you want</div>
            </div>
          </header>

          <div className="bm3__chips" role="list">
            {SERVICES.map((s) => {
              const active = s.key === serviceKey;
              return (
                <button
                  key={s.key}
                  type="button"
                  className={`bm3__chip ${active ? "is-active" : ""}`}
                  onClick={() => onPickService(s.key)}
                  data-service={s.key}
                  role="listitem"
                >
                  <span className="bm3__sel" aria-hidden="true">
                    {active ? "✓" : ""}
                  </span>
                  <span className="bm3__chipMain">{s.name}</span>
                  <span className="bm3__chipMeta">
                    {s.mins}m • £{s.price}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="bm3__selectedLine" aria-live="polite">
            {service ? service.desc : ""}
          </div>
        </section>

        {/* DATE + TIME (no fold, no auto-scroll) */}
        <section className="bm3__section">
          <header className="bm3__sectionHead">
            <div>
              <div className="bm3__kicker">Date & time</div>
              <div className="bm3__title">Pick your slot</div>
            </div>

            <div className="bm3__dayCapsule" role="group" aria-label="Day selection">
              <button
                type="button"
                className={`bm3__dayPill ${isTodaySelected ? "is-active" : ""}`}
                onClick={setToday}
                aria-pressed={isTodaySelected}
              >
                <span className="bm3__dayDot" aria-hidden="true" />
                <span className="bm3__dayLabel">{dayChipLabel}</span>
              </button>

              <button type="button" className="bm3__dayPick" onClick={openDatePicker}>
                <span className="bm3__cal" aria-hidden="true">
                  ▦
                </span>
                Choose date
              </button>

              {/* native date picker */}
              <input
                ref={dateInputRef}
                className="bm3__dateInput"
                type="date"
                value={isoForInput(date)}
                min={isoForInput(new Date())}
                onChange={(e) => onDateChange(e.target.value)}
                aria-label="Choose date"
              />
            </div>
          </header>

          {noSlots ? (
            <div className="bm3__empty">
              <div className="bm3__emptyT">No slots on this date.</div>
              <div className="bm3__emptyS">Try another day.</div>
              <div className="bm3__emptyActions">
                <button type="button" className="bm3__ghost" onClick={openDatePicker}>
                  Choose date
                </button>
                <button type="button" className="bm3__ghost" onClick={setToday}>
                  Back to today
                </button>
              </div>
            </div>
          ) : (
            <div className="bm3__times" role="list" aria-label="Available time slots">
              {times.map((t) => {
                const active = t === time;
                const isBest = t === nextLabelTime;
                const end = service ? addMins(t, service.mins) : "";
                return (
                  <button
                    key={t}
                    type="button"
                    className={`bm3__time ${active ? "is-active" : ""}`}
                    onClick={() => onPickTime(t)}
                    role="listitem"
                  >
                    <div className="bm3__timeTop">
                      <span className="bm3__sel" aria-hidden="true">
                        {active ? "✓" : ""}
                      </span>
                      {isBest ? <span className="bm3__timeBadge">Next available</span> : null}
                    </div>
                    <span className="bm3__timeMain">{t}</span>
                    <span className="bm3__timeSub">{service ? `${t}–${end} · Ends ${end}` : "Select service for range"}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* PHONE (no fold, no auto-focus) */}
        <section className="bm3__section">
          <header className="bm3__sectionHead">
            <div>
              <div className="bm3__kicker">Your phone</div>
              <div className="bm3__title">We’ll text to confirm</div>
            </div>
          </header>

          <label className="bm3__field">
            <span className="bm3__label">Phone*</span>

            <div className="bm3__inputWrap">
              <input
                className={`bm3__input ${phone && !phoneOk ? "is-warnSoft" : ""}`}
                value={phone}
                onChange={(e) => setPhone(formatUKPhone(e.target.value))}
                placeholder="+44 7xxx xxx xxx"
                autoComplete="tel"
                inputMode="tel"
                required
                aria-invalid={phone ? String(!phoneOk) : "false"}
              />
              {phoneOk ? <span className="bm3__okTick" aria-hidden="true">✓</span> : null}
            </div>

            <span className="bm3__hint">Text confirmation only. No spam.</span>
            {phoneSoftError ? <span className="bm3__softErr">{phoneSoftError}</span> : null}
          </label>

          <button type="button" className="bm3__detailsToggle" onClick={toggleDetails} aria-expanded={showDetails}>
            {showDetails ? "Hide details" : "Add details (optional)"}
            <span className="bm3__chev" aria-hidden="true">▾</span>
          </button>

          <div className={`bm3__details ${showDetails ? "is-open" : ""}`}>
            <div className="bm3__detailsInner">
              <label className="bm3__field">
                <span className="bm3__label">Name</span>
                <input className="bm3__input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
              </label>

              <div className="bm3__noteChips" role="list" aria-label="Quick notes">
                {NOTE_CHIPS.map((c) => (
                  <button key={c} type="button" className="bm3__noteChip" onClick={() => addNoteChip(c)} role="listitem">
                    + {c}
                  </button>
                ))}
              </div>

              <label className="bm3__field">
                <span className="bm3__label">Notes</span>
                <textarea
                  className="bm3__input bm3__textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Beard trim? Skin fade length? Any allergies?"
                />
              </label>
            </div>
          </div>
        </section>

        {sent ? (
          <div className="bm3__sent" role="status">
            Request sent. We’ll text you soon.
          </div>
        ) : null}

        <div className="bm3__spacer" aria-hidden="true" />

        {/* STICKY CHECKOUT (NOT clickable) */}
        <div className="bm3__sticky" ref={stickyRef} aria-label="Checkout bar">
          <div className="bm3__stickyInner">
            <div className="bm3__stickyText">{summaryLeft}</div>

            <button className={`bm3__stickyCta ${canConfirm ? "is-ready" : ""} ${sending ? "is-loading" : ""}`} type="submit" disabled={!canConfirm}>
              {sending ? "Sending…" : ctaRight}
              <span className="bm3__ctaGlow" aria-hidden="true" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
