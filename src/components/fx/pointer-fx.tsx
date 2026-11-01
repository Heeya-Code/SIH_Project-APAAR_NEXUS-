// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import { useEffect } from "react";

/** One document-level pointer listener (throttled to animation frames) drives: the cursor glow, card spotlights and card tilt.
 *  It does nothing on touch devices or when the person prefers reduced motion. */
export function PointerFx() {
  useEffect(() => {
    if (!matchMedia("(pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    let raf = 0, last: PointerEvent | null = null, tilted: HTMLElement | null = null;
    const reset = (el: HTMLElement | null) => { el?.style.setProperty("--rx", "0deg"); el?.style.setProperty("--ry", "0deg"); };
    const frame = () => {
      raf = 0; const e = last; if (!e) return;
      root.style.setProperty("--px", `${e.clientX}px`); root.style.setProperty("--py", `${e.clientY}px`);
      const t = e.target instanceof Element ? e.target : null;
      const spot = t?.closest<HTMLElement>(".spot");
      if (spot) { const r = spot.getBoundingClientRect(); spot.style.setProperty("--mx", `${e.clientX - r.left}px`); spot.style.setProperty("--my", `${e.clientY - r.top}px`); }
      const tilt = t?.closest<HTMLElement>("[data-tilt]") ?? null;
      if (tilted && tilted !== tilt) reset(tilted);
      if (tilt) { const r = tilt.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; tilt.style.setProperty("--ry", `${(x * 6).toFixed(2)}deg`); tilt.style.setProperty("--rx", `${(-y * 6).toFixed(2)}deg`); }
      tilted = tilt;
    };
    const move = (e: PointerEvent) => { last = e; root.dataset.fx = "on"; if (!raf) raf = requestAnimationFrame(frame); };
    const leave = () => { root.removeAttribute("data-fx"); reset(tilted); tilted = null; };
    addEventListener("pointermove", move, { passive: true }); document.documentElement.addEventListener("pointerleave", leave);
    return () => { removeEventListener("pointermove", move); document.documentElement.removeEventListener("pointerleave", leave); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return <div aria-hidden className="cursor-glow" />;
}
