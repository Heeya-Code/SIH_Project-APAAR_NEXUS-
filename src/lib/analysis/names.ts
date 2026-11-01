// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Pure name-matching helpers (no database), shared by conflict detection and its tests.
function lev(a: string, b: string): number {
  if (a === b) return 0; const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}
export const nameSimilarity = (a: string, b: string) => { const x = a.toLowerCase().replace(/[^a-z]/g, ""), y = b.toLowerCase().replace(/[^a-z]/g, ""); const L = Math.max(x.length, y.length); return L ? 1 - lev(x, y) / L : 1; };

/** "Aarav Patil" vs "Aarav Suresh Patil", or "Aarav S. Patil": the same person with a middle name dropped or abbreviated. */
export function abbreviatedNameMatch(a: string, b: string): boolean {
  const tok = (n: string) => n.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  const [x, y] = [tok(a), tok(b)].sort((p, q) => p.length - q.length);
  if (x.length < 2 || x[0] !== y[0] || x[x.length - 1] !== y[y.length - 1]) return false;
  if (x.length === 2 && y.length >= 3) return true;
  if (x.length === y.length && x.length === 3) { const [m, n] = [x[1], y[1]]; return m !== n && ((m.length === 1 && n.startsWith(m)) || (n.length === 1 && m.startsWith(n))); }
  return false;
}
export const bestSimilarity = (a: string, b: string) => Math.max(nameSimilarity(a, b), abbreviatedNameMatch(a, b) ? 0.92 : 0);

