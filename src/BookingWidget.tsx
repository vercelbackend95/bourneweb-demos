import React, { useEffect, useMemo, useRef, useState } from "react";

type BarberKey = "mason" | "oliver" | "theo";
type ServiceKey = "skinfade" | "haircutbeard" | "hottowel";
type Step = 1 | 2 | 3;

type Barber = {
  key: BarberKey;
  name: string;
  role: string;
  rating: number;
  reviews: number;
  tags: Array<"fade">;
  photo: string;
};

type Service = {
  key: ServiceKey;
  name: string;
  mins: number;
  price: number;
  desc: string;
  details: string;
  badge?: "Most popular" | "Best value";
};

const OPEN_START = 10 * 60;
const OPEN_END = 20 * 60;
const STEP_MIN = 15;

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
function prettyDayShort(d: Date) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit" }).format(d);
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
  return Math.ceil(mins / STEP_MIN) * STEP_MIN;
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
  for (let m = OPEN_START; m < OPEN_END; m += STEP_MIN) all.push(fmt(m));

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

function avatarDataURI(seed: string, accent: string) {
  const initial = seed.trim().slice(0, 2).toUpperCase();
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <defs>
      <radialGradient id="g" cx="35%" cy="28%" r="80%">
        <stop offset="0" stop-color="${accent}" stop-opacity="0.30"/>
        <stop offset="1" stop-color="#0b0b0b" stop-opacity="1"/>
      </radialGradient>
      <linearGradient id="s" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.10"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="64" fill="url(#g)"/>
    <rect x="10" y="10" width="108" height="108" rx="54" fill="none" stroke="url(#s)"/>
    <path d="M64 72c14 0 26 8 30 20 1 3-1 6-5 6H39c-4 0-6-3-5-6 4-12 16-20 30-20z" fill="#ffffff" opacity="0.08"/>
    <circle cx="64" cy="50" r="16" fill="#ffffff" opacity="0.10"/>
    <text x="64" y="114" text-anchor="middle" font-family="ui-sans-serif,system-ui" font-size="16" fill="#ffffff" opacity="0.30" font-weight="800">${initial}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const BARBERS = [
  { key: "mason", name: "Mason", role: "Senior", rating: 4.9, reviews: 120, tags: [], photo: avatarDataURI("M", "#d2aa6e") },
  { key: "oliver", name: "Oliver", role: "Fade Specialist", rating: 4.9, reviews: 120, tags: ["fade"], photo: avatarDataURI("O", "#c8a46a") },
  { key: "theo", name: "Theo", role: "Classic Cuts", rating: 4.9, reviews: 120, tags: [], photo: avatarDataURI("T", "#b99254") },
] as const satisfies readonly Barber[];

const ANY_BARBER_PHOTO = avatarDataURI("NP", "#a78a5a");

const SERVICES: Service[] = [
  { key: "skinfade", name: "Skin fade", mins: 50, price: 28, desc: "Clean blend, crisp edges.", details: "Clean blend, crisp edges. Includes line-up + tidy finish.", badge: "Most popular" },
  { key: "haircutbeard", name: "Haircut + beard", mins: 60, price: 30, desc: "Full refresh, balanced shape.", details: "Haircut + beard tidy. Balanced shape, clean neckline.", badge: "Best value" },
  { key: "hottowel", name: "Hot towel shave", mins: 30, price: 18, desc: "Warm towel, close finish.", details: "Warm towel + close shave. Sensitive-skin friendly." },
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
  while (cells.length < 42) cells.push(null);

  return { cells };
}

function useRovingRadio<T extends string>(ids: T[], selected: T | null, onChange: (id: T) => void) {
  const activeIndex = Math.max(0, selected ? ids.indexOf(selected) : 0);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    let next = activeIndex;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = Math.max(0, activeIndex - 1);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = Math.min(ids.length - 1, activeIndex + 1);
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = ids.length - 1;
    onChange(ids[next]);
  };
  return { onKeyDown };
}

export default function BookingWidget() {
  const [step, setStep] = useState<Step>(1);

  const [barberKey, setBarberKey] = useState<BarberKey | null>(null);
  const [serviceKey, setServiceKey] = useState<ServiceKey | null>(null);

  const barber = useMemo(() => BARBERS.find((b) => b.key === barberKey) || null, [barberKey]);
  const service = useMemo(() => SERVICES.find((s) => s.key === serviceKey) || null, [serviceKey]);

  const [date, setDate] = useState<Date>(startOfDay(new Date()));
  const [time, setTime] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const phoneRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState(""); // optional
  const [notes, setNotes] = useState("");

  const [sending, setSending] = useState(false);

  const minDay = useMemo(() => startOfDay(new Date()), []);
  const [viewMonth, setViewMonth] = useState<Date>(() => new Date(date.getFullYear(), date.getMonth(), 1));
  useEffect(() => setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1)), [date]);

  const baseTimes = useMemo(() => buildTimesForDate(date), [date]);
  const times = useMemo(() => (service ? filterTimesForService(baseTimes, service.mins) : baseTimes), [baseTimes, service]);

  const noSlots = times.length === 0;

  const endTime = useMemo(() => {
    if (!service || !time) return "";
    return addMins(time, service.mins);
  }, [service, time]);

  const recommended = useMemo(() => (times.length ? times[0] : null), [times]);

  useEffect(() => {
    if (time) requestAnimationFrame(() => phoneRef.current?.focus());
  }, [time]);

  const phoneOk = isPhoneValid(phone);

  const grid = useMemo(() => getMonthGrid(viewMonth), [viewMonth]);

  const monthAvailability = useMemo(() => {
    const map = new Map<string, number>();
    for (const cell of grid.cells) {
      if (!cell) continue;
      const d = startOfDay(cell);
      if (d < minDay) {
        map.set(isoKey(d), 0);
        continue;
      }
      const raw = buildTimesForDate(d);
      const filtered = service ? filterTimesForService(raw, service.mins) : raw;
      const count = filtered.length;
      const level = count === 0 ? 0 : count < 8 ? 1 : 2;
      map.set(isoKey(d), level);
    }
    return map;
  }, [grid.cells, minDay, serviceKey]);

  const pickDate = (d: Date) => {
    const dd = startOfDay(d);
    setDate(dd);
    setTime(null);
    setPhone("");
    setName("");
    setEmail("");
    setNotes("");
  };

  const step1Ready = !!service;
  const step2Ready = startOfDay(date) >= minDay;
  const step3Ready = !!time && phoneOk;

  const title = useMemo(() => (step === 1 ? "Choose a service" : step === 2 ? "Pick a date" : "Pick a time"), [step]);
  const progressPct = useMemo(() => (step / 3) * 100, [step]);

  const serviceIds = ["skinfade", "haircutbeard", "hottowel"] as ServiceKey[];
  const serviceRadio = useRovingRadio<ServiceKey>(serviceIds, serviceKey, (id) => setServiceKey(id));

  const barberIds = ["any", "mason", "oliver", "theo"] as const;
  const barberSelectedId = barberKey ?? "any";
  const barberRadio = useRovingRadio<(typeof barberIds)[number]>(
    barberIds as any,
    barberSelectedId as any,
    (id) => {
      if (id === "any") setBarberKey(null);
      else setBarberKey(id as BarberKey);
    }
  );

  const [barberOpen, setBarberOpen] = useState(false);

  const step1SummaryLine1 = useMemo(() => (!service ? "Select a service" : `${service.name} • ${service.mins} min`), [service]);
  const step1SummaryLine2 = useMemo(
    () => (barberKey === null ? "No preference (fastest)" : barber ? `${barber.name} • ${barber.role}` : "No preference (fastest)"),
    [barberKey, barber]
  );

  const summaryFull = useMemo(() => {
    const s = service ? `${service.name} · £${service.price}` : "—";
    const b = barber ? ` · ${barber.name}` : " · No preference";
    const d = step >= 2 ? ` · ${prettyDayLong(date)}` : "";
    const t = step >= 3 && time ? ` · ${time}${endTime ? `–${endTime}` : ""}` : "";
    return `${s}${b}${d}${t}`;
  }, [service, barber, step, date, time, endTime]);

  const summaryCompact = useMemo(() => {
    if (!service) return "—";
    const base = `${service.name} · £${service.price}`;
    const d = step >= 2 ? ` · ${prettyDayShort(date)}` : "";
    const t = step >= 3 && time ? ` · ${time}${endTime ? `–${endTime}` : ""}` : "";
    return `${base}${d}${t}`;
  }, [service, step, date, time, endTime]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"details" | "summary">("details");
  const sheetCloseRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!sheetOpen) return;
      if (e.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  useEffect(() => {
    if (sheetOpen) requestAnimationFrame(() => sheetCloseRef.current?.focus());
  }, [sheetOpen]);

  const openDetailsSheet = () => {
    setSheetMode("details");
    setSheetOpen(true);
  };
  const openSummarySheet = () => {
    setSheetMode("summary");
    setSheetOpen(true);
  };

  const primaryLabel = useMemo(
    () => (step === 1 ? "Choose date" : step === 2 ? "Choose time" : sending ? "Confirming…" : "Confirm"),
    [step, sending]
  );

  // ✅ Endpoint within demo folder (Astro file route)
  const bookingEndpoint = "/projects/local-barber-neo-gentleman-site/api/booking";

  const onPrimary = async () => {
    if (step === 1) {
      if (!step1Ready) return;
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!step2Ready) return;
      setStep(3);
      return;
    }
    if (!step3Ready || sending) return;

    setSending(true);

    try {
      const payload = {
        service: service ? { key: service.key, name: service.name, mins: service.mins, price: service.price } : null,
        barber: barber ? { key: barber.key, name: barber.name, role: barber.role } : null,
        date: isoKey(date),
        time,
        endTime,
        phone,
        name,
        email: email.trim() || null,
        notes,
      };

      const res = await fetch(bookingEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Booking request failed");
      }

      alert("Request sent ✅ Check your inbox.");
    } catch {
      // If API route missing / server error -> fallback DEMO
      alert("Booked (demo) ✅");
    } finally {
      setSending(false);
    }
  };

  const contentStepClass = step === 2 ? "is-step2" : step === 3 ? "is-step3" : "is-step1";

  return (
    <div className="bmw">
      <form className="bmw__card" onSubmit={(e) => e.preventDefault()} aria-label="Book online">
        <header className="bmw__topbar">
          <div className="bmw__topbarRow">
            <div className="bmw__brandMark">Book online</div>
          </div>

          <div className="bmw__topbarRow2">
            <h2 className="bmw__title">{title}</h2>
          </div>

          <div className="bmw__progress" aria-label={`Step ${step} of 3`}>
            <div className="bmw__progressTrack" aria-hidden="true">
              <div className="bmw__progressFill" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="bmw__progressMeta" aria-hidden="true">
              {step}/3
            </div>
          </div>
        </header>

        <main className={`bmw__content ${contentStepClass}`} aria-live="polite">
          {step === 1 ? (
            <section className="bmw__panelStep1" aria-label="Step 1">
              <div className="bmw__block">
                <div className="bmw__labelRow">
                  <div className="bmw__labelSmall">Service (required)</div>
                </div>

                <div className="bmw__serviceList" role="radiogroup" aria-label="Choose a service" onKeyDown={serviceRadio.onKeyDown}>
                  {SERVICES.map((s) => {
                    const selected = s.key === serviceKey;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`bmw__serviceRow ${selected ? "is-selected" : ""}`}
                        onClick={() => setServiceKey(s.key)}
                      >
                        <span className="bmw__serviceMain">
                          <span className="bmw__serviceTop">
                            <span className="bmw__serviceName">{s.name}</span>
                            {s.badge ? <span className="bmw__badge">{s.badge}</span> : null}
                          </span>

                          <span className="bmw__serviceDesc" title={s.desc}>
                            {s.desc}
                          </span>

                          <span className="bmw__serviceMeta">
                            <span className="bmw__pill">{s.mins} min</span>
                          </span>
                        </span>

                        <span className="bmw__serviceRight">
                          <span className="bmw__price">£{s.price}</span>
                          <span className={`bmw__check ${selected ? "is-on" : ""}`} aria-hidden="true">
                            ✓
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bmw__block">
                <div className="bmw__labelRow">
                  <div className="bmw__labelSmall">Barber (optional)</div>
                </div>

                <button
                  type="button"
                  className="bmw__accordionBtn"
                  onClick={() => setBarberOpen((v) => !v)}
                  aria-expanded={barberOpen}
                  aria-controls="bmw-barber-panel"
                >
                  <span className="bmw__accordionLeft">
                    <span className="bmw__avatarSm" aria-hidden="true">
                      <img src={barberKey === null ? ANY_BARBER_PHOTO : barber?.photo || ANY_BARBER_PHOTO} alt="" loading="lazy" />
                    </span>
                    <span className="bmw__accordionTxt">
                      <span className="bmw__accordionTitle">
                        {barberKey === null ? "No preference" : barber?.name}
                        <span className="bmw__accordionSub">{barberKey === null ? " (fastest)" : ` • ${barber?.role}`}</span>
                      </span>
                      <span className="bmw__accordionHint">Tap to pick a specific barber</span>
                    </span>
                  </span>

                  <span className="bmw__accordionIcon" aria-hidden="true">
                    {barberOpen ? "–" : "+"}
                  </span>
                </button>

                <div id="bmw-barber-panel" className={`bmw__accordionPanel ${barberOpen ? "is-open" : ""}`}>
                  <div role="radiogroup" aria-label="Choose a barber" onKeyDown={barberRadio.onKeyDown} className="bmw__barberList">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={barberKey === null}
                      className={`bmw__barberRow ${barberKey === null ? "is-selected" : ""}`}
                      onClick={() => setBarberKey(null)}
                    >
                      <span className="bmw__avatarSm" aria-hidden="true">
                        <img src={ANY_BARBER_PHOTO} alt="" loading="lazy" />
                      </span>

                      <span className="bmw__barberRowMain">
                        <span className="bmw__barberRowTop">
                          <span className="bmw__barberRowName">No preference</span>
                          <span className="bmw__barberRowRole">• fastest</span>
                        </span>

                        <span className="bmw__barberRowMeta">
                          <span className="bmw__muted">Next available</span>
                          <span className="bmw__pill bmw__pill--time">{nextAvailableToday() ?? "—"}</span>
                        </span>
                      </span>

                      <span className={`bmw__check ${barberKey === null ? "is-on" : ""}`} aria-hidden="true">
                        ✓
                      </span>
                    </button>

                    {BARBERS.map((b) => {
                      const selected = b.key === barberKey;
                      const next = nextAvailableToday() ?? "—";
                      return (
                        <button
                          key={b.key}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          className={`bmw__barberRow ${selected ? "is-selected" : ""}`}
                          onClick={() => setBarberKey(b.key)}
                        >
                          <span className="bmw__avatarSm" aria-hidden="true">
                            <img src={b.photo} alt="" loading="lazy" />
                          </span>

                          <span className="bmw__barberRowMain">
                            <span className="bmw__barberRowTop">
                              <span className="bmw__barberRowName">{b.name}</span>
                              <span className="bmw__barberRowRole">• {b.role}</span>
                            </span>

                            <span className="bmw__barberRowMeta">
                              <span className="bmw__muted">
                                {b.rating.toFixed(1)} ({b.reviews})
                              </span>
                              <span className="bmw__pill bmw__pill--time">{next}</span>
                            </span>
                          </span>

                          <span className={`bmw__check ${selected ? "is-on" : ""}`} aria-hidden="true">
                            ✓
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="bmw__panelLite bmw__panelMonth" aria-label="Step 2">
              <div className="bmw__monthTop">
                <button
                  type="button"
                  className="bmw__iconBtn"
                  onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                  aria-label="Previous month"
                >
                  ‹
                </button>

                <div className="bmw__monthTitle">{prettyMonth(viewMonth)}</div>

                <button
                  type="button"
                  className="bmw__iconBtn"
                  onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>

              <div className="bmw__calendarFull" aria-label="Calendar month view">
                <div className="bmw__calStack">
                  <div className="bmw__weekRow" aria-hidden="true">
                    {["M", "T", "W", "T", "F", "S", "S"].map((w) => (
                      <div key={w} className="bmw__weekDay">
                        {w}
                      </div>
                    ))}
                  </div>

                  <div className="bmw__calGridFull">
                    {grid.cells.map((cell, idx) => {
                      if (!cell) return <div key={idx} className="bmw__calEmptyFull" aria-hidden="true" />;

                      const d = startOfDay(cell);
                      const key = isoKey(d);
                      const active = isSameDay(d, date);
                      const level = monthAvailability.get(key) ?? 0;
                      const disabled = d < minDay || level === 0;

                      return (
                        <button
                          key={key}
                          type="button"
                          className={`bmw__dayFull ${active ? "is-selected" : ""} ${level === 0 ? "is-dead" : ""}`}
                          onClick={() => pickDate(d)}
                          disabled={disabled}
                          aria-label={`Select ${key}`}
                          aria-pressed={active}
                        >
                          <span className="bmw__dayNum">{d.getDate()}</span>
                          <span className={`bmw__dot ${level === 2 ? "is-strong" : level === 1 ? "is-soft" : ""}`} aria-hidden="true" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <input
                  className="bmw__dateHidden"
                  type="date"
                  value={isoForInput(date)}
                  min={isoForInput(new Date())}
                  onChange={(e) => pickDate(parseISO(e.target.value))}
                  aria-label="Pick a date"
                />
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="bmw__panelLite bmw__panelTime" aria-label="Step 3">
              <div className="bmw__contextCard">
                <div className="bmw__contextK">Date</div>
                <div className="bmw__contextV">{prettyDayLong(date)}</div>
                <div className="bmw__contextS">{barber ? barber.name : "No preference"}</div>
              </div>

              <div className="bmw__slotsCard" aria-label="Time slots">
                <div className="bmw__slotsHead">Time</div>

                <div className="bmw__slotsScroll">
                  {noSlots ? (
                    <div style={{ color: "rgba(255,255,255,.60)", fontSize: 12, padding: "10px 2px" }}>
                      No slots on this date. Pick another day.
                    </div>
                  ) : (
                    <div className="bmw__timesGrid">
                      {times.map((t) => {
                        const selected = t === time;
                        const end = service ? addMins(t, service.mins) : "";
                        const isRec = recommended === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            className={`bmw__timeTile2 ${selected ? "is-selected" : ""}`}
                            onClick={() => setTime(t)}
                            aria-pressed={selected}
                            aria-label={`Select time ${t}`}
                          >
                            <div className="bmw__timeRow">
                              <span className="bmw__timeStart">{t}</span>
                              {end ? <span className="bmw__timeEnd">–{end}</span> : null}
                              {isRec ? <span className="bmw__rec">Recommended</span> : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {time ? (
                  <div className="bmw__afterPick">
                    <div className="bmw__phoneRow">
                      <div className="bmw__phoneLabel">Phone</div>
                      <input
                        ref={phoneRef}
                        className={`bmw__input ${phone.length > 0 && !isPhoneValid(phone) ? "is-warnSoft" : ""}`}
                        value={phone}
                        onChange={(e) => setPhone(formatUKPhone(e.target.value))}
                        placeholder="+44 7xxx xxx xxx"
                        autoComplete="tel"
                        inputMode="tel"
                        aria-label="Phone number"
                      />
                    </div>

                    <div className="bmw__miniActions">
                      <button type="button" className="bmw__linkBtn" onClick={openDetailsSheet} aria-label="Add details">
                        Add details (optional)
                      </button>
                      {phone.length > 0 && !isPhoneValid(phone) ? (
                        <div className="bmw__softErr">Enter a valid UK number.</div>
                      ) : (
                        <div className="bmw__miniHint">We’ll text to confirm. No marketing.</div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </main>

        <footer className="bmw__footerLite">
          <button
            type="button"
            className="bmw__btnBack"
            onClick={() => (step === 1 ? null : setStep((prev) => (prev === 3 ? 2 : 1)))}
            disabled={step === 1}
            aria-label="Back"
          >
            <span className="bmw__btnBackIcon" aria-hidden="true">
              ‹
            </span>
            Back
          </button>

          {step === 1 ? (
            <button type="button" className="bmw__summaryBtn2" onClick={openSummarySheet} aria-label="Open booking summary">
              <span className="bmw__summary2">
                <span className="bmw__sumL1">{step1SummaryLine1}</span>
                <span className="bmw__sumL2">{step1SummaryLine2}</span>
              </span>
              {service ? <span className="bmw__sumPrice">£{service.price}</span> : null}
            </button>
          ) : (
            <button type="button" className="bmw__summaryBtn" onClick={openSummarySheet} aria-label="Open booking summary" title={summaryFull}>
              <span className="bmw__summaryLine">{summaryCompact}</span>
            </button>
          )}

          <button
            type="button"
            className="bmw__btnPrimary"
            onClick={onPrimary}
            disabled={(step === 1 && !step1Ready) || (step === 2 && !step2Ready) || (step === 3 && (!step3Ready || sending))}
            aria-label={step === 3 ? "Confirm booking" : "Continue"}
          >
            {primaryLabel}
          </button>
        </footer>

        {sheetOpen ? (
          <div className="bmw__sheetRoot" role="presentation">
            <button type="button" className="bmw__sheetOverlay" onClick={() => setSheetOpen(false)} aria-label="Close overlay" />

            <div className="bmw__sheet" role="dialog" aria-modal="true" aria-label="Details">
              <div className="bmw__sheetTop">
                <div className="bmw__sheetTitle">{sheetMode === "summary" ? "Summary" : "Add details"}</div>
                <button ref={sheetCloseRef} type="button" className="bmw__sheetClose" onClick={() => setSheetOpen(false)} aria-label="Close">
                  ✕
                </button>
              </div>

              <div className="bmw__sheetBody">
                {sheetMode === "summary" ? (
                  <>
                    <div style={{ fontWeight: 900, color: "rgba(255,255,255,.90)" }}>{summaryFull}</div>
                    <div style={{ marginTop: 10, color: "rgba(255,255,255,.62)" }}>Tap Back to edit, or Confirm when you’re ready.</div>
                  </>
                ) : (
                  <>
                    <label className="bmw__field">
                      <span style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.60)", marginBottom: 6 }}>Name</span>
                      <input
                        className="bmw__input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        autoComplete="name"
                        aria-label="Name"
                      />
                    </label>

                    <label className="bmw__field">
                      <span style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.60)", marginBottom: 6 }}>Email (optional)</span>
                      <input
                        className="bmw__input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        inputMode="email"
                        aria-label="Email"
                      />
                    </label>

                    <label className="bmw__field">
                      <span style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.60)", marginBottom: 6 }}>Notes</span>
                      <textarea
                        className="bmw__input bmw__textarea"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Beard trim? Skin fade length? Any allergies?"
                        aria-label="Notes"
                      />
                    </label>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </form>
    </div>
  );
}
