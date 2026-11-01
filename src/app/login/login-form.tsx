// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import { useActionState, useRef, useState } from "react";
import { Building2, Eye, EyeOff, GraduationCap, Landmark, Loader2, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DemoAccount } from "@/lib/demo-accounts";
import { loginAction, type LoginState } from "./actions";

type Groups = { title: string; accounts: DemoAccount[] }[];
const ICON: Record<string, typeof Landmark> = { AICTE: Landmark, Institution: Building2, Student: GraduationCap, Verifier: ScanSearch };
const field = "h-11 w-full rounded-control border border-line-strong bg-white px-3.5 text-[15px] placeholder:text-slate-500";

export function LoginForm({ groups, demoPassword }: { groups: Groups; demoPassword: string | null }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [show, setShow] = useState(false);
  const email = useRef<HTMLInputElement>(null);
  const password = useRef<HTMLInputElement>(null);
  const fill = (a: DemoAccount) => { if (email.current) email.current.value = a.email; if (password.current && demoPassword) password.current.value = demoPassword; password.current?.focus(); };
  return (
    <div className="space-y-9">
      <form action={action} className="space-y-4" noValidate>
        <div><label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-navy-900">Email</label><input ref={email} id="email" name="email" type="email" autoComplete="username" required className={field} /></div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-navy-900">Password</label>
          <div className="relative">
            <input ref={password} id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" required className={`${field} pr-11`} />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-md text-slate-500 hover:bg-navy-900/5">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
          </div>
        </div>
        {state.error && <p role="alert" className="rounded-control bg-red-100 px-3.5 py-2.5 text-sm text-red-700">{state.error}</p>}
        <Button type="submit" size="lg" disabled={pending} className="w-full">{pending ? <><Loader2 className="animate-spin" aria-hidden />Signing in</> : "Sign in"}</Button>
        <p className="text-center text-[13px]"><a href="/forgot-password" className="text-blue-600 underline-offset-2 hover:underline">Forgot your password?</a></p>
      </form>
      {demoPassword && (
        <div>
          <p className="mb-1 text-[13px] font-medium text-navy-900">Demo accounts</p>
          <p className="mb-4 text-[13px] text-slate-500">All records are synthetic. Select an account to fill the form.</p>
          <div className="space-y-5">
            {groups.map((g) => {
              const Icon = ICON[g.title] ?? Landmark;
              return (
                <div key={g.title}>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500"><Icon className="size-3.5" aria-hidden />{g.title}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {g.accounts.map((a) => (
                      <button key={a.email} type="button" onClick={() => fill(a)} className="rounded-control border border-line bg-white px-3.5 py-2.5 text-left shadow-card transition-colors hover:border-teal-600 hover:bg-teal-100/30">
                        <span className="block text-[13px] font-medium text-navy-900">{a.label}</span><span className="block text-xs text-slate-500">{a.note}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
