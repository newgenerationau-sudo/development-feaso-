import Database from "better-sqlite3";
import path from "path";

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    const dbPath = path.join(process.cwd(), "data", "schools.db");
    _db = new Database(dbPath, { readonly: true });
  }
  return _db;
}

export interface SchoolRecord {
  acara_id: number;
  school_name: string;
  suburb: string;
  state: string;
  sector: string;
  school_type: string;
  year_range: string;
  icsea: number | null;
  icsea_percentile: number | null;
  total_enrolments: number | null;
  naplan_reading: number | null;
  naplan_numeracy: number | null;
  naplan_avg: number | null;
  naplan_vs_australia: string | null;
  naplan_grade: string | null;
  school_url: string | null;
}

function normalize(name: string): string {
  return (name ?? "")
    .toLowerCase()
    .replace(/\b(school|college|primary|secondary|combined|campus|the|st|saint|and|&)\b/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Match a Google Places school name to the ACARA database
// Strategy: exact suburb match + normalized name similarity
export function lookupSchool(name: string, suburb: string, state: string): SchoolRecord | null {
  const db = getDb();
  const suburbNorm = suburb.toLowerCase().trim();
  const nameNorm = normalize(name);

  // 1. Exact suburb + normalized name prefix match
  const candidates = db.prepare(`
    SELECT * FROM schools
    WHERE suburb_norm = ? AND state = ?
    LIMIT 20
  `).all(suburbNorm, state) as SchoolRecord[];

  if (candidates.length > 0) {
    const scored = candidates.map(c => ({
      record: c,
      score: similarity(nameNorm, normalize(c.school_name)),
    })).sort((a, b) => b.score - a.score);

    if (scored[0].score > 0.35) return scored[0].record;
  }

  // 2. Broaden: nearby suburbs — try name match across state
  const wider = db.prepare(`
    SELECT * FROM schools
    WHERE school_name_norm LIKE ? AND state = ?
    LIMIT 10
  `).all(`%${nameNorm.split(" ")[0]}%`, state) as SchoolRecord[];

  if (wider.length > 0) {
    const scored = wider.map(c => ({
      record: c,
      score: similarity(nameNorm, normalize(c.school_name)),
    })).sort((a, b) => b.score - a.score);

    if (scored[0].score > 0.4) return scored[0].record;
  }

  return null;
}

// Simple token-overlap similarity (0–1)
function similarity(a: string, b: string): number {
  const ta = new Set(a.split(" ").filter(Boolean));
  const tb = new Set(b.split(" ").filter(Boolean));
  const intersection = [...ta].filter(t => tb.has(t)).length;
  const union = new Set([...ta, ...tb]).size;
  return union === 0 ? 0 : intersection / union;
}

export function icseaLabel(percentile: number | null): string {
  if (percentile === null) return "";
  if (percentile >= 95) return "Top 5%";
  if (percentile >= 90) return "Top 10%";
  if (percentile >= 75) return "Top 25%";
  if (percentile >= 50) return "Above average";
  if (percentile >= 25) return "Average";
  return "Below average";
}
