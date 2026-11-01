// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const ACCENTS = [["teal", "Teal", "#5eead4"], ["violet", "Violet", "#a78bfa"], ["blue", "Blue", "#8db8ff"], ["pink", "Pink", "#f7a8d2"], ["gold", "Gold", "#e9c46a"]] as const;
type Accent = (typeof ACCENTS)[number][0];

/** Five accent swatches, as in the reference design. The choice retints buttons, highlights and glow, and is remembered on this device. */
export function AccentPicker() {
  const [accent, setAccent] = useState<Accent>("violet");
  useEffect(() => { const a = document.documentElement.dataset.accent as Accent | undefined; if (a) setAccent(a); }, []);
  const choose = (a: Accent) => { setAccent(a); document.documentElement.dataset.accent = a; try { localStorage.setItem("nexus-accent", a); } catch { /* storage unavailable */ } };
  return (
    <div role="radiogroup" aria-label="Accent colour" className="flex items-center gap-1.5">
      {ACCENTS.map(([id, label, color]) => (
        <button key={id} type="button" role="radio" aria-checked={accent === id} aria-label={label} title={label} onClick={() => choose(id)}
          className={cn("size-6 rounded-full transition-transform hover:scale-110", accent === id ? "ring-2 ring-offset-2 ring-offset-transparent" : "opacity-85")}
          style={{ background: `radial-gradient(circle at 35% 30%, #fff 0, ${color} 45%)`, ...(accent === id ? { boxShadow: `0 0 0 2px var(--color-paper), 0 0 0 4px ${color}` } : {}) }} />
      ))}
    </div>
  );
}
