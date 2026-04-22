/**
 * One-time script: builds data/schools.db from ACARA Excel files.
 * Run with: npx tsx scripts/build-schools-db.ts
 */
import Database from "better-sqlite3";
import * as xlsx from "xlsx";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "schools.db");
const PROFILE_FILE = path.join(process.cwd(), "School_Profile_2025.xlsx");
const NAPLAN_FILE = path.join(process.cwd(), "NAPLAN_Results_2024.xlsx");

// ── helpers ──────────────────────────────────────────────────────────────────

function normalize(name: string): string {
  return (name ?? "")
    .toLowerCase()
    .replace(/\b(school|college|primary|secondary|combined|campus|the|st|saint|and|&)\b/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readSheet<T>(file: string, sheetIndex = 1): T[] {
  const wb = xlsx.readFile(file);
  const ws = wb.Sheets[wb.SheetNames[sheetIndex]];
  return xlsx.utils.sheet_to_json<T>(ws);
}

// ── create DB ─────────────────────────────────────────────────────────────────

if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE schools (
    acara_id              INTEGER PRIMARY KEY,
    school_name           TEXT NOT NULL,
    school_name_norm      TEXT,
    suburb                TEXT,
    suburb_norm           TEXT,
    state                 TEXT,
    postcode              TEXT,
    sector                TEXT,
    school_type           TEXT,
    year_range            TEXT,
    icsea                 INTEGER,
    icsea_percentile      INTEGER,
    total_enrolments      INTEGER,
    geolocation           TEXT,
    school_url            TEXT,
    naplan_reading        REAL,
    naplan_numeracy       REAL,
    naplan_writing        REAL,
    naplan_spelling       REAL,
    naplan_grammar        REAL,
    naplan_avg            REAL,
    naplan_vs_australia   TEXT,
    naplan_grade          TEXT
  );
  CREATE INDEX idx_suburb_norm ON schools (suburb_norm);
  CREATE INDEX idx_name_norm   ON schools (school_name_norm);
  CREATE INDEX idx_state       ON schools (state);
`);

// ── import School Profile ─────────────────────────────────────────────────────

interface ProfileRow {
  "ACARA SML ID": number;
  "School Name": string;
  Suburb: string;
  State: string;
  Postcode: string | number;
  "School Sector": string;
  "School Type": string;
  "Year Range": string;
  ICSEA: number;
  "ICSEA Percentile": number;
  "Total Enrolments": number;
  Geolocation: string;
  "School URL": string;
}

console.log("Importing School Profile...");
const profiles = readSheet<ProfileRow>(PROFILE_FILE);

const insertProfile = db.prepare(`
  INSERT INTO schools (acara_id, school_name, school_name_norm, suburb, suburb_norm, state, postcode,
    sector, school_type, year_range, icsea, icsea_percentile, total_enrolments, geolocation, school_url)
  VALUES (@acara_id, @school_name, @school_name_norm, @suburb, @suburb_norm, @state, @postcode,
    @sector, @school_type, @year_range, @icsea, @icsea_percentile, @total_enrolments, @geolocation, @school_url)
  ON CONFLICT(acara_id) DO NOTHING
`);

const insertMany = db.transaction((rows: ProfileRow[]) => {
  for (const r of rows) {
    insertProfile.run({
      acara_id:         r["ACARA SML ID"],
      school_name:      r["School Name"]?.trim() ?? "",
      school_name_norm: normalize(r["School Name"] ?? ""),
      suburb:           r["Suburb"]?.trim() ?? "",
      suburb_norm:      (r["Suburb"] ?? "").toLowerCase().trim(),
      state:            r["State"]?.trim() ?? "",
      postcode:         String(r["Postcode"] ?? "").trim(),
      sector:           r["School Sector"]?.trim() ?? "",
      school_type:      r["School Type"]?.trim() ?? "",
      year_range:       r["Year Range"]?.trim() ?? "",
      icsea:            r["ICSEA"] ?? null,
      icsea_percentile: r["ICSEA Percentile"] ?? null,
      total_enrolments: r["Total Enrolments"] ?? null,
      geolocation:      r["Geolocation"]?.trim() ?? "",
      school_url:       r["School URL"]?.trim() ?? "",
    });
  }
});

insertMany(profiles);
console.log(`  ✓ ${profiles.length} schools imported`);

// ── import NAPLAN (if file exists) ────────────────────────────────────────────

interface NaplanRow {
  "ACARA SML ID": number;
  Domain: string;
  "Student Grade Level": string;
  "Average NAPLAN Score": number | string;
  "All Australian Students Average NAPLAN Score": number | string;
  "Colour Comparison to all Australian Students": string;
}

if (fs.existsSync(NAPLAN_FILE)) {
  console.log("Importing NAPLAN results...");
  const naplanRows = readSheet<NaplanRow>(NAPLAN_FILE);

  // Group by acara_id — collect scores per domain, average across grade levels
  const bySchool = new Map<number, {
    reading: number[]; numeracy: number[]; writing: number[];
    spelling: number[]; grammar: number[]; comparison: string[]; grade: string[];
  }>();

  for (const r of naplanRows) {
    const id = r["ACARA SML ID"];
    if (!id) continue;
    const score = parseFloat(String(r["Average NAPLAN Score"]));
    if (isNaN(score)) continue;
    if (!bySchool.has(id)) bySchool.set(id, { reading: [], numeracy: [], writing: [], spelling: [], grammar: [], comparison: [], grade: [] });
    const s = bySchool.get(id)!;
    const domain = (r["Domain"] ?? "").toLowerCase();
    if (domain.includes("read"))    s.reading.push(score);
    if (domain.includes("numer"))   s.numeracy.push(score);
    if (domain.includes("writ"))    s.writing.push(score);
    if (domain.includes("spell"))   s.spelling.push(score);
    if (domain.includes("grammar")) s.grammar.push(score);
    const cmp = r["Colour Comparison to all Australian Students"];
    if (cmp) s.comparison.push(String(cmp));
    const grade = r["Student Grade Level"];
    if (grade) s.grade.push(String(grade));
  }

  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  const mode = (arr: string[]) => {
    if (!arr.length) return null;
    const freq = arr.reduce((m, v) => (m.set(v, (m.get(v) ?? 0) + 1), m), new Map<string, number>());
    return [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
  };

  const updateNaplan = db.prepare(`
    UPDATE schools SET
      naplan_reading = @reading, naplan_numeracy = @numeracy,
      naplan_writing = @writing, naplan_spelling = @spelling,
      naplan_grammar = @grammar, naplan_avg = @naplan_avg,
      naplan_vs_australia = @vs_australia, naplan_grade = @grade
    WHERE acara_id = @acara_id
  `);

  const updateMany = db.transaction((entries: [number, typeof bySchool extends Map<number, infer V> ? V : never][]) => {
    for (const [id, s] of entries) {
      const r = avg(s.reading), n = avg(s.numeracy), w = avg(s.writing), sp = avg(s.spelling), g = avg(s.grammar);
      const scores = [r, n, w, sp, g].filter((x): x is number => x !== null);
      const overall = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
      updateNaplan.run({
        acara_id:     id,
        reading:      r,
        numeracy:     n,
        writing:      w,
        spelling:     sp,
        grammar:      g,
        naplan_avg:   overall,
        vs_australia: mode(s.comparison),
        grade:        [...new Set(s.grade)].join(", "),
      });
    }
  });

  updateMany([...bySchool.entries()]);
  console.log(`  ✓ NAPLAN scores applied for ${bySchool.size} schools`);
} else {
  console.log("  ⚠ NAPLAN file not found — skipping (ICSEA ranking still works)");
}

// ── summary ───────────────────────────────────────────────────────────────────

const count = (db.prepare("SELECT COUNT(*) as n FROM schools").get() as { n: number }).n;
const withNaplan = (db.prepare("SELECT COUNT(*) as n FROM schools WHERE naplan_avg IS NOT NULL").get() as { n: number }).n;
console.log(`\nDatabase built at: ${DB_PATH}`);
console.log(`  Total schools : ${count}`);
console.log(`  With NAPLAN   : ${withNaplan}`);
db.close();
