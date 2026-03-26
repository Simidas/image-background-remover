import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

type PayPalWebhookEvent =
  | "BILLING.SUBSCRIPTION.CREATED"
  | "BILLING.SUBSCRIPTION.CANCELLED"
  | "BILLING.SUBSCRIPTION.PAYMENT.FAILED"
  | "BILLING.SUBSCRIPTION.RE-ACTIVATED";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const headers = req.headers;

  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error("PAYPAL_WEBHOOK_ID not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // In production, verify webhook signature using PayPal SDK:
  // https://developer.paypal.com/docs/api-basics/notifications/webhooks/verify/
  // Skipped here — add verification before going live

  let event: { event_type: PayPalWebhookEvent; resource: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event_type, resource } = event;
  console.log(`PayPal webhook: ${event_type}`);

  try {
    switch (event_type) {
      case "BILLING.SUBSCRIPTION.CREATED": {
        const paypalSubId = resource.id as string;
        // custom_id contains our userId (set when creating subscription)
        const userId = resource.custom_id as string | undefined;
        const subscriber = resource.subscriber as { email_address?: string; payer_id?: string };
        const paypalCustomerId = subscriber?.payer_id ?? "";

        if (!userId) {
          console.error("No custom_id (userId) in subscription webhook");
          break;
        }

        // Upsert subscription — link user + PayPal subscription
        const existing = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.userId, userId))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(subscriptions)
            .set({
              paypalCustomerId,
              paypalSubscriptionId: paypalSubId,
              plan: "pro",
              status: "active",
              credits: 999999,
              currentPeriodEnd: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000
              ).toISOString(),
            })
            .where(eq(subscriptions.userId, userId));
        } else {
          await db.insert(subscriptions).values({
            id: crypto.randomUUID(),
            userId,
            paypalCustomerId,
            paypalSubscriptionId: paypalSubId,
            plan: "pro",
            status: "active",
            credits: 999999,
            currentPeriodEnd: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ).toISOString(),
          });
        }
        break;
      }

      case "BILLING.SUBSCRIPTION.CANCELLED": {
        const paypalSubId = resource.id as string;
        await db
          .update(subscriptions)
          .set({ status: "canceled", plan: "free", credits: 20 })
          .where(eq(subscriptions.paypalSubscriptionId, paypalSubId));
        break;
      }

      case "BILLING.SUBSCRIPTION.PAYMENT.FAILED": {
        const paypalSubId = resource.id as string;
        await db
          .update(subscriptions)
          .set({ status: "past_due" })
          .where(eq(subscriptions.paypalSubscriptionId, paypalSubId));
        break;
      }

      case "BILLING.SUBSCRIPTION.RE-ACTIVATED": {
        const paypalSubId = resource.id as string;
        await db
          .update(subscriptions)
          .set({ status: "active", plan: "pro", credits: 999999 })
          .where(eq(subscriptions.paypalSubscriptionId, paypalSubId));
        break;
      }

      default:
        console.log(`Unhandled PayPal event: ${event_type}`);
    }
  } catch (err) {
    console.error(`Error processing webhook ${event_type}:`, err);
    return NextResponse.json({ error: "Processing error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
