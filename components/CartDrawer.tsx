"use client";

import { useCartStore } from "@/lib/cart-store";
import { useState, useEffect } from "react";

export default function CartDrawer() {
  const { items, removeItem, clearCart, total, count } = useCartStore();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItems: items }),
      });
      const data = await res.json();
      if (data.url) {
        clearCart();
        window.location.href = data.url;
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Cart button */}
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center gap-2 px-4 py-2 rounded-md text-white text-sm font-semibold transition-colors"
        style={{ backgroundColor: "#007a6e" }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <span className="hidden sm:inline">Cart</span>
        {mounted && count() > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">
            {count()}
          </span>
        )}
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white w-full max-w-md h-full flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Your Cart ({count()})</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {items.length === 0 ? (
                <div className="text-center py-16">
                  <svg className="w-12 h-12 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-gray-400">Your cart is empty</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.project.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                      style={{ backgroundColor: "#007a6e" }}
                    >
                      {item.project.type.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {item.project.address}
                      </p>
                      <p className="text-gray-500 text-xs">{item.project.suburb}, {item.project.state}</p>
                      <p className="text-[#007a6e] font-bold text-sm mt-1">${item.project.price} AUD</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.project.id)}
                      className="text-gray-300 hover:text-red-400 flex-shrink-0 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100">
                <div className="flex justify-between mb-4">
                  <span className="font-semibold text-gray-700">Total</span>
                  <span className="font-extrabold text-xl text-gray-900">${total()} AUD</span>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="w-full py-3 rounded-lg text-white font-bold transition-colors disabled:opacity-60"
                  style={{ backgroundColor: loading ? "#999" : "#007a6e" }}
                >
                  {loading ? "Redirecting…" : "Checkout Securely"}
                </button>
                <button
                  onClick={clearCart}
                  className="w-full mt-2 py-2 text-sm text-gray-400 hover:text-red-400 transition-colors"
                >
                  Clear cart
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
