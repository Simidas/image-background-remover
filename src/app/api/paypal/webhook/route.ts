import { NextRequest, NextResponse } from "next/server";
import {
  getSubscriptionByUserId,
  createSubscription,
  updateSubscription,
  updateSubscriptionByPaypalId,
} from "@/db";
import { generateId } from "@/lib/id";

type PayPalWebhookEvent =
  | "BILLING.SUBSCRIPTION.CREATED"
  | "BILLING.SUBSCRIPTION.ACTIVATED"
  | "BILLING.SUBSCRIPTION.CANCELLED"
  | "BILLING.SUBSCRIPTION.PAYMENT.FAILED"
  | "BILLING.SUBSCRIPTION.RE-ACTIVATED";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error("PAYPAL_WEBHOOK_ID not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // In production, verify webhook signature using PayPal SDK:
  // https://developer.paypal.com/docs/api-basics/notifications/webhooks/verify/
  // Skipped here — add verification before going live

  let event: {
    event_type: PayPalWebhookEvent;
    resource: Record<string, unknown>;
  };
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
        const userId = resource.custom_id as string | undefined;
        const subscriber = resource.subscriber as {
          email_address?: string;
          payer_id?: string;
        };
        const paypalCustomerId = subscriber?.payer_id ?? "";

        if (!userId) {
          console.error("No custom_id (userId) in subscription webhook");
          break;
        }

        const existing = await getSubscriptionByUserId(userId);

        if (existing) {
          await updateSubscription(userId, {
            paypalCustomerId,
            paypalSubscriptionId: paypalSubId,
            plan: "pro",
            status: "active",
            credits: 999999,
            currentPeriodEnd: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ).toISOString(),
          });
          // Mark first-month discount as used if not already
          if (!existing.has_used_first_month_discount) {
            await updateSubscription(userId, {
              hasUsedFirstMonthDiscount: 1,
            });
          }
        } else {
          await createSubscription({
            id: generateId(),
            userId,
            paypalCustomerId,
            paypalSubscriptionId: paypalSubId,
            plan: "pro",
            status: "active",
            credits: 999999,
            currentPeriodEnd: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ).toISOString(),
            hasUsedFirstMonthDiscount: 1,
            createdAt: new Date().toISOString(),
          });
        }
        break;
      }

      case "BILLING.SUBSCRIPTION.ACTIVATED": {
        // Payment succeeded — upgrade user to Pro
        const paypalSubId = resource.id as string;
        await updateSubscriptionByPaypalId(paypalSubId, {
          status: "active",
          plan: "pro",
          credits: 999999,
        });
        break;
      }

      case "BILLING.SUBSCRIPTION.CANCELLED": {
        const paypalSubId = resource.id as string;
        await updateSubscriptionByPaypalId(paypalSubId, {
          status: "canceled",
          plan: "free",
          credits: 20,
        });
        break;
      }

      case "BILLING.SUBSCRIPTION.PAYMENT.FAILED": {
        const paypalSubId = resource.id as string;
        await updateSubscriptionByPaypalId(paypalSubId, {
          status: "past_due",
        });
        break;
      }

      case "BILLING.SUBSCRIPTION.RE-ACTIVATED": {
        const paypalSubId = resource.id as string;
        await updateSubscriptionByPaypalId(paypalSubId, {
          status: "active",
          plan: "pro",
          credits: 999999,
        });
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
