// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { redirect } from "next/navigation";
import Link from "next/link";
import { Wordmark, TAGLINE } from "@/components/brand";
import { TileGrid, type TileDatum } from "@/components/tile-grid";
import { TILES } from "@/lib/geo/india-tiles";
import { getAuth } from "@/lib/auth/session";
import { ROLE_META } from "@/lib/auth/permissions";
import { DEMO_GROUPS } from "@/lib/demo-accounts";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getAuth();
  if (user) redirect(ROLE_META[user.role].home);
  const demo = process.env.DEMO_MODE === "true";
  const decor: Record<string, TileDatum> = Object.fromEntries(TILES.map((t, i) => [t.code, { value: ((i * 7) % 10) + 1 }]));
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="relative hidden overflow-hidden bg-navy-950 p-10 lg:flex lg:flex-col lg:justify-between">
        <Link href="/"><Wordmark /></Link>
        <div className="mx-auto w-full max-w-md opacity-30"><TileGrid data={decor} max={10} animate={false} compact decorative /></div>
        <div className="max-w-sm"><p className="font-serif text-[26px] leading-snug text-white">{TAGLINE}</p><p className="mt-3 text-sm text-slate-400">Every sign-in is recorded. Every record you open is limited to your role.</p></div>
      </div>
      <div className="flex items-center bg-paper px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-xl">
          <div className="mb-8 lg:hidden"><Wordmark tone="dark" sub={false} /></div>
          <h1 className="mb-1 text-[28px] text-navy-900">Sign in</h1>
          <p className="mb-8 text-slate-600">Use the account issued for your role.</p>
          <LoginForm groups={demo ? DEMO_GROUPS : []} demoPassword={demo ? (process.env.DEMO_PASSWORD ?? null) : null} />
        </div>
      </div>
    </div>
  );
}
