"use client";

import Link from "next/link";
import { useState } from "react";

const footerTabs = ["Development Feaso", "Popular Areas", "Popular Searches"];

const stateLinks = [
  { label: "Feasibility Reports VIC", href: "/projects" },
  { label: "Feasibility Reports NSW", href: "/projects" },
  { label: "Feasibility Reports QLD", href: "/projects" },
  { label: "Feasibility Reports WA", href: "/projects" },
  { label: "Feasibility Reports SA", href: "/projects" },
  { label: "Feasibility Reports TAS", href: "/projects" },
  { label: "Feasibility Reports ACT", href: "/projects" },
  { label: "Feasibility Reports NT", href: "/projects" },
  { label: "Feasibility Reports Melbourne", href: "/projects" },
  { label: "Feasibility Reports Sydney", href: "/projects" },
  { label: "Feasibility Reports Brisbane", href: "/projects" },
  { label: "Feasibility Reports Perth", href: "/projects" },
];

const popularAreas = [
  "Melbourne CBD", "South Yarra", "Fitzroy", "Richmond",
  "Sydney CBD", "Paddington", "Mosman", "Surry Hills",
  "Brisbane City", "West End", "Fortitude Valley", "New Farm",
];

const popularSearches = [
  "Dual Occupancy Melbourne",
  "Subdivision Sydney",
  "Multi-Unit Brisbane",
  "Townhouse Development VIC",
  "Apartment Feasibility NSW",
  "Development Report QLD",
];

export default function Footer() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <footer className="bg-white border-t border-gray-200">
      {/* Tab navigation */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-0">
            {footerTabs.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === i
                    ? "border-[#007a6e] text-[#007a6e]"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-4">Feasibility Reports in Australia</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-2">
              {stateLinks.map((link) => (
                <Link key={link.label} href={link.href} className="text-sm text-gray-500 hover:text-[#007a6e] hover:underline">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
        {activeTab === 1 && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-4">Popular Areas</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-2">
              {popularAreas.map((area) => (
                <Link key={area} href="/projects" className="text-sm text-gray-500 hover:text-[#007a6e] hover:underline">
                  {area}
                </Link>
              ))}
            </div>
          </div>
        )}
        {activeTab === 2 && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-4">Popular Searches</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2">
              {popularSearches.map((s) => (
                <Link key={s} href="/projects" className="text-sm text-gray-500 hover:text-[#007a6e] hover:underline">
                  {s}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Social icons */}
            <div className="flex items-center gap-4">
              {/* Facebook */}
              <a href="#" aria-label="Facebook" className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                </svg>
              </a>
              {/* Instagram */}
              <a href="#" aria-label="Instagram" className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
                </svg>
              </a>
              {/* LinkedIn */}
              <a href="#" aria-label="LinkedIn" className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
              {/* YouTube */}
              <a href="#" aria-label="YouTube" className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58z" />
                  <polygon fill="white" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
                </svg>
              </a>
            </div>

            {/* Legal links */}
            <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-400">
              <a href="#" className="hover:text-gray-600">Contact us</a>
              <a href="#" className="hover:text-gray-600">Privacy Policy</a>
              <a href="#" className="hover:text-gray-600">Terms of Use</a>
              <a href="#" className="hover:text-gray-600">Sitemap</a>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-4 text-center sm:text-left">
            © {new Date().getFullYear()} Development Feaso. All rights reserved. Australia-wide property feasibility service.
          </p>
        </div>
      </div>
    </footer>
  );
}
