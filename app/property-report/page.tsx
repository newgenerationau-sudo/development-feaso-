"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import HexagonChart, { HexScore } from "@/components/HexagonChart";
import Link from "next/link";

declare global {
  interface Window {
    google: typeof google;
    initPropertyMap: () => void;
  }
}

interface SchoolData {
  name: string; dist: number; distLabel: string; isUni: boolean;
  sector?: string; schoolType?: string; yearRange?: string;
  icsea?: number; icseaPercentile?: number; icseaLabel?: string;
  naplanVsAus?: string; naplanAvg?: number; totalEnrolments?: number; url?: string;
}
interface ScoreItem {
  score: number;
  detail: string;
  items?: string[];
  noData?: boolean;
  schoolData?: SchoolData[];
}
interface Scores {
  school:      ScoreItem;
  transport:   ScoreItem;
  shopping:    ScoreItem;
  lifestyle:   ScoreItem;
  growth:      ScoreItem;
  zoning:      ScoreItem;
}

const SCORE_META = [
  { key: "school",      label: "School",      icon: "🎓", color: "#4f46e5", description: "Proximity and number of schools within 2km" },
  { key: "transport",   label: "Transport",   icon: "🚆", color: "#0891b2", description: "Access to train stations and bus stops" },
  { key: "shopping",    label: "Shopping",    icon: "🛒", color: "#d97706", description: "Supermarkets and retail within 1.5km" },
  { key: "lifestyle",   label: "Amenity",     icon: "🌳", color: "#16a34a", description: "Parks, cafes, hospital and supermarket nearby" },
  { key: "growth",  label: "Growth",  icon: "📈", color: "#dc2626", description: "Suburb value appreciation potential" },
  { key: "zoning",  label: "Zoning",  icon: "🏛️", color: "#7c3aed", description: "Development character based on surrounding area" },
];

function ScoreLabel(score: number) {
  if (score >= 9) return { label: "Excellent", color: "text-emerald-600" };
  if (score >= 7) return { label: "Good", color: "text-blue-600" };
  if (score >= 5) return { label: "Average", color: "text-yellow-600" };
  return { label: "Below Average", color: "text-red-500" };
}

function PropertyReportPage() {
  const searchParams = useSearchParams();
  const [address, setAddress] = useState(() => searchParams.get("address") ?? "");
  const [lat, setLat] = useState<number | null>(() => {
    const v = searchParams.get("lat"); return v ? parseFloat(v) : null;
  });
  const [lng, setLng] = useState<number | null>(() => {
    const v = searchParams.get("lng"); return v ? parseFloat(v) : null;
  });
  const [loading, setLoading] = useState(false);
  const [scores, setScores] = useState<Partial<Scores> | null>(null);
  const [allLoaded, setAllLoaded] = useState(false);
  const [error, setError] = useState("");
  const [financeRates, setFinanceRates] = useState<{
    rba: { rate: number; period: string };
    banks: { bank: string; type: string; rate: number }[];
    big4: { name: string; lo: number; hi: number }[];
    source: string;
    asOf: string;
  } | null>(null);
  const [emailName, setEmailName] = useState("");
  const [emailAddr, setEmailAddr] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");
  const [interests, setInterests] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const autoSearchedRef = useRef(false);

  async function consumeScoreStream(response: Response) {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const { key, data } = JSON.parse(line);
          if (key === "__done__") setAllLoaded(true);
          else setScores(prev => ({ ...(prev ?? {}), [key]: data }));
        } catch {}
      }
    }
  }

  useEffect(() => {
    if (autoSearchedRef.current) return;
    const initLat = searchParams.get("lat");
    const initLng = searchParams.get("lng");
    if (initLat && initLng) {
      autoSearchedRef.current = true;
      const latN = parseFloat(initLat);
      const lngN = parseFloat(initLng);
      setLoading(true);
      setScores({});
      setAllLoaded(false);
      fetch("/api/finance-rates").then(r => r.ok ? r.json() : null).then(d => { if (d) setFinanceRates(d); });
      const subM = (searchParams.get("address") ?? "").match(/,\s*([^,]+?)\s+(?:VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\s+\d{4}/i);
      const subP = subM ? encodeURIComponent(subM[1].trim()) : "";
      fetch(`/api/property-score?lat=${latN}&lng=${lngN}&suburb=${subP}`)
        .then(async response => {
          setLoading(false);
          if (!response.ok) { const d = await response.json(); setError(d.error ?? "Failed to load."); return; }
          await consumeScoreStream(response);
        })
        .catch(() => setError("Network error. Please try again."))
        .finally(() => setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || typeof window === "undefined") return;

    function initAutocomplete() {
      if (!inputRef.current) return;
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "au" },
        types: ["address"],
      });
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();
        if (!place) return;
        if (place.formatted_address) setAddress(place.formatted_address);
        if (place.geometry?.location) {
          setLat(place.geometry.location.lat());
          setLng(place.geometry.location.lng());
        }
      });
    }

    if (window.google?.maps?.places) { initAutocomplete(); return; }
    if (document.getElementById("gmap-prop-script")) return;
    window.initPropertyMap = initAutocomplete;
    const script = document.createElement("script");
    script.id = "gmap-prop-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=initPropertyMap`;
    script.async = true;
    document.head.appendChild(script);
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!lat || !lng) { setError("Please select an address from the dropdown."); return; }
    setError("");
    setLoading(true);
    setScores({});
    setAllLoaded(false);
    setSent(false);
    fetch("/api/finance-rates").then(r => r.ok ? r.json() : null).then(d => { if (d) setFinanceRates(d); });
    const suburbMatch = address.match(/,\s*([^,]+?)\s+(?:VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\s+\d{4}/i);
    const suburbParam = suburbMatch ? encodeURIComponent(suburbMatch[1].trim()) : "";
    try {
      const response = await fetch(`/api/property-score?lat=${lat}&lng=${lng}&suburb=${suburbParam}`);
      setLoading(false);
      if (!response.ok) { const d = await response.json(); setError(d.error ?? "Failed to load property data."); return; }
      await consumeScoreStream(response);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendReport(e: React.FormEvent) {
    e.preventDefault();
    setSendError("");
    setSending(true);
    const res = await fetch("/api/send-property-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: emailName, email: emailAddr, address, lat, lng, scores, interests }),
    });
    if (res.ok) { setSent(true); }
    else { setSendError("Failed to send. Please try again."); }
    setSending(false);
  }

  const hexScores: HexScore[] = allLoaded && scores
    ? SCORE_META
        .filter(m => scores[m.key as keyof Scores] && !scores[m.key as keyof Scores]!.noData)
        .map(m => ({
          label: m.label,
          icon: m.icon,
          score: scores[m.key as keyof Scores]!.score,
          color: m.color,
          detail: scores[m.key as keyof Scores]!.detail,
        }))
    : [];

  const overallScore = allLoaded && scores
    ? (() => {
        const valid = SCORE_META.filter(m => scores[m.key as keyof Scores] && !scores[m.key as keyof Scores]!.noData);
        const total = valid.reduce((sum, m) => sum + scores[m.key as keyof Scores]!.score, 0);
        return valid.length ? Math.round(total / valid.length) : null;
      })()
    : null;

  const loadingSteps = [
    { icon: "🎓", label: "Schools & education" },
    { icon: "🚆", label: "Transport links" },
    { icon: "🛒", label: "Shopping & retail" },
    { icon: "🌳", label: "Amenity & lifestyle" },
    { icon: "📈", label: "Suburb growth" },
    { icon: "🏛️", label: "Zoning & development" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="relative overflow-hidden bg-white border-b border-gray-100 py-14 px-4">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/60 to-white pointer-events-none" />
        <div className="relative max-w-2xl mx-auto text-center">
          {/* Badges */}
          <div className="flex items-center justify-center flex-wrap gap-2 mb-6">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">✓ 100% Free</span>
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">⚡ Instant Report</span>
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">🇦🇺 Australia-Wide</span>
          </div>

          {/* Main headline */}
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4 leading-tight tracking-tight">
            Know Your Block<br />
            <span className="relative inline-block">
              <span style={{ color: "#007a6e" }}>in 5 Seconds.</span>
            </span>
          </h1>
          <p className="text-gray-500 text-base mb-2 max-w-lg mx-auto">
            Schools · Transport · Zoning · Growth · Amenity — <strong className="text-gray-700">scored instantly</strong>.
          </p>
          <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">
            Enter any Australian address and get the full picture before you buy, sell or develop.
          </p>

          <form onSubmit={handleSearch} className="flex gap-2 shadow-lg rounded-2xl border border-gray-200 bg-white p-1.5">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </span>
              <input
                ref={inputRef}
                type="text"
                value={address}
                onChange={e => { setAddress(e.target.value); setLat(null); setLng(null); }}
                placeholder="Enter any Australian address…"
                className="w-full pl-9 pr-4 py-3 text-sm focus:outline-none bg-transparent"
              />
            </div>
            <button type="submit" disabled={loading}
              className="px-6 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60 whitespace-nowrap transition-opacity"
              style={{ backgroundColor: "#007a6e" }}>
              {loading ? "Analysing…" : "Check My Block →"}
            </button>
          </form>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

          {/* Social proof strip */}
          {!scores && !loading && (
            <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-400">
              <span>🏠 10,000+ properties checked</span>
              <span>📊 Live data</span>
              <span>🔒 No sign-up needed</span>
            </div>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <div className="w-14 h-14 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-extrabold text-gray-900 mb-1">Scoring Your Block…</h2>
          <p className="text-gray-400 text-sm mb-8">Checking 6 key property factors in real time</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {loadingSteps.map((step, i) => (
              <div key={i}
                className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500 animate-pulse"
                style={{ animationDelay: `${i * 0.18}s`, animationDuration: "1.4s" }}>
                <span className="text-base">{step.icon}</span>
                <span className="font-medium">{step.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-300 mt-8">Pulling live data from Google Maps, ABS &amp; VIC Government…</p>
        </div>
      )}

      {/* Results — show as soon as any score arrives */}
      {scores !== null && !loading && (
        <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

          {/* Address + overall score */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-gray-400 mb-1">Property Analysis</p>
              <h2 className="text-lg font-extrabold text-gray-900">{address}</h2>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-extrabold mx-auto"
                style={{ backgroundColor: "#007a6e" }}>
                {overallScore ?? <span className="text-sm animate-pulse">…</span>}
              </div>
              <p className="text-xs text-gray-500 mt-1">Overall Score</p>
            </div>
          </div>

          {/* Hexagon chart — only when all scores loaded */}
          {allLoaded && hexScores.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <h3 className="text-lg font-extrabold text-gray-900 mb-1 text-center">Property Score Breakdown</h3>
              <p className="text-sm text-gray-400 text-center mb-6">Based on live data from Google Maps & OpenStreetMap</p>
              <div className="flex justify-center">
                <HexagonChart scores={hexScores} />
              </div>
            </div>
          )}

          {/* Score cards — skeleton for not-yet-loaded */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SCORE_META.map(m => {
              const s = scores[m.key as keyof Scores];

              // Skeleton
              if (!s) {
                return (
                  <div key={m.key} className={`bg-white rounded-xl border border-gray-200 p-5 animate-pulse${m.key === "school" ? " md:col-span-2" : ""}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{m.icon}</span>
                        <div className="h-4 bg-gray-200 rounded w-20" />
                      </div>
                      <div className="h-7 bg-gray-200 rounded w-12" />
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3" />
                    <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
                    <div className="space-y-1.5">
                      <div className="h-3 bg-gray-100 rounded w-full" />
                      <div className="h-3 bg-gray-100 rounded w-4/5" />
                    </div>
                  </div>
                );
              }

              const { label, color } = ScoreLabel(s.score);

              // ── Special full-width school card ──────────────────────────
              if (m.key === "school") {
                return (
                  <div key="school" className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{m.icon}</span>
                        <span className="font-bold text-gray-800 text-sm">{m.label}</span>
                      </div>
                      <div className="flex items-end gap-0.5">
                        <span className="text-2xl font-extrabold" style={{ color: "#007a6e" }}>{s.score}</span>
                        <span className="text-gray-400 text-xs mb-1">/10</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                      <div className="h-1.5 rounded-full" style={{ width: `${s.score * 10}%`, backgroundColor: "#007a6e" }} />
                    </div>
                    <p className={`text-xs font-semibold ${color} mb-4`}>{label}</p>

                    {s.schoolData && s.schoolData.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {s.schoolData.map((sch, i) => (
                          <div key={i} className="border border-gray-100 rounded-xl p-4 bg-gray-50 hover:bg-emerald-50 hover:border-emerald-200 transition-colors">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-base flex-shrink-0">{sch.isUni ? "🎓" : "🏫"}</span>
                                <span className="font-semibold text-gray-900 text-sm leading-snug">{sch.name}</span>
                              </div>
                              <span className="text-xs text-gray-400 flex-shrink-0">{sch.distLabel}</span>
                            </div>

                            {!sch.isUni && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {sch.icseaLabel && (
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                    sch.icseaPercentile && sch.icseaPercentile >= 90 ? "bg-emerald-100 text-emerald-700" :
                                    sch.icseaPercentile && sch.icseaPercentile >= 75 ? "bg-blue-100 text-blue-700" :
                                    sch.icseaPercentile && sch.icseaPercentile >= 50 ? "bg-yellow-100 text-yellow-700" :
                                    "bg-gray-100 text-gray-600"
                                  }`}>
                                    🏆 {sch.icseaLabel}
                                  </span>
                                )}
                                {sch.naplanVsAus && (
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    sch.naplanVsAus.toLowerCase().includes("above") ? "bg-emerald-50 text-emerald-600" :
                                    sch.naplanVsAus.toLowerCase().includes("below") ? "bg-red-50 text-red-600" :
                                    "bg-gray-100 text-gray-600"
                                  }`}>
                                    📊 NAPLAN {sch.naplanVsAus}
                                  </span>
                                )}
                                {sch.sector && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{sch.sector}</span>
                                )}
                                {sch.yearRange && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{sch.yearRange}</span>
                                )}
                                {sch.totalEnrolments && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{sch.totalEnrolments.toLocaleString()} students</span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">{s.detail}</p>
                    )}

                    <p className="text-xs text-gray-400 mt-3">School ranking based on ICSEA (Index of Community Socio-Educational Advantage) · Source: ACARA 2025</p>
                  </div>
                );
              }

              // ── Standard card for all other scores ──────────────────────
              return (
                <div key={m.key} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{m.icon}</span>
                      <span className="font-bold text-gray-800 text-sm">{m.label}</span>
                    </div>
                    {s.noData ? (
                      <span className="text-xl font-extrabold text-gray-400">*</span>
                    ) : (
                      <div className="flex items-end gap-0.5">
                        <span className="text-2xl font-extrabold" style={{ color: "#007a6e" }}>{s.score}</span>
                        <span className="text-gray-400 text-xs mb-1">/10</span>
                      </div>
                    )}
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
                    {s.noData
                      ? <div className="h-1.5 rounded-full bg-gray-300 w-full opacity-40" />
                      : <div className="h-1.5 rounded-full" style={{ width: `${s.score * 10}%`, backgroundColor: "#007a6e" }} />
                    }
                  </div>
                  {s.noData
                    ? <p className="text-xs font-semibold text-gray-400 mb-2">Data unavailable</p>
                    : <p className={`text-xs font-semibold ${color} mb-2`}>{label}</p>
                  }
                  {s.items && s.items.length > 0 ? (
                    <ul className="space-y-1">
                      {s.items.map((item, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                          <span className="text-emerald-500 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-400">{s.detail}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Street View, map, finance, email, CTA — after all scores loaded */}
          {allLoaded && <>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">Street View</h3>
            </div>
            <img
              src={`https://maps.googleapis.com/maps/api/streetview?size=800x300&location=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
              alt="Street view"
              className="w-full h-48 object-cover"
            />
          </div>

          {/* Map */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">Location Map</h3>
            </div>
            <img
              src={`https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=800x300&markers=color:0x007a6e%7C${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
              alt="Map"
              className="w-full h-48 object-cover"
            />
          </div>

          {/* Finance Section */}
          {financeRates && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💰</span>
                  <h3 className="text-lg font-extrabold text-gray-900">Current Interest Rates</h3>
                </div>
                <span className="text-xs text-gray-400">Source: {financeRates.source} · {financeRates.asOf}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {financeRates.banks.map((r, i) => (
                  <div key={i} className={`rounded-xl p-4 text-center border ${i === 0 ? "border-emerald-200 bg-emerald-50" : "border-gray-100 bg-gray-50"}`}>
                    <p className="text-xs font-semibold text-gray-500 mb-0.5">{r.bank}</p>
                    <p className="text-xs text-gray-400 mb-2">{r.type}</p>
                    <p className={`text-2xl font-extrabold ${i === 0 ? "text-emerald-700" : ""}`}
                      style={i !== 0 ? { color: "#007a6e" } : {}}>
                      {r.rate}%
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">p.a.</p>
                  </div>
                ))}
              </div>
              {/* Big 4 bank rate ranges */}
              <div className="mt-5">
                <h4 className="text-sm font-bold text-gray-700 mb-2">Big 4 Banks — Variable Rate Range (Owner Occupier)</h4>
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                  {financeRates.big4.map(b => (
                    <div key={b.name} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50">
                      <span className="text-sm font-bold text-gray-800">{b.name}</span>
                      <span className="text-sm font-extrabold" style={{ color: "#007a6e" }}>
                        {b.lo}% – {b.hi}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Indicative ranges based on RBA cash rate + typical published margins. Actual rates vary — check your bank or a mortgage broker.
              </p>
            </div>
          )}

          {/* Email Report */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-lg font-extrabold text-gray-900 mb-1">📧 Get this report in your inbox</h3>
            <p className="text-sm text-gray-500 mb-5">Free — we'll email you a full copy of this property report instantly.</p>
            {sent ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p className="text-emerald-700 font-semibold">Report sent! Check your inbox.</p>
                <p className="text-emerald-600 text-sm mt-1">Can't find it? Check your spam folder.</p>
              </div>
            ) : (
              <form onSubmit={handleSendReport} className="space-y-5">
                {/* Interest checkboxes */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">What else can we help you with? <span className="font-normal text-gray-400">(optional)</span></p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { key: "finance",    label: "💰 Finance tips to save interest on my loan" },
                      { key: "offmarket",  label: "🏠 Off-market property opportunities" },
                      { key: "corelogic",  label: "📊 CoreLogic report for this property" },
                      { key: "buyersagent",label: "🤝 Speak with a buyer's agent" },
                      { key: "investing",  label: "📈 Property investment strategies" },
                      { key: "buying6mo",  label: "🔑 I'm planning to buy within 6 months" },
                      { key: "selling",    label: "🏷️ I'm thinking about selling" },
                    ].map(opt => (
                      <label key={opt.key}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors text-sm
                          ${interests[opt.key] ? "border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold" : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300"}`}>
                        <input
                          type="checkbox"
                          className="accent-emerald-600 w-4 h-4 flex-shrink-0"
                          checked={!!interests[opt.key]}
                          onChange={e => setInterests(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Name / Email / Submit */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={emailName}
                    onChange={e => setEmailName(e.target.value)}
                    required
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <input
                    type="email"
                    placeholder="Your email"
                    value={emailAddr}
                    onChange={e => setEmailAddr(e.target.value)}
                    required
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <button type="submit" disabled={sending}
                    className="px-6 py-2.5 rounded-lg text-white font-semibold text-sm disabled:opacity-60 whitespace-nowrap"
                    style={{ backgroundColor: "#007a6e" }}>
                    {sending ? "Sending..." : "Send Report"}
                  </button>
                </div>
              </form>
            )}
            {sendError && <p className="text-red-500 text-sm mt-2">{sendError}</p>}
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 rounded-2xl p-8 text-center text-white">
            <p className="text-emerald-300 text-xs font-semibold uppercase tracking-widest mb-3">Unlock Your Block&apos;s Potential</p>
            <h3 className="text-2xl font-extrabold mb-3">Detailed Development Report</h3>
            <p className="text-emerald-100 text-sm mb-7 max-w-md mx-auto">
              Discover exactly what you can build on this block — zoning analysis, development yield, overlays and council requirements, delivered by our registered architect.
            </p>
            <Link href={`/order${address ? `?q=${encodeURIComponent(address)}` : ""}`}
              className="inline-block px-8 py-3 bg-white text-emerald-700 font-bold rounded-xl hover:bg-gray-50 transition-colors text-sm">
              Get a Free Consultation from Our Registered Architect
            </Link>
          </div>

          <p className="text-center text-xs text-gray-400 pb-4">
            Data sourced from Google Maps. Scores are indicative only and should not replace professional advice.
          </p>
          </>}
        </div>
      )}
    </div>
  );
}

export default function PropertyReportPageWrapper() {
  return (
    <Suspense>
      <PropertyReportPage />
    </Suspense>
  );
}
