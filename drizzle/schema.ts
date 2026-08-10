import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  timestamp,
  date,
  index,
} from "drizzle-orm/pg-core";

// ─── admins ──────────────────────────────────────────────────────────────────
export const admins = pgTable("admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone"),
  pin_hash: text("pin_hash").notNull(),
  role: text("role").notNull().default("editor"), // 'owner' | 'editor'
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── vegetables ───────────────────────────────────────────────────────────────
export const vegetables = pgTable("vegetables", {
  id: uuid("id").primaryKey().defaultRandom(),
  name_en: text("name_en").notNull(),
  name_ta: text("name_ta").notNull(),
  unit: text("unit").notNull(), // 'kg' | 'bunch' | 'piece' | 'dozen' | 'g'
  category: text("category").notNull().default("vegetable"), // 'vegetable' | 'fruit' | 'leafy' | 'grocery'
  allow_piece_mode: boolean("allow_piece_mode").notNull().default(true),
  // Reference price per unit — nullable if owner hasn't set reference price yet
  current_price: numeric("current_price"),
  original_price: numeric("original_price"),
  // in_stock kept but no longer surfaced as daily action — treat all listed items as orderable
  in_stock: boolean("in_stock").notNull().default(true),
  image_url: text("image_url"),
  is_curated_image: boolean("is_curated_image").default(false),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  updated_by: uuid("updated_by").references(() => admins.id),
});

// ─── shop_config ──────────────────────────────────────────────────────────────
export const shop_config = pgTable("shop_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  shop_name: text("shop_name").notNull().default("PPR Fruits & Vegetables"),
  owner_name: text("owner_name").notNull(),
  phone_number: text("phone_number").notNull(),
  lat: numeric("lat").notNull(),
  long: numeric("long").notNull(),
  // Hard gate: orders outside this radius are rejected at address-save time
  delivery_radius_km: numeric("delivery_radius_km").notNull().default("3"),
  // v1 legacy — kept for compat, not used in v2 delivery logic
  free_delivery_threshold: numeric("free_delivery_threshold").notNull().default("500"),
  // v2 — three category-based thresholds (Section 8)
  free_delivery_veg_threshold: numeric("free_delivery_veg_threshold").notNull().default("500"),
  free_delivery_fruit_threshold: numeric("free_delivery_fruit_threshold").notNull().default("1000"),
  free_delivery_mixed_threshold: numeric("free_delivery_mixed_threshold").notNull().default("700"),
  flat_delivery_charge: numeric("flat_delivery_charge").notNull().default("20"),
  min_order_amount: numeric("min_order_amount").notNull().default("500"),
  covered_areas: text("covered_areas").array(),
  // daily_blurb kept in schema but cron and display are retired in v2
  daily_blurb: text("daily_blurb"),
  daily_blurb_updated_at: timestamp("daily_blurb_updated_at", { withTimezone: true }),
  // ── On-leave / closed-for-holiday banner (R7) ────────────────────────────
  is_on_leave: boolean("is_on_leave").notNull().default(false),
  leave_start_date: date("leave_start_date"),   // inclusive start (YYYY-MM-DD)
  leave_end_date: date("leave_end_date"),       // inclusive end   (YYYY-MM-DD)
  leave_message: text("leave_message"),         // optional custom message
});

// ─── offers (retired in v2 — kept in schema to avoid data loss) ───────────────
// Do not use in any new code. The offers feature was removed in the v2 pivot.
export const offers = pgTable("offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  veg_id: uuid("veg_id").references(() => vegetables.id),
  min_qty: numeric("min_qty").notNull(),
  discount_type: text("discount_type").notNull(), // 'flat' | 'percent'
  discount_value: numeric("discount_value").notNull(),
  label: text("label").notNull(),
  active: boolean("active").default(true),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── supplier_requests ────────────────────────────────────────────────────────
export const supplier_requests = pgTable("supplier_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  veg_name: text("veg_name").notNull(),
  approx_qty: text("approx_qty"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  seen: boolean("seen").default(false),
});

// ─── call_taps (lightweight first-party analytics) ───────────────────────────
export const call_taps = pgTable("call_taps", {
  id: uuid("id").primaryKey().defaultRandom(),
  tapped_at: timestamp("tapped_at", { withTimezone: true }).defaultNow(),
});

// ─── users (customer accounts, authenticated via mobile OTP) ─────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone_number: text("phone_number").notNull().unique(),
  name: text("name"), // optional, collected post-signup
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── addresses ───────────────────────────────────────────────────────────────
export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id").references(() => users.id),
    full_address: text("full_address").notNull(),
    lat: numeric("lat", { mode: "number" }).notNull(),
    long: numeric("long", { mode: "number" }).notNull(),
    // Computed at save time using Haversine against shop_config coordinates + radius
    is_within_range: boolean("is_within_range").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("idx_addresses_user_id").on(t.user_id)]
);

// ─── orders ───────────────────────────────────────────────────────────────────
// Every order is for next-day delivery. Prices are null until admin prices the order.
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id").references(() => users.id),
    address_id: uuid("address_id").references(() => addresses.id),
    delivery_date: date("delivery_date").notNull(), // always tomorrow relative to created_at
    status: text("status").notNull().default("pending"),
    // 'pending' | 'cancelled' | 'priced' | 'out_for_delivery' | 'delivered'
    subtotal: numeric("subtotal"),              // null until admin prices
    delivery_charge: numeric("delivery_charge"), // null until admin prices
    total_amount: numeric("total_amount"),       // null until admin prices
    cancellable_until: timestamp("cancellable_until", { withTimezone: true }).notNull(),
    // 10:00 PM on day of placement
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
    priced_at: timestamp("priced_at", { withTimezone: true }),
    // Client-generated UUID for idempotent order submission (prevents duplicate orders
    // on network retries / double-taps). Null for orders placed before this field was added.
    client_request_id: text("client_request_id").unique(),
  },
  (t) => [
    index("idx_orders_user_id").on(t.user_id),
    index("idx_orders_address_id").on(t.address_id),
  ]
);

// ─── order_items ─────────────────────────────────────────────────────────────────────
export const order_items = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    order_id: uuid("order_id").references(() => orders.id),
    veg_id: uuid("veg_id").references(() => vegetables.id),
    requested_qty: numeric("requested_qty").notNull(), // minimum 1 per spec
    unit: text("unit").notNull(),
    price_per_unit: numeric("price_per_unit"), // null until admin prices
    line_total: numeric("line_total"),          // null until admin prices
  },
  (t) => [
    index("idx_order_items_order_id").on(t.order_id),
    index("idx_order_items_veg_id").on(t.veg_id),
  ]
);
