import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const recoveryAttempts = pgTable("recovery_attempts", {
  id: text("id").primaryKey(),

  customer: text("customer").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("INR"),

  failureReason: text("failure_reason").notNull(),
  failureCode: text("failure_code").notNull(),

  channel: text("channel").notNull(),
  status: text("status").notNull(),

  attempts: integer("attempts").notNull().default(1),
  maxAttempts: integer("max_attempts").notNull().default(3),

  detectedAt: timestamp("detected_at", {
    withTimezone: true,
  }).notNull(),

  lastAction: text("last_action").notNull(),
  lastActionAt: timestamp("last_action_at", {
    withTimezone: true,
  }).notNull(),

  paymentMethod: text("payment_method"),

  recoveredAt: timestamp("recovered_at", {
    withTimezone: true,
  }),

  expiresAt: timestamp("expires_at", {
    withTimezone: true,
  }),

  razorpayPaymentId: text("razorpay_payment_id"),
  razorpayOrderId: text("razorpay_order_id"),

  razorpayPaymentLinkId: text("razorpay_payment_link_id"),
  razorpayPaymentLinkUrl: text("razorpay_payment_link_url"),
});

export const recoveryConfig = pgTable("recovery_config", {
  id: integer("id").primaryKey().default(1),

  maxAttempts: integer("max_attempts").notNull().default(3),
  cooldownMinutes: integer("cooldown_minutes").notNull().default(45),
  windowHours: integer("window_hours").notNull().default(24),
  discountCap: integer("discount_cap").notNull().default(10),

  enabled: boolean("enabled").notNull().default(true),
});