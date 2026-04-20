"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const ADMIN_EMAIL = "newgeneration.au@gmail.com";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (email !== ADMIN_EMAIL) {
      setError("Access denied.");
      setLoading(false);
      return;
    }

    if (!supabase) {
      setError("Supabase not configured.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/admin/projects");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#007a6e" }}>
            <span className="text-white font-extrabold text-sm">DF</span>
          </div>
          <div>
            <p className="text-sm font-extrabold text-gray-900 leading-none">development feaso</p>
            <p className="text-xs text-gray-400">Admin Panel</p>
          </div>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-1">Admin Login</h1>
        <p className="text-sm text-gray-500 mb-6">Restricted access only.</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Admin email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: "#007a6e" }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
