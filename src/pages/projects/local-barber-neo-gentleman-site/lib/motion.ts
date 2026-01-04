// motion.ts — shared tiny helpers for the demo (Lenis + reduced motion safe)

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Initialize Lenis once (browser-only).
 * Package renamed from "@studio-freight/lenis" -> "lenis".
 */
export async function initLenis() {
  if (typeof window === "undefined") return null;

  const w = window as any;
  if (w.__bw_lenis) return w.__bw_lenis;

  const { default: Lenis } = await import("lenis");
  const lenis = new Lenis({
    smoothWheel: true,
    smoothTouch: false,
  });

  w.__bw_lenis = lenis;

  const raf = (t: number) => {
    lenis.raf(t);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);

  return lenis;
}
