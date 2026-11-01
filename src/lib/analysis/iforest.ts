// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Isolation Forest (Liu, Ting, Zhou 2008), implemented from the paper. Unsupervised: it ranks points by how few
// random splits it takes to isolate them. It is a SCREENING aid for human reviewers, never evidence of wrongdoing.
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
type Node = { leaf: true; size: number } | { leaf: false; f: number; v: number; l: Node; r: Node };
const H = (i: number) => Math.log(i) + 0.5772156649;
const c = (n: number) => (n <= 1 ? 0 : n === 2 ? 1 : 2 * H(n - 1) - (2 * (n - 1)) / n);

export function isolationForest(data: number[][], opts: { trees?: number; sample?: number; seed?: number } = {}): number[] {
  const n = data.length; if (n < 2) return data.map(() => 0.5);
  const trees = opts.trees ?? 300, psi = Math.min(opts.sample ?? 64, n), rnd = mulberry32(opts.seed ?? 1), maxDepth = Math.ceil(Math.log2(psi)), d = data[0].length;
  const build = (rows: number[][], depth: number): Node => {
    if (depth >= maxDepth || rows.length <= 1) return { leaf: true, size: rows.length };
    const f = Math.floor(rnd() * d); let lo = Infinity, hi = -Infinity; for (const r of rows) { if (r[f] < lo) lo = r[f]; if (r[f] > hi) hi = r[f]; }
    if (lo === hi) return { leaf: true, size: rows.length };
    const v = lo + rnd() * (hi - lo);
    return { leaf: false, f, v, l: build(rows.filter((r) => r[f] < v), depth + 1), r: build(rows.filter((r) => r[f] >= v), depth + 1) };
  };
  const path = (x: number[], node: Node, depth: number): number => (node.leaf ? depth + c(node.size) : path(x, x[node.f] < node.v ? node.l : node.r, depth + 1));
  const forest: Node[] = [];
  for (let t = 0; t < trees; t++) { const idx = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; } forest.push(build(idx.slice(0, psi).map((i) => data[i]), 0)); }
  return data.map((x) => 2 ** (-(forest.reduce((s, t) => s + path(x, t, 0), 0) / trees) / c(psi)));
}

/** Robust z-scores (median and MAD) used to EXPLAIN a score: which features sit far from the typical value. */
export function robustZ(data: number[][]): { median: number[]; mad: number[]; z: (x: number[]) => number[] } {
  const d = data[0].length, med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
  const median = Array.from({ length: d }, (_, j) => med(data.map((r) => r[j])));
  const mad = Array.from({ length: d }, (_, j) => Math.max(med(data.map((r) => Math.abs(r[j] - median[j]))) * 1.4826, 1e-6));
  return { median, mad, z: (x) => x.map((v, j) => (v - median[j]) / mad[j]) };
}
