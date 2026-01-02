import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// ✅ zostaje jak masz
import BookOnline from "../../../BookingWidget";

type Props = {
  ctaLabel?: string;
  desktopBp?: number;
  stickyCtaLabel?: string;
  confirmSelector?: string;
  forceStickyCta?: boolean;
};

function usePrefersReducedMotionSSR() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const set = () => setReduce(!!mq.matches);
    set();
    mq.addEventListener?.("change", set);
    return () => mq.removeEventListener?.("change", set);
  }, []);
  return reduce;
}

function useMedia(query: string) {
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

function lockScroll(on: boolean) {
  const html = document.documentElement;
  const body = document.body;

  if (!on) {
    const y = body.dataset.bwScrollY;
    if (y) {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      html.style.overflow = "";
      body.style.overflow = "";
      window.scrollTo(0, Number(y));
      delete body.dataset.bwScrollY;
    }
    html.classList.remove("bm-noScroll");
    body.classList.remove("bm-noScroll");
    return;
  }

  const scrollY = window.scrollY || 0;
  body.dataset.bwScrollY = String(scrollY);

  html.classList.add("bm-noScroll");
  body.classList.add("bm-noScroll");

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
  stickyCtaLabel = "Confirm booking",
  confirmSelector,
  forceStickyCta = false,
}: Props) {
  const reduce = usePrefersReducedMotionSSR();
  const isDesktop = useMedia(`(min-width: ${desktopBp}px)`);

  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lockScroll(true);
    return () => lockScroll(false);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => sheetRef.current?.focus());
  }, [open]);

  const sheetTween = reduce
    ? { type: "tween" as const, duration: 0.18 }
    : { type: "spring" as const, stiffness: 420, damping: 38, mass: 0.9 };

  // ✅ morph
  const layoutId = reduce ? undefined : "booking-sheet";

  const [hasInternalFooter, setHasInternalFooter] = useState(false);
  useEffect(() => {
    if (!open) return;
    const root = contentRef.current;
    if (!root) return;
    const found =
      !!root.querySelector(".bmw__footerLite") ||
      !!root.querySelector(".bmw__btnPrimary") ||
      !!root.querySelector("button[type='submit']");
    setHasInternalFooter(found);
  }, [open]);

  const shouldShowSticky = forceStickyCta ? true : !hasInternalFooter;

  const triggerConfirm = () => {
    const root = contentRef.current;
    if (!root) return;

    if (confirmSelector) {
      const el = root.querySelector(confirmSelector) as HTMLElement | null;
      if (el) return el.click();
    }
    const el =
      (root.querySelector("button[type='submit']") as HTMLElement | null) ||
      (root.querySelector(".bmw__btnPrimary") as HTMLElement | null) ||
      (root.querySelector("button") as HTMLElement | null);
    el?.click();
  };

  return (
    <>
      {!open && (
        <motion.button
          type="button"
          className="bw-launcher__cta"
          layoutId={layoutId}
          onClick={() => setOpen(true)}
          whileTap={reduce ? undefined : { scale: 0.985 }}
        >
          <span className="bw-launcher__ctaTxt">{ctaLabel}</span>
          <span className="bw-launcher__ctaIcon" aria-hidden="true">
            →
          </span>
        </motion.button>
      )}

      <AnimatePresence>
        {open && (
          <div className="bw-launcher__portal" role="presentation">
            <motion.button
              type="button"
              className="bw-launcher__overlay"
              aria-label="Close booking"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.18 } }}
              exit={{ opacity: 0, transition: { duration: 0.18 } }}
            />

            <motion.div
              ref={sheetRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="Booking"
              className={`bw-launcher__sheet ${isDesktop ? "is-desktop" : "is-mobile"}`}
              layoutId={layoutId}
              initial={reduce ? { opacity: 0, scale: 0.985 } : false}
              animate={reduce ? { opacity: 1, scale: 1, transition: sheetTween } : undefined}
              exit={reduce ? { opacity: 0, scale: 0.985, transition: sheetTween } : undefined}
            >
              <div className="bw-launcher__chrome">
                <div className="bw-launcher__title">Booking</div>
                <button
                  type="button"
                  className="bw-launcher__close"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className="bw-launcher__body" ref={contentRef}>
                <BookOnline />
              </div>

              {shouldShowSticky && (
                <div className="bw-launcher__sticky">
                  <button type="button" className="bw-launcher__stickyBtn" onClick={triggerConfirm}>
                    {stickyCtaLabel}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
