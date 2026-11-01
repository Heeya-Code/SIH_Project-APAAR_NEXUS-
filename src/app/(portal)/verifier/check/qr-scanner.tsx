// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { Camera, CameraOff, ImageUp } from "lucide-react";
import { Button } from "@/components/ui/button";

function decode(source: CanvasImageSource, w: number, h: number): string | null {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true }); if (!ctx) return null;
  ctx.drawImage(source, 0, 0, w, h);
  return jsQR(ctx.getImageData(0, 0, w, h).data, w, h)?.data ?? null;
}

/** Camera scanning and QR-image upload. Decoding happens in the browser; only the decoded text is sent anywhere. */
export function QrScanner() {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null), stream = useRef<MediaStream | null>(null), timer = useRef<number | null>(null);
  const [on, setOn] = useState(false), [msg, setMsg] = useState<string | null>(null);
  const stop = () => { if (timer.current) cancelAnimationFrame(timer.current); stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; setOn(false); };
  useEffect(() => stop, []);
  const go = (text: string) => { stop(); router.push(`/verifier/check?code=${encodeURIComponent(text)}&via=qr`); };
  async function start() {
    setMsg(null);
    if (!navigator.mediaDevices?.getUserMedia) return setMsg("This browser cannot use the camera here. Upload a picture of the QR code, or type the code.");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }); stream.current = s; setOn(true);
      await new Promise((r) => setTimeout(r, 50)); if (!video.current) return; video.current.srcObject = s; await video.current.play();
      let last = 0;
      const tick = (t: number) => { if (!video.current || !stream.current) return; if (t - last > 150 && video.current.videoWidth) { last = t; const text = decode(video.current, video.current.videoWidth, video.current.videoHeight); if (text) return go(text); } timer.current = requestAnimationFrame(tick); };
      timer.current = requestAnimationFrame(tick);
    } catch { stop(); setMsg("The camera could not be opened. Allow camera access in your browser, upload a picture of the QR code, or type the code."); }
  }
  async function fromFile(f: File) {
    setMsg(null); const url = URL.createObjectURL(f);
    try { const img = new Image(); img.src = url; await img.decode(); const text = decode(img, img.naturalWidth, img.naturalHeight); if (text) go(text); else setMsg("No QR code was found in that picture. Try a clearer, closer picture, or type the code."); }
    catch { setMsg("That file could not be read as a picture."); } finally { URL.revokeObjectURL(url); }
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {on ? <Button variant="secondary" onClick={stop}><CameraOff aria-hidden />Stop camera</Button> : <Button onClick={start}><Camera aria-hidden />Scan with camera</Button>}
        <label className="inline-flex"><span className="sr-only">Upload a picture of the QR code</span><input type="file" accept="image/*" className="peer sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void fromFile(f); e.target.value = ""; }} /><span role="button" className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-control border border-line-strong bg-white px-4 text-sm font-medium text-navy-900 shadow-card hover:bg-paper peer-focus-visible:outline-2 peer-focus-visible:outline-teal-500"><ImageUp className="size-4" aria-hidden />Upload a QR picture</span></label>
      </div>
      {on && <video ref={video} muted playsInline aria-label="Camera view for scanning a QR code" className="aspect-video w-full max-w-md rounded-card border border-line bg-navy-950 object-cover" />}
      {msg && <p role="alert" className="rounded-control bg-amber-100 px-3 py-2 text-sm text-amber-700">{msg}</p>}
    </div>
  );
}
