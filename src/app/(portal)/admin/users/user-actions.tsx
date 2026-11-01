// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import { useTransition } from "react";
import { LogOut, UserCheck, UserX } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { revokeSessionsAction, setUserActiveAction } from "@/lib/actions/platform";

export function UserActions({ userId, name, isActive, sessions, self }: { userId: string; name: string; isActive: boolean; sessions: number; self: boolean }) {
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-1.5">
      <AlertDialog>
        <AlertDialogTrigger asChild><Button variant="secondary" size="sm" disabled={pending || sessions === 0}><LogOut aria-hidden />Revoke sessions</Button></AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Revoke all sessions for {name}?</AlertDialogTitle>
          <AlertDialogDescription>{name} will be signed out everywhere immediately. They can sign in again. This is recorded in the audit trail.</AlertDialogDescription>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => start(() => revokeSessionsAction(userId))}>Revoke sessions</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {!self && (isActive ? (
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="ghost" size="sm" disabled={pending} className="text-red-700 hover:bg-red-100 hover:text-red-700"><UserX aria-hidden />Deactivate</Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Deactivate {name}?</AlertDialogTitle>
            <AlertDialogDescription>{name} will be signed out and blocked from signing in until reactivated. This is recorded in the audit trail.</AlertDialogDescription>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => start(() => setUserActiveAction(userId, false))}>Deactivate account</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(() => setUserActiveAction(userId, true))} className="text-green-700 hover:bg-green-100 hover:text-green-700"><UserCheck aria-hidden />Reactivate</Button>
      ))}
    </span>
  );
}
