/**
 * One-time script: imports School Profile 2025.xlsx into Supabase `schools` table.
 * Run with: npx tsx scripts/import-schools.ts
 */
import * as xlsx from "xlsx";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // needs service role to bypass RLS
);

const FILE = path.join(process.cwd(), "School_Profile_2025.xlsx");
const SHEET = "SchoolProfile 2025";
const BATCH = 200;

interface RawRow {
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

async function main() {
  console.log("Reading Excel file...");
  const wb = xlsx.readFile(FILE);
  const ws = wb.Sheets[SHEET];
  const rows = xlsx.utils.sheet_to_json<RawRow>(ws);
  console.log(`Found ${rows.length} schools.`);

  const records = rows.map(r => ({
    acara_id: r["ACARA SML ID"],
    school_name: r["School Name"]?.trim() ?? "",
    school_name_normalized: normalize(r["School Name"] ?? ""),
    suburb: r["Suburb"]?.trim() ?? "",
    suburb_normalized: (r["Suburb"] ?? "").toLowerCase().trim(),
    state: r["State"]?.trim() ?? "",
    postcode: String(r["Postcode"] ?? "").trim(),
    sector: r["School Sector"]?.trim() ?? "",
    school_type: r["School Type"]?.trim() ?? "",
    year_range: r["Year Range"]?.trim() ?? "",
    icsea: r["ICSEA"] ?? null,
    icsea_percentile: r["ICSEA Percentile"] ?? null,
    total_enrolments: r["Total Enrolments"] ?? null,
    geolocation: r["Geolocation"]?.trim() ?? "",
    school_url: r["School URL"]?.trim() ?? "",
  })).filter(r => r.school_name && r.suburb);

  console.log(`Importing ${records.length} records in batches of ${BATCH}...`);

  let inserted = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const { error } = await supabase
      .from("schools")
      .upsert(batch, { onConflict: "acara_id" });
    if (error) {
      console.error(`Batch ${i / BATCH + 1} error:`, error.message);
    } else {
      inserted += batch.length;
      process.stdout.write(`\r${inserted}/${records.length} inserted...`);
    }
  }

  console.log(`\nDone! ${inserted} schools imported.`);
}

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(school|college|primary|secondary|combined|campus|the|st|saint|and|&)\b/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

main().catch(console.error);
