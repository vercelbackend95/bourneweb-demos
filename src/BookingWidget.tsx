import React, { useEffect, useMemo, useRef, useState } from "react";

type BarberKey = "mason" | "oliver" | "theo";
type ServiceKey = "skinfade" | "haircutbeard" | "hottowel";
type Step = 1 | 2 | 3;

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
  details: string;
};

const NOTE_CHIPS = ["Beard trim", "Skin fade length", "Sensitive skin", "No clipper zero"] as const;

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
  const initial = seed.trim().slice(0, 1).toUpperCase();
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

const BARBERS: Barber[] = [
  { key: "mason", name: "Mason", role: "Senior Barber", rating: "★ 4.9", photo: avatarDataURI("Mason", "#d2aa6e") },
  { key: "oliver", name: "Oliver", role: "Skin Fade Specialist", rating: "★ 4.9", photo: avatarDataURI("Oliver", "#c8a46a") },
  { key: "theo", name: "Theo", role: "Classic Cuts", rating: "★ 4.9", photo: avatarDataURI("Theo", "#b99254") },
];

const SERVICES: Service[] = [
  {
    key: "skinfade",
    name: "Skin fade",
    mins: 50,
    price: 28,
    desc: "Clean blend.",
    details: "Clean blend, crisp edges. Includes line-up + tidy finish. Skin-safe, no harsh shave unless asked.",
  },
  {
    key: "haircutbeard",
    name: "Haircut + beard",
    mins: 60,
    price: 30,
    desc: "Full refresh.",
    details: "Haircut + beard tidy. Balanced shape, clean neckline, soft finish. Add hot towel on request.",
  },
  {
    key: "hottowel",
    name: "Hot towel shave",
    mins: 30,
    price: 18,
    desc: "Warm towel.",
    details: "Warm towel + close shave. Sensitive-skin friendly. Calm, precise, no rush.",
  },
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

function useRovingRadio<T extends string>(
  ids: T[],
  selected: T | null,
  onChange: (id: T) => void
) {
  const activeIndex = Math.max(0, selected ? ids.indexOf(selected) : 0);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    let next = activeIndex;
    if (e.key === "ArrowLeft") next = Math.max(0, activeIndex - 1);
    if (e.key === "ArrowRight") next = Math.min(ids.length - 1, activeIndex + 1);
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = ids.length - 1;
    onChange(ids[next]);
  };

  const tabIndexFor = (id: T, i: number) => (i === activeIndex ? 0 : -1);

  return { activeIndex, onKeyDown, tabIndexFor };
}

export default function BookingWidget() {
  // lock page scroll (widget controls its own layout)
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, []);

  const [step, setStep] = useState<Step>(1);

  const [fastest, setFastest] = useState(false);
  const [barberKey, setBarberKey] = useState<BarberKey | null>(null);
  const [serviceKey, setServiceKey] = useState<ServiceKey | null>(null);

  const barber = useMemo(() => BARBERS.find((b) => b.key === barberKey) || null, [barberKey]);
  const service = useMemo(() => SERVICES.find((s) => s.key === serviceKey) || null, [serviceKey]);

  const [date, setDate] = useState<Date>(startOfDay(new Date()));
  const [time, setTime] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const phoneRef = useRef<HTMLInputElement | null>(null);

  const [showDetails, setShowDetails] = useState(false);
  const [name, setName] = useState("");
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

  // “Recommended” = pierwszy slot
  const recommended = useMemo(() => (times.length ? times[0] : null), [times]);

  // next per barber (lightweight: based on today’s next, same opening hours)
  const nextByBarber = useMemo(() => {
    const next = nextAvailableToday() ?? "—";
    const map = new Map<BarberKey, string>();
    (["mason", "oliver", "theo"] as BarberKey[]).forEach((k) => map.set(k, next === "—" ? "Next: —" : `Next: ${next}`));
    return map;
  }, []);

  // fastest mode: hide carousel and allow barber = null
  useEffect(() => {
    if (fastest) {
      setBarberKey(null);
    }
  }, [fastest]);

  // progressive disclosure phone (only after selecting time)
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
    setShowDetails(false);
    setNotes("");
    setName("");
  };

  const step1Ready = !!service && (fastest || !!barber);
  const step2Ready = startOfDay(date) >= minDay;
  const step3Ready = !!time && phoneOk;

  const title = useMemo(() => {
    if (step === 1) return "Pick barber + service";
    if (step === 2) return "Pick a date";
    return "Pick a time";
  }, [step]);

  const summary = useMemo(() => {
    const s = service ? `${service.name} · £${service.price} · ${service.mins}m` : "—";
    const b = barber ? ` · ${barber.name}` : fastest ? " · Fastest" : "";
    const d = step >= 2 ? ` · ${prettyDayLong(date)}` : "";
    const t = step >= 3 && time ? ` · ${time}${endTime ? `–${endTime}` : ""}` : "";
    return `${s}${b}${d}${t}`;
  }, [service, barber, fastest, step, date, time, endTime]);

  // bottom sheet for service info
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoService, setInfoService] = useState<Service | null>(null);
  const infoCloseRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!infoOpen) return;
      if (e.key === "Escape") {
        setInfoOpen(false);
        setInfoService(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [infoOpen]);

  useEffect(() => {
    if (infoOpen) requestAnimationFrame(() => infoCloseRef.current?.focus());
  }, [infoOpen]);

  const openInfo = (s: Service) => {
    setInfoService(s);
    setInfoOpen(true);
  };

  const onBack = () => {
    if (step === 1) return;
    setStep((prev) => (prev === 3 ? 2 : 1));
  };

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
    await new Promise((r) => setTimeout(r, 650));
    setSending(false);
    // demo submit:
    alert("Booked (demo) ✅");
  };

  const barberRadio = useRovingRadio<BarberKey>(
    ["mason", "oliver", "theo"],
    barberKey,
    (id) => setBarberKey(id)
  );

  const serviceIds = ["skinfade", "haircutbeard", "hottowel"] as ServiceKey[];
  const serviceRadio = useRovingRadio<ServiceKey>(
    serviceIds,
    serviceKey,
    (id) => setServiceKey(id)
  );

  return (
    <div className="bmw">
      <form className="bmw__card" onSubmit={(e) => e.preventDefault()} aria-label="Book online">
        {/* HEADER */}
        <header className="bmw__topbar">
          <div className="bmw__topbarRow">
            <div className="bmw__stepPill" aria-label={`Step ${step} of 3`}>
              Step {step}/3
            </div>
            <div className="bmw__brandMark">Book online</div>
          </div>
          <div className="bmw__topbarRow2">
            <h2 className="bmw__title">{title}</h2>
          </div>
        </header>

        {/* CONTENT: must be min-height:0 */}
        <main className="bmw__content" aria-live="polite">
          {/* STEP 1 */}
          {step === 1 ? (
            <section className="bmw__panelLite" aria-label="Step 1">
              <div className="bmw__fastestRow">
                <div className="bmw__fastestText">
                  <div className="bmw__fastestTitle">Fastest available</div>
                  <div className="bmw__fastestSub">No preference on barber</div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={fastest}
                  className={`bmw__switch ${fastest ? "is-on" : ""}`}
                  onClick={() => setFastest((v) => !v)}
                  aria-label="Toggle fastest available"
                >
                  <span className="bmw__switchKnob" />
                </button>
              </div>

              {!fastest ? (
                <div className="bmw__block">
                  <div className="bmw__labelRow">
                    <div className="bmw__labelSmall">Barber</div>
                  </div>

                  <div
                    className="bmw__barberRail"
                    role="radiogroup"
                    aria-label="Choose a barber"
                    onKeyDown={barberRadio.onKeyDown}
                  >
                    {BARBERS.map((b, i) => {
                      const selected = b.key === barberKey;
                      return (
                        <button
                          key={b.key}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          tabIndex={barberRadio.tabIndexFor(b.key, i)}
                          className={`bmw__barberTile ${selected ? "is-selected" : ""}`}
                          onClick={() => setBarberKey(b.key)}
                          aria-label={`Select barber ${b.name}`}
                        >
                          <span className="bmw__avatar" aria-hidden="true">
                            <img src={b.photo} alt="" loading="lazy" />
                          </span>

                          <span className="bmw__barberTxt">
                            <span className="bmw__barberName">{b.name}</span>
                            <span className="bmw__barberRole">{b.role}</span>
                            <span className="bmw__barberMeta">
                              <span className="bmw__metaRating">{b.rating}</span>
                              <span className="bmw__metaDot" aria-hidden="true">
                                •
                              </span>
                              <span className="bmw__metaNext">{nextByBarber.get(b.key)}</span>
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bmw__hintCard" role="note">
                  We’ll pick the earliest slot automatically.
                </div>
              )}

              <div className="bmw__block">
                <div className="bmw__labelRow">
                  <div className="bmw__labelSmall">Service</div>
                  <div className="bmw__labelTiny">Tap (i) for details</div>
                </div>

                <div
                  className="bmw__serviceGrid"
                  role="radiogroup"
                  aria-label="Choose a service"
                  onKeyDown={serviceRadio.onKeyDown}
                >
                  {SERVICES.map((s, i) => {
                    const selected = s.key === serviceKey;
                    return (
                      <div key={s.key} className="bmw__serviceCell">
                        <button
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          tabIndex={serviceRadio.tabIndexFor(s.key, i)}
                          className={`bmw__chip ${selected ? "is-selected" : ""}`}
                          onClick={() => setServiceKey(s.key)}
                          aria-label={`Select service ${s.name}`}
                        >
                          <span className="bmw__chipName">{s.name}</span>
                          <span className="bmw__chipMeta">
                            {s.mins}m · £{s.price}
                          </span>
                        </button>

                        <button
                          type="button"
                          className="bmw__infoBtn"
                          aria-label={`Service details for ${s.name}`}
                          onClick={() => openInfo(s)}
                        >
                          i
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          ) : null}

          {/* STEP 2 */}
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

                {/* hidden native date input for fallback / a11y */}
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

          {/* STEP 3 */}
          {step === 3 ? (
            <section className="bmw__panelLite bmw__panelTime" aria-label="Step 3">
              <div className="bmw__contextCard">
                <div className="bmw__contextK">Date</div>
                <div className="bmw__contextV">{prettyDayLong(date)}</div>
                <div className="bmw__contextS">{barber ? barber.name : fastest ? "Fastest available" : "Any barber"}</div>
              </div>

              <div className="bmw__slotsCard" aria-label="Time slots">
                <div className="bmw__slotsHead">Time</div>

                {/* ONLY scrollable area in step 3 */}
                <div className="bmw__slotsScroll">
                  {noSlots ? (
                    <div className="bmw__emptyLite">
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
                            <span className="bmw__timeMain">
                              <span className="bmw__timeStart">{t}</span>
                              {end ? <span className="bmw__timeEnd">–{end}</span> : null}
                            </span>
                            {isRec ? <span className="bmw__rec">Recommended</span> : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Phone shows ONLY after time selection */}
              {time ? (
                <div className="bmw__phoneCard">
                  <label className="bmw__field">
                    <span className="bmw__labelSmall">Phone</span>
                    <input
                      ref={phoneRef}
                      className={`bmw__input ${phone.length > 0 && !phoneOk ? "is-warnSoft" : ""}`}
                      value={phone}
                      onChange={(e) => setPhone(formatUKPhone(e.target.value))}
                      placeholder="+44 7xxx xxx xxx"
                      autoComplete="tel"
                      inputMode="tel"
                      aria-label="Phone number"
                    />
                    <span className="bmw__hint">We’ll text to confirm. Nothing else.</span>
                    {phone.length > 0 && !phoneOk ? <span className="bmw__softErr">Enter a valid UK number.</span> : null}
                  </label>

                  <button
                    type="button"
                    className="bmw__accordionBtn"
                    onClick={() => setShowDetails((v) => !v)}
                    aria-expanded={showDetails}
                    aria-label="Toggle optional details"
                  >
                    Add details (optional)
                    <span className="bmw__chev" aria-hidden="true">{showDetails ? "▴" : "▾"}</span>
                  </button>

                  {showDetails ? (
                    <div className="bmw__accordionBody">
                      <label className="bmw__field">
                        <span className="bmw__labelSmall">Name</span>
                        <input
                          className="bmw__input"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your name"
                          autoComplete="name"
                          aria-label="Name"
                        />
                      </label>

                      <div className="bmw__noteChips" role="list" aria-label="Quick notes">
                        {NOTE_CHIPS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className="bmw__noteChip"
                            onClick={() => setNotes((prev) => (prev ? `${prev}${prev.trim().endsWith(".") ? "" : "."} ${c}` : c))}
                            role="listitem"
                            aria-label={`Add note ${c}`}
                          >
                            + {c}
                          </button>
                        ))}
                      </div>

                      <label className="bmw__field">
                        <span className="bmw__labelSmall">Notes</span>
                        <textarea
                          className="bmw__input bmw__textarea"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={3}
                          placeholder="Beard trim? Skin fade length? Any allergies?"
                          aria-label="Notes"
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}
        </main>

        {/* FOOTER: minimal chrome */}
        <footer className="bmw__footerLite">
          <button
            type="button"
            className="bmw__btnGhost"
            onClick={onBack}
            disabled={step === 1}
            aria-label="Back"
          >
            Back
          </button>

          <div className="bmw__summaryLine" aria-label="Summary">
            {summary}
          </div>

          <button
            type="button"
            className={`bmw__btnPrimary ${step === 3 ? "is-confirm" : ""}`}
            onClick={onPrimary}
            disabled={
              (step === 1 && !step1Ready) ||
              (step === 2 && !step2Ready) ||
              (step === 3 && (!step3Ready || sending))
            }
            aria-label={step === 3 ? "Confirm booking" : "Continue"}
          >
            {step === 3 ? (sending ? "Confirming…" : "Confirm") : "Continue"}
          </button>
        </footer>

        {/* INFO BOTTOM SHEET */}
        {infoOpen && infoService ? (
          <div className="bmw__sheetRoot" role="presentation">
            <button
              type="button"
              className="bmw__sheetOverlay"
              onClick={() => {
                setInfoOpen(false);
                setInfoService(null);
              }}
              aria-label="Close overlay"
            />

            <div className="bmw__sheet" role="dialog" aria-modal="true" aria-label={`${infoService.name} details`}>
              <div className="bmw__sheetTop">
                <div className="bmw__sheetTitle">{infoService.name}</div>
                <button
                  ref={infoCloseRef}
                  type="button"
                  className="bmw__sheetClose"
                  onClick={() => {
                    setInfoOpen(false);
                    setInfoService(null);
                  }}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="bmw__sheetBody">{infoService.details}</div>
            </div>
          </div>
        ) : null}
      </form>
    </div>
  );
}
