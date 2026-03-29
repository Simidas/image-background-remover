import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateId } from "@/lib/id";
import { getSubscriptionByUserId } from "@/db";

// PayPal REST API base URLs
const PAYPAL_API_BASE =
  process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

// Plan identifiers
const REGULAR_PLAN_NAME = "RemoveBG Pro Monthly";
const REGULAR_PLAN_DESCRIPTION = "Unlimited AI background removal - $8.8/month";
const REGULAR_PLAN_PRICE = "8.80";
const FIRST_MONTH_PLAN_NAME = "RemoveBG Pro - First Month $1";
const FIRST_MONTH_PLAN_DESCRIPTION = "First month $1, then $8.8/month";
const FIRST_MONTH_TRIAL_PRICE = "1.00";
const REGULAR_PRICE = "8.80";
const PLAN_CURRENCY = "USD";

// In-memory cache for plan IDs (reset on Workers cold-start, acceptable)
let cachedRegularPlanId: string | null = null;
let cachedFirstMonthPlanId: string | null = null;

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

// Create a regular $8.8/month plan (no trial)
async function createRegularPlan(
  accessToken: string,
  productId: string
): Promise<string> {
  const res = await fetch(`${PAYPAL_API_BASE}/v1/billing/plans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "PayPal-Request-Id": `plan-${generateId()}`,
    },
    body: JSON.stringify({
      product_id: productId,
      name: REGULAR_PLAN_NAME,
      description: REGULAR_PLAN_DESCRIPTION,
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
              value: REGULAR_PLAN_PRICE,
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

// Create a first-month $1 trial plan (1 month trial, then $8.8/month)
async function createFirstMonthPlan(
  accessToken: string,
  productId: string
): Promise<string> {
  const res = await fetch(`${PAYPAL_API_BASE}/v1/billing/plans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "PayPal-Request-Id": `plan-firstmonth-${generateId()}`,
    },
    body: JSON.stringify({
      product_id: productId,
      name: FIRST_MONTH_PLAN_NAME,
      description: FIRST_MONTH_PLAN_DESCRIPTION,
      status: "ACTIVE",
      billing_cycles: [
        // Trial cycle: 1 month for $1
        {
          frequency: {
            interval_unit: "MONTH",
            interval_count: 1,
          },
          tenure_type: "TRIAL",
          sequence: 1,
          total_cycles: 1,
          pricing_scheme: {
            fixed_price: {
              value: FIRST_MONTH_TRIAL_PRICE,
              currency_code: PLAN_CURRENCY,
            },
          },
        },
        // Regular cycle: $8.8/month after trial
        {
          frequency: {
            interval_unit: "MONTH",
            interval_count: 1,
          },
          tenure_type: "REGULAR",
          sequence: 2,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: REGULAR_PRICE,
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
    throw new Error(
      `PayPal create first-month plan failed: ${res.status} ${text}`
    );
  }

  const data = (await res.json()) as { id: string };
  return data.id;
}

// Get or create product (cached by product existence check)
async function getOrCreateProduct(
  accessToken: string,
  productName: string = "RemoveBG Pro"
): Promise<string> {
  // Try to find existing product
  const res = await fetch(`${PAYPAL_API_BASE}/v1/catalogs/products?page_size=10`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.ok) {
    const data = (await res.json()) as {
      products: Array<{ id: string; name: string }>;
    };
    const existing = data.products?.find((p) => p.name === productName);
    if (existing) return existing.id;
  }

  return createProduct(accessToken);
}

// Get or create regular plan
async function getOrCreateRegularPlan(
  accessToken: string,
  productId: string
): Promise<string> {
  if (cachedRegularPlanId) return cachedRegularPlanId;

  try {
    const res = await fetch(
      `${PAYPAL_API_BASE}/v1/billing/plans?product_id=${productId}&status=ACTIVE&page_size=20`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (res.ok) {
      const data = (await res.json()) as {
        plans: Array<{ id: string; name: string }>;
      };
      const existing = data.plans?.find((p) => p.name === REGULAR_PLAN_NAME);
      if (existing) {
        cachedRegularPlanId = existing.id;
        return cachedRegularPlanId;
      }
    }
  } catch {
    // Fall through to create
  }

  cachedRegularPlanId = await createRegularPlan(accessToken, productId);
  return cachedRegularPlanId;
}

// Get or create first-month plan
async function getOrCreateFirstMonthPlan(
  accessToken: string,
  productId: string
): Promise<string> {
  if (cachedFirstMonthPlanId) return cachedFirstMonthPlanId;

  try {
    const res = await fetch(
      `${PAYPAL_API_BASE}/v1/billing/plans?product_id=${productId}&status=ACTIVE&page_size=20`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (res.ok) {
      const data = (await res.json()) as {
        plans: Array<{ id: string; name: string }>;
      };
      const existing = data.plans?.find(
        (p) => p.name === FIRST_MONTH_PLAN_NAME
      );
      if (existing) {
        cachedFirstMonthPlanId = existing.id;
        return cachedFirstMonthPlanId;
      }
    }
  } catch {
    // Fall through to create
  }

  cachedFirstMonthPlanId = await createFirstMonthPlan(accessToken, productId);
  return cachedFirstMonthPlanId;
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
  const { accessToken, planId, userId, userEmail, userName, returnUrl, cancelUrl } =
    params;

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
          ? {
              given_name: userName.split(" ")[0] ?? "",
              surname: userName.split(" ")[1] ?? "",
            }
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

  if (
    !process.env.PAYPAL_CLIENT_ID ||
    !process.env.PAYPAL_CLIENT_SECRET ||
    !process.env.AUTH_URL
  ) {
    return NextResponse.json({ error: "缺少 PayPal 环境变量" }, { status: 500 });
  }

  try {
    const accessToken = await getPayPalAccessToken();

    // Get or create product (reused for both plans)
    const productId = await getOrCreateProduct(accessToken);

    // Check if user has already used the first-month discount
    const existingSub = await getSubscriptionByUserId(session.user.id);
    const hasUsedFirstMonth = existingSub?.has_used_first_month_discount === 1;

    // Choose plan: first-month $1 if eligible, otherwise regular $8.8
    const planId = hasUsedFirstMonth
      ? await getOrCreateRegularPlan(accessToken, productId)
      : await getOrCreateFirstMonthPlan(accessToken, productId);

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
