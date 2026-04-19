"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Project } from "@/lib/projects";

// State centre coordinates for the zoom-to-state animation
const STATE_CENTRES: Record<string, { lat: number; lng: number; zoom: number }> = {
  VIC: { lat: -37.0, lng: 144.5, zoom: 8 },
  NSW: { lat: -33.5, lng: 151.0, zoom: 8 },
  QLD: { lat: -27.0, lng: 153.0, zoom: 8 },
  WA:  { lat: -31.9, lng: 115.9, zoom: 8 },
  SA:  { lat: -34.9, lng: 138.6, zoom: 8 },
  TAS: { lat: -42.0, lng: 146.5, zoom: 8 },
  NT:  { lat: -12.5, lng: 130.8, zoom: 8 },
  ACT: { lat: -35.3, lng: 149.1, zoom: 10 },
};

export interface DomainListing {
  id: number;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  lat: number;
  lng: number;
  price: string;
  bedrooms?: number;
  bathrooms?: number;
  landSize?: number;
  propertyType: string;
  photo?: string;
  headline: string;
  url: string;
}

interface Props {
  projects: Project[];
  filteredIds: Set<string> | null;
  searchCenter: { lat: number; lng: number } | null;
  radiusKm: number;
  onProjectSelect: (project: Project) => void;
  selectedId: string | null;
  domainListings?: DomainListing[];
  showDomainListings?: boolean;
}

declare global {
  interface Window {
    google: typeof google;
    initFeasoMap: () => void;
  }
}

export default function ProjectMap({
  projects,
  filteredIds,
  searchCenter,
  radiusKm,
  onProjectSelect,
  selectedId,
  domainListings = [],
  showDomainListings = false,
}: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const domainMarkersRef = useRef<google.maps.Marker[]>([]);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const prevSelectedId = useRef<string | null>(null);
  const [mapsReady, setMapsReady] = useState(false);

  const initMap = useCallback(() => {
    if (!mapDivRef.current) return;
    mapRef.current = new window.google.maps.Map(mapDivRef.current, {
      center: { lat: -27.0, lng: 133.0 },
      zoom: 4,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
      ],
    });
    infoWindowRef.current = new window.google.maps.InfoWindow();

    // Set initial view based on user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          const inAustralia = lat >= -44 && lat <= -10 && lng >= 113 && lng <= 154;
          if (inAustralia && mapRef.current) {
            mapRef.current.setCenter({ lat, lng });
            mapRef.current.setZoom(10);
          }
          // Outside Australia — keep default Australia overview
        },
        () => { /* permission denied — keep Australia overview */ }
      );
    }

    setMapsReady(true);
  }, []);

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    if (window.google?.maps) {
      initMap();
      return;
    }

    window.initFeasoMap = initMap;
    const existing = document.getElementById("google-maps-script");
    if (!existing) {
      const script = document.createElement("script");
      script.id = "google-maps-script";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&loading=async&callback=initFeasoMap`;
      script.async = true;
      document.head.appendChild(script);
    }
  }, [initMap]);

  // Place / refresh markers
  useEffect(() => {
    if (!mapsReady || !mapRef.current) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current.clear();

    projects.forEach((project) => {
      const isFiltered = filteredIds === null || filteredIds.has(project.id);
      const isSelected = project.id === selectedId;

      const marker = new window.google.maps.Marker({
        position: { lat: project.lat, lng: project.lng },
        map: mapRef.current!,
        title: `${project.address}, ${project.suburb}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 16 : 10,
          fillColor: isSelected ? "#f26c21" : isFiltered ? "#007a6e" : "#cccccc",
          fillOpacity: isFiltered ? 1 : 0.35,
          strokeColor: "#ffffff",
          strokeWeight: 2.5,
        },
        zIndex: isSelected ? 10 : isFiltered ? 5 : 1,
      });

      marker.addListener("click", () => {
        onProjectSelect(project);
      });

      markersRef.current.set(project.id, marker);
    });
  }, [mapsReady, projects, filteredIds, selectedId, onProjectSelect]);

  // Domain listing markers (red pins)
  useEffect(() => {
    if (!mapsReady || !mapRef.current) return;

    // Clear old domain markers
    domainMarkersRef.current.forEach(m => m.setMap(null));
    domainMarkersRef.current = [];

    if (!showDomainListings) return;

    domainListings.forEach((listing) => {
      const marker = new window.google.maps.Marker({
        position: { lat: listing.lat, lng: listing.lng },
        map: mapRef.current!,
        title: listing.address,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#e53e3e",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        zIndex: 4,
      });

      marker.addListener("click", () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(`
            <div style="font-family:Arial,sans-serif;max-width:260px;padding:4px 2px">
              ${listing.photo ? `<img src="${listing.photo}" style="width:100%;height:130px;object-fit:cover;border-radius:6px;margin-bottom:8px"/>` : ""}
              <p style="font-weight:700;font-size:13px;margin:0 0 2px">${listing.address}</p>
              <p style="color:#666;font-size:11px;margin:0 0 6px">${listing.suburb}, ${listing.state} ${listing.postcode}</p>
              <p style="font-weight:700;color:#e53e3e;font-size:14px;margin:0 0 4px">${listing.price}</p>
              <div style="font-size:11px;color:#555;margin-bottom:8px">
                ${listing.bedrooms ? `🛏 ${listing.bedrooms}` : ""}
                ${listing.bathrooms ? ` 🚿 ${listing.bathrooms}` : ""}
                ${listing.landSize ? ` 📐 ${listing.landSize}m²` : ""}
              </div>
              <a href="${listing.url}" target="_blank"
                style="display:block;text-align:center;background:#e53e3e;color:#fff;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none">
                View on Domain →
              </a>
            </div>`);
          infoWindowRef.current.open(mapRef.current, marker);
        }
      });

      domainMarkersRef.current.push(marker);
    });
  }, [mapsReady, domainListings, showDomainListings]);

  // Smoothly zoom one level at a time — Google Maps animates each step
  const smoothZoom = useCallback((map: google.maps.Map, target: number, onComplete?: () => void) => {
    const current = map.getZoom() ?? 4;
    if (current === target) { onComplete?.(); return; }
    const direction = target > current ? 1 : -1;
    window.google.maps.event.addListenerOnce(map, "zoom_changed", () => {
      smoothZoom(map, target, onComplete);
    });
    setTimeout(() => map.setZoom(current + direction), 80);
  }, []);

  // 4-step fly: Australia → State → Suburb → Street
  useEffect(() => {
    if (!mapsReady || !mapRef.current || !selectedId) return;
    if (selectedId === prevSelectedId.current) return;
    prevSelectedId.current = selectedId;

    const project = projects.find((p) => p.id === selectedId);
    if (!project) return;

    const map = mapRef.current;
    const stateCentre = STATE_CENTRES[project.state];
    const projectPos = { lat: project.lat, lng: project.lng };
    const suburbPos  = { lat: project.lat, lng: project.lng };

    // Step 1 — pull back to Australia
    map.panTo({ lat: -27.0, lng: 133.0 });
    smoothZoom(map, 4, () => {
      // Step 2 — fly to state
      map.panTo({ lat: stateCentre.lat, lng: stateCentre.lng });
      smoothZoom(map, stateCentre.zoom, () => {
        // Step 3 — move to suburb
        map.panTo(suburbPos);
        smoothZoom(map, 13, () => {
          // Step 4 — land on property + info window
          map.panTo(projectPos);
          smoothZoom(map, 17, () => {
            const marker = markersRef.current.get(project.id);
            if (marker && infoWindowRef.current) {
              infoWindowRef.current.setContent(`
                <div style="font-family:Arial,sans-serif;max-width:240px;padding:4px 2px">
                  <p style="font-weight:700;font-size:13px;margin:0 0 3px">${project.address}</p>
                  <p style="color:#666;font-size:12px;margin:0 0 6px">${project.suburb}, ${project.state} ${project.postcode}</p>
                  <span style="background:#007a6e;color:#fff;font-size:11px;padding:2px 10px;border-radius:99px">${project.type}</span>
                  <p style="font-weight:700;color:#007a6e;margin:8px 0 0;font-size:15px">$${project.price} AUD</p>
                </div>`);
              infoWindowRef.current.open(map, marker);
            }
          });
        });
      });
    });
  }, [mapsReady, selectedId, projects, smoothZoom]);

  // Draw search radius circle
  useEffect(() => {
    if (!mapsReady || !mapRef.current) return;

    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }

    if (searchCenter) {
      circleRef.current = new window.google.maps.Circle({
        map: mapRef.current,
        center: searchCenter,
        radius: radiusKm * 1000,
        strokeColor: "#007a6e",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#007a6e",
        fillOpacity: 0.08,
      });
      const bounds = circleRef.current.getBounds();
      if (bounds) mapRef.current.fitBounds(bounds);
    } else if (!selectedId) {
      mapRef.current.setCenter({ lat: -27.0, lng: 133.0 });
      mapRef.current.setZoom(4);
    }
  }, [mapsReady, searchCenter, radiusKm, selectedId]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="w-full h-full bg-gray-100 rounded-xl flex flex-col items-center justify-center p-6 gap-4">
        <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <p className="text-gray-500 font-medium text-center">Add your Google Maps API key to .env.local to enable the map</p>
      </div>
    );
  }

  return <div ref={mapDivRef} className="w-full h-full rounded-xl" />;
}
