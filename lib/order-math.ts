/**
 * lib/order-math.ts
 * Shared order subtotal calculation used by both CatalogClient.tsx (live running
 * total while browsing) and confirm-order/page.tsx (checkout screen).
 *
 * Uses integer-cent arithmetic throughout to avoid floating-point precision issues.
 */

export interface CartItemForMath {
  veg_id: string;
  qty: number;
  unit?: string;
  current_price?: string | null;
}

/**
 * Computes the subtotal in integer cents for the given cart items.
 * freshPrices overrides each item's stored current_price when available
 * (e.g. after a server revalidation fetch on the confirm-order page).
 *
 * An item is considered "priced" when its resolved price string is a
 * finite non-negative number. Items with null / empty / missing prices
 * contribute 0 to the total (they are unpriced).
 *
 * @returns subtotalCents  Sum of (priceCents × qty) for all priced items.
 */
export function computeSubtotalCents(
  items: CartItemForMath[],
  freshPrices: Map<string, string | null> = new Map()
): number {
  return items.reduce((sum, item) => {
    // Piece-mode items have variable weight — price is determined at billing time when weighed
    if (item.unit === "piece") {
      return sum;
    }
    const priceStr = freshPrices.get(item.veg_id) ?? item.current_price;
    if (
      priceStr === undefined ||
      priceStr === null ||
      priceStr === "" ||
      !Number.isFinite(Number(priceStr)) ||
      Number(priceStr) < 0
    ) {
      return sum;
    }
    // Skip invalid quantities so a malformed cart item can't corrupt the total.
    if (!Number.isFinite(item.qty) || item.qty < 0) {
      return sum;
    }
    const priceCents = Math.round(Number(priceStr) * 100);
    return sum + Math.round(priceCents * item.qty);
  }, 0);
}

/**
 * Returns the list of items that have a valid resolved price.
 */
export function getPricedItems(
  items: CartItemForMath[],
  freshPrices: Map<string, string | null> = new Map()
): CartItemForMath[] {
  return items.filter((item) => {
    if (item.unit === "piece") return false; // piece-mode items are weighed & priced during billing
    const priceStr = freshPrices.get(item.veg_id) ?? item.current_price;
    return (
      priceStr !== undefined &&
      priceStr !== null &&
      priceStr !== "" &&
      Number.isFinite(Number(priceStr)) &&
      Number(priceStr) >= 0
    );
  });
}

