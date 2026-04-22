import { NextRequest } from "next/server";
import https from "https";
import { lookupSchool, icseaLabel } from "@/lib/schools-db";
import { lookupCatchment } from "@/lib/school-zones";

const GMAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function fmtDist(m: number) {
  return m < 1000 ? `${m}m` : `${(m/1000).toFixed(1)}km`;
}

function httpsGet(url: string, extraHeaders?: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { headers: { "User-Agent": "DevelopmentFeaso/1.0", ...extraHeaders } }, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error("timeout")); });
    req.end();
  });
}

async function overpassQuery(lat: number, lng: number, query: string, radius = 1000): Promise<{ elements: { lat?: number; lon?: number; tags?: Record<string,string> }[] }> {
  const q = `[out:json][timeout:15];(${query}(around:${radius},${lat},${lng}););out body;`;
  const endpoints = [
    `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`,
    `https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(q)}`,
  ];
  for (const url of endpoints) {
    try {
      const text = await httpsGet(url);
      return JSON.parse(text);
    } catch { continue; }
  }
  return { elements: [] };
}

async function fetchTramStops(lat: number, lng: number, radius = 1200): Promise<{ elements: { lat?: number; lon?: number; tags?: Record<string,string> }[] }> {
  // Melbourne tram stops use several OSM tagging styles — query all of them
  const q = `[out:json][timeout:15];(node["railway"="tram_stop"](around:${radius},${lat},${lng});node["public_transport"="stop_position"]["tram"="yes"](around:${radius},${lat},${lng});node["public_transport"="platform"]["tram"="yes"](around:${radius},${lat},${lng}););out body;`;
  const endpoints = [
    `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`,
    `https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(q)}`,
  ];
  for (const url of endpoints) {
    try { return JSON.parse(await httpsGet(url)); } catch { continue; }
  }
  return { elements: [] };
}

async function overpassRelations(lat: number, lng: number, query: string, radius = 1200): Promise<{ elements: { tags?: Record<string,string> }[] }> {
  const q = `[out:json][timeout:15];(${query}(around:${radius},${lat},${lng}););out tags;`;
  const endpoints = [
    `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`,
    `https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(q)}`,
  ];
  for (const url of endpoints) {
    try {
      const text = await httpsGet(url);
      return JSON.parse(text);
    } catch { continue; }
  }
  return { elements: [] };
}

async function nearbyPlaces(lat: number, lng: number, type: string, radius: number): Promise<{ name: string; lat: number; lng: number }[]> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${GMAPS_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return (data.results ?? []).slice(0, 15).map((r: { name: string; geometry: { location: { lat: number; lng: number } } }) => ({
      name: r.name,
      lat: r.geometry.location.lat,
      lng: r.geometry.location.lng,
    }));
  } catch { return []; }
}

function toScore(count: number, thresholds: number[]): number {
  if (count >= thresholds[4]) return 10;
  if (count >= thresholds[3]) return 8;
  if (count >= thresholds[2]) return 6;
  if (count >= thresholds[1]) return 4;
  if (count >= thresholds[0]) return 2;
  return 1;
}

function detectCity(lat: number, lng: number): { code: string; name: string } {
  if (lat >= -38.5 && lat <= -37.3 && lng >= 144.4 && lng <= 146.0) return { code: "2GMEL", name: "Melbourne" };
  if (lat >= -34.3 && lat <= -33.4 && lng >= 150.4 && lng <= 151.6) return { code: "1GSYD", name: "Sydney" };
  if (lat >= -27.8 && lat <= -27.0 && lng >= 152.6 && lng <= 153.3) return { code: "3GBRI", name: "Brisbane" };
  if (lat >= -35.2 && lat <= -34.5 && lng >= 138.4 && lng <= 138.8) return { code: "4GADE", name: "Adelaide" };
  if (lat >= -32.3 && lat <= -31.5 && lng >= 115.6 && lng <= 116.2) return { code: "5GPER", name: "Perth" };
  if (lat >= -43.0 && lat <= -42.7 && lng >= 147.1 && lng <= 147.5) return { code: "6GHOB", name: "Hobart" };
  return { code: "2GMEL", name: "Australia" };
}

function detectState(lat: number, lng: number): { code: string; name: string } {
  if (lat >= -39.2 && lat <= -33.9 && lng >= 140.9 && lng <= 149.9) return { code: "2", name: "Victoria" };
  if (lat >= -37.5 && lat <= -28.2 && lng >= 141.0 && lng <= 153.6) return { code: "1", name: "New South Wales" };
  if (lat >= -29.2 && lat <= -10.6 && lng >= 137.9 && lng <= 153.6) return { code: "3", name: "Queensland" };
  if (lat >= -38.1 && lat <= -25.9 && lng >= 129.0 && lng <= 141.0) return { code: "4", name: "South Australia" };
  if (lat >= -35.1 && lat <= -13.7 && lng >= 113.2 && lng <= 129.0) return { code: "5", name: "Western Australia" };
  if (lat >= -43.6 && lat <= -39.5 && lng >= 143.8 && lng <= 148.5) return { code: "6", name: "Tasmania" };
  if (lat >= -26.0 && lat <= -10.9 && lng >= 129.0 && lng <= 138.0) return { code: "7", name: "Northern Territory" };
  if (lat >= -35.9 && lat <= -35.1 && lng >= 148.8 && lng <= 149.4) return { code: "8", name: "ACT" };
  return { code: "2", name: "Victoria" };
}

async function fetchABSGrowth(cityCode: string): Promise<{
  fiveYr: number | null; latestPeriod: string; annualised5: number | null;
}> {
  try {
    const url = `https://data.api.abs.gov.au/rest/data/ABS,RPPI,1.0.0/1.3.${cityCode}.Q?detail=dataonly&startPeriod=2015-Q1`;
    const text = await httpsGet(url, { "Accept": "application/vnd.sdmx.data+json" });
    const json = JSON.parse(text);
    const dataSets = json?.data?.dataSets;
    const structures = json?.data?.structures;
    if (!dataSets || !structures) return { fiveYr: null, latestPeriod: "", annualised5: null };

    const obs: Record<string, number[]> = dataSets[0]?.series?.["0:0:0:0"]?.observations ?? {};
    const periods: { id: string }[] = structures[0]?.dimensions?.observation?.[0]?.values ?? [];

    const series = Object.entries(obs)
      .map(([k, v]) => ({ period: periods[parseInt(k)]?.id ?? "", value: v[0] }))
      .filter(s => s.period)
      .sort((a, b) => a.period.localeCompare(b.period));

    if (series.length < 4) return { fiveYr: null, latestPeriod: "", annualised5: null };

    const last = series[series.length - 1];
    const [lastYrStr, qStr] = last.period.split("-Q");
    const lastYr = parseInt(lastYrStr);

    const target5 = `${lastYr - 5}-Q${qStr}`;
    const before5 = series.filter(s => s.period <= target5);
    const v5 = before5.length ? before5[before5.length - 1].value : null;

    const fiveYr = v5 ? Math.round(((last.value - v5) / v5) * 100) : null;
    const annualised5 = fiveYr !== null
      ? Math.round((Math.pow(1 + fiveYr / 100, 1 / 5) - 1) * 100 * 10) / 10
      : null;

    return { fiveYr, latestPeriod: last.period, annualised5 };
  } catch {
    return { fiveYr: null, latestPeriod: "", annualised5: null };
  }
}

function interpretZoneCode(code: string, desc: string): { label: string; score: number; suggestion: string } {
  const upper = code.toUpperCase();
  if (upper.startsWith("RGZ")) return { label: desc || "Residential Growth Zone", score: 9, suggestion: "Residential Growth Zone — high-density development supported. Apartments and multi-storey residential are typically viable. Consult a registered architect for design guidance." };
  if (upper.startsWith("GRZ")) return { label: desc || "General Residential Zone", score: 7, suggestion: "General Residential Zone — medium density development possible. Townhouses, units and dual occupancy are typically supported subject to lot size and council requirements." };
  if (upper.startsWith("NRZ")) return { label: desc || "Neighbourhood Residential Zone", score: 5, suggestion: "Neighbourhood Residential Zone — low-density residential character. Single dwellings and duplexes are most appropriate. Multi-unit development is generally restricted." };
  if (upper.startsWith("LDRZ")) return { label: desc || "Low Density Residential Zone", score: 3, suggestion: "Low Density Residential Zone — typically single dwellings on large lots. Subdivision and multi-unit development are heavily restricted." };
  if (upper.startsWith("MUZ")) return { label: desc || "Mixed Use Zone", score: 10, suggestion: "Mixed Use Zone — the most flexible zone. Commercial ground floor with residential above, apartments and mixed developments are all typically supported." };
  if (upper.startsWith("TZ")) return { label: desc || "Township Zone", score: 6, suggestion: "Township Zone — allows a range of residential and small-scale commercial uses. Medium density development possible subject to council requirements." };
  if (upper.startsWith("UGZ")) return { label: desc || "Urban Growth Zone", score: 6, suggestion: "Urban Growth Zone — land earmarked for future urban development. Potential depends on the Precinct Structure Plan for the area." };
  if (upper.startsWith("CDZ")) return { label: desc || "Comprehensive Development Zone", score: 8, suggestion: "Comprehensive Development Zone — large-scale integrated development intended. Check the specific Development Plan for permitted uses." };
  if (upper.match(/^[BC][0-9]/)) return { label: desc || "Commercial Zone", score: 8, suggestion: "Commercial Zone — primarily retail and commercial uses. Residential above ground floor is often permitted. Check local planning scheme for requirements." };
  if (upper.startsWith("IN")) return { label: desc || "Industrial Zone", score: 4, suggestion: "Industrial Zone — residential development is generally not permitted. Best suited for manufacturing, warehousing or light industry." };
  if (upper.startsWith("PPRZ") || upper.startsWith("PUZ") || upper.startsWith("SUZ")) return { label: desc || "Public / Special Use Zone", score: 3, suggestion: "Public or Special Use Zone — reserved for public purposes. Private residential or commercial development is generally not permitted." };
  if (upper.startsWith("RFZ") || upper.startsWith("RCZ") || upper.startsWith("RUZ")) return { label: desc || "Rural Zone", score: 2, suggestion: "Rural Zone — development is heavily restricted. Typically limited to agricultural use and single dwellings on large lots." };
  return { label: desc || code, score: 5, suggestion: `Zone: ${code}. Verify development potential with your local council or planning authority.` };
}

async function fetchVicmapZoning(lat: number, lng: number, stateName: string): Promise<{
  label: string; code: string; score: number; suggestion: string; source: string;
}> {
  const isVIC = stateName === "Victoria";
  const fallback = {
    label: isVIC ? "Zoning data unavailable" : `${stateName} zoning coming soon`,
    code: "",
    score: 5,
    suggestion: isVIC
      ? "Could not retrieve zoning data. Verify with your local council or planning authority."
      : `Detailed zoning analysis for ${stateName} is coming soon. Verify zoning with your local council or planning authority.`,
    source: "",
  };
  async function queryVicmap(geometry: object, geometryType: string): Promise<{ code: string; desc: string; lga: string } | null> {
    const geom = encodeURIComponent(JSON.stringify(geometry));
    const url = `https://services-ap1.arcgis.com/P744lA0wf4LlBZ84/ArcGIS/rest/services/Vicmap_Planning/FeatureServer/3/query?geometry=${geom}&geometryType=${geometryType}&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&f=json`;
    const text = await httpsGet(url);
    const json = JSON.parse(text);
    const features = json?.features ?? [];
    if (!features.length) return null;
    const attrs = features[0].attributes ?? {};
    const code: string = attrs.ZONE_CODE ?? attrs.zone_code ?? attrs.ZONE ?? attrs.zone ?? "";
    const desc: string = attrs.ZONE_DESC ?? attrs.zone_desc ?? attrs.ZONE_DESCRIPTION ?? attrs.zone_description ?? "";
    const lga: string = attrs.LGA_NAME ?? attrs.lga_name ?? attrs.LGA ?? attrs.lga ?? "";
    return code ? { code, desc, lga } : null;
  }
  try {
    let result = await queryVicmap({ x: lng, y: lat }, "esriGeometryPoint");
    if (!result) {
      const d = 0.0004;
      result = await queryVicmap(
        { xmin: lng - d, ymin: lat - d, xmax: lng + d, ymax: lat + d },
        "esriGeometryEnvelope"
      );
    }
    if (!result) return fallback;
    const { label, score, suggestion } = interpretZoneCode(result.code, result.desc);
    return { label, code: result.code, score, suggestion, source: result.lga ? `Vicmap Planning · ${result.lga}` : "Vicmap Planning (DEECA)" };
  } catch {
    return fallback;
  }
}

export async function GET(req: NextRequest) {
  const lat    = parseFloat(req.nextUrl.searchParams.get("lat") ?? "0");
  const lng    = parseFloat(req.nextUrl.searchParams.get("lng") ?? "0");
  const suburb = req.nextUrl.searchParams.get("suburb") ?? "";
  if (!lat || !lng) {
    return new Response(JSON.stringify({ error: "Missing lat/lng" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const city  = detectCity(lat, lng);
  const state = detectState(lat, lng);
  const encoder = new TextEncoder();

  // Start ALL external fetches immediately — they run in parallel
  const schoolP    = nearbyPlaces(lat, lng, "school", 2000);
  const univP      = nearbyPlaces(lat, lng, "university", 3000);
  const trainP     = nearbyPlaces(lat, lng, "train_station", 2000);
  const superP     = nearbyPlaces(lat, lng, "supermarket", 1500);
  const mallP      = nearbyPlaces(lat, lng, "shopping_mall", 3000);
  const parkP      = nearbyPlaces(lat, lng, "park", 1500);
  const cafeP      = nearbyPlaces(lat, lng, "cafe", 1000);
  const tramP      = fetchTramStops(lat, lng, 1200);
  const busP       = overpassQuery(lat, lng, `node["highway"="bus_stop"]`, 600);
  const tramRoutesP= overpassRelations(lat, lng, `relation["route"="tram"]`, 1200);
  const hospitalP  = nearbyPlaces(lat, lng, "hospital", 3000);
  const restaurantP= nearbyPlaces(lat, lng, "restaurant", 1000);
  const growthP    = fetchABSGrowth(city.code);
  const zoningP    = fetchVicmapZoning(lat, lng, state.name);

  const stream = new ReadableStream({
    async start(controller) {
      const send = (key: string, data: object) => {
        try { controller.enqueue(encoder.encode(JSON.stringify({ key, data }) + "\n")); } catch {}
      };

      await Promise.all([
        // School — depends on school + university places
        Promise.all([schoolP, univP]).then(([schoolPlaces, univPlaces]) => {
          const stateCode = state.name === "Victoria" ? "VIC"
            : state.name === "New South Wales" ? "NSW"
            : state.name === "Queensland" ? "QLD"
            : state.name === "South Australia" ? "SA"
            : state.name === "Western Australia" ? "WA"
            : state.name === "Tasmania" ? "TAS"
            : state.name === "Northern Territory" ? "NT"
            : "ACT";

          // Filter: only keep results that are genuine primary/secondary schools or unis
          const SCHOOL_KEYWORDS = /\b(school|college|grammar|academy|institute|montessori|kindergarten|preschool|pre-school|campus|education|girls|boys|ladies|christian|anglican|catholic|lutheran|jewish|islamic)\b/i;
          const EXCLUDE_KEYWORDS = /\b(swimming|music lesson|driving|gym|sport|dance|martial|tutorial|coaching|childcare|child care)\b/i;

          function isRealSchool(name: string): boolean {
            const n = name.toLowerCase();
            if (EXCLUDE_KEYWORDS.test(n) && !SCHOOL_KEYWORDS.test(n)) return false;
            return SCHOOL_KEYWORDS.test(n) || lookupSchool(name, suburb, stateCode) !== null;
          }

          const schoolsWithDist = schoolPlaces
            .filter(s => isRealSchool(s.name))
            .map(s => ({ ...s, dist: haversine(lat, lng, s.lat, s.lng), isUni: false }))
            .sort((a, b) => a.dist - b.dist)
            .filter((s, i, arr) => arr.findIndex(x => x.name === s.name) === i);

          const unisWithDist = univPlaces
            .map(u => ({ ...u, dist: haversine(lat, lng, u.lat, u.lng), isUni: true }))
            .sort((a, b) => a.dist - b.dist);

          // VIC school catchment zones (point-in-polygon from DET GeoJSON)
          let catchmentPrimary: { name: string; yearLevel: string } | null = null;
          let catchmentSecondary: { name: string; yearLevel: string } | null = null;
          if (stateCode === "VIC") {
            try {
              const zones = lookupCatchment(lat, lng);
              if (zones.primary) catchmentPrimary = { name: zones.primary.name, yearLevel: zones.primary.yearLevel };
              if (zones.secondary) catchmentSecondary = { name: zones.secondary.name, yearLevel: zones.secondary.yearLevel };
            } catch { /* zone lookup failed */ }
          }

          // Build structured school data for rich display
          const schoolData = [];
          for (const s of schoolsWithDist.slice(0, 5)) {
            try {
              const rec = lookupSchool(s.name, suburb, stateCode);
              schoolData.push({
                name: s.name,
                dist: s.dist,
                distLabel: fmtDist(s.dist),
                isUni: false,
                sector:           rec?.sector ?? null,
                schoolType:       rec?.school_type ?? null,
                yearRange:        rec?.year_range ?? null,
                icsea:            rec?.icsea ?? null,
                icseaPercentile:  rec?.icsea_percentile ?? null,
                icseaLabel:       icseaLabel(rec?.icsea_percentile ?? null) || null,
                naplanVsAus:      rec?.naplan_vs_australia ?? null,
                naplanAvg:        rec?.naplan_avg ?? null,
                totalEnrolments:  rec?.total_enrolments ?? null,
                url:              rec?.school_url ?? null,
              });
            } catch {
              schoolData.push({ name: s.name, dist: s.dist, distLabel: fmtDist(s.dist), isUni: false });
            }
          }
          for (const u of unisWithDist.slice(0, 2)) {
            schoolData.push({ name: u.name, dist: u.dist, distLabel: fmtDist(u.dist), isUni: true });
          }

          const allCount = schoolsWithDist.length;
          const nearest = schoolsWithDist[0];
          const detail = nearest
            ? `${nearest.name} · ${fmtDist(nearest.dist)} away · ${allCount} school${allCount !== 1 ? "s" : ""} within 2km`
            : "No schools nearby";

          send("school", {
            score: toScore(allCount, [1, 2, 4, 6, 10]),
            count: allCount,
            detail,
            items: schoolData.map(s => s.isUni
              ? `🎓 ${s.name} (${s.distLabel})`
              : `🏫 ${s.name} (${s.distLabel})${s.icseaLabel ? ` · ${s.icseaLabel}` : ""}${s.sector && s.sector !== "Government" ? ` · ${s.sector}` : ""}${s.yearRange ? ` · ${s.yearRange}` : ""}`
            ),
            schoolData,
            catchmentPrimary,
            catchmentSecondary,
          });
        }).catch(() => send("school", { score: 5, count: 0, detail: "Data unavailable", items: [] })),

        // Transport — depends on train + tram + bus + tramRoutes
        Promise.all([trainP, tramP, busP, tramRoutesP]).then(([trainPlaces, tramData, busData, tramRoutes]) => {
          const trains = trainPlaces.map(t => ({ name: t.name, dist: haversine(lat, lng, t.lat, t.lng) })).sort((a, b) => a.dist - b.dist);
          const trams  = tramData.elements.filter(e => e.lat && e.lon).map(e => ({ name: e.tags?.name ?? "Tram Stop", dist: haversine(lat, lng, e.lat!, e.lon!) })).sort((a, b) => a.dist - b.dist);
          const buses  = busData.elements.filter(e => e.lat && e.lon).map(e => ({ name: e.tags?.name ?? "Bus Stop", dist: haversine(lat, lng, e.lat!, e.lon!) })).sort((a, b) => a.dist - b.dist);
          const routeNums = [...new Set(tramRoutes.elements.map(e => e.tags?.ref ?? e.tags?.name ?? "").filter(Boolean))].slice(0, 8).join(", ");
          const tramDetail = trams.length > 0 ? `Nearest tram stop ${fmtDist(trams[0].dist)} away${routeNums ? ` · Route${routeNums.includes(",") ? "s" : ""} ${routeNums}` : ""}` : "No tram stops nearby";
          const busDetail  = buses.length > 0 ? `${buses.length} bus stop${buses.length !== 1 ? "s" : ""} within 600m · nearest ${fmtDist(buses[0].dist)}` : "No bus stops nearby";
          const trainDetail= trains.length > 0 ? `${trains[0].name} · ${fmtDist(trains[0].dist)}` : "No train station nearby";
          const count = trains.length * 3 + trams.length * 2 + buses.length;
          send("transport", {
            score: toScore(count, [1, 3, 6, 10, 15]),
            count,
            detail: tramDetail,
            items: [trainDetail, tramDetail, busDetail],
          });
        }).catch(() => send("transport", { score: 5, count: 0, detail: "Data unavailable", items: [] })),

        // Shopping — depends on supermarket + mall + restaurant
        Promise.all([superP, mallP, restaurantP]).then(([supermarkets, malls, restaurants]) => {
          const superDist = supermarkets.map(s => ({ name: s.name, dist: haversine(lat, lng, s.lat, s.lng) })).sort((a, b) => a.dist - b.dist);
          const mallDist  = malls.map(s => ({ name: s.name, dist: haversine(lat, lng, s.lat, s.lng) })).sort((a, b) => a.dist - b.dist);
          const nearest   = [...superDist, ...mallDist].sort((a, b) => a.dist - b.dist)[0];
          const detail = nearest ? `${nearest.name} · ${fmtDist(nearest.dist)} · ${superDist.length} supermarket${superDist.length !== 1 ? "s" : ""}, ${mallDist.length} shopping centre${mallDist.length !== 1 ? "s" : ""} nearby` : "No supermarkets nearby";
          const count = superDist.length + mallDist.length + restaurants.length;
          send("shopping", {
            score: toScore(count, [2, 4, 7, 10, 15]),
            count,
            detail,
            items: [
              ...mallDist.slice(0, 2).map(s => `🏬 ${s.name} (${fmtDist(s.dist)})`),
              ...superDist.slice(0, 2).map(s => `🛒 ${s.name} (${fmtDist(s.dist)})`),
            ],
          });
        }).catch(() => send("shopping", { score: 5, count: 0, detail: "Data unavailable", items: [] })),

        // Lifestyle — depends on park + cafe + hospital + supermarket + restaurant
        Promise.all([parkP, cafeP, hospitalP, superP, restaurantP]).then(([parks, cafes, hospitals, supermarkets, restaurants]) => {
          const parkDist  = parks.map(p => ({ name: p.name, dist: haversine(lat, lng, p.lat, p.lng) })).sort((a, b) => a.dist - b.dist);
          const superDist = supermarkets.map(s => ({ name: s.name, dist: haversine(lat, lng, s.lat, s.lng) })).sort((a, b) => a.dist - b.dist);
          const detail = parkDist.length > 0 ? `${parkDist[0].name} · ${fmtDist(parkDist[0].dist)} away · ${parkDist.length} park${parkDist.length !== 1 ? "s" : ""} within 1.5km` : "No parks nearby";
          const count = parkDist.length + cafes.length + restaurants.length + hospitals.length;
          send("lifestyle", {
            score: toScore(count, [3, 6, 10, 15, 20]),
            count,
            detail,
            items: [
              ...parkDist.slice(0, 2).map(p => `🌳 ${p.name} (${fmtDist(p.dist)})`),
              ...cafes.slice(0, 2).map(c => { const d = haversine(lat, lng, c.lat, c.lng); return `☕ ${c.name} (${fmtDist(d)})`; }),
              ...hospitals.slice(0, 1).map(h => { const d = haversine(lat, lng, h.lat, h.lng); return `🏥 ${h.name} (${fmtDist(d)})`; }),
              ...superDist.slice(0, 1).map(s => `🛒 ${s.name} (${fmtDist(s.dist)})`),
            ],
          });
        }).catch(() => send("lifestyle", { score: 5, count: 0, detail: "Data unavailable", items: [] })),

        // Growth — depends only on ABS fetch
        growthP.then(({ fiveYr, latestPeriod, annualised5 }) => {
          const hasData = fiveYr !== null;
          let score = 5;
          if (annualised5 !== null) {
            if (annualised5 >= 9) score = 10;
            else if (annualised5 >= 7) score = 8;
            else if (annualised5 >= 5) score = 6;
            else if (annualised5 >= 3) score = 4;
            else score = 2;
          }
          const sign = fiveYr !== null && fiveYr >= 0 ? "+" : "";
          send("growth", {
            score,
            count: 0,
            detail: hasData && annualised5 !== null ? `${city.name}: ~${annualised5}%/yr over 5 years (${sign}${fiveYr}% total)` : "Property growth data unavailable",
            items: hasData ? [
              `5yr growth: ${sign}${fiveYr}% (~${annualised5}%/yr)`,
              `Data: ABS RPPI · ${city.name}${latestPeriod ? ` · to ${latestPeriod}` : ""}`,
              `10yr & 20yr trend included in full report`,
            ] : ["Growth data unavailable"],
          });
        }).catch(() => send("growth", { score: 5, count: 0, detail: "Growth data unavailable", items: [] })),

        // Zoning — depends only on Vicmap fetch
        zoningP.then(z => {
          send("zoning", {
            score: z.score,
            count: 0,
            detail: z.label,
            items: [
              `📍 ${z.code ? `Zone: ${z.code} — ${z.label}` : z.label}`,
              `💡 ${z.suggestion}`,
              ...(z.source ? [`🗂 Source: ${z.source}`] : []),
            ],
          });
        }).catch(() => send("zoning", { score: 5, count: 0, detail: "Zoning data unavailable", items: [] })),
      ]);

      send("__done__", {});
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
