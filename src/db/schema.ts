import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Auth.js required tables for DrizzleAdapter
export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // Google sub
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: text("email_verified"), // ISO string, null if unverified
  image: text("image"), // avatar URL
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  sessionToken: text("session_token").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: text("expires").notNull(), // ISO string
});

export const verificationTokens = sqliteTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: text("expires").notNull(), // ISO string
});

// Application-specific tables
export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey(), // random UUID
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  paypalCustomerId: text("paypal_customer_id").unique(),
  paypalSubscriptionId: text("paypal_subscription_id").unique(),
  plan: text("plan").notNull().default("free"), // 'free' | 'pro'
  status: text("status").notNull().default("inactive"), // 'active' | 'inactive' | 'canceled' | 'past_due'
  credits: integer("credits").notNull().default(20), // remaining credits this period
  currentPeriodEnd: text("current_period_end"), // ISO string
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const usageLogs = sqliteTable("usage_logs", {
  id: text("id").primaryKey(), // random UUID
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  guestToken: text("guest_token"), // cookie-based guest identifier
  action: text("action").notNull(), // 'remove_bg'
  creditsUsed: integer("credits_used").notNull().default(1),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
});
