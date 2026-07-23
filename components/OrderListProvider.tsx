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
  const [items, setItems] = useState<OrderItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const isMounted = useRef(false);

  // Persist to sessionStorage on changes after initial mount
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
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

  const totalCount = items.reduce((sum, i) => sum + i.qty, 0);

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
