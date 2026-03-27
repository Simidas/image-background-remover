import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateId } from "@/lib/id";

// PayPal REST API base URLs
const PAYPAL_API_BASE =
  process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

const PLAN_NAME = "RemoveBG Pro Monthly";
const PLAN_DESCRIPTION = "Unlimited AI background removal - $8.8/month";
const PLAN_PRICE = "8.80";
const PLAN_CURRENCY = "USD";

// In-memory cache for plan ID (reset on Workers cold-start, acceptable)
let cachedPlanId: string | null = null;

// Get PayPal Access Token
async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID!;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal auth failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

// Create a PayPal Product
async function createProduct(accessToken: string): Promise<string> {
  const res = await fetch(`${PAYPAL_API_BASE}/v1/catalogs/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "PayPal-Request-Id": `product-${generateId()}`,
    },
    body: JSON.stringify({
      name: "RemoveBG Pro",
      type: "SERVICE",
      description: "AI-powered background removal - unlimited use",
      category: "SOFTWARE",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal create product failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { id: string };
  return data.id;
}

// Create a PayPal Billing Plan
async function createPlan(accessToken: string, productId: string): Promise<string> {
  const res = await fetch(`${PAYPAL_API_BASE}/v1/billing/plans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "PayPal-Request-Id": `plan-${generateId()}`,
    },
    body: JSON.stringify({
      product_id: productId,
      name: PLAN_NAME,
      description: PLAN_DESCRIPTION,
      status: "ACTIVE",
      billing_cycles: [
        {
          frequency: {
            interval_unit: "MONTH",
            interval_count: 1,
          },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: PLAN_PRICE,
              currency_code: PLAN_CURRENCY,
            },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 3,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal create plan failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { id: string };
  return data.id;
}

// Get or create billing plan (uses cached plan ID if available)
async function getOrCreatePlan(accessToken: string): Promise<string> {
  if (cachedPlanId) return cachedPlanId;

  try {
    // Try to list existing plans to find ours
    const res = await fetch(
      `${PAYPAL_API_BASE}/v1/billing/plans?product_id=RemoveBG&status=ACTIVE&page_size=10`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (res.ok) {
      const data = (await res.json()) as {
        plans: Array<{ id: string; name: string }>;
      };
      const existing = data.plans?.find(
        (p) => p.name === PLAN_NAME || p.name === PLAN_NAME
      );
      if (existing) {
        cachedPlanId = existing.id;
        return cachedPlanId;
      }
    }
  } catch {
    // Fall through to create
  }

  // Create product then plan
  const productId = await createProduct(accessToken);
  cachedPlanId = await createPlan(accessToken, productId);
  return cachedPlanId;
}

// Create PayPal Subscription
async function createSubscription(params: {
  accessToken: string;
  planId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<{ subscriptionId: string; approvalUrl: string }> {
  const { accessToken, planId, userId, userEmail, userName, returnUrl, cancelUrl } = params;

  const res = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "PayPal-Request-Id": `sub-${userId}-${Date.now()}`,
    },
    body: JSON.stringify({
      plan_id: planId,
      subscriber: {
        email_address: userEmail,
        name: userName
          ? { given_name: userName.split(" ")[0] ?? "", surname: userName.split(" ")[1] ?? "" }
          : undefined,
      },
      custom_id: userId,
      application_context: {
        brand_name: "RemoveBG Pro",
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal subscription create failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    id: string;
    links: Array<{ rel: string; href: string }>;
  };

  const approvalUrl = data.links.find((l) => l.rel === "approve")?.href;
  if (!approvalUrl) {
    throw new Error("No approval URL in PayPal response");
  }

  return { subscriptionId: data.id, approvalUrl };
}

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  if (!session.user.id) {
    return NextResponse.json({ error: "无法获取用户ID" }, { status: 400 });
  }

  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET || !process.env.AUTH_URL) {
    return NextResponse.json({ error: "缺少 PayPal 环境变量" }, { status: 500 });
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const planId = await getOrCreatePlan(accessToken);

    const { approvalUrl, subscriptionId } = await createSubscription({
      accessToken,
      planId,
      userId: session.user.id,
      userEmail: session.user.email ?? undefined,
      userName: session.user.name ?? undefined,
      returnUrl: `${process.env.AUTH_URL}/?subscription=success`,
      cancelUrl: `${process.env.AUTH_URL}/?subscription=cancelled`,
    });

    return NextResponse.json({ approvalUrl, subscriptionId });
  } catch (err) {
    console.error("PayPal create subscription error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "创建订阅失败" },
      { status: 500 }
    );
  }
}
