import {
  boolean,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const razorpayWebhookEvents = pgTable("razorpay_webhook_events", {
  eventId: text("event_id").primaryKey(),

  event: text("event").notNull(),

  receivedAt: timestamp("received_at", {
    withTimezone: true,
  }).notNull(),

  processed: boolean("processed").notNull().default(false),
});
