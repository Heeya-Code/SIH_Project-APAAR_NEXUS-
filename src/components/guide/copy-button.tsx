// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return <Button type="button" size="sm" variant="secondary" onClick={() => { void navigator.clipboard.writeText(value).then(() => { setDone(true); toast.success("Copied"); setTimeout(() => setDone(false), 2000); }); }}>{done ? <Check aria-hidden /> : <Copy aria-hidden />}{done ? "Copied" : label}</Button>;
}
