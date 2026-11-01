// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { GRID_COLS, GRID_ROWS, TILES } from "@/lib/geo/india-tiles";

import { classify, css, MUTED_TEXT, readableOn, SCALES, type RGB, type ScaleName } from "@/lib/geo/tile-colors";

export type TileDatum = { value: number | null; ring?: boolean; dot?: boolean; caption?: string };

/** Five-step legend matching the tile classes. */
export function TileLegend({ scale = "blue", low = "Lower", high = "Higher" }: { scale?: ScaleName; low?: string; high?: string }) {
  return (
    <span className="inline-flex items-center gap-2" aria-hidden>
      <span>{low}</span><span className="flex overflow-hidden rounded-[3px]">{SCALES[scale].map((c, i) => <span key={i} className="block h-3 w-5" style={{ background: css(c) }} />)}</span><span>{high}</span>
    </span>
  );
}

export function TileGrid({ data, scale = "blue", max, selected, onSelect, onHover, animate = true, compact = false, decorative = false }: {
  data: Record<string, TileDatum>; scale?: ScaleName; max: number; selected?: string | null;
  onSelect?: (code: string) => void; onHover?: (code: string | null) => void; animate?: boolean; compact?: boolean;
  /** Pure ornament: no labels, hidden from assistive technology. */
  decorative?: boolean;
}) {
  const steps = SCALES[scale];
  return (
    <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${GRID_ROWS}, minmax(0, 1fr))`, gap: compact ? 3 : 5 }}
      {...(decorative ? { "aria-hidden": true } : { role: onSelect ? "group" : "img", "aria-label": "Tile map of Indian states and union territories" })}>
      {TILES.map((t) => {
        const d = data[t.code];
        const present = !!d;                       // the state has institutions in this view: always interactive
        const has = present && d!.value !== null;  // ...but only coloured when it has a value for this measure
        const bgRgb: RGB = has ? steps[classify(max > 0 ? (d!.value as number) / max : 0)] : present ? [238, 242, 248] : [230, 237, 246];
        const fg = has ? readableOn(bgRgb) : MUTED_TEXT;
        const isSel = selected === t.code;
        const shadow = [d?.ring ? "inset 0 0 0 2.5px #b42318" : present && !has ? "inset 0 0 0 1.5px #8a99b0" : "", isSel ? "0 0 0 2px #0a1f3d" : ""].filter(Boolean).join(",");
        const style = { gridColumn: t.col + 1, gridRow: t.row + 1, background: css(bgRgb), color: css(fg), boxShadow: shadow || undefined, animationDelay: animate ? `${(t.row + t.col) * 22}ms` : undefined } as const;
        const cls = `relative aspect-square rounded-[5px] ${animate ? "tile-in" : ""} ${compact ? "text-[9px]" : "text-[11px]"} font-medium tracking-wide flex items-center justify-center transition-transform`;
        const label = `${t.name}${has ? `: ${d!.caption ?? d!.value}` : present ? ": no data for this measure" : ": no institutions in this view"}`;
        // The visible code is decorative; the full label is real text, so the accessible name always contains what is shown.
        const body = decorative ? null : (
          <>
            <span aria-hidden>{t.code}</span><span className="sr-only">{label}</span>
            {d?.dot && <span aria-hidden className="absolute right-[3px] top-[3px] h-1.5 w-1.5 rounded-full bg-amber-600 ring-1 ring-white/70" />}
          </>
        );
        return onSelect ? (
          <button key={t.code} type="button" className={`${cls} ${present ? "cursor-pointer hover:scale-105" : "cursor-default"}`} style={style} aria-pressed={isSel} disabled={!present} title={label}
            onClick={() => onSelect(t.code)} onMouseEnter={() => present && onHover?.(t.code)} onMouseLeave={() => onHover?.(null)} onFocus={() => present && onHover?.(t.code)} onBlur={() => onHover?.(null)}>{body}</button>
        ) : (<div key={t.code} className={cls} style={style} title={decorative ? undefined : label}>{body}</div>);
      })}
    </div>
  );
}
