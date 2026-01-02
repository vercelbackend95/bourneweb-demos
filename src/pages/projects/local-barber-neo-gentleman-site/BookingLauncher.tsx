import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import BookOnline from "../../../BookingWidget";

type Props = {
  ctaLabel?: string;
  desktopBp?: number;
};

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
    return;
  }

  const scrollY = window.scrollY || 0;
  body.dataset.bwScrollY = String(scrollY);

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
}: Props) {
  const reduce = usePrefersReducedMotionSSR();
  const isDesktop = useMedia(`(min-width: ${desktopBp}px)`);

  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);

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

  // ✅ Morph ONLY on desktop
  const layoutId = !reduce && isDesktop ? "booking-morph" : undefined;

  const sheetTransition = reduce
    ? { type: "tween" as const, duration: 0.22 }
    : { type: "spring" as const, stiffness: 420, damping: 38, mass: 0.9 };

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
          <div
            className={`bw-launcher__portal ${isDesktop ? "is-desktop" : "is-mobile"}`}
            role="presentation"
          >
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
              aria-label="Online booking"
              className={`bw-launcher__sheet ${isDesktop ? "is-desktop" : "is-mobile"}`}
              layoutId={layoutId}
              initial={
                isDesktop
                  ? (reduce ? { opacity: 0, scale: 0.985 } : false) // desktop morph
                  : { y: "100%" } // mobile bottom sheet
              }
              animate={
                isDesktop
                  ? (reduce ? { opacity: 1, scale: 1, transition: sheetTransition } : undefined)
                  : { y: 0, transition: sheetTransition }
              }
              exit={
                isDesktop
                  ? (reduce ? { opacity: 0, scale: 0.985, transition: sheetTransition } : undefined)
                  : { y: "100%", transition: sheetTransition }
              }
            >
              {/* ✅ no "Booking" header, no X — just the real card */}
{!isDesktop ? <div className="bw-launcher__grab" aria-hidden="true" /> : null}

<header className="bw-launcher__head" aria-label="Booking intro">
  <p className="bw-launcher__kicker">BOOK ONLINE</p>
  <h2 className="bw-launcher__headline">Book fast. Look sharp.</h2>
</header>

<div className="bw-launcher__body">
  <BookOnline />
</div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
