// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestResetAction, type ResetState } from "./actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState<ResetState, FormData>(requestResetAction, {});
  if (state.done) return <p role="status" className="rounded-control bg-green-100 px-4 py-3 text-sm text-green-700">If that email belongs to an account, your administrator has been asked to help you reset it. Nothing else is shown, so no one can use this form to discover who is registered.</p>;
  return (
    <form action={action} className="space-y-4" noValidate>
      <div><label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-navy-900">Email</label><input id="email" name="email" type="email" required autoComplete="username" className="h-11 w-full rounded-control border border-line-strong bg-white px-3.5 text-[15px]" /></div>
      {state.error && <p role="alert" className="rounded-control bg-red-100 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <Button type="submit" size="lg" disabled={pending} className="w-full">{pending ? <><Loader2 className="animate-spin" aria-hidden />Sending</> : "Ask for a reset"}</Button>
    </form>
  );
}
