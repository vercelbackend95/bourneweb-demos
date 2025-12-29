import React, { useEffect, useMemo, useRef, useState } from "react";

type BarberKey = "mason" | "oliver" | "theo";
type ServiceKey = "skinfade" | "haircutbeard" | "hottowel";

type Barber = {
  key: BarberKey;
  name: string;
  role: string;
  rating: string;
  photo: string;
};

type Service = {
  key: ServiceKey;
  name: string;
  mins: number;
  price: number;
  desc: string;
  includes?: string;
};

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
function isoKey(d: Date) {
  const dd = startOfDay(d);
  return `${dd.getFullYear()}-${pad(dd.getMonth() + 1)}-${pad(dd.getDate())}`;
}
function prettyDayLong(d: Date) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit", month: "short" }).format(d);
}
function prettyMonth(d: Date) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(d);
}
function isoForInput(d: Date) {
  return isoKey(d);
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
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function avatarDataURI(seed: string, accent: string) {
  const initial = seed.trim().slice(0, 1).toUpperCase();
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <defs>
      <radialGradient id="g" cx="35%" cy="28%" r="80%">
        <stop offset="0" stop-color="${accent}" stop-opacity="0.32"/>
        <stop offset="1" stop-color="#0b0b0b" stop-opacity="1"/>
      </radialGradient>
      <linearGradient id="s" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.12"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="64" fill="url(#g)"/>
    <rect x="10" y="10" width="108" height="108" rx="54" fill="none" stroke="url(#s)"/>
    <path d="M64 72c14 0 26 8 30 20 1 3-1 6-5 6H39c-4 0-6-3-5-6 4-12 16-20 30-20z" fill="#ffffff" opacity="0.08"/>
    <circle cx="64" cy="50" r="16" fill="#ffffff" opacity="0.10"/>
    <text x="64" y="114" text-anchor="middle" font-family="ui-sans-serif,system-ui" font-size="16" fill="#ffffff" opacity="0.32" font-weight="800">${initial}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const BARBERS: Barber[] = [
  { key: "mason", name: "Mason", role: "Senior Barber", rating: "★ 4.9", photo: avatarDataURI("Mason", "#d2aa6e") },
  { key: "oliver", name: "Oliver", role: "Skin Fade Specialist", rating: "★ 4.9", photo: avatarDataURI("Oliver", "#c8a46a") },
  { key: "theo", name: "Theo", role: "Classic Cuts", rating: "★ 4.9", photo: avatarDataURI("Theo", "#b99254") },
];

const SERVICES: Service[] = [
  { key: "skinfade", name: "Skin fade", mins: 50, price: 28, desc: "Clean blend, crisp edges.", includes: "Line-up + clean blend" },
  { key: "haircutbeard", name: "Haircut + beard", mins: 60, price: 30, desc: "Full refresh, tidy finish.", includes: "Full refresh + tidy finish" },
  { key: "hottowel", name: "Hot towel shave", mins: 30, price: 18, desc: "Warm towel, smooth close.", includes: "Hot towel finish" },
];

function getMonthGrid(view: Date) {
  const y = view.getFullYear();
  const m = view.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const startWeekday = (first.getDay() + 6) % 7; // Mon=0
  const daysInMonth = last.getDate();

  const cells: Array<Date | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
  while (cells.length % 7 !== 0) cells.push(null);

  return { cells };
}

export default function BookingWidget() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const p1Ref = useRef<HTMLDivElement | null>(null);
  const p2Ref = useRef<HTMLDivElement | null>(null);
  const p3Ref = useRef<HTMLDivElement | null>(null);

  const gsapRef = useRef<any>(null);
  const [animating, setAnimating] = useState(false);
  const animatingRef = useRef(false);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [barberKey, setBarberKey] = useState<BarberKey | null>(null);
  const barber = useMemo(() => BARBERS.find((b) => b.key === barberKey) || null, [barberKey]);

  const [serviceKey, setServiceKey] = useState<ServiceKey | null>(null);
  const service = useMemo(() => SERVICES.find((s) => s.key === serviceKey) || null, [serviceKey]);

  const [date, setDate] = useState<Date>(startOfDay(new Date()));
  const [time, setTime] = useState<string>("");

  const [showDetails, setShowDetails] = useState(false);
  const [phone, setPhone] = useState("");
  const phoneRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const minDay = useMemo(() => startOfDay(new Date()), []);
  const [viewMonth, setViewMonth] = useState<Date>(() => new Date(date.getFullYear(), date.getMonth(), 1));

  useEffect(() => setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1)), [date]);

  useEffect(() => {
    (async () => {
      if (typeof window === "undefined") return;
      if (gsapRef.current) return;
      const mod = await import("gsap");
      gsapRef.current = (mod as any).default ?? mod;
    })();
  }, []);

  useEffect(() => {
    if (!rootRef.current) return;
    if (prefersReducedMotion() || typeof window === "undefined") return;

    const run = async () => {
      if (!gsapRef.current) {
        const mod = await import("gsap");
        gsapRef.current = (mod as any).default ?? mod;
      }
      const gsap = gsapRef.current;
      gsap.fromTo(rootRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.42, ease: "power2.out" });
    };
    run();
  }, []);

  const panelRefFor = (s: 1 | 2 | 3) => (s === 1 ? p1Ref : s === 2 ? p2Ref : p3Ref);

  const baseTimes = useMemo(() => buildTimesForDate(date), [date]);
  const times = useMemo(() => (service ? filterTimesForService(baseTimes, service.mins) : baseTimes), [baseTimes, service]);
  const noSlots = times.length === 0;

  const endTime = useMemo(() => {
    if (!service || !time) return "";
    return addMins(time, service.mins);
  }, [service, time]);

  const phoneOk = isPhoneValid(phone);
  const phoneSoftError = phone.length > 0 && !phoneOk ? "Enter a UK mobile number." : "";

  const grid = useMemo(() => getMonthGrid(viewMonth), [viewMonth]);

  const timesForDay = (d: Date) => {
    const raw = buildTimesForDate(d);
    const mins = service?.mins ?? 0;
    return mins ? filterTimesForService(raw, mins) : raw;
  };

  const nextForDay = (d: Date) => {
    const list = timesForDay(d);
    return list.length ? list[0] : null;
  };

  const monthAvailability = useMemo(() => {
    const map = new Map<string, number>();
    for (const cell of grid.cells) {
      if (!cell) continue;
      const d = startOfDay(cell);
      if (d < minDay) {
        map.set(isoKey(d), 0);
        continue;
      }
      const count = timesForDay(d).length;
      const level = count === 0 ? 0 : count < 8 ? 1 : 2;
      map.set(isoKey(d), level);
    }
    return map;
  }, [grid.cells, minDay, serviceKey]);

  const pickDate = (d: Date) => {
    const dd = startOfDay(d);
    setDate(dd);
    setTime("");
    setSent(false);
  };

  useEffect(() => {
    setTime("");
    setSent(false);
  }, [barberKey, serviceKey, date]);

  const addNoteChip = (txt: string) => {
    setShowDetails(true);
    setNotes((prev) => {
      const p = (prev || "").trim();
      if (!p) return txt;
      if (p.toLowerCase().includes(txt.toLowerCase())) return prev;
      return `${p}${p.endsWith(".") ? "" : "."} ${txt}`;
    });
  };

  const transitionTo = async (next: 1 | 2 | 3) => {
    if (next === step) return;
    if (animatingRef.current) return;

    const stage = stageRef.current;
    const curEl = panelRefFor(step).current;
    const nextEl = panelRefFor(next).current;

    if (!stage || !curEl || !nextEl) {
      setStep(next);
      return;
    }

    setSent(false);

    if (prefersReducedMotion() || typeof window === "undefined") {
      setStep(next);
      return;
    }

    animatingRef.current = true;
    setAnimating(true);

    try {
      if (!gsapRef.current) {
        const mod = await import("gsap");
        gsapRef.current = (mod as any).default ?? mod;
      }
      const gsap = gsapRef.current;

      const forward = next > step;
      const inY = forward ? 10 : -8;
      const outY = forward ? -8 : 8;

      gsap.set(stage, { overflow: "hidden" });
      gsap.set(curEl, { position: "absolute", inset: 0, display: "block", autoAlpha: 1, y: 0, filter: "blur(0px)", pointerEvents: "none" });
      gsap.set(nextEl, { position: "absolute", inset: 0, display: "block", autoAlpha: 0, y: inY, filter: "blur(2px)", pointerEvents: "none" });

      await new Promise<void>((resolve) => {
        const tl = gsap.timeline({ defaults: { ease: "power2.out" }, onComplete: () => resolve() });
        tl.to(curEl, { autoAlpha: 0, y: outY, filter: "blur(2px)", duration: 0.20 }, 0);
        tl.to(nextEl, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.24 }, 0.06);
      });

      setStep(next);

      requestAnimationFrame(() => {
        const p1 = p1Ref.current;
        const p2 = p2Ref.current;
        const p3 = p3Ref.current;

        [p1, p2, p3].forEach((el) => {
          if (!el) return;
          const isActive = (next === 1 && el === p1) || (next === 2 && el === p2) || (next === 3 && el === p3);
          if (isActive) {
            gsap.set(el, { clearProps: "position,inset,display,opacity,transform,visibility,pointerEvents,filter" });
          } else {
            gsap.set(el, { display: "none", autoAlpha: 0, clearProps: "position,inset,transform,visibility,pointerEvents,filter" });
          }
        });

        gsap.set(stage, { clearProps: "overflow" });

        animatingRef.current = false;
        setAnimating(false);
      });
    } catch {
      animatingRef.current = false;
      setAnimating(false);
      setStep(next);
    }
  };

  const step1Ready = !!barber && !!service;
  const step2Ready = startOfDay(date) >= minDay;
  const step3Ready = !!time && phoneOk;

  const primaryLabel = useMemo(() => {
    if (step === 1) return "Continue to date";
    if (step === 2) return "Continue to time";
    return sending ? "Sending…" : "Confirm booking";
  }, [step, sending]);

  const footerHelp = useMemo(() => {
    if (step === 1) return step1Ready ? "" : "Select barber + service";
    if (step === 2) return step2Ready ? "" : "Pick a valid date";
    if (!time) return "Pick a time";
    if (!phoneOk) return "Add phone to confirm";
    return "";
  }, [step, step1Ready, step2Ready, time, phoneOk]);

  const primaryDisabled = useMemo(() => {
    if (step === 1) return !step1Ready || animating;
    if (step === 2) return !step2Ready || animating;
    return !step3Ready || sending || animating;
  }, [step, step1Ready, step2Ready, step3Ready, sending, animating]);

  const nextHint = useMemo(() => {
    if (step === 1) return "Next: Pick a date";
    if (step === 2) return "Next: Pick a time";
    return "Next: Confirm booking";
  }, [step]);

  const onBack = () => {
    if (step === 1) return;
    transitionTo((step - 1) as 1 | 2 | 3);
  };

  const onPrimary = () => {
    if (step === 1) transitionTo(2);
    else if (step === 2) transitionTo(3);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSent(false);
    if (step !== 3) return;
    if (!step3Ready || sending || animating) return;

    setSending(true);
    await new Promise((r) => setTimeout(r, 850));
    setSending(false);
    setSent(true);
  };

  const summaryText = useMemo(() => {
    if (!barber || !service || !date || !time || !endTime) return "";
    return `${barber.name} · ${service.name} · ${prettyDayLong(date)} · ${time}–${endTime} · £${service.price}`;
  }, [barber, service, date, time, endTime]);

  const summaryParts = useMemo(() => {
    if (!barber || !service) return [];
    const parts: Array<{ key: string; label: string; go: () => void }> = [];
    parts.push({ key: "b", label: barber.name, go: () => transitionTo(1) });
    parts.push({ key: "s", label: service.name, go: () => transitionTo(1) });
    parts.push({ key: "d", label: prettyDayLong(date), go: () => transitionTo(2) });
    if (time && endTime) parts.push({ key: "t", label: `${time}–${endTime}`, go: () => transitionTo(3) });
    return parts;
  }, [barber, service, date, time, endTime]);

  const serviceBenefit = useMemo(() => {
    if (!service) return "Choose a service to continue.";
    if (service.includes) return `Includes ${service.includes}.`;
    return service.desc;
  }, [service]);

  return (
    <div className="bmw" ref={rootRef}>
      <form className="bmw__card" onSubmit={onSubmit} aria-label="Book online">
        {/* BODY (fixed height stage) */}
        <div className="bmw__stage" ref={stageRef} aria-live="polite">
          {/* STEP 1 */}
          <div ref={p1Ref} className={`bmw__panel ${step === 1 ? "is-active" : ""}`} aria-hidden={step !== 1}>
            <div className="bmw__stepTop">
              <div className="bmw__stepLabel">SERVICE</div>
              <div className="bmw__stepTitle">Pick barber + service</div>
            </div>

            <div className="bmw__panelInner">
              <div className="bmw__section">
                <div className="bmw__sectionTitle">Barber</div>

                <div className="bmw__barberGrid" role="list">
                  {BARBERS.map((b) => {
                    const active = b.key === barberKey;
                    const next = nextForDay(date);
                    return (
                      <button
                        key={b.key}
                        type="button"
                        className={`bmw__barberCard bmw__surface ${active ? "is-selected" : ""}`}
                        onClick={() => setBarberKey(b.key)}
                        role="listitem"
                        aria-pressed={active}
                      >
                        <span className="bmw__barberAvatar" aria-hidden="true">
                          <img src={b.photo} alt="" loading="lazy" />
                        </span>

                        <span className="bmw__barberText">
                          <span className="bmw__barberName">{b.name}</span>
                          <span className="bmw__barberRole">{b.role}</span>
                        </span>

                        <span className="bmw__barberMeta">
                          <span className="bmw__metaInline">
                            <span className="bmw__metaRating">{b.rating}</span>
                            <span className="bmw__metaDot" aria-hidden="true">
                              •
                            </span>
                            <span className="bmw__metaNext">Next {next ? next : "—"}</span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bmw__section">
                <div className="bmw__sectionTitle">Service</div>

                <div className="bmw__serviceRow" role="list">
                  {SERVICES.map((s) => {
                    const active = s.key === serviceKey;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        className={`bmw__serviceChip bmw__surface ${active ? "is-selected" : ""}`}
                        onClick={() => setServiceKey(s.key)}
                        role="listitem"
                        aria-pressed={active}
                      >
                        <span className="bmw__serviceTop">
                          <span className="bmw__serviceName">{s.name}</span>
                        </span>
                        <span className="bmw__serviceBottom">
                          {s.mins} min · £{s.price}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="bmw__benefitLine">{serviceBenefit}</div>
              </div>
            </div>
          </div>

          {/* STEP 2 */}
          <div
            ref={p2Ref}
            className={`bmw__panel bmw__panel--monthOnly ${step === 2 ? "is-active" : ""}`}
            aria-hidden={step !== 2}
          >
            <div className="bmw__stepTop">
              <div className="bmw__stepLabel">DATE</div>
              <div className="bmw__stepTitle">Pick a date</div>
            </div>

            <div className="bmw__panelInner bmw__panelInner--noScroll">
              <div className="bmw__calendar bmw__surface">
                <div className="bmw__calTop">
                  <button
                    type="button"
                    className="bmw__calArrow bmw__surface"
                    onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                    title="Previous month"
                  >
                    ‹
                  </button>
                  <div className="bmw__calMonth">{prettyMonth(viewMonth)}</div>
                  <button
                    type="button"
                    className="bmw__calArrow bmw__surface"
                    onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                    title="Next month"
                  >
                    ›
                  </button>
                </div>

                <div className="bmw__calWeek">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
                    <div key={w} className="bmw__calW">
                      {w}
                    </div>
                  ))}
                </div>

                <div className="bmw__calGrid">
                  {grid.cells.map((cell, idx) => {
                    if (!cell) return <div key={idx} className="bmw__calEmpty" aria-hidden="true" />;

                    const d = startOfDay(cell);
                    const key = isoKey(d);
                    const active = isSameDay(d, date);
                    const level = monthAvailability.get(key) ?? 0;
                    const disabled = d < minDay;

                    return (
                      <button
                        key={key}
                        type="button"
                        className={`bmw__day bmw__surface ${active ? "is-selected" : ""} ${level === 0 ? "is-dead" : ""}`}
                        onClick={() => pickDate(d)}
                        disabled={disabled}
                        aria-pressed={active}
                        title={level === 0 ? "No availability" : "Available"}
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
                />
              </div>
            </div>
          </div>

          {/* STEP 3 */}
          <div ref={p3Ref} className={`bmw__panel ${step === 3 ? "is-active" : ""}`} aria-hidden={step !== 3}>
            <div className="bmw__stepTop">
              <div className="bmw__stepLabel">TIME</div>
              <div className="bmw__stepTitle">Pick a time</div>
            </div>

            <div className="bmw__panelInner">
              {noSlots ? (
                <div className="bmw__empty bmw__surface">
                  <div className="bmw__emptyT">No slots on this date.</div>
                  <div className="bmw__emptyS">Pick another day.</div>
                  <button type="button" className="bmw__btnGhost bmw__surface" onClick={() => transitionTo(2)}>
                    Back to dates
                  </button>
                </div>
              ) : (
                <div className="bmw__timesWheel bmw__surface" aria-label="Time slots">
                  <div className="bmw__timesGrid" role="list">
                    {times.map((t) => {
                      const active = t === time;
                      const recommended = t === times[0];
                      const end = service ? addMins(t, service.mins) : "";
                      return (
                        <button
                          key={t}
                          type="button"
                          className={`bmw__timeTile bmw__surface ${active ? "is-selected" : ""}`}
                          onClick={() => {
                            setTime(t);
                            setSent(false);
                            requestAnimationFrame(() => phoneRef.current?.focus());
                          }}
                          role="listitem"
                          aria-pressed={active}
                        >
                          <span className="bmw__ttTop">
                            {t}
                            {end ? <span className="bmw__ttDash"> — </span> : null}
                            {end ? end : ""}
                          </span>
                          {recommended ? <span className="bmw__ttTag">Recommended</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bmw__phoneBlock">
                <label className="bmw__field">
                  <span className="bmw__label">Phone*</span>
                  <div className={`bmw__inputWrap ${phone ? "is-hasValue" : ""}`}>
                    <input
                      ref={phoneRef}
                      className={`bmw__input ${phone && !phoneOk ? "is-warnSoft" : ""}`}
                      value={phone}
                      onChange={(e) => setPhone(formatUKPhone(e.target.value))}
                      placeholder="+44 7xxx xxx xxx"
                      autoComplete="tel"
                      inputMode="tel"
                      required
                    />
                    {phoneOk ? (
                      <span className="bmw__okTick" aria-hidden="true">
                        ✓
                      </span>
                    ) : null}
                  </div>
                  <span className="bmw__hint">Text confirmation only. No spam.</span>
                  {phoneSoftError ? <span className="bmw__softErr">{phoneSoftError}</span> : null}
                </label>

                <button
                  type="button"
                  className="bmw__detailsToggle bmw__surface"
                  onClick={() => setShowDetails((v) => !v)}
                  aria-expanded={showDetails}
                >
                  {showDetails ? "Hide details" : "Add details (optional)"}{" "}
                  <span className="bmw__chev" aria-hidden="true">
                    ▾
                  </span>
                </button>

                <div className={`bmw__details ${showDetails ? "is-open" : ""}`}>
                  <div className="bmw__detailsInner bmw__surface">
                    <label className="bmw__field">
                      <span className="bmw__label">Name</span>
                      <input className="bmw__input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
                    </label>

                    <div className="bmw__noteChips" role="list" aria-label="Quick notes">
                      {NOTE_CHIPS.map((c) => (
                        <button key={c} type="button" className="bmw__noteChip bmw__surface" onClick={() => addNoteChip(c)} role="listitem" title="Add note">
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
                  <div className="bmw__sent bmw__surface" role="status">
                    Request sent. We’ll text you soon.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Summary strip above footer (Step 3 only) */}
        {step === 3 && summaryText ? (
          <div className="bmw__summaryStrip" role="group" aria-label="Booking summary">
            <div className="bmw__summaryInner bmw__surface" role="button" tabIndex={0} title="Edit">
              <div className="bmw__summaryLeft">
                {summaryParts.slice(0, 4).map((p) => (
                  <button key={p.key} type="button" className="bmw__summaryChip" onClick={p.go} title="Edit">
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="bmw__summaryRight">
                <button type="button" className="bmw__summaryPrice" onClick={() => transitionTo(3)} title="Edit">
                  £{service?.price ?? ""}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* FOOTER */}
        <div className="bmw__footer">
          <button type="button" className="bmw__btnGhost bmw__surface" onClick={onBack} disabled={step === 1 || animating}>
            Back
          </button>

          <div className="bmw__footerMid">
            <div className="bmw__stepNav" aria-label="Steps">
              <button type="button" className={`bmw__stepItem ${step === 1 ? "is-active" : ""}`} onClick={() => transitionTo(1)} title="Edit">
                Service
                <span className="bmw__stepLine" aria-hidden="true" />
              </button>
              <button type="button" className={`bmw__stepItem ${step === 2 ? "is-active" : ""}`} onClick={() => transitionTo(2)} title="Edit">
                Date
                <span className="bmw__stepLine" aria-hidden="true" />
              </button>
              <button type="button" className={`bmw__stepItem ${step === 3 ? "is-active" : ""}`} onClick={() => transitionTo(3)} title="Edit">
                Time
                <span className="bmw__stepLine" aria-hidden="true" />
              </button>
            </div>

            <div className="bmw__nextHint">{nextHint}</div>
            {footerHelp ? <div className="bmw__help">{footerHelp}</div> : <div className="bmw__help is-ok">Ready.</div>}
          </div>

          {step === 3 ? (
            <button type="submit" className={`bmw__btn ${!primaryDisabled ? "is-ready" : "is-waiting"} ${sending ? "is-loading" : ""}`} disabled={primaryDisabled}>
              {primaryLabel}
            </button>
          ) : (
            <button type="button" className={`bmw__btn ${!primaryDisabled ? "is-ready" : "is-waiting"}`} onClick={onPrimary} disabled={primaryDisabled}>
              {primaryLabel}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
