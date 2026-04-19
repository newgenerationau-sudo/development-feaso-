"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

declare global {
  interface Window {
    google: typeof google;
    initOrderMap: () => void;
  }
}

function OrderForm() {
  const searchParams = useSearchParams();
  const prefilled = searchParams.get("q") ?? "";

  const [address, setAddress] = useState(prefilled);
  const [addressLocked, setAddressLocked] = useState(!!prefilled);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [propertyCoords, setPropertyCoords] = useState<{ lat: number; lng: number } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  function attachAutocomplete() {
    if (!inputRef.current) return;
    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "au" },
      types: ["address"],
    });
    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace();
      if (place?.formatted_address) { setAddress(place.formatted_address); setAddressLocked(true); }
      if (place?.geometry?.location) {
        setPropertyCoords({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
      }
    });
  }

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || typeof window === "undefined") return;

    if (window.google?.maps?.places) { attachAutocomplete(); return; }
    if (document.getElementById("gmap-order-script")) return;

    window.initOrderMap = attachAutocomplete;
    const script = document.createElement("script");
    script.id = "gmap-order-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=initOrderMap`;
    script.async = true;
    document.head.appendChild(script);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When unlocking the address field, focus + re-attach autocomplete
  useEffect(() => {
    if (!addressLocked && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      if (window.google?.maps?.places) attachAutocomplete();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressLocked]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!address.trim()) { setError("Please enter a property address."); return; }
    if (!name.trim() || !email.trim()) { setError("Please fill in your name and email."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/quote-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, name, email, phone, notes }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Geocode a pre-filled address that came from the homepage (no place_changed fired)
  useEffect(() => {
    if (!prefilled || propertyCoords) return;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;
    fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(prefilled)}&key=${apiKey}`)
      .then(r => r.json())
      .then(d => {
        if (d.status === "OK" && d.results[0]) {
          const loc = d.results[0].geometry.location;
          setPropertyCoords({ lat: loc.lat, lng: loc.lng });
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-[#e6f4f2] flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[#007a6e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Request Received!</h2>
          <p className="text-gray-500 mb-2">
            Thank you, <strong>{name}</strong>! We&apos;ve received your enquiry for:
          </p>
          <p className="text-gray-700 font-semibold mb-4">{address}</p>
          <p className="text-gray-400 text-sm">
            Our team will review your property and send you a free quote to <strong>{email}</strong> within 1–2 business days.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 px-4" style={{ backgroundColor: "#f7f7f7" }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Request a Free Quote</h1>
          <p className="text-gray-500 text-lg">
            Enter your property address and we&apos;ll send you a personalised feasibility quote — no obligation, no cost.
          </p>
        </div>

        {/* How it works banner */}
        <div className="flex items-center justify-center gap-8 mb-8 bg-white border border-gray-100 rounded-2xl px-6 py-4 shadow-sm text-sm text-gray-500">
          <span className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-[#e6f4f2] text-[#007a6e] font-bold flex items-center justify-center text-xs">1</span>Submit your address</span>
          <span className="text-gray-200">→</span>
          <span className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-[#e6f4f2] text-[#007a6e] font-bold flex items-center justify-center text-xs">2</span>We review the site</span>
          <span className="text-gray-200">→</span>
          <span className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-[#e6f4f2] text-[#007a6e] font-bold flex items-center justify-center text-xs">3</span>Free quote sent to you</span>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Property Address <span className="text-red-500">*</span>
              </label>

              {addressLocked ? (
                /* ── Locked: show confirmed address with a Change button ── */
                <div className="flex items-center gap-3 px-4 py-3 border-2 border-[#007a6e] rounded-lg bg-[#f0faf8]">
                  <svg className="w-5 h-5 text-[#007a6e] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="flex-1 text-gray-900 text-sm font-medium truncate">{address}</span>
                  <button
                    type="button"
                    onClick={() => { setAddressLocked(false); setPropertyCoords(null); }}
                    className="flex-shrink-0 flex items-center gap-1.5 text-sm font-semibold text-[#007a6e] hover:text-[#005a50] border border-[#007a6e] rounded-md px-3 py-1 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Change address
                  </button>
                </div>
              ) : (
                /* ── Unlocked: editable input with autocomplete ── */
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Start typing an Australian address…"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007a6e] focus:border-transparent"
                    required
                  />
                </div>
              )}
              {!addressLocked && (
                <p className="text-xs text-gray-400 mt-1">Australian addresses only. Start typing and select from suggestions.</p>
              )}

              {/* Property preview */}
              {propertyCoords && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
                <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  <div className="flex h-44">
                    <div className="relative flex-1">
                      <img
                        src={`https://maps.googleapis.com/maps/api/staticmap?center=${propertyCoords.lat},${propertyCoords.lng}&zoom=19&size=600x400&maptype=satellite&markers=color:red%7C${propertyCoords.lat},${propertyCoords.lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                        alt="Satellite view"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded font-medium">
                        Bird&apos;s Eye View
                      </span>
                    </div>
                    <div className="relative flex-1 border-l border-white/20">
                      <img
                        src={`https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${propertyCoords.lat},${propertyCoords.lng}&fov=90&pitch=5&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                        alt="Street view"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded font-medium">
                        Street View
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-3 py-2 text-xs text-gray-500 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-[#007a6e]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    {address}
                  </div>
                </div>
              )}
            </div>

            {/* Name + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="John Smith"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007a6e] focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007a6e] focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number (optional)</label>
              <input
                type="tel"
                placeholder="04XX XXX XXX"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007a6e] focus:border-transparent"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Additional Notes (optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Interested in subdividing, dual occupancy, multi-unit development…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007a6e] focus:border-transparent resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-lg text-white font-bold text-lg transition-colors disabled:opacity-60"
              style={{ backgroundColor: loading ? "#999" : "#007a6e" }}
            >
              {loading ? "Sending your request…" : "Send Us Your Request — Get a Free Quote"}
            </button>

            <p className="text-center text-xs text-gray-400">
              100% free — no payment required. We&apos;ll contact you with a personalised quote.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense>
      <OrderForm />
    </Suspense>
  );
}
