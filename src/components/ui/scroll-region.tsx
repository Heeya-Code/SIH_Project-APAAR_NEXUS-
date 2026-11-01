// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import { useEffect, useRef, useState } from "react";

/** A horizontally scrollable wrapper that becomes a focusable, labelled region only when its content really overflows. */
export function ScrollRegion({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const check = () => setScrolls(el.scrollWidth > el.clientWidth + 1);
    check(); const ro = new ResizeObserver(check); ro.observe(el); return () => ro.disconnect();
  }, []);
  return <div ref={ref} className={className} {...(scrolls ? { tabIndex: 0, role: "region", "aria-label": "Scrollable table. Use the arrow keys to scroll sideways." } : {})}>{children}</div>;
}
