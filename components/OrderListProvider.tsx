"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

export interface OrderItem {
  veg_id: string;
  name_en: string;
  name_ta: string;
  unit: string;
  image_url: string | null;
  qty: number;
}

interface OrderListContextValue {
  items: OrderItem[];
  totalCount: number;
  setQty: (veg_id: string, qty: number, meta?: Omit<OrderItem, "veg_id" | "qty">) => void;
  getQty: (veg_id: string) => number;
  removeItem: (veg_id: string) => void;
  clearAll: () => void;
}

const OrderListContext = createContext<OrderListContextValue | null>(null);

const STORAGE_KEY = "ppr_order_list";

export function OrderListProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<OrderItem[]>([]);
  // useRef instead of useState so we don't trigger a re-render on mount
  const mountedRef = useRef(false);

  // Read from sessionStorage after client mount (prevents SSR hydration mismatch)
  useEffect(() => {
    mountedRef.current = true;
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist to sessionStorage on item state changes after mount
  useEffect(() => {
    if (!mountedRef.current) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  const setQty = useCallback(
    (
      veg_id: string,
      qty: number,
      meta?: Omit<OrderItem, "veg_id" | "qty">
    ) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.veg_id === veg_id);
        if (qty <= 0) {
          return prev.filter((i) => i.veg_id !== veg_id);
        }
        if (existing) {
          return prev.map((i) => (i.veg_id === veg_id ? { ...i, qty } : i));
        }
        if (!meta) return prev; // can't add without metadata
        return [...prev, { veg_id, qty, ...meta }];
      });
    },
    []
  );

  const getQty = useCallback(
    (veg_id: string) => items.find((i) => i.veg_id === veg_id)?.qty ?? 0,
    [items]
  );

  const removeItem = useCallback(
    (veg_id: string) => setItems((prev) => prev.filter((i) => i.veg_id !== veg_id)),
    []
  );

  const clearAll = useCallback(() => {
    setItems([]);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const totalCount = items.length;

  return (
    <OrderListContext.Provider
      value={{ items, totalCount, setQty, getQty, removeItem, clearAll }}
    >
      {children}
    </OrderListContext.Provider>
  );
}

export function useOrderList() {
  const ctx = useContext(OrderListContext);
  if (!ctx) throw new Error("useOrderList must be used inside OrderListProvider");
  return ctx;
}
