// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Building2, CornerDownLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { NavItem } from "@/components/nav";
import { cn } from "@/lib/utils";

type Inst = { id: string; name: string; city: string; stateName: string };
type Item = { key: string; label: string; hint: string; href: string; kind: "page" | "institution" };

/** Press Ctrl+K (or ⌘K) anywhere. Finds your pages and, for AICTE roles, institutions in your scope. */
export function CommandPalette({ nav, national }: { nav: NavItem[]; national: boolean }) {
  const router = useRouter(), listId = useId();
  const [open, setOpen] = useState(false), [q, setQ] = useState(""), [sel, setSel] = useState(0), [insts, setInsts] = useState<Inst[]>([]);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); } };
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  }, []);
  useEffect(() => { if (!open) { setQ(""); setSel(0); setInsts([]); } }, [open]);
  useEffect(() => {
    if (!open || !national || q.trim().length < 2) { setInsts([]); return; }
    const ctl = new AbortController();
    const t = setTimeout(async () => { try { const r = await fetch(`/api/v1/search?q=${encodeURIComponent(q.trim())}`, { signal: ctl.signal }); const j = await r.json(); if (j.ok) setInsts(j.data.institutions); } catch { /* aborted or offline */ } }, 160);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q, open, national]);

  const items = useMemo<Item[]>(() => [
    ...nav.filter((n) => n.label.toLowerCase().includes(q.trim().toLowerCase())).map((n): Item => ({ key: `p:${n.href}`, label: n.label, hint: "Page", href: n.href, kind: "page" })),
    ...insts.map((i): Item => ({ key: `i:${i.id}`, label: i.name, hint: `${i.city}, ${i.stateName}`, href: `/aicte/institutions/${i.id}`, kind: "institution" })),
  ], [nav, insts, q]);
  useEffect(() => setSel(0), [q]);
  const go = (it: Item | undefined) => { if (!it) return; setOpen(false); router.push(it.href); };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className="btn-press flex h-10 items-center gap-2 rounded-full bg-navy-900 px-3 text-[14px] font-semibold sm:px-4">
          <Search className="size-4 shrink-0" aria-hidden /><span className="hidden sm:inline">Search</span><span className="sr-only sm:hidden">Search</span>
          <kbd className="hidden rounded-full bg-black/10 px-1.5 py-px font-mono text-[11px] md:inline">Ctrl K</kbd>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#030816]/70 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content onOpenAutoFocus={(e) => { e.preventDefault(); input.current?.focus(); }} className="fixed left-1/2 top-[14vh] z-50 w-[min(92vw,560px)] -translate-x-1/2 overflow-hidden rounded-card border border-line-strong bg-white shadow-pop data-[state=open]:animate-pop-in">
          <Dialog.Title className="sr-only">Search</Dialog.Title><Dialog.Description className="sr-only">Type to find a page or institution. Use the arrow keys and Enter.</Dialog.Description>
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Search className="size-4 shrink-0 text-slate-500" aria-hidden />
            <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} role="combobox" aria-expanded aria-controls={listId} aria-activedescendant={items[sel] ? `${listId}-${sel}` : undefined} aria-label="Search pages and institutions" placeholder={national ? "Search pages or institutions…" : "Search pages…"} autoComplete="off"
              onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, items.length - 1)); } else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); } else if (e.key === "Enter") { e.preventDefault(); go(items[sel]); } }}
              className="h-12 w-full bg-transparent text-[15px] text-navy-900 placeholder:text-slate-500 focus-visible:outline-offset-[-3px]" />
          </div>
          <ul id={listId} role="listbox" aria-label="Results" className="max-h-[50vh] overflow-y-auto p-2">
            {items.length === 0 && <li role="presentation" className="px-3 py-8 text-center text-sm text-slate-500">{national && q.trim().length < 2 ? "Type at least two letters to search institutions." : "Nothing matches that."}</li>}
            {items.map((it, i) => (
              <li key={it.key} id={`${listId}-${i}`} role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={() => go(it)}
                className={cn("flex cursor-pointer items-center gap-3 rounded-control px-3 py-2.5", i === sel ? "bg-blue-100 text-navy-900" : "text-slate-600")}>
                {it.kind === "institution" ? <Building2 className="size-4 shrink-0" aria-hidden /> : <CornerDownLeft className="size-4 shrink-0 opacity-60" aria-hidden />}
                <span className="min-w-0 flex-1 truncate text-sm">{it.label}</span><span className="shrink-0 text-xs text-slate-500">{it.hint}</span>
              </li>))}
          </ul>
          <p className="border-t border-line px-4 py-2 text-[11px] text-slate-500">Up and Down to move, Enter to open, Esc to close</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
