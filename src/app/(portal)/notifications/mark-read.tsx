// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function MarkAllRead() {
  const router = useRouter();
  return <Button variant="secondary" onClick={async () => { const r = await fetch("/api/v1/notifications/read", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ all: true }) }); const j = await r.json(); if (j.ok) { toast.success("All notifications marked as read"); router.refresh(); } else toast.error("Could not update notifications."); }}><CheckCheck aria-hidden />Mark all as read</Button>;
}
