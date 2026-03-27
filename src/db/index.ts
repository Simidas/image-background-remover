/**
 * Cloudflare D1 HTTP API client.
 * Replaces drizzle-orm + better-sqlite3 for Edge/Workers compatibility.
 *
 * Env vars required:
 *   CLOUDFLARE_ACCOUNT_ID    - Cloudflare account ID
 *   CLOUDFLARE_D1_DATABASE_ID - D1 database UUID
 *   CLOUDFLARE_API_TOKEN     - Cloudflare API token (Global API Key or scoped token)
 *
 * D1 HTTP API reference:
 *   POST https://api.cloudflare.com/client/v4/d1/database/{database_id}/query
 */

interface D1Response {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: Array<{ code: number; message: string }>;
  result: unknown[] | null;
  result_info?: { total_count: number; count: number };
}

function getD1BaseUrl(): string {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  if (!accountId || !databaseId) {
    throw new Error(
      "Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_D1_DATABASE_ID environment variables."
    );
  }
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}`;
}

async function d1Query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const baseUrl = getD1BaseUrl();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!apiToken) {
    throw new Error("Missing CLOUDFLARE_API_TOKEN environment variable.");
  }

  const res = await fetch(`${baseUrl}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });

  if (!res.ok) {
    throw new Error(`D1 API error: ${res.status} ${res.statusText}`);
  }

  const data: D1Response = await res.json();

  if (!data.success) {
    const errMsg = data.errors.map((e) => e.message).join("; ");
    throw new Error(`D1 query failed: ${errMsg}`);
  }

  return (data.result ?? []) as T[];
}

/** Execute a write query (INSERT/UPDATE/DELETE) that doesn't need results */
async function d1Exec(sql: string, params: unknown[] = []): Promise<void> {
  const baseUrl = getD1BaseUrl();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!apiToken) {
    throw new Error("Missing CLOUDFLARE_API_TOKEN environment variable.");
  }

  const res = await fetch(`${baseUrl}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });

  if (!res.ok) {
    throw new Error(`D1 API error: ${res.status} ${res.statusText}`);
  }

  const data: D1Response = await res.json();

  if (!data.success) {
    const errMsg = data.errors.map((e) => e.message).join("; ");
    throw new Error(`D1 exec failed: ${errMsg}`);
  }
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function getUserByEmail(email: string) {
  const rows = await d1Query<{
    id: string;
    name: string | null;
    email: string;
    email_verified: string | null;
    image: string | null;
    created_at: string;
    updated_at: string;
  }>("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
  return rows[0] ?? null;
}

export async function createUser(values: {
  id: string;
  name: string | null;
  email: string;
  emailVerified: string | null;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}) {
  await d1Exec(
    `INSERT INTO users (id, name, email, email_verified, image, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      values.id,
      values.name,
      values.email,
      values.emailVerified,
      values.image,
      values.createdAt,
      values.updatedAt,
    ]
  );
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export async function getSubscriptionByUserId(userId: string) {
  const rows = await d1Query<{
    id: string;
    user_id: string;
    paypal_customer_id: string | null;
    paypal_subscription_id: string | null;
    plan: string;
    status: string;
    credits: number;
    current_period_end: string | null;
    created_at: string;
  }>("SELECT * FROM subscriptions WHERE user_id = ? LIMIT 1", [userId]);
  return rows[0] ?? null;
}

export async function getSubscriptionByPaypalId(paypalSubscriptionId: string) {
  const rows = await d1Query<{
    id: string;
    user_id: string;
    paypal_customer_id: string | null;
    paypal_subscription_id: string | null;
    plan: string;
    status: string;
    credits: number;
    current_period_end: string | null;
    created_at: string;
  }>(
    "SELECT * FROM subscriptions WHERE paypal_subscription_id = ? LIMIT 1",
    [paypalSubscriptionId]
  );
  return rows[0] ?? null;
}

export async function createSubscription(values: {
  id: string;
  userId: string;
  paypalCustomerId: string | null;
  paypalSubscriptionId: string | null;
  plan: string;
  status: string;
  credits: number;
  currentPeriodEnd: string | null;
  createdAt: string;
}) {
  await d1Exec(
    `INSERT INTO subscriptions (id, user_id, paypal_customer_id, paypal_subscription_id, plan, status, credits, current_period_end, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      values.id,
      values.userId,
      values.paypalCustomerId,
      values.paypalSubscriptionId,
      values.plan,
      values.status,
      values.credits,
      values.currentPeriodEnd,
      values.createdAt,
    ]
  );
}

export async function updateSubscription(
  userId: string,
  values: {
    paypalCustomerId?: string | null;
    paypalSubscriptionId?: string | null;
    plan?: string;
    status?: string;
    credits?: number;
    currentPeriodEnd?: string | null;
  }
) {
  const sets: string[] = [];
  const params: unknown[] = [];

  if (values.paypalCustomerId !== undefined) {
    sets.push("paypal_customer_id = ?");
    params.push(values.paypalCustomerId);
  }
  if (values.paypalSubscriptionId !== undefined) {
    sets.push("paypal_subscription_id = ?");
    params.push(values.paypalSubscriptionId);
  }
  if (values.plan !== undefined) {
    sets.push("plan = ?");
    params.push(values.plan);
  }
  if (values.status !== undefined) {
    sets.push("status = ?");
    params.push(values.status);
  }
  if (values.credits !== undefined) {
    sets.push("credits = ?");
    params.push(values.credits);
  }
  if (values.currentPeriodEnd !== undefined) {
    sets.push("current_period_end = ?");
    params.push(values.currentPeriodEnd);
  }

  if (sets.length === 0) return;

  params.push(userId);
  await d1Exec(
    `UPDATE subscriptions SET ${sets.join(", ")} WHERE user_id = ?`,
    params
  );
}

export async function updateSubscriptionByPaypalId(
  paypalSubscriptionId: string,
  values: {
    status?: string;
    plan?: string;
    credits?: number;
  }
) {
  const sets: string[] = [];
  const params: unknown[] = [];

  if (values.status !== undefined) {
    sets.push("status = ?");
    params.push(values.status);
  }
  if (values.plan !== undefined) {
    sets.push("plan = ?");
    params.push(values.plan);
  }
  if (values.credits !== undefined) {
    sets.push("credits = ?");
    params.push(values.credits);
  }

  if (sets.length === 0) return;

  params.push(paypalSubscriptionId);
  await d1Exec(
    `UPDATE subscriptions SET ${sets.join(", ")} WHERE paypal_subscription_id = ?`,
    params
  );
}

export async function decrementCredits(userId: string) {
  await d1Exec(
    "UPDATE subscriptions SET credits = credits - 1 WHERE user_id = ?",
    [userId]
  );
}

// ---------------------------------------------------------------------------
// Usage logs
// ---------------------------------------------------------------------------

export async function getUsageLogsByGuestToday(
  guestToken: string,
  todayStart: string
) {
  return d1Query<{
    id: string;
    user_id: string | null;
    guest_token: string | null;
    action: string;
    credits_used: number;
    created_at: string;
  }>(
    `SELECT * FROM usage_logs
     WHERE guest_token = ? AND action = ? AND created_at >= ?
     ORDER BY created_at ASC`,
    [guestToken, "remove_bg", todayStart]
  );
}

export async function insertUsageLog(values: {
  id: string;
  userId?: string;
  guestToken?: string;
  action: string;
  creditsUsed: number;
  createdAt: string;
}) {
  await d1Exec(
    `INSERT INTO usage_logs (id, user_id, guest_token, action, credits_used, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      values.id,
      values.userId ?? null,
      values.guestToken ?? null,
      values.action,
      values.creditsUsed,
      values.createdAt,
    ]
  );
}
