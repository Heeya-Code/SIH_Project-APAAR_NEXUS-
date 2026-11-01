// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { ForgotForm } from "./forgot-form";

export const metadata = { title: "Forgot your password" };
export default function Forgot() {
  return (
    <div className="grid min-h-dvh place-items-center bg-paper px-6 py-10">
      <div className="w-full max-w-md rounded-card border border-line bg-white p-8 shadow-card">
        <div className="mb-6"><Wordmark tone="dark" sub={false} /></div>
        <h1 className="mb-1 text-[26px] text-navy-900">Forgot your password?</h1>
        <p className="mb-6 text-sm text-slate-600">Enter your email. If an account exists, your administrator is told to help you reset it. We never confirm whether an email is registered.</p>
        <ForgotForm />
        <p className="mt-6 rounded-control bg-blue-100/60 px-3 py-2.5 text-[13px] text-navy-900"><strong className="font-medium">Demonstration note:</strong> this prototype does not send email. Demo account passwords are listed on the sign-in page.</p>
        <p className="mt-5 text-sm"><Link href="/login" className="text-blue-600 underline-offset-2 hover:underline">Back to sign in</Link></p>
      </div>
    </div>
  );
}
