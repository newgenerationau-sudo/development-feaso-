"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PROJECTS } from "@/lib/projects";
import { haversineKm } from "@/lib/geo";

declare global {
  interface Window {
    google: typeof google;
    initHomeMap: () => void;
  }
}

const TABS = [
  { label: "Browse Projects", href: "/projects" },
  { label: "Custom Report",   href: "/order" },
];

const TESTIMONIALS = [
  { name: "Sarah T.", location: "Melbourne, VIC", quote: "Saved me weeks of research. The report was thorough and helped me make a confident investment decision." },
  { name: "James R.", location: "Sydney, NSW",    quote: "Fast turnaround, incredibly detailed. Worth every cent. I've now ordered three reports for different sites." },
  { name: "Linda K.", location: "Brisbane, QLD",  quote: "Finally a service that makes development feasibility accessible without paying thousands for consultants." },
];

const SUBURB_RADIUS_KM = 15;

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [nearbyCount, setNearbyCount] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Load Google Maps autocomplete on the hero search bar
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || typeof window === "undefined") return;

    function initAutocomplete() {
      if (!inputRef.current) return;
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "au" },
        types: ["geocode"],
      });
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();
        const addr = place?.formatted_address ?? inputRef.current?.value ?? "";
        setSearchText(addr);
        // Count projects near selected location
        if (place?.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const count = PROJECTS.filter(
            p => haversineKm(lat, lng, p.lat, p.lng) <= SUBURB_RADIUS_KM
          ).length;
          setNearbyCount(count);
        } else {
          setNearbyCount(null);
        }
      });
    }

    if (window.google?.maps?.places) { initAutocomplete(); return; }
    if (document.getElementById("gmap-home-script")) return;

    window.initHomeMap = initAutocomplete;
    const script = document.createElement("script");
    script.id = "gmap-home-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=initHomeMap`;
    script.async = true;
    document.head.appendChild(script);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const dest = TABS[activeTab].href;
    const q = searchText.trim();
    router.push(q ? `${dest}?q=${encodeURIComponent(q)}` : dest);
  }

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative">
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(160deg, #1b4f5e 0%, #2d7a6a 40%, #3a8a6a 70%, #6aaa7a 100%)" }} />
        <div className="absolute inset-0 bg-black/35" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 pt-14 pb-24 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-8 drop-shadow">
            Unlock any property&apos;s development potential
          </h1>

          {/* Floating search card */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-visible">
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              {TABS.map((tab, i) => (
                <button key={tab.label} onClick={() => setActiveTab(i)}
                  className={`flex-1 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === i
                      ? "border-[#007a6e] text-[#007a6e]"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search input row */}
            <form onSubmit={handleSearch} className="flex items-center gap-2 p-3">
              <div className="relative flex items-center flex-1 gap-2 px-3 py-2.5 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-[#007a6e] focus-within:border-transparent">
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  placeholder={activeTab === 0 ? "Search suburb, postcode or address…" : "Enter a property address…"}
                  className="w-full text-gray-800 placeholder-gray-400 text-sm focus:outline-none bg-transparent"
                />
                {searchText && (
                  <button type="button" onClick={() => { setSearchText(""); setNearbyCount(null); }} className="text-gray-300 hover:text-gray-500 flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <button type="submit"
                className="px-6 py-2.5 rounded-lg text-white text-sm font-bold flex-shrink-0 transition-colors"
                style={{ backgroundColor: "#007a6e" }}>
                Search
              </button>
            </form>
          </div>

          {/* Nearby project count badge */}
          {nearbyCount !== null ? (
            <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
              nearbyCount > 0
                ? "bg-white/20 text-white border border-white/30"
                : "bg-orange-500/80 text-white"
            }`}>
              {nearbyCount > 0 ? (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 111.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {nearbyCount} report{nearbyCount !== 1 ? "s" : ""} available near this address
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  0 reports in this area — request a free quote instead
                </>
              )}
            </div>
          ) : (
            <p className="text-white/70 text-sm mt-4">
              {activeTab === 0
                ? "Find existing feasibility reports near any address"
                : "Submit any Australian address for a custom report"}
            </p>
          )}
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 56" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0,28 C360,56 1080,0 1440,28 L1440,56 L0,56 Z" fill="#ffffff" />
          </svg>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <section className="py-4 border-b border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap justify-center gap-6 text-xs text-gray-500 font-medium">
          {["Australia-wide coverage", "Qualified designers & planners", "Secure Stripe payments", "Reports from $50"].map(t => (
            <span key={t} className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-[#007a6e]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 111.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section className="py-14 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-6 text-center">Our Services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              {
                title: "Browse Current Projects",
                desc: "Search our existing feasibility reports by suburb or postcode. Purchase and download instantly.",
                href: "/projects",
                emoji: "🗺️",
                bg: "#e6f4f2",
                cta: "View on Map",
              },
              {
                title: "Order a Custom Report",
                desc: "Submit any Australian property address. Our expert designers produce a tailored feasibility report within 2–5 business days.",
                href: "/order",
                emoji: "📋",
                bg: "#fff3e8",
                cta: "Get a Free Quote",
              },
            ].map(card => (
              <Link key={card.title} href={card.href}
                className="rounded-2xl border border-gray-200 p-7 hover:shadow-md transition-shadow flex gap-5 items-start"
                style={{ backgroundColor: card.bg }}>
                <span className="text-4xl flex-shrink-0">{card.emoji}</span>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{card.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-3">{card.desc}</p>
                  <span className="text-sm font-bold text-[#007a6e]">{card.cta} →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CURRENT PROJECTS ── */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-extrabold text-gray-900">Available Reports</h2>
            <Link href="/projects" className="text-sm font-semibold text-[#007a6e] hover:underline">
              View all on map →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PROJECTS.map(p => {
              const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
              const svUrl  = apiKey ? `https://maps.googleapis.com/maps/api/streetview?size=400x220&location=${p.lat},${p.lng}&fov=90&pitch=5&source=outdoor&key=${apiKey}` : null;
              const satUrl = apiKey ? `https://maps.googleapis.com/maps/api/staticmap?center=${p.lat},${p.lng}&zoom=19&size=400x220&maptype=satellite&markers=color:red%7C${p.lat},${p.lng}&key=${apiKey}` : null;
              return (
                <Link key={p.id} href="/projects"
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow block">
                  {/* Photos */}
                  {apiKey && (
                    <div className="flex h-32">
                      <div className="relative flex-1 bg-gray-100 overflow-hidden">
                        <img src={satUrl!} alt="Satellite" className="w-full h-full object-cover"
                          referrerPolicy="no-referrer-when-downgrade" />
                        <span className="absolute bottom-1 left-1 bg-black/55 text-white text-[9px] px-1.5 py-0.5 rounded">Bird&apos;s Eye</span>
                      </div>
                      <div className="relative flex-1 bg-gray-100 overflow-hidden border-l border-gray-100">
                        <img src={svUrl!} alt="Street View" className="w-full h-full object-cover"
                          referrerPolicy="no-referrer-when-downgrade" />
                        <span className="absolute bottom-1 left-1 bg-black/55 text-white text-[9px] px-1.5 py-0.5 rounded">Street View</span>
                      </div>
                    </div>
                  )}
                  {/* Card body */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">{p.type}</span>
                      <span className="font-extrabold text-[#007a6e] text-sm">${p.price}</span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm leading-tight">{p.address}</h3>
                    <p className="text-gray-400 text-xs mb-2">{p.suburb}, {p.state} {p.postcode}</p>
                    <div className="flex gap-3 text-xs text-gray-400 mb-2">
                      {p.landSize && <span>{p.landSize}m²</span>}
                      {p.units && <span>{p.units} units</span>}
                    </div>
                    <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 mb-2">{p.description}</p>
                    {p.isReal && (
                      <span className="text-xs font-bold text-[#007a6e] flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Report ready
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-14 px-4" style={{ backgroundColor: "#007a6e" }}>
        <div className="max-w-2xl mx-auto text-center text-white">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3">Can&apos;t find your address?</h2>
          <p className="text-teal-100 mb-7">Submit any Australian property and our team will send you a free quote.</p>
          <Link href="/order"
            className="inline-block px-10 py-3.5 bg-white font-bold text-base rounded-lg hover:bg-gray-50 transition-colors"
            style={{ color: "#007a6e" }}>
            Request a Free Quote
          </Link>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-8 text-center">What Our Clients Say</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white rounded-2xl p-7 border border-gray-200 shadow-sm">
                <div className="flex mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-5 italic">&ldquo;{t.quote}&rdquo;</p>
                <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                <p className="text-gray-400 text-xs">{t.location}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
