import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";

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
    const set = () => setReduce(!!mq?.matches);
    set();
    mq?.addEventListener?.("change", set);
    return () => mq?.removeEventListener?.("change", set);
  }, []);
  return reduce;
}

function lockScroll(lock: boolean) {
  const html = document.documentElement;
  const body = document.body;

  if (!lock) {
    const y = parseInt(body.dataset.lockY || "0", 10) || 0;
    html.style.overflow = "";
    body.style.overflow = "";
    body.style.position = "";
    body.style.top = "";
    body.style.left = "";
    body.style.right = "";
    body.style.width = "";
    delete body.dataset.lockY;
    window.scrollTo(0, y);
    return;
  }

  const y = window.scrollY || 0;
  body.dataset.lockY = String(y);

  body.style.position = "fixed";
  body.style.top = `-${y}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";
  html.style.overflow = "hidden";
  body.style.overflow = "hidden";
}

export default function BookingLauncher({
  ctaLabel = "BOOK ONLINE",
  desktopBp = 900,
}: Props) {
  const reduce = usePrefersReducedMotionSSR();
  const isDesktop = useMedia(`(min-width: ${desktopBp}px)`);
  const isMobile = !isDesktop;

  const [open, setOpen] = useState(false);

  const dragControls = useDragControls();
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  // allow body-initiated drag when scrolled to top
  const startYRef = useRef<number | null>(null);
  const canBodyDragRef = useRef(false);

  const CLOSE_DRAG_PX = 120;
  const CLOSE_VEL = 850;

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

  // ✅ Open from sticky pill / anywhere
  useEffect(() => {
    const openFromOutside = () => setOpen(true);
    window.addEventListener("bm:open-booking", openFromOutside as EventListener);
    return () =>
      window.removeEventListener("bm:open-booking", openFromOutside as EventListener);
  }, []);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => sheetRef.current?.focus());
  }, [open]);

  const sheetTransition = reduce
    ? { type: "tween" as const, duration: 0.22 }
    : { type: "spring" as const, stiffness: 420, damping: 38, mass: 0.8 };

  const backdropTransition = reduce
    ? { type: "tween" as const, duration: 0.18 }
    : { type: "tween" as const, duration: 0.22 };

  function canStartBodyDrag(e: PointerEvent) {
    const body = bodyRef.current;
    if (!body) return false;

    if ((e as any).button != null && (e as any).button !== 0) return false;
    if (body.scrollTop > 0) return false;

    const target = e.target as Element | null;
    if (!target) return false;

    if (
      target.closest(
        "button, a, input, select, textarea, [role='button'], [data-no-drag]"
      )
    )
      return false;

    return true;
  }

  return (
    <>
      {/* ✅ Launcher CTA */}
      <button
        className="bw-launcher__cta"
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open booking"
      >
        <span className="bw-launcher__ctaTxt">{ctaLabel}</span>
        <span className="bw-launcher__ctaIcon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <div
            className={`bw-launcher__portal ${isDesktop ? "is-desktop" : "is-mobile"}`}
            aria-label="Booking portal"
          >
            {/* Backdrop */}
            <motion.button
              className="bw-launcher__overlay"
              type="button"
              aria-label="Close booking"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={backdropTransition}
            />

            {/* Sheet / modal */}
            <motion.div
              className={`bw-launcher__sheet ${isDesktop ? "is-desktop" : "is-mobile"}`}
              role="dialog"
              aria-modal="true"
              aria-label="Booking"
              ref={sheetRef}
              tabIndex={-1}
              initial={
                isDesktop
                  ? reduce
                    ? { opacity: 0, scale: 0.98 }
                    : { opacity: 0, scale: 0.985 }
                  : reduce
                  ? { y: 12, opacity: 0 }
                  : { y: 18, opacity: 0 }
              }
              animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0, opacity: 1 }}
              exit={isDesktop ? { opacity: 0, scale: 0.985 } : { y: 18, opacity: 0 }}
              transition={sheetTransition}
              drag={isMobile ? "y" : false}
              dragListener={false}
              dragControls={dragControls}
              dragConstraints={isMobile ? { top: 0, bottom: 260 } : undefined}
              dragElastic={isMobile ? 0.1 : undefined}
              onDragEnd={(_, info) => {
                if (!isMobile) return;
                const shouldClose =
                  info.offset.y > CLOSE_DRAG_PX || info.velocity.y > CLOSE_VEL;
                if (shouldClose) setOpen(false);
              }}
            >
{/* Mobile drag zone (no visible bar, still swipe-down to close) */}
{isMobile && (
  <div
    className="bw-launcher__dragZone"
    aria-hidden="true"
    onPointerDown={(e) => dragControls.start(e as any)}
  />
)}


              {/* Body */}
              <div
                className="bw-launcher__body"
                ref={bodyRef}
                onPointerDownCapture={(e) => {
                  if (!isMobile) return;
                  const pe = e.nativeEvent as PointerEvent;
                  startYRef.current = pe.clientY;
                  canBodyDragRef.current = canStartBodyDrag(pe);
                }}
                onPointerMoveCapture={(e) => {
                  if (!isMobile) return;
                  if (!canBodyDragRef.current) return;
                  const pe = e.nativeEvent as PointerEvent;
                  if (startYRef.current == null) return;

                  const dy = pe.clientY - startYRef.current;
                  if (dy > 6) {
                    dragControls.start(e as any);
                    canBodyDragRef.current = false;
                    startYRef.current = null;
                  }
                }}
                onPointerUpCapture={() => {
                  startYRef.current = null;
                  canBodyDragRef.current = false;
                }}
                onPointerCancel={() => {
                  startYRef.current = null;
                  canBodyDragRef.current = false;
                }}
              >
                <BookOnline />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
