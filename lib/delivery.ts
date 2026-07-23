/**
 * Delivery charge computation — Section 8 of the v2 brief.
 * Pure function: no DB access, fully testable in isolation.
 *
 * Rules:
 *   - Vegetable-only orders: free if subtotal >= veg_threshold
 *   - Fruit-only orders:     free if subtotal >= fruit_threshold
 *   - Mixed orders:          free if subtotal >= mixed_threshold
 *   - Otherwise:             flat_delivery_charge applied
 */

export interface DeliveryConfig {
  free_delivery_veg_threshold: number;   // default ₹500
  free_delivery_fruit_threshold: number; // default ₹1000
  free_delivery_mixed_threshold: number; // default ₹700
  flat_delivery_charge: number;          // owner-editable, e.g. ₹50
}

export interface OrderLineCategorized {
  category: "vegetable" | "fruit" | "leafy"; // leafy treated as vegetable for threshold logic
  line_total: number;
}

export interface DeliveryResult {
  vegetable_total: number;
  fruit_total: number;
  subtotal: number;
  threshold_used: number;
  delivery_charge: number;
  total_amount: number;
  is_free_delivery: boolean;
}

export function computeDeliveryCharge(
  lines: OrderLineCategorized[],
  config: DeliveryConfig
): DeliveryResult {
  // Leafy greens are treated as vegetables for delivery threshold logic
  const vegetable_total = lines
    .filter((l) => l.category === "vegetable" || l.category === "leafy")
    .reduce((sum, l) => sum + l.line_total, 0);

  const fruit_total = lines
    .filter((l) => l.category === "fruit")
    .reduce((sum, l) => sum + l.line_total, 0);

  const subtotal = vegetable_total + fruit_total;

  const has_vegetables = vegetable_total > 0;
  const has_fruits = fruit_total > 0;

  let threshold: number;
  let relevant_total: number;

  if (has_vegetables && has_fruits) {
    threshold = config.free_delivery_mixed_threshold;
    relevant_total = subtotal;
  } else if (has_vegetables) {
    threshold = config.free_delivery_veg_threshold;
    relevant_total = vegetable_total;
  } else {
    // fruit only (or empty, edge case)
    threshold = config.free_delivery_fruit_threshold;
    relevant_total = fruit_total;
  }

  const is_free_delivery = relevant_total >= threshold;
  const delivery_charge = is_free_delivery ? 0 : config.flat_delivery_charge;
  const total_amount = subtotal + delivery_charge;

  return {
    vegetable_total,
    fruit_total,
    subtotal,
    threshold_used: threshold,
    delivery_charge,
    total_amount,
    is_free_delivery,
  };
}
