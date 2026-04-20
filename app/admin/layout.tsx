"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

const ADMIN_EMAIL = "newgeneration.au@gmail.com";

const NAV = [
  { href: "/admin/projects", label: "Listings", icon: "🏠" },
  { href: "/admin/crm", label: "CRM", icon: "👥" },
  { href: "/admin/upload", label: "Add Project", icon: "➕" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (pathname === "/admin/login") { setChecking(false); return; }
    if (!supabase) { router.replace("/admin/login"); return; }
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user || data.user.email !== ADMIN_EMAIL) {
        router.replace("/admin/login");
      } else {
        setChecking(false);
      }
    });
  }, [pathname]);

  if (pathname === "/admin/login") return <>{children}</>;
  if (checking) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#007a6e" }}>
              <span className="text-white font-extrabold text-xs">DF</span>
            </div>
            <div>
              <p className="text-xs font-extrabold text-gray-900 leading-none">development feaso</p>
              <p className="text-xs text-gray-400">Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith(item.href)
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}>
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50">
            ← View Site
          </Link>
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 mt-1">
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
