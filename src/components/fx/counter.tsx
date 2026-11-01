// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import { useEffect, useState } from "react";

/** Counts up to `value` when it appears. The final number is always the accessible text, and it is shown at once for reduced motion. */
export function Counter({ value, className, suffix = "" }: { value: number; className?: string; suffix?: string }) {
  const [n, setN] = useState(value);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(value); return; }
    let raf = 0, start = 0; const dur = 1000;
    const tick = (t: number) => { start ||= t; const p = Math.min(1, (t - start) / dur); setN(Math.round(value * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
    setN(0); raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className}><span aria-hidden>{n.toLocaleString("en-IN")}{suffix}</span><span className="sr-only">{value.toLocaleString("en-IN")}{suffix}</span></span>;
}
