// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

// Layout modelled on the reference design: a floating glass navigation bar across the top (no sidebar),
// accent swatches, theme switch and a gradient search pill. Small screens use the slide-in drawer.
import Link from "next/link";
import { useRef, useState } from "react";
import { Bell, Building2, ChevronsUpDown, ClipboardCheck, FileClock, FileDown, GraduationCap, IdCard, Inbox, Landmark, Layers, LayoutDashboard, LogOut, Map as MapIcon, Menu, QrCode, ScanLine, ScanSearch, ScrollText, SendHorizontal, Settings2, ShieldCheck, TriangleAlert, Upload, UserCog, Users, BadgeCheck, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { TAGLINE } from "@/components/brand";
import { AccentPicker } from "@/components/fx/accent-picker";
import { CommandPalette } from "@/components/fx/command-palette";
import { ThemeToggle } from "@/components/fx/theme-toggle";
import type { NavIcon, NavItem } from "@/components/nav";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { logoutAction } from "@/app/login/actions";
import { cn } from "@/lib/utils";

const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard, audit: ScrollText, users: Users, building: Building2, students: GraduationCap, verify: ShieldCheck, identity: IdCard, desk: ScanSearch,
  upload: Upload, history: FileClock, trust: BadgeCheck, alerts: TriangleAlert, ledger: Layers, directory: Landmark, regions: MapIcon, reports: FileDown, requests: Inbox, consent: ClipboardCheck, qr: QrCode, scan: ScanLine, send: SendHorizontal, operators: UserCog, settings: Settings2,
};
// Short labels keep the top bar on one line; the drawer and tooltips use the full label.
const SHORT: Record<string, string> = {
  "Command centre": "Overview",
  "Institution directory": "Institutions", "Live seat ledger": "Seat ledger", "Regional seat ledger": "Seat ledger", "Regional analytics": "Regions", "Alerts and conflicts": "Alerts", "Regional alerts": "Alerts",
  "Trust scores": "Trust", "Trust score": "Trust", "Audit logs": "Audit", "Audit history": "Audit", "Platform overview": "Overview", "Users and access": "Users", "Security and audit": "Audit", "Configuration": "Config",
  "Regional overview": "Overview", "Upload centre": "Upload", "Check an APAAR ID": "Check ID", "Data operators": "Operators", "Work dashboard": "Dashboard", "Verification requests": "Requests",
  "Consent history": "Consents", "My QR verification": "My QR", "My profile": "Profile", "Verification dashboard": "Dashboard", "Scan or enter a code": "Check a code", "Request history": "History",
};
export type ShellUser = { name: string; email: string; roleLabel: string; scope: string; initials: string; unread: number };

function useActiveHref(nav: NavItem[]) {
  const pathname = usePathname();
  return useMemo(() => nav.filter((n) => pathname === n.href || pathname.startsWith(`${n.href}/`)).sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null, [nav, pathname]);
}

function TopNav({ nav, active }: { nav: NavItem[]; active: string | null }) {
  return (
    <nav aria-label="Primary" className="no-scrollbar hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [mask-image:linear-gradient(90deg,#000_94%,transparent)] xl:flex">
      {nav.map((n) => {
        const Icon = ICONS[n.icon], on = n.href === active;
        return (
          <Link key={n.href} href={n.href} title={n.label} aria-current={on ? "page" : undefined}
            className={cn("nav-pill flex h-10 shrink-0 items-center gap-2 rounded-full px-3 text-[14px] font-medium transition-colors 2xl:px-3.5", on ? "text-navy-900" : "text-slate-500 hover:text-navy-900")}>
            <Icon className="hidden size-[17px] shrink-0 2xl:block" aria-hidden />{SHORT[n.label] ?? n.label}
          </Link>
        );
      })}
    </nav>
  );
}

function DrawerNav({ nav, active, onNavigate }: { nav: NavItem[]; active: string | null; onNavigate: () => void }) {
  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      {nav.map((n, idx) => {
        const Icon = ICONS[n.icon], on = n.href === active;
        return (
          <div key={n.href}>
            {n.group && n.group !== nav[idx - 1]?.group && <p aria-hidden className={cn("px-3 pb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400", idx > 0 && "mt-4")}>{n.group}</p>}
            <Link href={n.href} onClick={onNavigate} aria-current={on ? "page" : undefined}
              className={cn("nav-pill flex h-10 items-center gap-3 rounded-full px-3 text-[14px]", on ? "text-white" : "text-slate-300 hover:bg-white/[0.06] hover:text-white")}>
              <Icon className="size-[18px] shrink-0" aria-hidden /><span className="truncate">{n.label}</span>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}

export function AppShell({ user, nav, home, national = false, children }: { user: ShellUser; nav: NavItem[]; home: string; national?: boolean; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const logoutForm = useRef<HTMLFormElement>(null);
  const active = useActiveHref(nav);
  const brand = <Link href={home} className="flex shrink-0 items-center gap-2.5 rounded-full pr-2"><span aria-hidden className="orb size-8 rounded-full" /><span className="hidden text-[17px] font-bold tracking-[-0.02em] text-navy-900 sm:inline">APAAR Nexus</span><span className="sr-only sm:hidden">APAAR Nexus home</span></Link>;

  return (
    <TooltipProvider>
      <a href="#main" className="sr-only z-50 rounded-md bg-white px-4 py-2 text-sm font-medium text-navy-900 shadow-pop focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to main content</a>
      <form ref={logoutForm} action={logoutAction} hidden />
      <div className="min-h-dvh">
        <p className="px-4 pt-2 text-center text-[11px] tracking-wide text-slate-500"><span aria-hidden className="mr-2 inline-block size-1.5 rounded-full bg-amber-600 align-middle" />Demo data: every record is synthetic. Prototype for Smart India Hackathon 2026 (SIH26263), not an official AICTE system.</p>
        <header className="sticky top-3 z-40 mx-2 mt-2 sm:mx-6">
          <div className="glass-bar flex h-[60px] min-w-0 items-center gap-1 rounded-full pl-2 pr-2 sm:gap-2 sm:pl-3">
            <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation" className="grid size-10 shrink-0 place-items-center rounded-full text-slate-600 hover:bg-navy-900/5 xl:hidden"><Menu className="size-5" /></button>
            {brand}
            <span aria-hidden className="mx-2 hidden h-6 w-px bg-line xl:block" />
            <TopNav nav={nav} active={active} />
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <div className="mr-1 hidden min-[1400px]:block"><AccentPicker /></div>
              <ThemeToggle />
              <Link href="/notifications" className="relative grid size-10 place-items-center rounded-full text-slate-600 hover:bg-navy-900/5">
                <Bell className="size-[18px]" aria-hidden /><span className="sr-only">Notifications{user.unread > 0 ? `, ${user.unread} unread` : ""}</span>{user.unread > 0 && <span aria-hidden className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-4 text-white">{user.unread > 9 ? "9+" : user.unread}</span>}
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full p-1 pr-2 hover:bg-navy-900/5">
                  <span aria-hidden className="grid size-8 place-items-center rounded-full bg-teal-100 text-xs font-semibold text-teal-700">{user.initials}</span><span className="sr-only">Account menu for {user.name}</span>
                  <ChevronsUpDown className="size-3.5 text-slate-500" aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel><p className="text-sm font-medium text-navy-900">{user.name}</p><p className="mt-0.5 break-all text-xs text-slate-500">{user.email}</p><p className="mt-2 text-xs text-slate-600">{user.roleLabel} · {user.scope}</p></DropdownMenuLabel>
                  <div className="px-2 py-2 min-[1400px]:hidden"><p className="mb-2 text-xs text-slate-500">Accent colour</p><AccentPicker /></div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link href="/profile">My profile and settings</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/help">Help and guidance</Link></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {/* Submit from onSelect: it runs before Radix unmounts the menu, so the submission cannot be cancelled by the unmount. */}
                  <DropdownMenuItem onSelect={() => logoutForm.current?.requestSubmit()}><LogOut aria-hidden />Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <CommandPalette nav={nav} national={national} />
            </div>
          </div>
        </header>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent className="sheet-dark">
            <SheetTitle className="sr-only">Navigation</SheetTitle><SheetDescription className="sr-only">Main navigation for your role</SheetDescription>
            <div className="flex h-full flex-col justify-between overflow-y-auto px-3 py-4">
              <div className="space-y-6">
                <div className="flex items-center gap-2.5 px-2"><span aria-hidden className="orb size-8 rounded-full" /><span className="text-[17px] font-bold text-white">APAAR Nexus</span></div>
                <DrawerNav nav={nav} active={active} onNavigate={() => setMobileOpen(false)} />
              </div>
              <div className="space-y-3 border-t border-white/10 px-2 pt-4"><AccentPicker /><p className="text-xs text-slate-400">{user.name} · {user.roleLabel}</p></div>
            </div>
          </SheetContent>
        </Sheet>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1320px] px-4 pb-10 pt-10 outline-none sm:px-8">{children}</main>
        <footer className="border-t border-line px-4 py-4 text-center text-xs text-slate-500 sm:px-8"><span className="font-medium text-navy-900">EnrolTrust.</span> {TAGLINE} <span className="mx-1.5" aria-hidden>·</span>© 2026 Heeya-Code. All rights reserved.</footer>
      </div>
    </TooltipProvider>
  );
}
