import {
  jsonb,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";

export const recoveryAuditEvents = pgTable("recovery_audit_events", {
  id: text("id").primaryKey(),

  recoveryAttemptId: text("recovery_attempt_id").notNull(),

  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),

  timestamp: timestamp("timestamp", {
    withTimezone: true,
  }).notNull(),

  actor: text("actor").notNull(),

  meta: text("meta"),
});