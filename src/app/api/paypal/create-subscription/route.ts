import { NextResponse } from "next/server";
import { auth } from "@/auth";

// PayPal REST API base URLs
const PAYPAL_API_BASE =
  process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

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

// Create PayPal Billing Subscription
async function createPayPalSubscription(params: {
  accessToken: string;
  planId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<{ subscriptionId: string; approvalUrl: string }> {
  const { accessToken, planId, userId, userEmail, userName, returnUrl, cancelUrl } = params;

  const body = {
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
    // 🔗 Link userId so webhook can correlate this subscription to a user
    custom_id: userId,
    application_context: {
      brand_name: "RemoveBG Pro",
      locale: "en-US",
      shipping_preference: "NO_SHIPPING",
      user_action: "SUBSCRIBE_NOW",
      return_url: returnUrl,
      cancel_url: cancelUrl,
    },
  };

  const res = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "PayPal-Request-Id": `${userId}-${Date.now()}`, // idempotency
    },
    body: JSON.stringify(body),
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

  const required = ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_PLAN_ID", "AUTH_URL"];
  for (const key of required) {
    if (!process.env[key]) {
      return NextResponse.json({ error: `缺少环境变量: ${key}` }, { status: 500 });
    }
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const { subscriptionId, approvalUrl } = await createPayPalSubscription({
      accessToken,
      planId: process.env.PAYPAL_PLAN_ID!,
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
