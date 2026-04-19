"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import CartDrawer from "./CartDrawer";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#007a6e" }}>
              <span className="text-white font-extrabold text-sm tracking-tight">DF</span>
            </div>
            <div className="leading-tight">
              <span className="block text-sm font-extrabold text-gray-900 leading-none">development</span>
              <span className="block text-sm font-extrabold leading-none" style={{ color: "#007a6e" }}>feaso</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { href: "/", label: "Home" },
              { href: "/projects", label: "Browse Projects" },
              { href: "/order", label: "Custom Report" },
              { href: "/how-it-works", label: "How It Works" },
            ].map((item) => (
              <Link key={item.href} href={item.href}
                className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-[#007a6e] hover:bg-gray-50 rounded-md transition-colors">
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right: Cart + Auth + CTA */}
          <div className="hidden md:flex items-center gap-3">
            <CartDrawer />
            {user ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: "#007a6e" }}>
                  {(user.email ?? "U")[0].toUpperCase()}
                </div>
                <button onClick={handleSignOut}
                  className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
                  Sign Out
                </button>
              </div>
            ) : (
              <Link href="/auth/login"
                className="text-sm font-semibold text-gray-600 hover:text-[#007a6e] transition-colors">
                Sign In
              </Link>
            )}
            <Link href="/order"
              className="px-5 py-2 rounded-md text-white text-sm font-bold transition-colors"
              style={{ backgroundColor: "#007a6e" }}>
              Get Report — $50
            </Link>
          </div>

          {/* Mobile */}
          <div className="flex md:hidden items-center gap-2">
            <CartDrawer />
            <button className="p-2 rounded-md text-gray-600" onClick={() => setMenuOpen(!menuOpen)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 py-3 flex flex-col gap-1">
            {[
              { href: "/", label: "Home" },
              { href: "/projects", label: "Browse Projects" },
              { href: "/order", label: "Custom Report" },
              { href: "/how-it-works", label: "How It Works" },
            ].map((item) => (
              <Link key={item.href} href={item.href}
                className="px-3 py-2 text-gray-700 font-medium rounded-md hover:bg-gray-50"
                onClick={() => setMenuOpen(false)}>
                {item.label}
              </Link>
            ))}
            {user
              ? <button onClick={handleSignOut} className="px-3 py-2 text-left text-gray-700 font-medium">Sign Out</button>
              : <Link href="/auth/login" className="px-3 py-2 text-gray-700 font-medium" onClick={() => setMenuOpen(false)}>Sign In</Link>
            }
          </div>
        )}
      </div>
    </header>
  );
}
