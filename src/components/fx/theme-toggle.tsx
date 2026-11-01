// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

/** Dark is the default. The choice is remembered on this device and applied before first paint (see the script in layout.tsx). */
export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  function toggle() {
    const next = !dark; setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("nexus-theme", next ? "dark" : "light"); } catch { /* storage unavailable */ }
  }
  return (
    <button type="button" onClick={toggle} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} aria-pressed={dark}
      className="grid size-9 place-items-center rounded-control text-slate-600 transition-colors hover:bg-navy-900/5 hover:text-navy-900">
      {dark ? <Sun className="size-[18px]" aria-hidden /> : <Moon className="size-[18px]" aria-hidden />}
    </button>
  );
}
