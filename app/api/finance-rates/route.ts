import { NextResponse } from "next/server";
import https from "https";

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { headers: { "User-Agent": "DevelopmentFeaso/1.0" } }, res => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        resolve(httpsGet(res.headers.location)); return;
      }
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error("timeout")); });
    req.end();
  });
}

let cache: Record<string, unknown> | null = null;
let cacheAt = 0;

// Parse an RBA CSV and return the last numeric value for a given series ID
function parseRBACSV(csv: string, seriesId: string): { value: number; period: string } | null {
  const lines = csv.split("\n");
  let inData = false;
  let lastValue: number | null = null;
  let lastPeriod = "";

  // Find the series — RBA CSVs have a "Series ID" row to identify columns
  let targetCol = -1;
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const cells = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const idx = cells.findIndex(c => c.toUpperCase() === seriesId.toUpperCase());
    if (idx !== -1) { targetCol = idx; break; }
  }
  if (targetCol === -1) return null;

  for (const line of lines) {
    const cells = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    if (!inData) {
      // Data rows start after a line beginning with a date-like value
      if (/^\d{4}(-\d{2})?/.test(cells[0])) inData = true;
    }
    if (inData && cells[targetCol] !== undefined) {
      const val = parseFloat(cells[targetCol]);
      if (!isNaN(val) && val > 0) { lastValue = val; lastPeriod = cells[0]; }
    }
  }
  return lastValue !== null ? { value: lastValue, period: lastPeriod } : null;
}

async function fetchRates() {
  if (cache && Date.now() - cacheAt < 21600000) return cache; // 6h cache

  // Fetch RBA Cash Rate (A2) and Major Bank Lending Rates (F5) in parallel
  const [a2, f5] = await Promise.allSettled([
    httpsGet("https://www.rba.gov.au/statistics/tables/csv/a02hist.csv"),
    httpsGet("https://www.rba.gov.au/statistics/tables/csv/f05hist.csv"),
  ]);

  const a2csv = a2.status === "fulfilled" ? a2.value : "";
  const f5csv = f5.status === "fulfilled" ? f5.value : "";

  // RBA Cash Rate Target — series ARBAMPCNCRT or find last value in A2
  let cashRate = 4.10; // fallback
  let cashRatePeriod = "";
  if (a2csv) {
    // A2 has only one data series — just find the last numeric row
    const lines = a2csv.split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const cells = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      if (/^\d{4}/.test(cells[0])) {
        const val = parseFloat(cells[1] ?? "");
        if (!isNaN(val) && val > 0 && val < 30) {
          cashRate = val; cashRatePeriod = cells[0]; break;
        }
      }
    }
  }

  // F5 series IDs for major bank home loan rates
  // FILRHLBVS = Standard Variable Housing Loan Rate (owner-occupier)
  // FILRHLBVSI = Standard Variable Housing Loan Rate (investor)
  // FILRHLF1 = Fixed 1-yr, FILRHLF3 = Fixed 3-yr
  let varOwner    = parseRBACSV(f5csv, "FILRHLBVS");
  let varInvestor = parseRBACSV(f5csv, "FILRHLBVSI");
  let fixed1yr    = parseRBACSV(f5csv, "FILRHLF1");
  let fixed3yr    = parseRBACSV(f5csv, "FILRHLF3");

  // Fallback: estimate from cash rate + typical big-4 margin if RBA F5 unavailable
  const v  = varOwner?.value    ?? Math.round((cashRate + 2.14) * 100) / 100;
  const vi = varInvestor?.value ?? Math.round((cashRate + 2.54) * 100) / 100;
  const f1 = fixed1yr?.value    ?? Math.round((cashRate + 1.90) * 100) / 100;
  const f3 = fixed3yr?.value    ?? Math.round((cashRate + 2.00) * 100) / 100;
  const f2 = Math.round(((f1 + f3) / 2) * 100) / 100; // interpolate 2-yr

  // Big 4 indicative variable rate ranges (owner-occupier, standard variable)
  // Derived from cash rate + typical published margins; update when banks announce changes
  const big4: { name: string; lo: number; hi: number }[] = [
    { name: "CBA",     lo: Math.round((cashRate + 1.55) * 100) / 100, hi: Math.round((cashRate + 2.05) * 100) / 100 },
    { name: "Westpac", lo: Math.round((cashRate + 1.50) * 100) / 100, hi: Math.round((cashRate + 2.10) * 100) / 100 },
    { name: "NAB",     lo: Math.round((cashRate + 1.45) * 100) / 100, hi: Math.round((cashRate + 2.00) * 100) / 100 },
    { name: "ANZ",     lo: Math.round((cashRate + 1.40) * 100) / 100, hi: Math.round((cashRate + 1.95) * 100) / 100 },
  ];

  const result = {
    rba: { rate: cashRate, period: cashRatePeriod },
    banks: [
      { bank: "RBA Cash Rate",  type: "Central Bank",      rate: cashRate },
      { bank: "Big 4 Variable", type: "Owner Occupier",    rate: v  },
      { bank: "Big 4 Variable", type: "Investor",          rate: vi },
      { bank: "Big 4 Fixed",    type: "1-Year Fixed",      rate: f1 },
      { bank: "Big 4 Fixed",    type: "2-Year Fixed",      rate: f2 },
      { bank: "Big 4 Fixed",    type: "3-Year Fixed",      rate: f3 },
    ],
    big4,
    source: "Reserve Bank of Australia",
    asOf: cashRatePeriod || new Date().toISOString().slice(0, 7),
  };

  cache = result;
  cacheAt = Date.now();
  return result;
}

export async function GET() {
  try {
    const data = await fetchRates();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Unable to fetch rates" }, { status: 500 });
  }
}
