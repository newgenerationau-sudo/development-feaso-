"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";

type Mode = "magic" | "password";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [usePhone, setUsePhone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const supabase = createClient();

  async function handleMagicLink() {
    if (!supabase) return;
    setLoading(true); setError(""); setMessage("");
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
    if (error) setError(error.message);
    else setMessage("Check your email — we sent you a login link!");
    setLoading(false);
  }

  async function handlePassword(type: "login" | "signup") {
    if (!supabase) return;
    setLoading(true); setError(""); setMessage("");
    if (type === "signup") {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
      if (error) setError(error.message);
      else setMessage("Account created! Check your email to confirm.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else location.href = "/";
    }
    setLoading(false);
  }

  async function handleGoogle() {
    if (!supabase) return;
    setLoading(true);
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback` } });
  }

  async function handlePhoneOtp() {
    if (!supabase) return;
    setLoading(true); setError(""); setMessage("");
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) setError(error.message);
    else setMessage("SMS sent! Enter the code below.");
    setLoading(false);
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12" style={{ backgroundColor: "#f7f7f7" }}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#007a6e" }}>
              <span className="text-white font-extrabold text-sm">DF</span>
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold text-gray-900">Sign in to Development Feaso</h1>
          <p className="text-gray-500 text-sm mt-2">Create an account to order reports and track your projects</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Google login */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors mb-6 disabled:opacity-60"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Mode tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-5">
            <button
              onClick={() => setMode("magic")}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${mode === "magic" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
            >
              Magic Link
            </button>
            <button
              onClick={() => setMode("password")}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${mode === "password" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
            >
              Email + Password
            </button>
          </div>

          {/* Phone toggle */}
          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <div
              onClick={() => setUsePhone(!usePhone)}
              className={`w-10 h-5 rounded-full transition-colors relative ${usePhone ? "bg-[#007a6e]" : "bg-gray-300"}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${usePhone ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm text-gray-600">Use mobile number (SMS)</span>
          </label>

          {usePhone ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  placeholder="+61 4XX XXX XXX"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007a6e]"
                />
              </div>
              <button
                onClick={handlePhoneOtp}
                disabled={loading || !phone}
                className="w-full py-3 rounded-lg text-white font-bold disabled:opacity-60"
                style={{ backgroundColor: "#007a6e" }}
              >
                {loading ? "Sending…" : "Send SMS Code"}
              </button>
            </div>
          ) : mode === "magic" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007a6e]"
                />
              </div>
              <button
                onClick={handleMagicLink}
                disabled={loading || !email}
                className="w-full py-3 rounded-lg text-white font-bold disabled:opacity-60"
                style={{ backgroundColor: "#007a6e" }}
              >
                {loading ? "Sending…" : "Send Magic Link"}
              </button>
              <p className="text-xs text-gray-400 text-center">We&apos;ll email you a one-click login link. No password needed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007a6e]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007a6e]"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePassword("login")}
                  disabled={loading || !email || !password}
                  className="flex-1 py-3 rounded-lg text-white font-bold disabled:opacity-60"
                  style={{ backgroundColor: "#007a6e" }}
                >
                  {loading ? "…" : "Sign In"}
                </button>
                <button
                  onClick={() => handlePassword("signup")}
                  disabled={loading || !email || !password}
                  className="flex-1 py-3 rounded-lg font-bold border-2 border-[#007a6e] text-[#007a6e] disabled:opacity-60 hover:bg-[#e6f4f2] transition-colors"
                >
                  {loading ? "…" : "Sign Up"}
                </button>
              </div>
            </div>
          )}

          {message && <div className="mt-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">{message}</div>}
          {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          By signing in you agree to our{" "}
          <a href="#" className="underline">Terms of Use</a> and{" "}
          <a href="#" className="underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
