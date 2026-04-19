"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Project } from "./projects";

export interface CartItem {
  project: Project;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (project: Project) => void;
  removeItem: (projectId: string) => void;
  clearCart: () => void;
  total: () => number;
  count: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (project) => {
        const existing = get().items.find((i) => i.project.id === project.id);
        if (existing) return; // already in cart
        set((state) => ({ items: [...state.items, { project, quantity: 1 }] }));
      },

      removeItem: (projectId) => {
        set((state) => ({ items: state.items.filter((i) => i.project.id !== projectId) }));
      },

      clearCart: () => set({ items: [] }),

      total: () => get().items.reduce((sum, i) => sum + i.project.price * i.quantity, 0),

      count: () => get().items.length,
    }),
    { name: "feaso-cart" }
  )
);
