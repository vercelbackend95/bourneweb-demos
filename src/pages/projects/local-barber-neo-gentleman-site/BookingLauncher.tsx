import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";

// ✅ Podmień import na swój realny komponent:
// import BookOnline from "./BookOnline";
import BookOnline from "./BookingWidget"; // <- u Ciebie tak się nazywa teraz :contentReference[oaicite:2]{index=2}

type Snap = "mid" | "full";

type BookingLauncherProps = {
  /** Tekst CTA (guzik który morphuje w sheet/drawer) */
  ctaLabel?: string;

  /** Desktop breakpoint (px) */
  desktopBp?: number;

  /** Startowy snap po otwarciu */
  initialSnap?: Snap;

  /** Sticky footer CTA – jeśli Twój BookOnline ma własny footer (np. .bmw__footerLite), wrapper go ukryje automatycznie. :contentReference[oaicite:3]{index=3} */
  stickyCtaLabel?: string;

  /**
   * Jeśli chcesz, żeby sticky CTA “kliknęło” Twój istniejący przycisk w środku,
   * podaj selektor (np. ".bmw__btnPrimary"). :contentReference[oaicite:4]{index=4}
   * Jeśli nie podasz – wrapper spróbuje znaleźć pierwszy sensowny button w środku.
   */
  confirmSelector?: string;

  /** Wymuś sticky CTA nawet jeśli wykryjemy wewnętrzny footer */
  forceStickyCta?: boolean;
};

function useMediaQuery(query: string) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setOk(m.matches);
    on();
    m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, [query]);
  return ok;
}

function useViewportPx() {
  const [vh, setVh] = useState<number>(0);
  const [vw, setVw] = useState<number>(0);

  useLayoutEffect(() => {
    const read = () => {
      const vv = window.visualViewport;
      const h = vv?.height ?? window.innerHeight;
      const w = vv?.width ?? window.innerWidth;
      setVh(h);
      setVw(w);
    };
    read();
    window.addEventListener("resize", read);
    window.visualViewport?.addEventListener("resize", read);
    return () => {
      window.removeEventListener("resize", read);
      window.visualViewport?.removeEventListener("resize", read);
    };
  }, []);

  return { vh, vw };
}

function lockScroll(locked: boolean) {
  const html = document.documentElement;
  const body = document.body;

  if (!locked) {
    const y = body.dataset.bwScrollY;
    if (y) {
      const n = Number(y);
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      html.style.overflow = "";
      body.style.overflow = "";
      window.scrollTo(0, n);
      delete body.dataset.bwScrollY;
    }
    html.classList.remove("bm-noScroll");
    body.classList.remove("bm-noScroll");
    return;
  }

  const scrollY = window.scrollY || 0;
  body.dataset.bwScrollY = String(scrollY);

  // klasy masz już używane w projekcie (np. drawer w nav) :contentReference[oaicite:5]{index=5}
  html.classList.add("bm-noScroll");
  body.classList.add("bm-noScroll");

  // twardy lock (działa wszędzie)
  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";
  html.style.overflow = "hidden";
  body.style.overflow = "hidden";
}

export default function BookingLauncher({
  ctaLabel = "Book online",
  desktopBp = 900,
  initialSnap = "full",
  stickyCtaLabel = "Confirm booking",
  confirmSelector,
  forceStickyCta = false,
}: BookingLauncherProps) {
  const reduce = useReducedMotion();
  const isDesktop = useMediaQuery(`(min-width: ${desktopBp}px)`);
  const { vh } = useViewportPx();

  const [open, setOpen] = useState(false);
  const [snap, setSnap] = useState<Snap>(initialSnap);

  const sheetRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  // motion values
  const y = useMotionValue(0);
  const x = useMotionValue(0);

  // snap math (sheet ma 100vh, a widoczne snapy to 40% i 92% ekranu)
  const snapY = useMemo(() => {
    const full = Math.round(vh * (1 - 0.92)); // 8% od góry
    const mid = Math.round(vh * (1 - 0.40));  // 60% od góry
    const closed = Math.round(vh + 24);       // poza ekran
    return { full, mid, closed };
  }, [vh]);

  // drawer math
  const drawer = useMemo(() => {
    const w = 480;
    const closed = w + 40;
    return { w, closed };
  }, []);

  // scale content w desktop drawer (bez dotykania klas w środku)
  const contentScale = useMemo(() => {
    if (!isDesktop) return 1;
    // BookOnline w tym demie celuje w ~720px szerokości :contentReference[oaicite:6]{index=6}
    const base = 720;
    const available = drawer.w - 24;
    return Math.min(1, Math.max(0.55, available / base));
  }, [isDesktop, drawer.w]);

  // open/close helpers
  const close = () => {
    setOpen(false);
  };
  const openIt = () => {
    setSnap(initialSnap);
    setOpen(true);
  };

  // scroll lock
  useEffect(() => {
    lockScroll(open);
    return () => lockScroll(false);
  }, [open]);

  // ESC closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // set initial positions on open + snap changes
  useEffect(() => {
    if (!open) return;

    if (isDesktop) {
      x.set(0);
      y.set(0);
      requestAnimationFrame(() => sheetRef.current?.focus());
      return;
    }

    const target = snap === "full" ? snapY.full : snapY.mid;
    y.set(target);
    requestAnimationFrame(() => sheetRef.current?.focus());
  }, [open, snap, isDesktop, snapY.full, snapY.mid, x, y]);

  // overlay click
  const onOverlay = () => close();

  // mobile: drag end -> snap/close
  const onMobileDragEnd = (_: any, info: { velocity: { y: number }; offset: { y: number } }) => {
    const cur = y.get();

    const goingDownFast = info.velocity.y > 900;
    const pastMid = cur > (snapY.mid + 40);

    if (goingDownFast && cur > snapY.mid) return close();
    if (cur > (snapY.mid + (snapY.closed - snapY.mid) * 0.45)) return close();

    // snap to nearest (full vs mid)
    const distFull = Math.abs(cur - snapY.full);
    const distMid = Math.abs(cur - snapY.mid);
    const next: Snap = distFull <= distMid ? "full" : "mid";
    setSnap(next);

    // animate to exact snap (tween if reduced)
    const target = next === "full" ? snapY.full : snapY.mid;
    y.set(target);
  };

  // desktop: drag right to close
  const onDesktopDragEnd = (_: any, info: { velocity: { x: number } }) => {
    const cur = x.get();
    const fling = info.velocity.x > 900;
    if (fling || cur > drawer.w * 0.45) return close();
    x.set(0);
  };

  // sticky CTA detection (jeśli BookOnline ma własny footer – nie dokładamy dubla)
  const [hasInternalFooter, setHasInternalFooter] = useState<boolean>(false);
  useEffect(() => {
    if (!open) return;
    const el = contentRef.current;
    if (!el) return;

    // wykrywamy “wewnętrzny” footer, np. BookingWidget ma .bmw__footerLite :contentReference[oaicite:7]{index=7}
    const found =
      !!el.querySelector(".bmw__footerLite") ||
      !!el.querySelector("[aria-label='Confirm booking']") ||
      !!el.querySelector(".bmw__btnPrimary"); // :contentReference[oaicite:8]{index=8}
    setHasInternalFooter(found);
  }, [open]);

  const shouldShowSticky = forceStickyCta ? true : !hasInternalFooter;

  const triggerConfirm = () => {
    const root = contentRef.current;
    if (!root) return;

    // 1) explicit selector
    if (confirmSelector) {
      const btn = root.querySelector(confirmSelector) as HTMLElement | null;
      if (btn) {
        btn.click();
        return;
      }
    }

    // 2) best guess: primary / submit-ish
    const candidates = [
      "button[type='submit']",
      "input[type='submit']",
      "button[aria-label*='Confirm']",
      "button[aria-label*='Continue']",
      "button",
    ];
    for (const sel of candidates) {
      const el = root.querySelector(sel) as HTMLElement | null;
      if (el) {
        el.click();
        return;
      }
    }
  };

  // transitions: reduced motion = simple tween
  const overlayMotion = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.18 } }
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.22 } };

  const sheetTween = reduce ? { type: "tween" as const, duration: 0.22 } : { type: "spring" as const, stiffness: 380, damping: 36, mass: 0.9 };

  // layoutId only when not reduced (no morph when reduced)
  const LAYOUT_ID = !reduce ? "booking-sheet" : undefined;

  return (
    <LayoutGroup>
      {/* CTA (morph source) */}
      {!open ? (
        <motion.button
          type="button"
          className="bw-launcher__cta"
          layoutId={LAYOUT_ID}
          onClick={openIt}
          whileTap={reduce ? undefined : { scale: 0.985 }}
        >
          <span className="bw-launcher__ctaTxt">{ctaLabel}</span>
          <span className="bw-launcher__ctaIcon" aria-hidden="true">→</span>
        </motion.button>
      ) : null}

      <AnimatePresence>
        {open ? (
          <div className="bw-launcher__portal" role="presentation">
            {/* overlay */}
            <motion.button
              type="button"
              className="bw-launcher__overlay"
              aria-label="Close booking"
              onClick={onOverlay}
              {...overlayMotion}
            />

            {/* sheet/drawer (morph target) */}
            <motion.div
              ref={sheetRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="Booking"
              className={`bw-launcher__sheet ${isDesktop ? "is-desktop" : "is-mobile"}`}
              layoutId={LAYOUT_ID}
              style={isDesktop ? { x } : { y }}
              initial={reduce ? (isDesktop ? { x: drawer.closed, opacity: 0 } : { y: snapY.closed, opacity: 0 }) : false}
              animate={
                reduce
                  ? isDesktop
                    ? { x: 0, opacity: 1, transition: sheetTween }
                    : { y: snap === "full" ? snapY.full : snapY.mid, opacity: 1, transition: sheetTween }
                  : undefined
              }
              exit={
                reduce
                  ? isDesktop
                    ? { x: drawer.closed, opacity: 0, transition: sheetTween }
                    : { y: snapY.closed, opacity: 0, transition: sheetTween }
                  : undefined
              }
              drag={reduce ? false : isDesktop ? "x" : "y"}
              dragElastic={reduce ? 0 : 0.08}
              dragMomentum={false}
              dragConstraints={
                reduce
                  ? undefined
                  : isDesktop
                  ? { left: 0, right: drawer.closed }
                  : { top: snapY.full, bottom: snapY.closed }
              }
              onDragEnd={reduce ? undefined : isDesktop ? onDesktopDragEnd : onMobileDragEnd}
            >
              {/* top chrome */}
              <div className="bw-launcher__chrome">
                {!isDesktop ? <div className="bw-launcher__handle" aria-hidden="true" /> : null}
                <div className="bw-launcher__title">Booking</div>
                <button type="button" className="bw-launcher__close" onClick={close} aria-label="Close">
                  ×
                </button>
              </div>

              {/* body */}
              <div className="bw-launcher__body" ref={contentRef}>
                <div
                  className="bw-launcher__scale"
                  style={
                    {
                      ["--bw-scale" as any]: String(contentScale),
                    } as React.CSSProperties
                  }
                >
                  <div className="bw-launcher__scaleInner">
                    {/* ✅ TU: bez zmian w środku */}
                    <BookOnline />
                  </div>
                </div>
              </div>

              {/* sticky footer CTA (opcjonalnie, auto-hide jeśli BookOnline ma swój footer) */}
              {shouldShowSticky ? (
                <div className="bw-launcher__sticky">
                  <button type="button" className="bw-launcher__stickyBtn" onClick={triggerConfirm}>
                    {stickyCtaLabel}
                  </button>
                </div>
              ) : null}
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </LayoutGroup>
  );
}
