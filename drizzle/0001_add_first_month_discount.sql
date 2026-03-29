-- Migration: Add has_used_first_month_discount column to subscriptions table
-- Run this on Cloudflare D1 via Dashboard or `wrangler d1 execute <database> --file ./drizzle/0001_add_first_month_discount.sql`

ALTER TABLE `subscriptions` ADD COLUMN `has_used_first_month_discount` integer DEFAULT 0 NOT NULL;
