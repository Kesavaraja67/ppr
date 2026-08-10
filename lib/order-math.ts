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
    const priceCents = Math.round(Number(priceStr) * 100);
    return sum + priceCents * item.qty;
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
