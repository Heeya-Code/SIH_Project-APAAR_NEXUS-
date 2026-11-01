// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true" className="shrink-0">
      <rect x="1" y="1" width="12" height="12" rx="2.5" fill="#2a5490" />
      <rect x="15" y="1" width="12" height="12" rx="2.5" fill="#1b4073" />
      <rect x="1" y="15" width="12" height="12" rx="2.5" fill="#12305a" />
      <rect x="15" y="15" width="12" height="12" rx="2.5" fill="#14a59f" />
    </svg>
  );
}

export function Wordmark({ tone = "light", sub = true, compact = false }: { tone?: "light" | "dark"; sub?: boolean; compact?: boolean }) {
  if (compact) return <BrandMark size={30} />;
  const main = tone === "light" ? "text-white" : "text-navy-900";
  const muted = tone === "light" ? "text-slate-400" : "text-slate-500";
  return (
    <span className="flex items-center gap-3">
      <BrandMark />
      <span className="leading-tight">
        <span className={`block font-serif text-[17px] font-semibold tracking-wide ${main}`}>APAAR NEXUS</span>
        {sub && <span lang="hi" className={`block font-deva text-[10px] leading-snug ${muted}`}>राष्ट्रीय शैक्षणिक पहचान एवं बुद्धिमत्ता नेटवर्क</span>}
      </span>
    </span>
  );
}

/** Product concept line (EnrolTrust). */
export const TAGLINE = "One student, one APAAR ID, one verified enrolment.";
