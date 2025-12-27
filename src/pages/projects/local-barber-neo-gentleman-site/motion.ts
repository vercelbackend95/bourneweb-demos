// src/pages/projects/local-barber-neo-gentleman-site/motion.ts
import Lenis from "@studio-freight/lenis";
import gsap from "gsap";

export function bootMotion() {
  const lenis = new Lenis({ smoothWheel: true });

  function raf(time: number) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // przykładowy “premium szept”:
  gsap.from("[data-anim='fadeUp']", { y: 16, opacity: 0, duration: 0.6, ease: "power2.out", stagger: 0.06 });
}
