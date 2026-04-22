"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

declare global {
  interface Window {
    google: typeof google;
    initAdminMap: () => void;
  }
}

const TYPES = ["Multi-Unit", "Dual Occupancy", "Subdivision", "Townhouse", "Apartment"];
const AU_STATES = ["VIC", "NSW", "QLD", "SA", "WA", "TAS", "NT", "ACT"];

export default function AdminUploadPage() {
  const [address, setAddress]     = useState("");
  const [suburb, setSuburb]       = useState("");
  const [state, setState]         = useState("VIC");
  const [postcode, setPostcode]   = useState("");
  const [lat, setLat]             = useState("");
  const [lng, setLng]             = useState("");
  const [type, setType]           = useState("Multi-Unit");
  const [description, setDescription] = useState("");
  const [landSize, setLandSize]   = useState("");
  const [units, setUnits]         = useState("");
  const [price, setPrice]         = useState("0");

  const [photo, setPhoto]             = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);

  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Google Maps autocomplete
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

        // Auto-fill suburb, state, postcode, lat, lng from place components
        let foundSuburb = "", foundState = "", foundPostcode = "";
        for (const comp of place.address_components ?? []) {
          if (comp.types.includes("locality")) foundSuburb = comp.long_name;
          if (comp.types.includes("administrative_area_level_1")) foundState = comp.short_name;
          if (comp.types.includes("postal_code")) foundPostcode = comp.long_name;
        }
        if (foundSuburb)  setSuburb(foundSuburb);
        if (foundState)   setState(foundState);
        if (foundPostcode) setPostcode(foundPostcode);
        if (place.geometry?.location) {
          setLat(place.geometry.location.lat().toFixed(6));
          setLng(place.geometry.location.lng().toFixed(6));
        }
      });
    }

    if (window.google?.maps?.places) { initAutocomplete(); return; }
    if (document.getElementById("gmap-admin-script")) return;
    window.initAdminMap = initAutocomplete;
    const script = document.createElement("script");
    script.id = "gmap-admin-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=initAdminMap`;
    script.async = true;
    document.head.appendChild(script);
  }, []);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhoto(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    } else {
      setPhotoPreview(null);
    }
  }

  function handleAttachmentsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setAttachments(prev => {
      const names = new Set(prev.map(f => f.name));
      return [...prev, ...files.filter(f => !names.has(f.name))];
    });
  }

  function removeAttachment(name: string) {
    setAttachments(prev => prev.filter(f => f.name !== name));
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!address || !suburb || !postcode) {
      setError("Please fill in address, suburb, and postcode.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("address", address);
      formData.append("suburb", suburb);
      formData.append("state", state);
      formData.append("postcode", postcode);
      formData.append("lat", lat);
      formData.append("lng", lng);
      formData.append("type", type);
      formData.append("description", description);
      formData.append("landSize", landSize);
      formData.append("units", units);
      formData.append("price", price);
      if (photo) formData.append("photo", photo);
      for (const file of attachments) formData.append("attachments", file);

      const res = await fetch("/api/admin/upload-project", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Upload failed.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-[#e6f4f2] flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[#007a6e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Project Uploaded!</h2>
          <p className="text-gray-500 mb-6">The project has been added and will appear on the projects page.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setSuccess(false); setAddress(""); setSuburb(""); setPostcode(""); setLat(""); setLng(""); setDescription(""); setLandSize(""); setUnits(""); setPhoto(null); setPhotoPreview(null); setAttachments([]); }}
              className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
            >
              Add Another
            </button>
            <Link href="/projects"
              className="px-5 py-2.5 rounded-lg text-white font-medium"
              style={{ backgroundColor: "#007a6e" }}>
              View Projects
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 px-4 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/projects" className="text-sm text-gray-400 hover:text-gray-600">← Back to Projects</Link>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-2">Upload New Project</h1>
          <p className="text-gray-500 text-sm mt-1">Add a project with photos and attachments. Attachments will be packed into a downloadable .zip.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── ADDRESS ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Property Address</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Address <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                <input ref={inputRef} type="text" value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="Start typing an Australian address…"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007a6e]" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Suburb <span className="text-red-500">*</span></label>
                <input type="text" value={suburb} onChange={e => setSuburb(e.target.value)}
                  placeholder="Box Hill"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007a6e]" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <select value={state} onChange={e => setState(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007a6e]">
                  {AU_STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Postcode <span className="text-red-500">*</span></label>
                <input type="text" value={postcode} onChange={e => setPostcode(e.target.value)}
                  placeholder="3128"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007a6e]" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={type} onChange={e => setType(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007a6e]">
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude (auto-filled)</label>
                <input type="text" value={lat} onChange={e => setLat(e.target.value)}
                  placeholder="-37.819"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007a6e] bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude (auto-filled)</label>
                <input type="text" value={lng} onChange={e => setLng(e.target.value)}
                  placeholder="145.122"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007a6e] bg-gray-50" />
              </div>
            </div>
          </div>

          {/* ── PROJECT DETAILS ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Project Details</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Proposed 12-unit development on a 1,865m² site…"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007a6e] resize-none" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Land Size (m²)</label>
                <input type="number" value={landSize} onChange={e => setLandSize(e.target.value)}
                  placeholder="1865"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007a6e]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Units</label>
                <input type="number" value={units} onChange={e => setUnits(e.target.value)}
                  placeholder="12"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007a6e]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (AUD)</label>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                  placeholder="50"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007a6e]" />
              </div>
            </div>
          </div>

          {/* ── FRONT PHOTO ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
            <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Front Photo</h2>
            <p className="text-xs text-gray-400">The main property photo shown on the project card.</p>

            <label className="block">
              <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${photoPreview ? "border-[#007a6e] bg-[#f0faf8]" : "border-gray-200 hover:border-[#007a6e] hover:bg-gray-50"}`}>
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full max-h-48 object-cover rounded-lg mb-2" />
                ) : (
                  <>
                    <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-gray-500">Click to upload front photo</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP</p>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </div>
            </label>
            {photoPreview && (
              <button type="button" onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                className="text-xs text-red-400 hover:text-red-600">Remove photo</button>
            )}
          </div>

          {/* ── ATTACHMENTS ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
            <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Attachments</h2>
            <p className="text-xs text-gray-400">Upload documents, plans, or photos. All files will be packed into a single .zip for download.</p>

            <label className="block">
              <div className="border-2 border-dashed border-gray-200 hover:border-[#007a6e] hover:bg-gray-50 rounded-xl p-6 text-center cursor-pointer transition-colors">
                <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <p className="text-sm text-gray-500">Click to add files</p>
                <p className="text-xs text-gray-400 mt-1">PDF, DOCX, JPG, PNG, DWG — any file type</p>
                <input type="file" multiple className="hidden" onChange={handleAttachmentsChange} />
              </div>
            </label>

            {attachments.length > 0 && (
              <ul className="space-y-2">
                {attachments.map(f => (
                  <li key={f.name} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm text-gray-700 truncate">{f.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{formatBytes(f.size)}</span>
                    </div>
                    <button type="button" onClick={() => removeAttachment(f.name)}
                      className="text-gray-300 hover:text-red-400 flex-shrink-0 ml-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
                <p className="text-xs text-[#007a6e] font-medium">
                  {attachments.length} file{attachments.length !== 1 ? "s" : ""} → will be zipped on upload
                </p>
              </ul>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-4 rounded-xl text-white font-bold text-base transition-colors disabled:opacity-60"
            style={{ backgroundColor: loading ? "#999" : "#007a6e" }}>
            {loading ? "Uploading…" : "Upload Project"}
          </button>
        </form>
      </div>
    </div>
  );
}
