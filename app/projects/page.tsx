"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { REAL_PROJECTS, Project } from "@/lib/projects";
import type { DomainListing } from "@/components/ProjectMap";
import { haversineKm } from "@/lib/geo";
import { useCartStore } from "@/lib/cart-store";

function BuyNowButton({ project }: { project: import("@/lib/projects").Project }) {
  const [loading, setLoading] = useState(false);

  async function handleBuyNow(e: React.MouseEvent) {
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          reportFile: project.reportFile,
          address: `${project.address}, ${project.suburb}`,
          price: project.price,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleBuyNow}
      disabled={loading}
      className="w-full py-2 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-60"
      style={{ backgroundColor: loading ? "#999" : "#f26c21" }}
    >
      {loading ? "Redirecting…" : `Buy Now — $${project.price}`}
    </button>
  );
}

function PropertyPhotos({ lat, lng, address, apiKey }: { lat: number; lng: number; address: string; apiKey: string }) {
  const [svError, setSvError] = useState(false);
  const [satError, setSatError] = useState(false);

  const svUrl = `https://maps.googleapis.com/maps/api/streetview?size=400x240&location=${lat},${lng}&fov=90&pitch=5&source=outdoor&key=${apiKey}`;
  const satUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=19&size=400x240&maptype=satellite&markers=color:red%7C${lat},${lng}&key=${apiKey}`;

  return (
    <div className="flex gap-1 mb-3 rounded-lg overflow-hidden h-32 animate-in fade-in duration-300">
      <div className="relative flex-1 bg-gray-100">
        {svError ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-xs gap-1">
            <span>📷</span><span>No street view</span>
          </div>
        ) : (
          <img src={svUrl} alt={`Street view of ${address}`} className="w-full h-full object-cover"
            onError={() => setSvError(true)} referrerPolicy="no-referrer-when-downgrade" />
        )}
        <span className="absolute bottom-1 left-1 bg-black/55 text-white text-[9px] px-1.5 py-0.5 rounded">Street View</span>
      </div>
      <div className="relative flex-1 bg-gray-100">
        {satError ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-xs gap-1">
            <span>🛰</span><span>No satellite</span>
          </div>
        ) : (
          <img src={satUrl} alt={`Satellite view of ${address}`} className="w-full h-full object-cover"
            onError={() => setSatError(true)} referrerPolicy="no-referrer-when-downgrade" />
        )}
        <span className="absolute bottom-1 left-1 bg-black/55 text-white text-[9px] px-1.5 py-0.5 rounded">Satellite</span>
      </div>
    </div>
  );
}

const ProjectMap = dynamic(() => import("@/components/ProjectMap"), { ssr: false });

const TYPE_COLORS: Record<string, string> = {
  Subdivision: "bg-purple-100 text-purple-700",
  "Dual Occupancy": "bg-blue-100 text-blue-700",
  "Multi-Unit": "bg-teal-100 text-teal-700",
  Townhouse: "bg-amber-100 text-amber-700",
  Apartment: "bg-rose-100 text-rose-700",
};

const RADIUS_OPTIONS = [
  { label: "5 km",  km: 5  },
  { label: "15 km", km: 15 },
  { label: "50 km", km: 50 },
];

function ProjectsContent() {
  const searchParams = useSearchParams();
  const [searchText, setSearchText] = useState(searchParams.get("q") ?? "");
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [filteredIds, setFilteredIds] = useState<Set<string> | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [allProjects, setAllProjects] = useState<Project[]>(REAL_PROJECTS);
  const [radiusKmIdx, setRadiusKmIdx] = useState(1);   // default = 15km
  const [sortLatest, setSortLatest] = useState(false);
  const [domainListings, setDomainListings] = useState<DomainListing[]>([]);
  const [showDomainListings, setShowDomainListings] = useState(false);
  const [loadingDomain, setLoadingDomain] = useState(false);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const selectedPlaceRef = useRef<{ lat: number; lng: number } | null>(null);
  const selectedSuburbRef = useRef<{ suburb: string; state: string }>({ suburb: "", state: "" });

  const radiusKm = RADIUS_OPTIONS[radiusKmIdx].km;

  const { addItem, items } = useCartStore();
  const inCart = (id: string) => items.some((i) => i.project.id === id);

  // Fetch uploaded projects and merge with static ones
  useEffect(() => {
    fetch("/api/projects")
      .then(r => r.json())
      .then((data: Project[]) => setAllProjects(data))
      .catch(() => {});
  }, []);

  const displayedProjects = (() => {
    let list = filteredIds ? allProjects.filter((p) => filteredIds.has(p.id)) : allProjects;
    if (sortLatest) {
      list = [...list].sort((a, b) =>
        (b.reportDate ?? "").localeCompare(a.reportDate ?? "")
      );
    }
    return list;
  })();

  // Attach Google Maps Places autocomplete to the search input
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || typeof window === "undefined") return;

    function attachAutocomplete() {
      if (!searchInputRef.current || autocompleteRef.current) return;
      autocompleteRef.current = new window.google.maps.places.Autocomplete(searchInputRef.current, {
        componentRestrictions: { country: "au" },
        types: ["geocode"],
      });
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();
        if (!place) return;

        // Extract English suburb + state from address components
        let suburb = "", state = "";
        for (const comp of place.address_components ?? []) {
          if (comp.types.includes("locality")) suburb = comp.long_name;
          if (comp.types.includes("administrative_area_level_1")) state = comp.short_name;
        }
        selectedSuburbRef.current = { suburb, state };

        // Show a clean English label in the input
        const label = suburb && state ? `${suburb} ${state}` : (place.formatted_address ?? "");
        setSearchText(label);

        if (place.geometry?.location) {
          selectedPlaceRef.current = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };
        }
      });
    }

    if (window.google?.maps?.places) { attachAutocomplete(); return; }

    // Reuse any existing Maps script already loaded by other pages
    if (!document.getElementById("gmap-projects-script") && !document.getElementById("gmap-home-script") && !document.getElementById("google-maps-script")) {
      const script = document.createElement("script");
      script.id = "gmap-projects-script";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&loading=async`;
      script.async = true;
      script.onload = attachAutocomplete;
      document.head.appendChild(script);
    } else {
      // Script already loading — poll until ready
      const interval = setInterval(() => {
        if (window.google?.maps?.places) { attachAutocomplete(); clearInterval(interval); }
      }, 200);
    }
  }, []);

  // Auto-run search if ?q= param is present on load
  useEffect(() => {
    const q = searchParams.get("q");
    if (!q?.trim()) return;
    runSearch(q.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSearch(query: string) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      const q = query.toLowerCase();
      const matched = new Set(
        allProjects
          .filter((p) =>
            p.suburb.toLowerCase().includes(q) ||
            p.postcode.includes(q) ||
            p.state.toLowerCase().includes(q)
          )
          .map((p) => p.id)
      );
      setFilteredIds(matched);
      setNoResults(matched.size === 0);
      return;
    }

    setGeocoding(true);
    try {
      // Use coordinates from autocomplete selection if available, else geocode
      let center: { lat: number; lng: number } | null = selectedPlaceRef.current;
      selectedPlaceRef.current = null; // consume it

      if (!center) {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
            query + ", Australia"
          )}&key=${apiKey}`
        );
        const data = await res.json();
        if (data.status === "OK" && data.results[0]) {
          const loc = data.results[0].geometry.location;
          center = { lat: loc.lat, lng: loc.lng };
        }
      }

      if (center) {
        setSearchCenter(center);
        const nearby = new Set(
          allProjects
            .filter((p) => haversineKm(center!.lat, center!.lng, p.lat, p.lng) <= radiusKm)
            .map((p) => p.id)
        );
        setFilteredIds(nearby);
        setNoResults(nearby.size === 0);
      } else {
        setNoResults(true);
        setFilteredIds(new Set());
      }
    } catch {
      setNoResults(true);
    } finally {
      setGeocoding(false);
    }
  }

  async function fetchDomainListings(suburb: string, state: string) {
    setLoadingDomain(true);
    try {
      const res = await fetch(
        `/api/domain-listings?suburb=${encodeURIComponent(suburb)}&state=${encodeURIComponent(state)}`
      );
      const data = await res.json();
      setDomainListings(data.listings ?? []);
      setShowDomainListings(true);
    } catch {
      setDomainListings([]);
    } finally {
      setLoadingDomain(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchText.trim()) {
      setSearchCenter(null);
      setFilteredIds(null);
      setNoResults(false);
      return;
    }
    await runSearch(searchText.trim());
  }

  function clearSearch() {
    setSearchText("");
    setSearchCenter(null);
    setFilteredIds(null);
    setNoResults(false);
    setSelectedProject(null);
  }

  const handleProjectSelect = useCallback((project: Project) => {
    setSelectedProject(project);
    const card = cardRefs.current.get(project.id);
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Search bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-extrabold text-gray-900">Current Projects</h1>
            {/* Sort + Radius controls */}
            <div className="flex items-center gap-2">
              {/* Properties for Sale toggle */}
              <button
                type="button"
                disabled={loadingDomain}
                onClick={async () => {
                  if (domainListings.length > 0) {
                    setShowDomainListings(v => !v);
                  } else {
                    const { suburb, state } = selectedSuburbRef.current;
                    if (suburb) {
                      await fetchDomainListings(suburb, state);
                    } else if (searchText.trim()) {
                      await fetchDomainListings(searchText.trim(), "");
                    } else {
                      alert("Search for a suburb first, then click Properties for Sale.");
                    }
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                  showDomainListings
                    ? "bg-red-500 text-white border-red-500"
                    : "bg-white text-gray-500 border-gray-200 hover:border-red-400 hover:text-red-500"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-current inline-block" />
                {loadingDomain ? "Loading…" : showDomainListings ? `For Sale (${domainListings.length})` : "Properties for Sale"}
              </button>
              {/* Latest toggle */}
              <button
                type="button"
                onClick={() => setSortLatest(v => !v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  sortLatest
                    ? "bg-[#007a6e] text-white border-[#007a6e]"
                    : "bg-white text-gray-500 border-gray-200 hover:border-[#007a6e] hover:text-[#007a6e]"
                }`}
              >
                Latest first
              </button>
              {/* Radius toggle */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
                {RADIUS_OPTIONS.map((opt, i) => (
                  <button
                    key={opt.km}
                    type="button"
                    onClick={() => setRadiusKmIdx(i)}
                    className={`px-3 py-1.5 transition-colors ${
                      radiusKmIdx === i
                        ? "bg-[#007a6e] text-white"
                        : "bg-white text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchText}
                onChange={(e) => { setSearchText(e.target.value); selectedPlaceRef.current = null; }}
                placeholder="Search by suburb, postcode or address (e.g. Burwood VIC, Fitzroy, 3000)"
                className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007a6e] focus:border-transparent"
              />
              {searchText && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={geocoding}
              className="px-6 py-3 rounded-lg text-white font-semibold text-sm transition-colors disabled:opacity-60"
              style={{ backgroundColor: "#007a6e" }}
            >
              {geocoding ? "Searching…" : "Search"}
            </button>
          </form>
          {filteredIds && (
            <p className="text-sm text-gray-500 mt-2">
              {filteredIds.size === 0
                ? `No projects found within ${radiusKm}km. Try switching to State view.`
                : (
                  <>
                    <span className="font-semibold text-[#007a6e]">{filteredIds.size} project{filteredIds.size !== 1 ? "s" : ""}</span>
                    {" "}found within {radiusKm}km
                  </>
                )}
              <button onClick={clearSearch} className="ml-2 text-[#007a6e] underline text-xs">
                Clear
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Main content: map + cards */}
      <div className="flex flex-1 overflow-hidden">
        {/* Cards panel */}
        <div className="w-full md:w-96 lg:w-[420px] flex-shrink-0 overflow-y-auto border-r border-gray-200 bg-white">
          {noResults ? (
            <div className="flex flex-col items-center justify-center h-64 px-6 text-center">
              <svg className="w-12 h-12 text-gray-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500 font-medium">No projects in this area</p>
              <p className="text-gray-400 text-sm mt-1">Try a different suburb or postcode</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {displayedProjects.map((project) => (
                <div
                  key={project.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(project.id, el);
                  }}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedProject?.id === project.id
                      ? "bg-[#e6f4f2] border-l-4 border-[#007a6e]"
                      : "hover:bg-gray-50 border-l-4 border-transparent"
                  }`}
                  onClick={() => setSelectedProject(project)}
                >
                  {/* Street View + Satellite — only shown when this card is selected (street level) */}
                  {selectedProject?.id === project.id && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
                    <PropertyPhotos
                      lat={project.lat}
                      lng={project.lng}
                      address={project.address}
                      apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                    />
                  )}

                  {/* Type badge + price */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[project.type] ?? "bg-gray-100 text-gray-600"}`}>
                      {project.type}
                    </span>
                    <span className="font-extrabold text-[#007a6e]">${project.price}</span>
                  </div>

                  {/* Address */}
                  <h3 className="font-bold text-gray-900 text-sm leading-tight">{project.address}</h3>
                  <p className="text-gray-500 text-xs mb-2">
                    {project.suburb}, {project.state} {project.postcode}
                  </p>

                  {/* Meta */}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400 mb-3">
                    {project.landSize && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                        {project.landSize}m²
                      </span>
                    )}
                    {project.units && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {project.units} units
                      </span>
                    )}
                    {project.reportDate && (
                      <span className="flex items-center gap-1 text-[#007a6e] font-semibold">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Report ready
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 mb-3">
                    {project.description}
                  </p>

                  {/* Add to Cart only */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); addItem(project); }}
                      disabled={inCart(project.id)}
                      className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors border ${
                        inCart(project.id)
                          ? "bg-gray-100 text-gray-400 cursor-default border-gray-200"
                          : "text-white border-transparent"
                      }`}
                      style={!inCart(project.id) ? { backgroundColor: "#007a6e" } : {}}
                    >
                      {inCart(project.id) ? "✓ Added to Cart" : "Add to Cart"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map */}
        <div className="hidden md:block flex-1 p-3">
          <ProjectMap
            projects={allProjects}
            filteredIds={filteredIds}
            searchCenter={searchCenter}
            radiusKm={radiusKm}
            onProjectSelect={handleProjectSelect}
            selectedId={selectedProject?.id ?? null}
            domainListings={domainListings}
            showDomainListings={showDomainListings}
          />
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense>
      <ProjectsContent />
    </Suspense>
  );
}
