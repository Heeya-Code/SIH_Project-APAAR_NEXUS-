// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// State/UT tile cartogram. Each state is one equal tile placed roughly where it sits on the map.
// Deliberately NOT a boundary map: equal tiles stop large, sparsely populated states from
// dominating, and avoid any dispute over drawn boundaries.
export type Tile = { code: string; name: string; col: number; row: number };

export const GRID_COLS = 10;
export const GRID_ROWS = 9;

export const TILES: Tile[] = [
  { code: "LA", name: "Ladakh", col: 3, row: 0 }, { code: "JK", name: "Jammu & Kashmir", col: 4, row: 0 },
  { code: "PB", name: "Punjab", col: 3, row: 1 }, { code: "HP", name: "Himachal Pradesh", col: 4, row: 1 },
  { code: "CH", name: "Chandigarh", col: 2, row: 2 }, { code: "HR", name: "Haryana", col: 3, row: 2 }, { code: "UK", name: "Uttarakhand", col: 4, row: 2 },
  { code: "SK", name: "Sikkim", col: 6, row: 2 }, { code: "AR", name: "Arunachal Pradesh", col: 8, row: 2 },
  { code: "RJ", name: "Rajasthan", col: 2, row: 3 }, { code: "DL", name: "Delhi", col: 3, row: 3 }, { code: "UP", name: "Uttar Pradesh", col: 4, row: 3 },
  { code: "BR", name: "Bihar", col: 5, row: 3 }, { code: "WB", name: "West Bengal", col: 6, row: 3 }, { code: "AS", name: "Assam", col: 8, row: 3 }, { code: "NL", name: "Nagaland", col: 9, row: 3 },
  { code: "GJ", name: "Gujarat", col: 1, row: 4 }, { code: "MP", name: "Madhya Pradesh", col: 3, row: 4 }, { code: "CG", name: "Chhattisgarh", col: 4, row: 4 },
  { code: "JH", name: "Jharkhand", col: 5, row: 4 }, { code: "ML", name: "Meghalaya", col: 8, row: 4 }, { code: "MN", name: "Manipur", col: 9, row: 4 },
  { code: "DD", name: "Dadra & Nagar Haveli and Daman & Diu", col: 1, row: 5 }, { code: "MH", name: "Maharashtra", col: 2, row: 5 }, { code: "TS", name: "Telangana", col: 3, row: 5 },
  { code: "OD", name: "Odisha", col: 5, row: 5 }, { code: "TR", name: "Tripura", col: 8, row: 5 }, { code: "MZ", name: "Mizoram", col: 9, row: 5 },
  { code: "GA", name: "Goa", col: 1, row: 6 }, { code: "KA", name: "Karnataka", col: 2, row: 6 }, { code: "AP", name: "Andhra Pradesh", col: 4, row: 6 },
  { code: "KL", name: "Kerala", col: 2, row: 7 }, { code: "TN", name: "Tamil Nadu", col: 3, row: 7 }, { code: "PY", name: "Puducherry", col: 4, row: 7 },
  { code: "LD", name: "Lakshadweep", col: 0, row: 8 }, { code: "AN", name: "Andaman & Nicobar Islands", col: 7, row: 8 },
];
export const STATE_NAME: Record<string, string> = Object.fromEntries(TILES.map((t) => [t.code, t.name]));
